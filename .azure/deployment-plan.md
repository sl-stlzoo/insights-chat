# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-07-02T15:15:13.991-05:00

---

## 1. Project Overview

**Goal:** Modernize `motherduckdb/maude-claude-mcp-demo` from a Vercel-oriented Next.js application into an Azure Container Apps deployment with Microsoft Entra authentication, Key Vault-backed secrets, OpenAI-first model access, a future Azure AI Foundry migration path, a Teams-ready Dive workspace surface, and a sidecar Astro Starlight documentation experience with Orama search.

**Path:** Modernize Existing

**Source repository:** `https://github.com/motherduckdb/maude-claude-mcp-demo`

**Workspace note:** The current workspace contains planning artifacts only. After approval, execution begins by importing the source repository into this workspace with Git metadata preserved so ADRs and commit-linked decisions can be tracked correctly.

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Development |
| Scale | Small (<1K users) |
| Budget | Cost-Optimized |
| **Subscription** | Pay-As-You-Go (`17dd17fe-f814-44bb-828f-c37c07db5a4f`) |
| **Location** | `eastus2` |
| Compliance | No special constraints |
| Entra auth strategy | Create a new app registration for this app |
| MotherDuck access model | Single service-level token stored in Key Vault |
| MotherDuck Dive strategy | Use Dives for live visualization artifacts and embed them in the app via backend-created embed sessions |
| Current AI provider target | OpenAI API key |
| Future AI provider target | Azure AI Foundry with Key Vault-backed configuration |
| Primary region | `eastus2` |
| Fallback regions after provider registration | `eastus`, then `southcentralus` |
| Brand palette | Havelock Blue `#5887DA`, Mulled Wine `#624B78`, Monza `#C10230`, Paarl `#AC4525`, Pirate Gold `#CF8A00`, Sycamore `#8A8C49`, Schooner `#8C837B`, Orient `#00538B` |
| Typography | Meta Pro and Adobe Caslon or accessible fallbacks |

### Policy Constraints

- Subscription scope policy assignments: none returned by `az policy assignment list --subscription 17dd17fe-f814-44bb-828f-c37c07db5a4f --disable-scope-strict-match`.
- Region comparison for `ManagedEnvironmentCount` was checked in `eastus2`, `eastus`, `southcentralus`, `centralus`, and `westus3`; every region currently reports `0` because `Microsoft.App` is **not registered** in the subscription. This is a **subscription registration blocker**, not an East US 2-only capacity issue.

### UX and branding assumptions

- Because the private Canto style guide is not directly fetchable from this environment, the implementation will use the confirmed color palette and typography guidance with tokenized theme variables so final brand assets can be dropped in later without structural refactoring.
- Persona Chat will be used as a reusable chat shell and interaction pattern, not as the full product experience; application-specific conversation logic and MotherDuck workflows remain owned by this codebase.
- Refactoring UI principles will drive spacing, hierarchy, layout density, and interaction clarity.
- The deployed app will not try to impersonate an MCP App host for Dive Viewer. Instead, it will create or update MotherDuck Dives through MCP tools and render them in-app through MotherDuck's embedded Dive flow.
- The current web app should remain deployable as a standalone experience while staying compatible with an eventual Microsoft Teams hybrid delivery model (bot + personal tab).

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| Main application shell | Frontend + SSR web app | Next.js 14, React 18, TypeScript | `app/`, `app/page.tsx`, `app/components/ChatInterface.tsx` |
| Chat orchestration API | Backend route | Next.js route handlers, SSE streaming, Anthropic SDK against OpenRouter | `app/api/chat/route.ts` |
| MotherDuck integration | Data access client | MCP SDK over HTTP | `lib/mcp-client.ts` |
| Shared report storage | Relational persistence | PostgreSQL client (`pg`) | `lib/planetscale.ts`, `scripts/init-db.ts` |
| Prompt library | Prompt/content assets | Markdown | `prompts/` |
| Existing deployment posture | Hosting baseline | Vercel-oriented app with environment-variable secrets | `README.md`, `.env.example` |

