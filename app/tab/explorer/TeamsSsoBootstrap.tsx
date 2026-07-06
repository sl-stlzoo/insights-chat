'use client';

import { useEffect, useState } from 'react';

type TeamsSsoState = 'booting' | 'ready' | 'error' | 'skipped';

interface TeamsSsoExchangeResponse {
  error?: string;
  errorCode?: string;
  exchanged?: boolean;
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
          if (payload.errorCode === 'auth_required') {
            throw new Error('Sign in to the app before continuing in Microsoft Teams.');
          }
          if (payload.errorCode === 'missing_required_role' || payload.errorCode === 'missing_required_group') {
            throw new Error('Your account is not authorized for this Teams tab environment.');
          }
          throw new Error(payload.error || 'Teams OBO exchange was not completed.');
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
