import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AgoraTokenBody = {
  channelName?: string;
  uid: number;
  role?: 'publisher' | 'subscriber';
  expirationTimeInSeconds?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AgoraTokenBody;

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_CERTIFICATE;

    if (!appId || !appCertificate) {
      return NextResponse.json(
        { error: 'Agora credentials missing. Set AGORA_APP_ID and AGORA_CERTIFICATE.' },
        { status: 500 },
      );
    }

    const channelName = body.channelName ?? 'hackathon-persona';
    const uid = Number(body.uid);
    if (!Number.isFinite(uid) || uid <= 0) {
      return NextResponse.json({ error: '`uid` must be a positive number.' }, { status: 400 });
    }

    const role = body.role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    // `privilegeExpiredTs` is a unix timestamp in seconds.
    const now = Math.floor(Date.now() / 1000);
    const expirationTimeInSeconds = Number(body.expirationTimeInSeconds ?? 60 * 60); // 1 hour
    const privilegeExpiredTs = now + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs,
    );

    return NextResponse.json({ token, channelName, uid });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to generate Agora token', details: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}