### Gaps to address during execution

- Replace the current OpenRouter/Anthropic wiring with an OpenAI-first provider abstraction that leaves a clean Azure AI Foundry adapter seam.
- Introduce app-level Entra authentication for the Next.js app.
- Replace external-hosting assumptions with Azure Container Apps, ACR, Key Vault, App Insights, and Azure Database for PostgreSQL.
- Add an Astro Starlight docs sidecar with Orama search, ADRs, phase tracking, and generated README rollups.
- Adapt the visualization path to use MotherDuck Dives and embedded live previews rather than relying only on saved HTML report iframes.

---

## 4. Recipe Selection

**Selected:** Bicep

**Rationale:**

- The target architecture requires a **single Azure Container App with multiple containers**: a primary Next.js web container and a docs sidecar container.
- This design needs fine-grained control over `template.containers`, ingress target port selection, secret references, managed identity, and container-level environment wiring.
- Direct Bicep keeps the multi-container ACA definition explicit and avoids forcing the docs site into a separate deployable service just to fit a higher-level wrapper.
- Azure deployment execution can still be automated later through the Azure validation/deploy workflow using `az deployment` plus image build/push steps.

---

## 5. Architecture

**Stack:** Containers

### Service Mapping

| Component | Azure Service | SKU / Shape |
|-----------|---------------|-------------|
| Next.js web app + API routes | Azure Container Apps | Single app, external ingress, main container target port `3000`, min replicas `1` |
| Astro Starlight docs sidecar | Additional container in the same Azure Container App | Internal sidecar on port `4321`, reverse-proxied from `/docs` |
| Container images | Azure Container Registry | Basic |
| Shared reports relational store | Azure Database for PostgreSQL Flexible Server | Burstable (`B1ms`) |
| Secrets | Azure Key Vault | Standard |
| Telemetry | Application Insights (workspace-based) | Standard service defaults |
| Centralized logs | Log Analytics Workspace | Pay-as-you-go |
| Identity for Azure resources | System-assigned managed identity on the Container App | N/A |
| User authentication | Microsoft Entra ID + new app registration | OIDC via app-level auth |
| Dive embedding backend | Next.js route + MotherDuck embed session API | Uses admin token + dedicated service account username |
| Teams personal tab surface | Next.js route (`/tab/explorer`) | Teams-ready iframe host for Dive workspaces |

### Architecture decisions

- **Docs sidecar shape:** The docs site will run as a true sidecar container in the same Container App. The main web container will proxy `/docs` traffic to the sidecar over the shared pod network, because ACA ingress is app-wide with a single target port.
- **Authentication approach:** Use app-level Entra authentication in the Next.js app so auth works consistently in local development and Azure, while still using tenant-backed identity and future extensibility.
- **Secrets model:** Local development will use `.env.local`; Azure will use Key Vault-backed secrets and ACA secret references wherever possible.
- **AI provider migration path:** Execution will introduce a provider abstraction with OpenAI as the current implementation and a dormant Azure AI Foundry adapter plus environment contract for a future cutover.
- **Docs platform:** Add an Astro Starlight site with a custom Orama search component and a build-time README rollup so subdirectory `README.md` files become first-class docs content automatically.
- **Decision tracking:** Create ADR documents for major architecture choices and maintain a phase tracker section inside the docs site so implementation progress is captured alongside technical context.
- **Region strategy:** Keep `eastus2` as the primary target because it aligns well with future Azure AI Foundry availability. If East US 2 still lacks `ManagedEnvironmentCount >= 1` after provider registration, recheck `eastus` next, then `southcentralus`.
- **Dive integration strategy:** Use MotherDuck MCP tools such as `save_dive`, `update_dive`, `list_dives`, and `share_dive_data` for persisted visualizations. For the deployed app, render those Dives through MotherDuck embed sessions created on the backend using a dedicated service account; this gives the app a live, production-safe equivalent of the Dive Viewer experience.
- **Teams delivery strategy:** Keep the web deployment as the near-term execution target, but shape routing, headers, env vars, and auth contracts so a Teams bot + personal tab experience can layer on without reworking the core Dive workspace.

