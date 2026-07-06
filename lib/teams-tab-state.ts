import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TeamsTabStatePayload {
  diveId?: string;
  diveUrl?: string;
  title?: string;
  version?: number;
  query?: string;
  database?: string;
  expiresAt?: string;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function resolveSecret() {
  return process.env.TEAMS_TAB_CONTEXT_SECRET || process.env.NEXTAUTH_SECRET;
}

export function createTeamsTabStateToken(payload: TeamsTabStatePayload) {
  const secret = resolveSecret();
  if (!secret) {
    throw new Error('TEAMS_TAB_CONTEXT_SECRET or NEXTAUTH_SECRET must be configured');
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyTeamsTabStateToken(token: string): TeamsTabStatePayload | null {
  const secret = resolveSecret();
  if (!secret) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest();
  const providedSignature = Buffer.from(signature, 'base64url');

  if (
    expectedSignature.length !== providedSignature.length ||
    !timingSafeEqual(expectedSignature, providedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TeamsTabStatePayload;
    if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
