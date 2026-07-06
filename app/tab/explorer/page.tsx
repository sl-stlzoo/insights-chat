import DiveFrame from '@/app/components/DiveFrame';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluateTeamsAccess } from '@/lib/teams-access';
import { verifyTeamsTabStateToken } from '@/lib/teams-tab-state';
import TeamsSsoBootstrap from './TeamsSsoBootstrap';

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

interface TeamsExplorerPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TeamsExplorerPage({ searchParams }: TeamsExplorerPageProps) {
  const session = await getServerSession(authOptions);
  const accessDecision = evaluateTeamsAccess(session);

  const params = await searchParams;
  const stateToken = getSingleValue(params.state);
  const directDiveId = getSingleValue(params.diveId);
  const directDiveUrl = getSingleValue(params.diveUrl);
  const directTitle = getSingleValue(params.title);
  const directVersion = getSingleValue(params.version);

  const verifiedState = stateToken ? verifyTeamsTabStateToken(stateToken) : null;
  const hasInvalidStateToken = Boolean(stateToken && !verifiedState);

  const diveId = !hasInvalidStateToken ? verifiedState?.diveId || directDiveId : undefined;
  const diveUrl = !hasInvalidStateToken ? verifiedState?.diveUrl || directDiveUrl : undefined;
  const title = !hasInvalidStateToken
    ? verifiedState?.title || directTitle || 'Teams Dive workspace'
    : 'Teams Dive workspace';
  const version = !hasInvalidStateToken
    ? verifiedState?.version ?? (directVersion ? Number(directVersion) : undefined)
    : undefined;

  return (
    <main className="signin-page">
      <section className="signin-panel">
        <div className="signin-eyebrow">Microsoft Teams personal tab</div>
        <h1>Data Explorer Workspace</h1>
        <p>
          This route is designed to host the MotherDuck Dive workspace inside
          Microsoft Teams. A deep-link state token can pre-load the target Dive
          and preserve its analysis context.
        </p>
        {!accessDecision.allowed ? (
          <div className="teams-tab-auth-state">
            <strong>Access required:</strong> {accessDecision.userMessage}
            {accessDecision.code === 'auth_required' ? (
              <p>
                Continue by signing in at <a href="/signin">/signin</a>, then open the tab again from
                Microsoft Teams.
              </p>
            ) : null}
          </div>
        ) : null}

        {accessDecision.allowed ? <TeamsSsoBootstrap /> : null}

        {hasInvalidStateToken ? (
          <div className="dive-frame-state error">
            The tab context token could not be validated. Please reopen the tab from a fresh Teams deep link.
          </div>
        ) : null}

        {accessDecision.allowed && diveId ? (
          <DiveFrame
            diveId={diveId}
            diveUrl={diveUrl}
            title={title}
            version={version}
          />
        ) : (
          <div className="dive-frame-state">
            {!accessDecision.allowed
              ? 'Sign in and complete authorization checks before loading a Dive in this tab.'
              : 'No Dive was specified. Pass a verified state token or a direct `diveId` query string when opening this tab.'}
          </div>
        )}
      </section>
    </main>
  );
}