### Supporting Services

| Service | Purpose |
|---------|---------|
| Log Analytics | Centralized logging for ACA and supporting resources |
| Application Insights | Request tracing, exceptions, latency, and dependency telemetry |
| Key Vault | Secure storage for OpenAI key, MotherDuck token, and auth secrets |
| Managed Identity | Secretless access from ACA to Key Vault and Azure services |
| Azure Container Registry | Image storage for the web and docs containers |
| Azure Database for PostgreSQL | Shared report persistence |
| MotherDuck service account | Execution identity for embedded Dive sessions |

---

## 6. Provisioning Limit Checklist

**Purpose:** Validate that the selected subscription and region have sufficient quota/capacity for all planned resources.

### Phase 1: Prepare Resource Inventory

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| `Microsoft.App/managedEnvironments` | 1 | 1 | **0 currently** | Fetched from `azure-quotas` via `ManagedEnvironmentCount` in `eastus2`. The subscription currently reports zero capacity because `Microsoft.App` is **NotRegistered**. Official guidance in the Azure prep references expects 50 per region after the provider is registered, but the current deployable state is blocked until registration and re-check. |
| `Microsoft.App/containerApps` | 1 | 1 | 500 apps per environment | Fetched from official Azure Container Apps limits documentation. Current regional count is 0. This limit is only usable after a managed environment quota is available. |
| `Microsoft.ContainerRegistry/registries` | 1 | 1 | 800 per resource group | Fetched from Azure Resource Manager resource-group per-resource-type limit. Current regional count is 0. |
| `Microsoft.KeyVault/vaults` | 1 | 1 | 800 per resource group | Fetched from Azure Resource Manager resource-group per-resource-type limit. Current regional count is 0. |
| `Microsoft.OperationalInsights/workspaces` | 1 | 1 | 800 per resource group | Fetched from Azure Resource Manager resource-group per-resource-type limit. Current regional count is 0. |
| `Microsoft.Insights/components` | 1 | 1 | 800 per resource group | Fetched from Azure Resource Manager resource-group per-resource-type limit. Current regional count is 0. |
| `Microsoft.DBforPostgreSQL/flexibleServers` | 1 | 1 | 800 per resource group | Fetched from Azure Resource Manager resource-group per-resource-type limit. Current regional count is 0. |

### Phase 2: Fetch Quotas and Validate Capacity

- Azure CLI quota checks completed for the selected subscription and region.
- `Microsoft.App` is the only current **hard blocker** because the subscription is not yet registered for that provider and therefore reports `ManagedEnvironmentCount = 0` in every tested candidate region, including `eastus2`, `eastus`, `southcentralus`, `centralus`, and `westus3`.
- All other planned resource types currently show **0 existing regional instances** and fit comfortably inside conservative documented limits for a single-resource deployment.

### Microsoft.App blocker resolution

1. Register the `Microsoft.App` resource provider at the subscription scope.
2. Wait until `az provider show --namespace Microsoft.App --query registrationState -o tsv` returns `Registered`.
3. Re-run `ManagedEnvironmentCount` checks for `eastus2`, `eastus`, and `southcentralus`.
4. Proceed in the first region that returns `ManagedEnvironmentCount >= 1`, keeping `eastus2` as the preferred target if it becomes available.
5. If all three regions still return `0`, stop execution and either request support help from Azure or choose a different subscription with Container Apps capacity enabled.

**Status:** ❌ Insufficient capacity in the current state for Azure Container Apps until `Microsoft.App` is registered and the quota is rechecked. Changing regions **before** provider registration will not resolve the blocker.

---

## 7. Execution Checklist

