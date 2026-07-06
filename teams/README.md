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
