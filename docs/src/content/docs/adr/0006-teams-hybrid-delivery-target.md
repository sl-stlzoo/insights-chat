---
title: ADR 0006 - Teams hybrid delivery target
description: Keep the web app deployable now while aligning the architecture to an eventual Teams bot + personal tab experience.
---

# ADR 0006: Teams hybrid delivery target

## Status

Accepted

## Decision

Treat the current Azure Container Apps web app as the **foundation** for an
eventual **single-tenant Microsoft Teams hybrid app** rather than as the final
delivery surface.

## Why

- The updated PRD makes Teams the long-term user entry point
- The personal tab needs a route that can host MotherDuck Dive workspaces
- Teams deep links and SSO constraints affect routing, headers, and auth design

## Consequences

- The app now needs Teams-aware routing and signed tab-state handling
- Documentation and env contracts must include Teams placeholders
- The current app-level Entra auth should remain compatible with a future Teams
  SSO exchange instead of hard-coding a purely browser-first experience