### Phase 1: Planning
- [x] Analyze workspace
- [x] Gather requirements
- [x] Confirm subscription and location with user
- [x] Prepare resource inventory
- [x] Fetch quotas and validate capacity
- [x] Scan codebase
- [x] Select recipe
- [x] Plan architecture
- [x] **User approved this plan**

### Phase 2: Execution
- [x] Import the source repository into this workspace with Git history preserved
- [ ] Register the `Microsoft.App` provider in the target subscription after explicit user approval, wait for `Registered`, then re-run the Container Apps quota check in `eastus2`, `eastus`, and `southcentralus`
- [x] Add Bicep infrastructure for ACA, ACR, Key Vault, App Insights, Log Analytics, PostgreSQL Flexible Server, and RBAC
- [x] Add Docker build assets for the main app container and docs sidecar container
- [x] Refactor AI provider wiring to support OpenAI now and Azure AI Foundry later
- [x] Add Entra auth to the Next.js app using the new app registration
- [x] Integrate Persona-based chat shell patterns with tokenized Saint Louis Zoo theming
- [x] Create the Astro Starlight docs site with Orama search
- [x] Add ADRs, README rollup generation, and phase-tracker content
- [x] Generate secure `.env.example` files with grouped variables and strong comments
- [x] **⛔ Update plan status to "Ready for Validation"** before invoking `azure-validate`

### Phase 3: Validation
- [x] Invoke `azure-validate`
- [x] All validation checks pass
  - [x] Bicep compilation (`az bicep build --file .\infra\main.bicep`)
  - [x] Template validation (`az deployment group validate --subscription 17dd17fe-f814-44bb-828f-c37c07db5a4f --resource-group DefaultResourceGroup-EUS --template-file .\infra\main.bicep ...`)
  - [x] What-if preview (`az deployment group what-if --subscription 17dd17fe-f814-44bb-828f-c37c07db5a4f --resource-group DefaultResourceGroup-EUS --template-file .\infra\main.bicep ...`)
  - [x] Azure auth context (`az account show --subscription 17dd17fe-f814-44bb-828f-c37c07db5a4f`)
  - [x] Application build (`npm run build`)
  - [x] Docs sidecar build (`npm run docs:build`)
  - [x] Bicep lint (`az bicep lint --file .\infra\main.bicep`)
  - [x] Static RBAC review (Key Vault Secrets User + AcrPull assignments scoped to resource level in `infra/main.bicep`)
- [x] Update plan status to `Validated`

### Phase 4: Deployment
- [ ] Invoke `azure-deploy`
- [ ] Deployment successful
- [ ] Report deployed endpoint URLs
- [ ] Update plan status to `Deployed`

---

## 8. Validation Proof

| Check | Command Run | Result | Timestamp |
|-------|-------------|--------|-----------|
| Azure auth context | `az account show --subscription 17dd17fe-f814-44bb-828f-c37c07db5a4f --query "{name:name,id:id,tenantId:tenantId}" -o json` | ✅ Returned `Pay-As-You-Go` / `b0153149-2345-4840-b1a8-ffc44fdf72c3` | 2026-07-02T15:55:09.7974808-05:00 |
| Bicep compilation | `az bicep build --file .\infra\main.bicep` | ✅ Passed | 2026-07-02T15:53:00-05:00 |
| Bicep lint | `az bicep lint --file C:\Users\stephen\Documents\GH-Dev\md_zoo_maude\infra\main.bicep` | ✅ Passed with one non-blocking naming warning (BCP334) | 2026-07-02T15:53:00-05:00 |
| Template validation | `az deployment group validate --subscription 17dd17fe-f814-44bb-828f-c37c07db5a4f --resource-group DefaultResourceGroup-EUS --template-file .\infra\main.bicep --parameters ...` | ✅ Passed using placeholder secret values against an existing validation resource group | 2026-07-02T15:53:00-05:00 |
| What-if preview | `az deployment group what-if --subscription 17dd17fe-f814-44bb-828f-c37c07db5a4f --resource-group DefaultResourceGroup-EUS --template-file .\infra\main.bicep --parameters ...` | ✅ Passed; 17 resources to create, 1 ignored workspace | 2026-07-02T15:53:00-05:00 |
| Application build | `npm run build` | ✅ Passed | 2026-07-02T15:52:00-05:00 |
| Docs sidecar build | `npm run docs:build` | ✅ Passed | 2026-07-02T15:53:33-05:00 |
| Static RBAC review | `rg "roleAssignments|4633458b-17de-408a-b874-0445c86b69e6|7f951dda-4ed3-4680-a7ca-43fe172d538d" infra\main.bicep` | ✅ Verified resource-scoped Key Vault Secrets User and AcrPull assignments | 2026-07-02T15:55:09.7974808-05:00 |

