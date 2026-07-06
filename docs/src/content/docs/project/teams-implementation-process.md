---
title: Teams implementation process
description: PRD-aligned implementation process for moving from web-first delivery to Teams hybrid delivery.
---

# Teams implementation process

This process defines the concrete order of operations to move to the PRD-aligned
Microsoft Teams delivery model while minimizing rework.

## Stage 1 - Identity and architecture baseline

1. Lock architecture boundaries (tab primary, bot assistive, API trust boundaries).
2. Finalize Entra app model:
   - tab app registration
   - bot app registration (split if required)
   - redirect URIs and post-logout URIs
   - delegated scopes and admin consent set.
3. Confirm Teams IDs and environment contracts in GitHub env variables/secrets.

**Completion signal:** production Entra artifacts and env contracts are documented
and validated in `dev`.

## Stage 2 - Token and manifest plane

1. Implement Teams SSO token exchange and backend OBO flow.
2. Enforce secure downstream-token usage for API calls and service integrations.
3. Build hardened env-specific Teams manifests (`dev`, `pilot`, `prod`):
   - `validDomains`
   - `webApplicationInfo`
   - permissions
   - app/bot IDs.

**Completion signal:** Teams manifest validation and end-to-end SSO/OBO checks
pass in `dev`.

## Stage 3 - Product surface and authorization

1. Complete tab UX hardening for Teams iframe/runtime constraints:
   - deterministic loading states
   - auth/session error handling
   - Fluent-consistent controls.
2. Implement bot command surface for key analytics workflows.
3. Add deep-link handoff from bot commands/cards into tab context.
4. Enforce authorization model:
   - group/app-role checks in app entry points
   - mapping to MotherDuck policy expectations.

**Completion signal:** pilot users can run command -> deep link -> tab workflow
with least-privilege access controls.

## Stage 4 - Delivery, observability, and rollout

1. Extend GitHub Actions for Teams package build/sign/publish.
2. Enforce promotion gates: `dev -> pilot -> prod`.
3. Add Teams-specific telemetry and diagnostics:
   - sign-in failures
   - token exchange/OBO failures
   - bot command usage and failures
   - audit events.
4. Run pilot rollout, collect UX/query-quality feedback, and close hardening gaps.
5. Promote to GA after pilot acceptance criteria are met.

**Completion signal:** prod rollout approved with monitored, auditable operations.

## Required artifacts by stage

| Stage | Artifacts to update |
|---|---|
| 1 | `docs/.../platform/microsoft-teams-delivery.md`, `teams/README.md`, environment variable/secret contracts |
| 2 | Teams auth/token code paths, `teams/manifest.*.json`, CI validation jobs |
| 3 | `app/tab/explorer/*`, bot handlers, authorization guards, policy mapping docs |
| 4 | `.github/workflows/*`, alerting/dashboards, pilot runbook, phase tracker |

## Current execution status

- **Stage 1:** Complete (env contract wired through `.env.example`, `infra/*`,
  `.github/workflows/deploy-aca.yml`, and `teams/README.md`).
- **Stage 2:** Complete (`app/api/teams/sso/obo/route.ts`,
  `lib/teams-obo.ts`, `app/tab/explorer/TeamsSsoBootstrap.tsx`,
  `teams/manifest.{dev,pilot,prod}.json`, and `npm run teams:validate`).

## Gate discipline

- Do not advance stages with unresolved security findings in SSO/OBO or authorization.
- Every stage close requires a phase-tracker status update and explicit evidence.
