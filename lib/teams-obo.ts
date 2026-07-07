interface TeamsJwtPayload {
  aud?: string | string[];
  exp?: number;
  tid?: string;
}

interface TeamsOboConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  allowedAudiences: string[];
}

interface OboTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface TeamsOboTokenResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export type TeamsOboErrorCode =
  | 'invalid_jwt'
  | 'invalid_jwt_payload'
  | 'missing_obo_config'
  | 'invalid_audience'
  | 'invalid_tenant'
  | 'expired_token'
  | 'obo_exchange_failed';

export class TeamsOboError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: TeamsOboErrorCode,
    readonly userMessage: string,
  ) {
    super(message);
  }
}

function splitCsv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function splitScopes(value: string | undefined) {
  return (value ?? '')
    .split(/\s+/)
    .map(scope => scope.trim())
    .filter(Boolean);
}

function decodeJwtPayload(token: string): TeamsJwtPayload {
  const tokenParts = token.split('.');
  if (tokenParts.length < 2) {
    throw new TeamsOboError(
      'Teams SSO token is not a valid JWT.',
      400,
      'invalid_jwt',
      'The Teams sign-in token format is invalid. Reopen the tab and try again.',
    );
  }

  try {
    const payloadJson = Buffer.from(tokenParts[1], 'base64url').toString('utf8');
    return JSON.parse(payloadJson) as TeamsJwtPayload;
  } catch {
    throw new TeamsOboError(
      'Teams SSO token payload could not be decoded.',
      400,
      'invalid_jwt_payload',
      'The Teams sign-in token could not be read. Reopen the tab and try again.',
    );
  }
}

function resolveAllowedAudiences() {
  const explicitAllowlist = splitCsv(process.env.TEAMS_SSO_ALLOWED_AUDIENCES);
  if (explicitAllowlist.length > 0) {
    return explicitAllowlist;
  }

  return [
    process.env.TEAMS_TAB_AAD_APP_ID,
    process.env.TEAMS_OBO_CLIENT_ID,
    process.env.AZURE_AD_CLIENT_ID,
  ].filter((entry): entry is string => Boolean(entry && entry.trim()));
}

function resolveConfig(): TeamsOboConfig {
  const tenantId = process.env.AZURE_AD_TENANT_ID?.trim();
  const clientId = (process.env.TEAMS_OBO_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID)?.trim();
  const clientSecret = (process.env.TEAMS_OBO_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET)?.trim();
  const scopes = splitScopes(process.env.TEAMS_OBO_SCOPES || 'User.Read');
  const allowedAudiences = resolveAllowedAudiences();

  if (!tenantId) {
    throw new TeamsOboError(
      'AZURE_AD_TENANT_ID must be configured for Teams OBO.',
      500,
      'missing_obo_config',
      'Teams sign-in is not configured for this environment.',
    );
  }
  if (!clientId) {
    throw new TeamsOboError(
      'TEAMS_OBO_CLIENT_ID or AZURE_AD_CLIENT_ID must be configured.',
      500,
      'missing_obo_config',
      'Teams sign-in is not configured for this environment.',
    );
  }
  if (!clientSecret) {
    throw new TeamsOboError(
      'TEAMS_OBO_CLIENT_SECRET or AZURE_AD_CLIENT_SECRET must be configured.',
      500,
      'missing_obo_config',
      'Teams sign-in is not configured for this environment.',
    );
  }
  if (scopes.length === 0) {
    throw new TeamsOboError(
      'TEAMS_OBO_SCOPES must include at least one scope.',
      500,
      'missing_obo_config',
      'Teams sign-in is not configured for this environment.',
    );
  }
  if (allowedAudiences.length === 0) {
    throw new TeamsOboError(
      'TEAMS_SSO_ALLOWED_AUDIENCES or TEAMS_TAB_AAD_APP_ID must be configured.',
      500,
      'missing_obo_config',
      'Teams sign-in is not configured for this environment.',
    );
  }

  return {
    tenantId,
    clientId,
    clientSecret,
    scopes,
    allowedAudiences,
  };
}

function validateIncomingToken(token: string, config: TeamsOboConfig) {
  const payload = decodeJwtPayload(token);
  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];

  if (!audiences.some(audience => config.allowedAudiences.includes(audience))) {
    throw new TeamsOboError(
      'Incoming Teams SSO token audience is not allowed.',
      401,
      'invalid_audience',
      'The Teams sign-in token is not valid for this app environment.',
    );
  }

  if (payload.tid && payload.tid !== config.tenantId) {
    throw new TeamsOboError(
      'Incoming Teams SSO token tenant does not match configured tenant.',
      401,
      'invalid_tenant',
      'The Teams sign-in token is not valid for this tenant.',
    );
  }

  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    throw new TeamsOboError(
      'Incoming Teams SSO token is expired.',
      401,
      'expired_token',
      'Your Teams sign-in token expired. Reopen the tab and try again.',
    );
  }
}

export async function exchangeTeamsSsoTokenForOboToken(token: string): Promise<TeamsOboTokenResult> {
  const config = resolveConfig();
  validateIncomingToken(token, config);

  const form = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    requested_token_use: 'on_behalf_of',
    assertion: token,
    scope: config.scopes.join(' '),
  });

  const tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  let payload: OboTokenResponse | null = null;
  try {
    payload = (await response.json()) as OboTokenResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.access_token) {
    const detail = payload?.error_description || payload?.error || 'Unknown OBO token exchange failure.';
    throw new TeamsOboError(
      `Teams OBO exchange failed: ${detail}`,
      response.status === 401 ? 401 : 502,
      'obo_exchange_failed',
      'Teams sign-in could not be completed. Try again or contact support if this persists.',
    );
  }

  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in,
    tokenType: payload.token_type,
    scope: payload.scope,
  };
}