**Validated by:** azure-validate skill
**Validation timestamp:** 2026-07-02T15:55:09.7974808-05:00

---

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | Azure preparation source of truth | ✅ |
| `infra/main.bicep` | Main Azure infrastructure deployment | ✅ |
| `infra/modules/*.bicep` | Resource modules for ACA, ACR, Key Vault, PostgreSQL, monitoring, and RBAC | ✅ |
| `Dockerfile` | Main Next.js production container | ✅ |
| `docs/Dockerfile` | Astro Starlight sidecar container | ✅ |
| `docs/` | Documentation site, ADRs, phase tracker, and Starlight config | ✅ |
| `scripts/docs/*` | README rollup and Orama indexing helpers | ✅ |
| `.env.example` | Root environment contract with secure comments and future Foundry path | ✅ |
| `docs/.env.example` | Docs-side environment contract for Orama/search-related settings | ✅ |
| `app/api/dives/embed-session/route.ts` | Secure MotherDuck embed-session exchange for live Dive previews | ✅ |
| `app/components/DiveFrame.tsx` | Inline embedded Dive renderer for the deployed app | ✅ |
| `app/tab/explorer/page.tsx` | Teams-ready personal tab workspace host | ✅ |
| `teams/manifest.template.json` | Teams app manifest starter for the eventual hybrid delivery shape | ✅ |
| `README.md` updates | Root project instructions for Azure deployment and local development | ✅ |
| `*/README.md` updates | Subdirectory-level operational and architectural documentation | ✅ |

---

## 10. Next Steps

> Current: deployment in progress (control-plane gates mostly cleared)

1. Push the Dockerfile fix (`mkdir -p public`) so GitHub Actions can build the `maude-web` image from `main`.
2. Re-run `Deploy Azure Container Apps` for `dev` and verify both `build-and-push` and `deploy` jobs complete.
3. Validate `https://<aca-fqdn>/` and `https://<aca-fqdn>/docs` after the deploy job updates image tags.
4. Promote with the same workflow to `prod` behind the existing environment approval gate.

## 11. Deployment Gate Tracker (Live)

| Gate | Status | Evidence |
|------|--------|----------|
| GitHub Environments (`dev`, `prod`) with required reviewer protection | ✅ Complete | Environments created and approvals are being enforced during workflow runs |
| Branch protection requires CI on `main` | ✅ Complete | `build-and-validate` required status check is active |
| OIDC federation for deploy identity | ✅ Complete | Federated credentials created for `repo:sl-stlzoo/insights-chat:environment:dev` and `...:prod` |
| RBAC for deploy identity | ✅ Complete | Reader at subscription, Contributor + User Access Administrator at `rg-maude-dev`, and AcrPush at `maudedevacr` |
| Dev workflow Azure login | ✅ Complete | `Azure login (OIDC)` step now passes in run `28811115950` |
| Dev workflow image build | ✅ Complete | `build-and-push` succeeded in run `28811332456` (web + docs images pushed to ACR) |
| Dev workflow deploy + endpoint verification | ⚠️ Blocked (fix prepared) | Key Vault ARM-reference failure is resolved; latest deploy run `28812218231` now fails on Log Analytics `RetentionInDays` SKU limits, and retention defaults were updated to `30` days pending rerun |
