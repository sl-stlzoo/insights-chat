---
title: ADR 0005 - Embedded Dives for live visualizations
description: Use MotherDuck Dives plus embed sessions for deployed-app visual previews.
---

# ADR 0005: Embedded Dives for live visualizations

## Status

Accepted

## Decision

For the deployed web app, use **MotherDuck Dives** as the persistent
visualization artifact and render them with **embed sessions** in a sandboxed
iframe.

## Why

- The full **Dive Viewer MCP App** is native to MCP App-capable clients such as
  Claude, not to arbitrary custom web apps.
- Embedded Dives still run against live data and give users an in-app preview.
- MotherDuck already provides the backend API and session model for secure
  embedding.

## Consequences

- The backend must hold an admin-capable MotherDuck token and a dedicated
  service-account username for embed-session creation.
- The frontend must handle sandboxed iframe postMessage events for safe link
  navigation and related behaviors.
