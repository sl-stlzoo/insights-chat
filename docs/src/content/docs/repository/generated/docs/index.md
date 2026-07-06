---
title: Docs
description: Rolled up from docs/README.md.
---

> Source: `docs/README.md`

# Documentation Sidecar

This package builds the Astro Starlight documentation site that will run as the
docs sidecar for the main Azure Container Apps deployment.

## Responsibilities

- Publish architectural guidance, ADRs, and delivery notes
- Surface the live phase tracker for this modernization effort
- Roll up repository `README.md` files into the docs navigation automatically
- Provide Orama-backed client-side search for the generated docs corpus

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install Astro, Starlight, React, and Orama dependencies |
| `npm run sync:content` | Regenerate rolled-up README pages and the search index |
| `npm run dev` | Sync generated content, then run the docs dev server |
| `npm run build` | Sync generated content, then build the static docs site |
| `npm run check` | Run Astro type/content checks after syncing content |

## Generated Content

The `scripts/sync-readmes.mjs` script scans the repository for curated
subdirectory `README.md` files and emits generated docs pages under
`src/content/docs/repository/generated/`. It also creates
`src/generated/search-index.json` for the Orama search experience.
