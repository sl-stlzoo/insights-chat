import { NextRequest, NextResponse } from 'next/server';
import { TeamsOboError, exchangeTeamsSsoTokenForOboToken } from '@/lib/teams-obo';

interface TeamsSsoExchangeRequest {
  ssoToken?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as TeamsSsoExchangeRequest;
    const ssoToken = payload.ssoToken?.trim();

    if (!ssoToken) {
      return NextResponse.json({ error: 'ssoToken is required.' }, { status: 400 });
    }

    const oboToken = await exchangeTeamsSsoTokenForOboToken(ssoToken);

    return NextResponse.json({
      tokenType: oboToken.tokenType,
      expiresIn: oboToken.expiresIn,
      scope: oboToken.scope,
      accessToken: oboToken.accessToken,
    });
  } catch (error) {
    if (error instanceof TeamsOboError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Teams SSO token exchange failed.',
      },
      { status: 500 },
    );
  }
}
