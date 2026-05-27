import { NextRequest, NextResponse } from 'next/server';
import { compileSystemPrompt } from '@/services/promptCompiler';
import { getUserProfile } from '@/services/profileManager';
import {
  getGeminiLiveModel,
  getGeminiLiveVoice,
  getLiveClientAuth,
  FALLBACK_LIVE_MODEL,
} from '@/services/geminiLiveConfig';
import { getGenAIClient, validateVertexConfig } from '@/services/vertexGemini';
import { Modality, type LiveConnectConfig } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const vertexCheck = validateVertexConfig();
    if (!vertexCheck.ok) {
      return NextResponse.json({ error: vertexCheck.error }, { status: 500 });
    }

    const body = (await req.json()) as { user_id?: string };
    const userId = body.user_id || req.headers.get('x-user-id') || 'default_user';
    const profile = await getUserProfile(userId);
    const systemInstruction = await compileSystemPrompt(profile);
    const model = getGeminiLiveModel();
    const voice = getGeminiLiveVoice();
    const auth = getLiveClientAuth();

    const liveConfig: LiveConnectConfig = {
      responseModalities: [Modality.AUDIO],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    };

    if (vertexCheck.mode === 'ai-studio') {
      try {
        const ai = getGenAIClient();
        const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const token = await ai.authTokens.create({
          config: {
            uses: 1,
            expireTime,
            liveConnectConstraints: {
              model,
              config: liveConfig,
            },
          },
        });

        return NextResponse.json({
          authType: 'ephemeral',
          token: token.name,
          model,
          fallbackModel: FALLBACK_LIVE_MODEL,
          voice,
        });
      } catch (e) {
        console.warn('[Live] ephemeral token failed, using apiKey:', e);
      }
    }

    if (!auth.apiKey && vertexCheck.mode !== 'vertex-project') {
      return NextResponse.json(
        { error: 'No API key available for Live API bootstrap' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      authType: 'apiKey',
      apiKey: auth.apiKey,
      vertexai: auth.vertexai,
      model,
      fallbackModel: FALLBACK_LIVE_MODEL,
      voice,
      systemInstruction,
      liveConfig,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Live] bootstrap error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
