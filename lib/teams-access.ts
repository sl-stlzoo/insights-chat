import type { Session } from 'next-auth';

export type TeamsAccessCode =
  | 'authorized'
  | 'auth_required'
  | 'missing_required_role'
  | 'missing_required_group';

export interface TeamsAccessDecision {
  allowed: boolean;
  code: TeamsAccessCode;
  userMessage: string;
}

function parseCsv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function normalizeClaimList(value: unknown) {
  if (!value) {
    return [] as string[];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [] as string[];
}

function hasIntersection(required: string[], userValues: string[]) {
  if (required.length === 0) {
    return true;
  }
  const userSet = new Set(userValues);
  return required.some(value => userSet.has(value));
}

export function evaluateTeamsAccess(session: Session | null): TeamsAccessDecision {
  if (!session?.user) {
    return {
      allowed: false,
      code: 'auth_required',
      userMessage: 'Sign in is required before using this Teams tab.',
    };
  }

  const requiredRoles = parseCsv(process.env.TEAMS_ALLOWED_ROLES);
  const requiredGroups = parseCsv(process.env.TEAMS_ALLOWED_GROUPS);
  const userRoles = normalizeClaimList(session.user.roles);
  const userGroups = normalizeClaimList(session.user.groups);

  if (!hasIntersection(requiredRoles, userRoles)) {
    return {
      allowed: false,
      code: 'missing_required_role',
      userMessage: 'Your account does not have a required Teams app role.',
    };
  }

  if (!hasIntersection(requiredGroups, userGroups)) {
    return {
      allowed: false,
      code: 'missing_required_group',
      userMessage: 'Your account is not in a required Teams access group.',
    };
  }

  return {
    allowed: true,
    code: 'authorized',
    userMessage: 'Access granted.',
  };
}
