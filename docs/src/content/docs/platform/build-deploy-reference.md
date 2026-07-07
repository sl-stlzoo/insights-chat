---
title: Build and Deploy Reference
description: Reference guide for CI/CD pipelines, post-deploy verification, and environment variables.
---

## ⚙️ Priority 4: Build/Deploy Reference

This document outlines the deployment pipeline for Azure Container Apps (ACA), the required environment variables, and the post-deploy checklist to ensure the system is operating correctly.

### 1. Triggering and Verifying the CI/CD Pipeline
The primary deployment pipeline is located at `.github/workflows/deploy-aca.yml`. 

- **Trigger:** The workflow is triggered automatically on `push` to the `main` branch (for specific paths) or manually via `workflow_dispatch` (GitHub Actions UI).
- **Process:** 
  1. Authenticates with Azure via OIDC.
  2. Builds the `maude-web` (Next.js) and `maude-docs` (Astro) container images using `az acr build`.
  3. Deploys the Bicep template (`infra/main.bicep`) to Azure, passing Key Vault secret references and ACR images.
- **Verification:** Monitor the GitHub Actions tab. The deployment outputs the final FQDN in the "Show deployed URL" step. Check the Azure Portal (Container Apps > Revisions) to ensure the new images successfully pulled and provisioned.

### 2. Post-Deploy Verification Checklist
Run through this 12-item checklist after every major deployment to `prod`:

1.  [ ] **Application Load:** Main Next.js application (`/`) loads without 5xx errors.
2.  [ ] **Authentication:** Login via Microsoft Entra ID works successfully.
3.  [ ] **Session Persistence:** Cookie-based session remains active after a page refresh.
4.  [ ] **Database Connectivity:** MCP `list_databases` tool executes successfully (MotherDuck API is reachable).
5.  [ ] **LLM Orchestration:** Sending a simple query (e.g., "Hello") returns a coherent response via OpenAI.
6.  [ ] **MotherDuck Dive Embedding:** Ask the AI to "chart zoo attendance" and verify the embedded Dive iframe loads securely.
7.  [ ] **Docs Sidecar:** Navigate to `/docs` to ensure the Astro documentation sidecar proxies successfully.
8.  [ ] **Teams Tab (If Pilot/Prod):** Open the app within the Teams client personal tab.
9.  [ ] **Teams SSO (If Pilot/Prod):** Confirm Teams SSO automatically authenticates the user without a separate popup.
10. [ ] **PostgreSQL State:** Confirm that generated reports are saving successfully to the persistent Postgres DB.
11. [ ] **Key Vault Integration:** Confirm that no secrets are hardcoded and all Azure variables resolve via Key Vault references.
12. [ ] **Log Analytics:** Verify application logs and Container App system logs are appearing in Azure Log Analytics Workspace.

### 3. Environment Variable Table & Key File Index

#### Key Variables & Secrets (from `.github/workflows/deploy-aca.yml`)
| Variable / Secret | Description |
|---|---|
| `PUBLIC_APP_URL` | The public base URL for the deployed web app. |
| `APP_AZURE_AD_*` | Entra ID Tenant and Client ID for Web/SSO Auth. |
| `TEAMS_*` | Configuration for Teams Bot, Tab, SSO, and OBO exchanges. |
| `MOTHERDUCK_TOKEN` | Read-only MotherDuck connection token (Key Vault). |
| `MOTHERDUCK_DIVE_ADMIN_TOKEN` | MotherDuck token used specifically to generate Dive embed sessions (Key Vault). |
| `MOTHERDUCK_DIVE_SERVICE_ACCOUNT_USERNAME` | Restricted user context for Dives. |
| `MOTHERDUCK_ALLOWED_DATABASES` | Guardrail allowlist (e.g., `za_edw_pov`). |
| `OPENAI_API_KEY` | Server-side API key for LLM orchestration (Key Vault). |
| `POSTGRES_ADMIN_PASSWORD` | Password for the report storage database (Key Vault). |

#### Key File Index
- `.github/workflows/deploy-aca.yml`: The main CI/CD deployment pipeline.
- `.env.example`: The local development environment contract.
- `infra/main.bicep`: Root infrastructure-as-code template mapping parameters to Azure resources.
- `docs/astro.config.mjs`: Documentation sidecar configuration (note the `base: '/docs'` path).
- `app/api/chat/route.ts`: Core MCP client instantiation and LLM orchestration logic.
- `app/api/dives/embed-session/route.ts`: The endpoint responsible for turning MotherDuck Dives into securely embedded UI components.
