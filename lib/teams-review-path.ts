import { createTeamsTabStateToken } from '@/lib/teams-tab-state';

export interface TeamsReviewPathInput {
  origin: string;
  diveId: string;
  diveUrl?: string;
  title?: string;
  version?: number;
  query?: string;
  database?: string;
}

export interface TeamsReviewPathResult {
  tabUrl: string;
  teamsDeepLink: string;
  adaptiveCard: Record<string, unknown>;
}

const DEFAULT_ENTITY_ID = 'maudeDiveViewerTab';

function resolveTeamsAppId() {
  const teamsAppId = process.env.TEAMS_APP_ID?.trim();
  if (!teamsAppId) {
    throw new Error('TEAMS_APP_ID must be configured for Teams deep-link generation.');
  }
  return teamsAppId;
}

export function buildTeamsReviewPath(input: TeamsReviewPathInput): TeamsReviewPathResult {
  const teamsAppId = resolveTeamsAppId();
  const title = input.title?.trim() || 'Teams Dive workspace';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const stateToken = createTeamsTabStateToken({
    diveId: input.diveId,
    diveUrl: input.diveUrl,
    title,
    version: input.version,
    query: input.query,
    database: input.database,
    expiresAt,
  });

  const tabUrl = `${input.origin}/tab/explorer?state=${encodeURIComponent(stateToken)}`;
  const teamsDeepLink = `https://teams.microsoft.com/l/entity/${encodeURIComponent(teamsAppId)}/${encodeURIComponent(DEFAULT_ENTITY_ID)}?webUrl=${encodeURIComponent(tabUrl)}&label=${encodeURIComponent(title)}`;

  const adaptiveCard = {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        size: 'Medium',
        weight: 'Bolder',
        text: title,
      },
      {
        type: 'TextBlock',
        wrap: true,
        text: 'Open this review context in the Teams tab to continue the analysis.',
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Open review in Teams tab',
        url: teamsDeepLink,
      },
    ],
  };

  return {
    tabUrl,
    teamsDeepLink,
    adaptiveCard,
  };
}
