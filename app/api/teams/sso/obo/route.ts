import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { TeamsOboError, exchangeTeamsSsoTokenForOboToken } from '@/lib/teams-obo';
import { authOptions } from '@/lib/auth';
import { evaluateTeamsAccess } from '@/lib/teams-access';

interface TeamsSsoExchangeRequest {
  ssoToken?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessDecision = evaluateTeamsAccess(session);
    if (!accessDecision.allowed) {
      const status = accessDecision.code === 'auth_required' ? 401 : 403;
      return NextResponse.json(
        {
          error: accessDecision.userMessage,
          errorCode: accessDecision.code,
        },
        { status },
      );
    }

    const payload = (await request.json()) as TeamsSsoExchangeRequest;
    const ssoToken = payload.ssoToken?.trim();

    if (!ssoToken) {
      return NextResponse.json(
        { error: 'A Teams SSO token is required.', errorCode: 'missing_sso_token' },
        { status: 400 },
      );
    }

    const oboToken = await exchangeTeamsSsoTokenForOboToken(ssoToken);

    return NextResponse.json({
      tokenType: oboToken.tokenType,
      expiresIn: oboToken.expiresIn,
      scope: oboToken.scope,
      exchanged: true,
    });
  } catch (error) {
    if (error instanceof TeamsOboError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: 'obo_exchange_failed',
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: 'Teams SSO token exchange failed.',
        errorCode: 'obo_exchange_failed',
      },
      { status: 500 },
    );
  }
}
