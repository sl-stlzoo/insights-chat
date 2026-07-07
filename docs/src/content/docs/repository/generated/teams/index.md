---
title: Teams
description: Rolled up from teams/README.md.
---

> Source: `teams/README.md`

# Teams Delivery

This directory contains the scaffolding for the eventual Microsoft Teams-hosted
delivery model described in the updated PRD.

## Scope

- Personal tab manifest template
- Deep-link aware tab route expectations
- Notes for bot + tab integration

## Current direction

- The Next.js app exposes `/tab/explorer` for the Teams personal tab scenario
- A signed state token can carry Dive context into the tab
- The embedded Dive renderer is shared with the web app so the same live
  visualization pattern works both on the web and inside Teams

## Locked architecture target

- **Primary surface:** Teams personal tab
- **Assistive/proactive surface:** Teams bot + command/deep-link workflows
- **Identity model:** Entra SSO + OBO for secure downstream access
- **Authorization model:** group/app-role enforcement with least privilege

## Stage 1 contract (Entra + environment wiring)

- `AZURE_AD_*` variables continue to represent the web app registration for
  current standalone + ACA authentication.
- `TEAMS_TAB_AAD_APP_ID` and `TEAMS_API_APPLICATION_ID_URI` describe the Teams
  tab SSO app identity (`webApplicationInfo`) and API resource URI.
- `TEAMS_OBO_CLIENT_ID` and `TEAMS_OBO_CLIENT_SECRET` define the confidential
  app identity used for backend OBO token exchange.
- `TEAMS_SSO_ALLOWED_AUDIENCES` constrains accepted incoming Teams SSO token
  audiences.
- `TEAMS_OBO_SCOPES` limits downstream delegated scopes to a least-privilege set.
- `TEAMS_ALLOWED_ROLES` and `TEAMS_ALLOWED_GROUPS` enforce optional app-role/group
  checks on Teams tab and API entry points.

All of the above are wired through:

- `.env.example`
- `infra/main.bicep` and `infra/modules/container-app.bicep`
- `.github/workflows/deploy-aca.yml`

## Implementation process pointer

The detailed rollout sequence lives in:

- `docs/src/content/docs/platform/microsoft-teams-delivery.md`
- `docs/src/content/docs/project/teams-implementation-process.md`
- `docs/src/content/docs/project/phase-tracker.md`

## Planned artifact shape

As the Teams move progresses, this directory is expected to hold:

## Stage 3 review-path artifact

- `/api/teams/review-path` returns a signed tab deep-link and Adaptive Card payload
  so bot/card flows can hand users into `/tab/explorer` with preserved Dive context.

Environment manifests expect environment-specific placeholder values:

- `TEAMS_<ENV>_APP_ID`
- `TEAMS_<ENV>_BOT_ID`
- `TEAMS_<ENV>_APP_DOMAIN`
- `TEAMS_<ENV>_TAB_AAD_APP_ID`
- `TEAMS_<ENV>_API_APPLICATION_ID_URI`

## Validation gate

Run manifest policy checks locally before packaging:

```bash
npm run teams:validate
```
