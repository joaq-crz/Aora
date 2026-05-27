import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractVoices(data: any): Array<{ id: string; name?: string }> {
  const list = data?.voices ?? data?.items ?? data?.data?.voices ?? data?.data ?? null;
  if (!Array.isArray(list)) return [];

  return list
    .map((v: any) => {
      const id = v?.voice_id ?? v?.id ?? v?.voiceId ?? null;
      if (!id || typeof id !== 'string') return null;
      const name = v?.name ?? v?.voice_name ?? v?.friendly_name ?? undefined;
      return { id: id.trim(), name };
    })
    .filter(Boolean) as Array<{ id: string; name?: string }>;
}

export async function GET(_req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY missing' }, { status: 500 });
  }

  const candidates = [
    'https://api.elevenlabs.io/v2/voices?page_size=10',
    'https://api.elevenlabs.io/v1/voices',
  ];

  let lastFailure: { url: string; status?: number; body?: string } | null = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { 'xi-api-key': apiKey } });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastFailure = { url, status: res.status, body: body?.slice(0, 300) };
        continue;
      }

      const data = await res.json().catch(() => null);
      if (!data) continue;

      const voices = extractVoices(data);
      if (voices.length > 0) {
        return NextResponse.json({ voices });
      }
    } catch {
      // ignore, try next
    }
  }

  return NextResponse.json(
    {
      error: 'Could not resolve voices list from ElevenLabs',
      hint: 'Check API key permissions / plan / voice list availability',
      lastFailure,
    },
    { status: 500 },
  );
}

