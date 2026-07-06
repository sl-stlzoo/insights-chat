---
title: Microsoft Teams delivery target
description: Eventual single-tenant Teams bot plus personal tab delivery shape from the updated PRD.
---

# Microsoft Teams delivery target

The updated PRD changes the eventual end-user surface from a standalone web app
to a **hybrid Microsoft Teams application** with a personal tab as the primary
experience and a bot for assistive/proactive workflows.

## Locked target architecture

1. **Primary UX:** Teams personal tab hosting `/tab/explorer` for chat + Dive workspace.
2. **Assistive UX:** Teams bot for commands, proactive nudges, and deep-link handoffs.
3. **Identity:** Entra-backed Teams SSO into app APIs, with OBO for downstream access.
4. **Authorization:** App roles/groups mapped to least-privilege data policies.
5. **Delivery:** Gated CI/CD across `dev -> pilot -> prod`, including Teams app package promotion.

## Current foundation in this repo

- `/tab/explorer` exists as a Teams-friendly route.
- Signed tab-state support exists (`lib/teams-tab-state.ts`).
- Entra app auth + ACA deployment baseline are operational.
- `teams/manifest.template.json` provides the starting manifest contract.

## PRD execution plan (ordered to unblock downstream work)

| Phase | Workstream | Key outputs | Exit criteria |
|---|---|---|---|
| 1 | Architecture lock | Hybrid architecture decision locked (tab primary, bot assistive), integration boundaries, sequence | Architecture sign-off recorded in docs/ADRs |
| 2 | Entra app model | Final app registration topology (tab app and optional bot app), redirect URIs, app IDs, delegated scopes, admin consent plan | Prod-ready Entra registrations and documented env bindings |
| 3 | Teams SSO + OBO | Teams token exchange, backend OBO implementation, secure downstream token usage model | Successful end-to-end token flow from Teams client to protected API and downstream resource |
| 4 | Manifest hardening | Env-specific manifests (`dev`, `pilot`, `prod`) with `validDomains`, `webApplicationInfo`, permissions, IDs | Teams manifest validation passes for each environment |
| 5 | Tab UX readiness | Teams-safe iframe layout, error/loading/session states, Fluent-consistent auth affordances | Tab renders reliably in Teams desktop/web/mobile with consistent UX states |
| 6 | Bot command surface | Bot commands for core analytics journeys and deep links into tab context | Commands resolve successfully and open tab with correct scoped context |
| 7 | Authorization model | Group/app-role enforcement in app and policy mapping to MotherDuck access patterns | Least-privilege access confirmed for pilot personas |
| 8 | CI/CD extension | Teams package build/sign/publish in GitHub Actions with promotion gates (`dev -> pilot -> prod`) | Pipeline promotes artifacts by environment with approvals and traceability |
| 9 | Observability/governance | Teams telemetry dimensions, sign-in diagnostics, OBO tracing, audit logs, alerts | Operational dashboards and alert thresholds reviewed and active |
| 10 | Pilot -> GA | Controlled pilot, UX/query-quality feedback loops, hardening backlog, broad rollout | Pilot acceptance criteria met and tenant-wide rollout approved |

## Environment model

- **dev:** engineering integration environment, rapid iteration.
- **pilot:** controlled stakeholder rollout with approval gates and feedback capture.
- **prod:** tenant-wide rollout with stricter approvals and change windows.

## Implementation governance

1. Each phase must have explicit **entry criteria**, **exit criteria**, and an owner.
2. No phase closes without updating:
   - `docs/src/content/docs/project/phase-tracker.md`
   - implementation process docs under `docs/src/content/docs/project/`
   - relevant manifests/workflows/README contracts.
3. Security controls (SSO/OBO, scopes, app roles, policy mapping) are treated as
   release gates, not post-release cleanup.
