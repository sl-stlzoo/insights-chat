---
title: Microsoft Teams delivery target
description: Eventual single-tenant Teams bot plus personal tab delivery shape from the updated PRD.
---

# Microsoft Teams delivery target

The updated PRD changes the eventual end-user surface from a standalone web app
to a **hybrid Microsoft Teams application**:

- **Conversational bot** for ad-hoc natural-language queries
- **Personal tab** for high-density visual analysis
- **Adaptive Card deep links** that hand users from chat into a dedicated Dive workspace

## What this means for the current repo

- `/tab/explorer` exists as a Teams-friendly tab route
- A signed state token can carry Dive context into the tab
- The app adds frame-ancestor and frame-src controls for the Teams embed surface
- The provider layer now has a clear path to keyless Azure AI Foundry access

## What is still future-facing

- Microsoft Teams AI SDK bot orchestration
- Azure Bot Service wiring
- Teams Tab SSO-specific token exchange
- Full Adaptive Card deep-link generation and conversation handoff
