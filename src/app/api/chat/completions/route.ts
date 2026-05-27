// Core API route handler for chat completions with persona injection

import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionRequest } from '@/types/chat';
import { extractText, analyzePersona, extractLocation, detectBuyingIntent } from '@/services/analyzer';
import { getUserProfile, updateProfile } from '@/services/profileManager';
import { compileSystemPrompt } from '@/services/promptCompiler';
import {
  getGenAIClient,
  getGeminiAuthMode,
  resolveVertexModelId,
  toVertexChatMessages,
  validateVertexConfig,
} from '@/services/vertexGemini';
import { TtsPipeline } from '@/services/ttsPipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const vertexCheck = validateVertexConfig();
    if (!vertexCheck.ok) {
      console.error(vertexCheck.error);
      return NextResponse.json({ error: vertexCheck.error }, { status: 500 });
    }

    const body: ChatCompletionRequest = await req.json();

    if (!body.stream) {
      return NextResponse.json(
        { error: 'Streaming must be enabled (stream: true)' },
        { status: 400 },
      );
    }

    const userId = body.user_id || req.headers.get('x-user-id') || 'default_user';
    const userProfile = await getUserProfile(userId);

    const userMessages = body.messages.filter((m) => m.role === 'user');
    if (userMessages.length > 0) {
      const latestMessage = userMessages[userMessages.length - 1];
      const messageText = extractText(latestMessage.content);
      const analysis = analyzePersona(messageText);

      const updates: Record<string, unknown> = {
        interactionText: messageText,
      };

      if (analysis.detected_persona !== 'Unknown' && analysis.confidence_score >= 3) {
        updates.persona = analysis.detected_persona;
      }

      const location = extractLocation(messageText);
      if (location) {
        updates.location = location;
      }

      if (analysis.unrecognized_slang.length > 0) {
        updates.unrecognizedSlang = analysis.unrecognized_slang;
      }

      if (detectBuyingIntent(messageText)) {
        updates.funnelStage = 'converted';
      }

      updateProfile(userId, updates).catch(console.error);
    }

    const systemPrompt = await compileSystemPrompt(userProfile);
    const { history, lastParts } = toVertexChatMessages(body.messages);

    const requestedModel = body.model || 'gemini-3.1-flash-lite';
    const primaryModelId = resolveVertexModelId(requestedModel);
    const fallbackModelId =
      primaryModelId === 'gemini-3.1-flash-lite'
        ? 'gemini-3.1-flash-lite-preview'
        : 'gemini-3.1-flash-lite';

    const authMode = getGeminiAuthMode();
    console.log('[API] Auth mode:', authMode);
    console.log('[API] Requested model:', requestedModel, '->', primaryModelId);
    console.log('[API] Fallback model:', fallbackModelId);

    const encoder = new TextEncoder();
    let accumulatedResponse = '';
    const enableTts = body.enable_tts !== false;

    const stream = new ReadableStream({
      async start(controller) {
        const tts = enableTts
          ? new TtsPipeline((pcm, sampleRate) => {
              const payload = {
                audio: {
                  pcm: Buffer.from(pcm).toString('base64'),
                  sampleRate,
                },
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            })
          : null;
        const sendStreamWithModel = async (modelId: string) => {
          const ai = getGenAIClient();
          const chat = ai.chats.create({
            model: modelId,
            history,
            config: {
              systemInstruction: systemPrompt,
              temperature: body.temperature ?? 0.8,
              maxOutputTokens: body.max_tokens ?? 500,
            },
          });

          console.log(`[API] Streaming from ${authMode} model:`, modelId);
          return chat.sendMessageStream({ message: lastParts });
        };

        try {
          let streamResult;
          let activeModel = primaryModelId;

          try {
            streamResult = await sendStreamWithModel(primaryModelId);
          } catch (primaryError: unknown) {
            const msg = String(
              primaryError instanceof Error ? primaryError.message : primaryError,
            );
            const isCapacityError =
              msg.includes('503') ||
              msg.toLowerCase().includes('high demand') ||
              msg.includes('429');

            if (!isCapacityError) {
              throw primaryError;
            }

            console.warn(
              `[API] Model ${primaryModelId} unavailable, retrying with ${fallbackModelId}`,
            );
            activeModel = fallbackModelId;
            streamResult = await sendStreamWithModel(fallbackModelId);
          }

          for await (const chunk of streamResult) {
            const text = chunk.text;
            if (!text) continue;

            accumulatedResponse += text;
            tts?.push(text);

            const sseData = {
              choices: [
                {
                  delta: { content: text },
                  index: 0,
                  finish_reason: null,
                },
              ],
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
          }

          if (tts) {
            await tts.finish();
          }

          console.log('[API] Stream complete:', activeModel, `(${authMode})`);
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          if (accumulatedResponse) {
            updateProfile(userId, {
              interactionText: `[AI] ${accumulatedResponse}`,
            }).catch(console.error);
          }

          controller.close();
        } catch (error: unknown) {
          tts?.cancel();
          console.error('Gemini stream error:', error);

          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          const errorData = {
            choices: [
              {
                delta: { content: `\n\n[Error: ${errorMessage}]` },
                index: 0,
                finish_reason: 'error',
              },
            ],
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check VERTEX_API_KEY, GEMINI_API_KEY, or Vertex project credentials',
      },
      { status: 500 },
    );
  }
}
