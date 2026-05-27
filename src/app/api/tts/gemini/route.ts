import { NextRequest, NextResponse } from 'next/server';
import {
  GEMINI_PCM_SAMPLE_RATE,
  streamGeminiTtsPcm,
  synthesizeGeminiTtsWav,
} from '@/services/geminiTts';
import { validateVertexConfig } from '@/services/vertexGemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GeminiTtsBody = {
  text: string;
  stream?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const auth = validateVertexConfig();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 500 });
    }

    const body = (await req.json()) as GeminiTtsBody;
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: '`text` is required' }, { status: 400 });
    }

    if (body.stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const pcm of streamGeminiTtsPcm(text)) {
              const payload = JSON.stringify({
                pcm: Buffer.from(pcm).toString('base64'),
                sampleRate: GEMINI_PCM_SAMPLE_RATE,
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const wav = await synthesizeGeminiTtsWav(text);
    return new NextResponse(Buffer.from(wav), {
      headers: { 'Content-Type': 'audio/wav' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TTS] Gemini error:', message);
    return NextResponse.json(
      {
        error: 'Gemini TTS failed',
        details: message,
        hint: 'Set VERTEX_API_KEY (or GEMINI_API_KEY) and optional GEMINI_TTS_MODEL / GEMINI_TTS_VOICE.',
      },
      { status: 502 },
    );
  }
}
