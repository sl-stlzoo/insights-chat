'use client';

import { useEffect, useState } from 'react';

type TeamsSsoState = 'booting' | 'ready' | 'error' | 'skipped';

interface TeamsSsoExchangeResponse {
  error?: string;
  errorCode?: string;
  exchanged?: boolean;
}

function resolveUserSafeMessage(errorCode: string | undefined, fallbackMessage: string | undefined) {
  switch (errorCode) {
    case 'auth_required':
      return 'Sign in to the app before continuing in Microsoft Teams.';
    case 'missing_required_role':
    case 'missing_required_group':
      return 'Your account is not authorized for this Teams tab environment.';
    case 'invalid_audience':
    case 'invalid_tenant':
      return 'Your Teams sign-in token is not valid for this app environment.';
    case 'expired_token':
      return 'Your Teams sign-in token expired. Reopen the tab and try again.';
    case 'missing_sso_token':
      return 'Teams did not return a sign-in token for this tab session.';
    case 'missing_obo_config':
      return 'Teams sign-in is not configured for this environment.';
    case 'obo_exchange_failed':
      return 'Teams sign-in could not be completed. Try again shortly.';
    default:
      return fallbackMessage || 'Teams sign-in could not be completed.';
  }
}

export default function TeamsSsoBootstrap() {
  const [state, setState] = useState<TeamsSsoState>('booting');
  const [message, setMessage] = useState('Initializing Teams runtime...');

  useEffect(() => {
    let disposed = false;

    async function bootstrapTeamsSso() {
      try {
        const { app, authentication } = await import('@microsoft/teams-js');
        await app.initialize();

        const context = await app.getContext();
        const hostName = String(context.app.host.name);
        if (hostName !== 'teams' && hostName !== 'teamsModern') {
          if (!disposed) {
            setState('skipped');
          }
          return;
        }

        const ssoToken = await authentication.getAuthToken();
        const response = await fetch('/api/teams/sso/obo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ssoToken }),
        });
        const payload = (await response.json()) as TeamsSsoExchangeResponse;

        if (!response.ok || !payload.exchanged) {
          throw new Error(resolveUserSafeMessage(payload.errorCode, payload.error));
        }

        if (!disposed) {
          setState('ready');
          setMessage('Teams SSO connected and OBO token exchange completed.');
        }
      } catch (error) {
        if (!disposed) {
          setState('error');
          setMessage(
            error instanceof Error
              ? `Teams SSO initialization failed: ${error.message}`
              : 'Teams SSO initialization failed.',
          );
        }
      }
    }

    void bootstrapTeamsSso();

    return () => {
      disposed = true;
    };
  }, []);

  if (state === 'skipped') {
    return null;
  }

  return (
    <div className={`teams-sso-state ${state}`}>
      <strong>Teams auth:</strong> {message}
    </div>
  );
}
