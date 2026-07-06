---
title: Repository Root
description: Rolled up from ./README.md.
---

> Source: `./README.md`

# Maude - Azure-ready MotherDuck analytics workspace

Maude is a Next.js analytics workspace that connects to MotherDuck through MCP,
uses Microsoft Entra ID for application access, and is being prepared for Azure
Container Apps with a sidecar Astro Starlight documentation site.

## What this repo now targets

- **Primary runtime:** Azure Container Apps
- **Current LLM provider:** OpenAI
- **Future LLM path:** Azure AI Foundry with keyless Entra auth
- **Visualization path:** MotherDuck Dives embedded through secure backend-created embed sessions
- **Docs experience:** Astro Starlight sidecar under `/docs`
- **Future end-user shell:** Microsoft Teams hybrid app (bot + personal tab)

## Key capabilities

- **Entra-protected web app** with app-level auth routes and middleware
- **MotherDuck MCP integration** for schema discovery, SQL execution, and Dive workflows
- **Live Dive embedding** via `app/api/dives/embed-session/route.ts`
- **Teams-ready tab route** at `/tab/explorer`
- **README rollup pipeline** that publishes curated repo docs into the Starlight site
- **Azure infrastructure** expressed as Bicep in `infra/`

## Runtime architecture

```text
Authenticated user
   │
   ▼
Next.js App Router (Container App main container)
   ├─ /api/chat                -> OpenAI-first orchestration + MotherDuck MCP tools
   ├─ /api/dives/embed-session -> Server-only MotherDuck embed session exchange
   ├─ /signin                  -> Entra login
   ├─ /tab/explorer            -> Teams-ready Dive workspace host
   └─ /docs/*                  -> Reverse proxy to Astro Starlight sidecar
                                     │
                                     ▼
                           Astro Starlight docs container

Supporting Azure services
   ├─ Azure Container Registry
   ├─ Azure Key Vault
   ├─ Azure Database for PostgreSQL
   ├─ Application Insights
   └─ Log Analytics
```

## MotherDuck Dive strategy

The repo now distinguishes between two visualization modes:

1. **Shared HTML reports** for lightweight export/share scenarios
2. **MotherDuck Dives** for live, embedded visual workspaces

The deployed app does **not** pretend to host the native MotherDuck Dive Viewer
MCP App. Instead, it:

- creates or updates Dives through MotherDuck MCP tools
- requests short-lived embed sessions on the backend
- renders the live Dive in a sandboxed iframe

That keeps the deployed app compatible with MotherDuck's secure embedding model
while still aligning with the Dive Viewer workflow used in MCP App-capable
clients like Claude.

## Environment contracts

Use the provided examples:

- Root app: [`.env.example`](./.env.example)
- Docs sidecar: [`docs/.env.example`](./docs/.env.example)

The root example is organized by:

- application URLs and session secrets
- Entra auth
- OpenAI
- MotherDuck MCP access
- MotherDuck Dive embedding
- PostgreSQL persistence
- Azure runtime placeholders
- future Azure AI Foundry settings

## Local development

### App

```bash
npm install
npm run db:init
npm run dev
```

### Docs sidecar

```bash
npm run docs:dev
```

### Production builds

```bash
npm run build
npm run docs:build
```

## Azure deployment assets

- **Infrastructure:** `infra/main.bicep`
- **Bicep modules:** `infra/modules/`
- **Web container:** `Dockerfile`
- **Docs container:** `docs/Dockerfile`
- **Azure helper scripts:** `scripts/azure/`
- **Deployment plan:** `.azure/deployment-plan.md`

### Important Azure note

The current target subscription must register `Microsoft.App` before Container
Apps resources can be provisioned. The plan and scripts in this repo account for
that prerequisite.

## Teams trajectory

The attached PRD shifts the eventual end-user experience into Microsoft Teams.
This repo now includes the first pieces of that delivery shape:

- `app/tab/explorer/page.tsx` - personal tab-ready Dive workspace route
- `lib/teams-tab-state.ts` - signed deep-link state token helper
- `teams/manifest.template.json` - starter Teams manifest

The current web deployment remains the near-term execution target, but the app
is now being shaped so Teams bot/tab delivery can layer on without reworking the
core analytics workspace.

## Project structure

```text
.
├── .azure/                      # Azure deployment plan artifact
├── app/                         # Next.js app, API routes, Teams tab route, share pages
├── docs/                        # Astro Starlight sidecar and generated docs pipeline
├── infra/                       # Azure Bicep infrastructure
├── lib/                         # Shared server-side helpers
├── prompts/                     # Prompt assets
├── scripts/                     # Operational helpers, including Azure scripts
├── teams/                       # Teams manifest scaffolding
├── Dockerfile                   # Main app container image
└── .env.example                 # Root environment contract
```
