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

## GitHub Actions CI/CD (OIDC, recommended)

This repo now includes:

- `.github/workflows/ci.yml` for build + docs + Bicep validation on PR/push
- `.github/workflows/deploy-aca.yml` for secure image build/push and Bicep deploy

Use GitHub OIDC federation (no long-lived Azure secret) with `azure/login`.

### Required GitHub Environment secrets

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

### Required GitHub Environment variables

- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_PREFIX`
- `AZURE_ENVIRONMENT_NAME`
- `ACR_NAME`
- `KEY_VAULT_NAME`
- `PUBLIC_APP_URL`
- `APP_AZURE_AD_TENANT_ID`
- `APP_AZURE_AD_CLIENT_ID`
- `TEAMS_APP_ID` (optional until Teams package promotion)
- `TEAMS_BOT_ID` (optional until bot rollout)
- `TEAMS_TAB_AAD_APP_ID` (defaults to `APP_AZURE_AD_CLIENT_ID` if omitted)
- `TEAMS_API_APPLICATION_ID_URI` (optional runtime override)
- `TEAMS_OBO_CLIENT_ID` (defaults to `APP_AZURE_AD_CLIENT_ID` if omitted)
- `TEAMS_OBO_SCOPES` (for example `User.Read`)
- `TEAMS_SSO_ALLOWED_AUDIENCES` (comma-separated app ID allowlist)
- `MOTHERDUCK_DIVE_SERVICE_ACCOUNT_USERNAME`
- `MOTHERDUCK_ALLOWED_DATABASES` (for example `za_edw_pov`)
- `MOTHERDUCK_DEFAULT_DATABASE` (for example `za_edw_pov`)
- `MOTHERDUCK_METADATA_FILE` (for example `metadata/za_edw_pov.md`)
- `KV_SECRET_AZURE_AD_CLIENT_SECRET` (for example `azure-ad-client-secret`)
- `KV_SECRET_NEXTAUTH_SECRET` (for example `nextauth-secret`)
- `KV_SECRET_OPENAI_API_KEY` (for example `openai-api-key`)
- `KV_SECRET_MOTHERDUCK_TOKEN` (for example `motherduck-token`)
- `KV_SECRET_MOTHERDUCK_DIVE_ADMIN_TOKEN` (for example `motherduck-dive-admin-token`)
- `KV_SECRET_TEAMS_OBO_CLIENT_SECRET` (optional; defaults to `KV_SECRET_AZURE_AD_CLIENT_SECRET`)
- `KV_SECRET_POSTGRES_ADMIN_PASSWORD` (for example `postgres-admin-password`)

### GitHub Environment config guide (what, where, why, how)

Set these at the **GitHub Environment** scope (for example `dev` and `prod`), not hardcoded in workflow files.

- Manage environments: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- Manage environment secrets: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- Manage environment variables: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables

#### A) GitHub Environment Secrets (Azure login only)

| Name | What | Where to source | Why | How to set in GitHub |
|---|---|---|---|---|
| `AZURE_CLIENT_ID` | Client ID of Entra app or user-assigned managed identity used by `azure/login` | Azure OIDC setup output (Client ID) | Identifies workload identity for OIDC token exchange | Environment → Secrets and variables → Actions → New environment secret |
| `AZURE_TENANT_ID` | Microsoft Entra tenant (directory) ID | Azure OIDC setup output (Directory/Tenant ID) | Scopes OIDC login to your tenant | Same as above |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID for deployment target | Azure account/subscription metadata | Tells workflow where to build/deploy | Same as above |

Canonical references:
- GitHub OIDC in Azure: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure
- Azure guide for GitHub OIDC: https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
- Azure Login action (OIDC recommended): https://github.com/Azure/login

#### B) GitHub Environment Variables

| Name | What | Where to source | Why | How to set in GitHub |
|---|---|---|---|---|
| `AZURE_RESOURCE_GROUP` | Target resource group name | Existing Azure RG (for example `rg-maude-dev`) | Scope for ARM/Bicep deployment | Environment → Secrets and variables → Actions → Variables |
| `AZURE_LOCATION` | Azure region (for example `eastus2`) | Deployment plan / target region decision | Regional placement consistency | Same as above |
| `AZURE_PREFIX` | Resource naming prefix | Project naming convention (for example `maude`) | Deterministic infra naming in Bicep | Same as above |
| `AZURE_ENVIRONMENT_NAME` | Environment token (for example `dev`, `prod`) | Deployment environment strategy | Separates environment-specific resources | Same as above |
| `ACR_NAME` | Azure Container Registry name | Deployed ACR resource | Build/push target for images | Same as above |
| `KEY_VAULT_NAME` | Azure Key Vault name | Deployed Key Vault resource | Key Vault reference resolution in deploy workflow | Same as above |
| `PUBLIC_APP_URL` | Canonical HTTPS app URL | Actual ingress host / custom domain | Required for auth callback URL wiring | Same as above |
| `APP_AZURE_AD_TENANT_ID` | App runtime Entra tenant ID | Entra app registration tenant | Runtime auth config (`AZURE_AD_TENANT_ID`) | Same as above |
| `APP_AZURE_AD_CLIENT_ID` | App runtime Entra client ID | Entra app registration | Runtime auth config (`AZURE_AD_CLIENT_ID`) | Same as above |
| `TEAMS_APP_ID` | Teams app package ID | Teams Developer Portal app entry | Runtime + manifest identity wiring | Same as above |
| `TEAMS_BOT_ID` | Teams bot app ID | Bot app registration | Manifest `bots[].botId` contract | Same as above |
| `TEAMS_TAB_AAD_APP_ID` | Teams tab SSO app ID | Entra app registration for Teams tab SSO | Manifest `webApplicationInfo.id` and runtime audience checks | Same as above |
| `TEAMS_API_APPLICATION_ID_URI` | Teams API Application ID URI | Entra "Expose an API" app ID URI | Runtime OBO resource targeting and manifest `webApplicationInfo.resource` | Same as above |
| `TEAMS_OBO_CLIENT_ID` | Confidential app ID for OBO exchange | Entra app registration used by backend | Runtime OBO client identity | Same as above |
| `TEAMS_OBO_SCOPES` | Space-separated delegated scopes | Downstream API least-privilege design (`User.Read`, custom scopes, etc.) | Constrains OBO token exchange privileges | Same as above |
| `TEAMS_SSO_ALLOWED_AUDIENCES` | Comma-separated accepted SSO token audiences | Teams tab/app IDs for the environment | Prevents accepting tokens minted for unrelated audiences | Same as above |
| `MOTHERDUCK_DIVE_SERVICE_ACCOUNT_USERNAME` | MotherDuck service account user for Dive embed sessions | MotherDuck workspace/org setup | Runtime identity for Dive embed-session flow | Same as above |
| `MOTHERDUCK_ALLOWED_DATABASES` | Comma-separated MotherDuck database allowlist | Data access policy for the environment (for example `za_edw_pov`) | API-side guardrail restricting SQL target databases | Same as above |
| `MOTHERDUCK_DEFAULT_DATABASE` | Default MotherDuck database name | Primary runtime database selection (for example `za_edw_pov`) | Prompt context + MCP preflight verification target | Same as above |
| `MOTHERDUCK_METADATA_FILE` | Runtime metadata file path in the web container | Repo-managed metadata path (for example `metadata/za_edw_pov.md`) | Injects business/schema context without hardcoded Eastlake defaults | Same as above |
| `KV_SECRET_AZURE_AD_CLIENT_SECRET` | Key Vault secret name for Entra app secret | Key Vault naming convention | Maps deploy parameter to Key Vault secret | Same as above |
| `KV_SECRET_NEXTAUTH_SECRET` | Key Vault secret name for NextAuth secret | Key Vault naming convention | Maps deploy parameter to Key Vault secret | Same as above |
| `KV_SECRET_OPENAI_API_KEY` | Key Vault secret name for OpenAI key | Key Vault naming convention | Maps deploy parameter to Key Vault secret | Same as above |
| `KV_SECRET_MOTHERDUCK_TOKEN` | Key Vault secret name for MotherDuck token | Key Vault naming convention | Maps deploy parameter to Key Vault secret | Same as above |
| `KV_SECRET_MOTHERDUCK_DIVE_ADMIN_TOKEN` | Key Vault secret name for MotherDuck Dive admin token | Key Vault naming convention | Maps deploy parameter to Key Vault secret | Same as above |
| `KV_SECRET_TEAMS_OBO_CLIENT_SECRET` | Key Vault secret name for Teams OBO confidential-client secret | Key Vault naming convention (or reuse Entra web app secret) | Maps deploy parameter to Key Vault secret for backend OBO exchange | Same as above |
| `KV_SECRET_POSTGRES_ADMIN_PASSWORD` | Key Vault secret name for PostgreSQL admin password | Key Vault naming convention | Maps deploy parameter to Key Vault secret | Same as above |

Operational references:
- Environment variables in workflows (`vars` context): https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables
- Environment protection rules (recommended for `prod`): https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments

### Where and when to provide secrets (Key Vault-first)

Provide runtime secrets **before the first deploy workflow run** by writing them to
Azure Key Vault:

```powershell
.\scripts\azure\set-keyvault-secrets.ps1 -KeyVaultName <your-keyvault-name>
```

This keeps app/runtime secrets in Key Vault and lets GitHub Actions deploy using
Key Vault references instead of storing those secrets in GitHub.

### Production-hardening recommendations

- Use separate GitHub Environments (`dev`, `prod`) with required reviewers.
- Restrict OIDC federated credential subjects per environment/branch.
- Keep deployment permissions scoped to one subscription/resource group per environment.
- Require PR checks from `ci.yml` before allowing `main` merges.

### Important Azure note

The current target subscription must register `Microsoft.App` before Container
Apps resources can be provisioned. The plan and scripts in this repo account for
that prerequisite.

### Cost-aware defaults now included

- Container App scales to zero off-hours and scales up during business hours
  (America/Chicago, 8:00 AM to 8:00 PM) with HTTP + cron scaling rules.
- Monitoring defaults are constrained for lower steady-state cost (workspace
  quota + reduced App Insights sampling).
- PostgreSQL stop/start helper scripts are available under `scripts/azure/` for
  environments that allow scheduled database downtime.

## Teams trajectory

The attached PRD shifts the eventual end-user experience into Microsoft Teams.
This repo now includes the first pieces of that delivery shape:

- `app/tab/explorer/page.tsx` - personal tab-ready Dive workspace route
- `lib/teams-tab-state.ts` - signed deep-link state token helper
- `teams/manifest.template.json` - starter Teams manifest
- `docs/src/content/docs/project/teams-implementation-process.md` - staged implementation sequence and gates

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
