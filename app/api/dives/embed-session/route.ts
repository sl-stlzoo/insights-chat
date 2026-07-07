import { NextRequest, NextResponse } from 'next/server';

interface DiveEmbedSessionRequest {
  diveId?: string;
  version?: number;
}

const MOTHERDUCK_EMBED_API_ORIGIN = 'https://api.motherduck.com';

export async function POST(request: NextRequest) {
  try {
    const { diveId, version } = (await request.json()) as DiveEmbedSessionRequest;

    if (!diveId) {
      return NextResponse.json({ error: 'diveId is required' }, { status: 400 });
    }

    const adminToken = process.env.MOTHERDUCK_DIVE_ADMIN_TOKEN;
    const serviceAccountUsername = process.env.MOTHERDUCK_DIVE_SERVICE_ACCOUNT_USERNAME;

    if (!adminToken || !serviceAccountUsername) {
      return NextResponse.json(
        {
          error:
            'MotherDuck Dive embedding is not configured. Set MOTHERDUCK_DIVE_ADMIN_TOKEN and MOTHERDUCK_DIVE_SERVICE_ACCOUNT_USERNAME.',
        },
        { status: 500 },
      );
    }

    const response = await fetch(`${MOTHERDUCK_EMBED_API_ORIGIN}/v1/dives/${diveId}/embed-session`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: serviceAccountUsername,
        ...(typeof version === 'number' ? { version } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `MotherDuck embed session request failed: ${response.status} ${errorText}` },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as { session?: string };
    if (!payload.session) {
      console.error('[Embed API] Invalid payload from MotherDuck:', payload);
      return NextResponse.json({ error: `MotherDuck did not return an embed session. Payload: ${JSON.stringify(payload)}` }, { status: 502 });
    }

    return NextResponse.json({ session: payload.session });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create MotherDuck embed session',
      },
      { status: 500 },
    );
  }
}
