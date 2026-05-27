import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ElevenLabsTtsBody = {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ElevenLabsTtsBody;
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: '`text` is required' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = body.voiceId ?? process.env.ELEVENLABS_VOICE_ID;
    const modelId = body.modelId ?? process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2';

    if (!apiKey || !voiceId) {
      return NextResponse.json(
        {
          error: 'ElevenLabs not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env.local.',
        },
        { status: 500 },
      );
    }

    const outputFormat = body.outputFormat ?? 'mp3_44100_128';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(
      outputFormat,
    )}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'ElevenLabs TTS failed', status: res.status, details: errorText || undefined },
        { status: 500 },
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') ?? 'audio/mpeg';
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: { 'Content-Type': contentType },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ElevenLabs TTS error', details: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}

