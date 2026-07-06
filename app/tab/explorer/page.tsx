import DiveFrame from '@/app/components/DiveFrame';
import { verifyTeamsTabStateToken } from '@/lib/teams-tab-state';

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

interface TeamsExplorerPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TeamsExplorerPage({ searchParams }: TeamsExplorerPageProps) {
  const params = await searchParams;
  const stateToken = getSingleValue(params.state);
  const directDiveId = getSingleValue(params.diveId);
  const directDiveUrl = getSingleValue(params.diveUrl);
  const directTitle = getSingleValue(params.title);
  const directVersion = getSingleValue(params.version);

  const verifiedState = stateToken ? verifyTeamsTabStateToken(stateToken) : null;

  const diveId = verifiedState?.diveId || directDiveId;
  const diveUrl = verifiedState?.diveUrl || directDiveUrl;
  const title = verifiedState?.title || directTitle || 'Teams Dive workspace';
  const version = verifiedState?.version ?? (directVersion ? Number(directVersion) : undefined);

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

        {diveId ? (
          <DiveFrame
            diveId={diveId}
            diveUrl={diveUrl}
            title={title}
            version={version}
          />
        ) : (
          <div className="dive-frame-state">
            No Dive was specified. Pass a verified state token or a direct
            `diveId` query string when opening this tab.
          </div>
        )}
      </section>
    </main>
  );
}
