import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ElevenLabsTtsBody = {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
};

async function resolveVoiceId(apiKey: string, preferredVoiceId?: string): Promise<string | null> {
  if (preferredVoiceId?.trim()) return preferredVoiceId.trim();

  // Fallback: auto-pick the first available voice.
  // This keeps the demo working even if the user only configured an API key.
  const tryExtract = (voices: any): string | null => {
    if (!Array.isArray(voices)) return null;
    for (const v of voices.slice(0, 10)) {
      const candidate = v?.voice_id ?? v?.id ?? v?.voiceId ?? v?.voiceID ?? null;
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
    return null;
  };

  try {
    const resV1 = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
    });

    if (resV1.ok) {
      const data = (await resV1.json().catch(() => null)) as any;
      const direct = tryExtract(data?.voices);
      if (direct) return direct;
    }
  } catch {
    // ignore and try v2
  }

  try {
    const resV2 = await fetch('https://api.elevenlabs.io/v2/voices?page_size=10', {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
    });

    if (resV2.ok) {
      const data = (await resV2.json().catch(() => null)) as any;
      const direct = tryExtract(data?.voices ?? data?.items ?? data?.data?.voices);
      if (direct) return direct;
    }
  } catch {
    // ignore
  }

  return null;
}

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

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs not configured. Set ELEVENLABS_API_KEY in .env.local.' },
        { status: 500 },
      );
    }

    const resolvedVoiceId = await resolveVoiceId(apiKey, voiceId);
    if (!resolvedVoiceId) {
      return NextResponse.json(
        { error: 'ElevenLabs voice_id could not be resolved. Set ELEVENLABS_VOICE_ID in .env.local.' },
        { status: 500 },
      );
    }

    const outputFormat = body.outputFormat ?? 'mp3_44100_128';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(resolvedVoiceId)}?output_format=${encodeURIComponent(
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

