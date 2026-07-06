# Azure Scripts

These scripts support the Azure Container Apps deployment workflow around the
infrastructure modules in `infra/`.

## Suggested order

1. `register-providers.ps1` - register required Azure resource providers
2. `create-entra-app.ps1` - create the Microsoft Entra web app registration and client secret
3. `set-keyvault-secrets.ps1` - write runtime secrets directly into Azure Key Vault
4. `build-and-push-images.ps1` - publish the web and docs images to Azure Container Registry
5. Deploy `infra/main.bicep`
6. (Optional, cost optimization) schedule `postgres-start.ps1` and `postgres-stop.ps1` for business-hour usage only

## Notes

- The Entra script is meant for the web app registration only
- MotherDuck embed-session tokens must stay server-side
- Container Apps quota should be rechecked after `Microsoft.App` registration
- PostgreSQL stop/start is best for non-production or agreed maintenance windows
- For sustainable delivery, prefer GitHub Actions OIDC workflows in
  `.github/workflows/deploy-aca.yml` over manual shell-driven deployments.
- Preferred secret flow:
  - Humans set app/runtime secrets in Key Vault (step 3)
  - GitHub Actions deploy reads those secrets using ARM Key Vault references
  - Avoid storing application secrets in GitHub when Key Vault is available

## Secret retrieval guide for `set-keyvault-secrets.ps1`

Use this section to gather each required secret before running:

```powershell
.\set-keyvault-secrets.ps1 -KeyVaultName <your-key-vault-name>
```

All secrets should be captured and stored in **Azure Key Vault** only.

### 1) Azure AD client secret (`azure-ad-client-secret`)

- **What:** Confidential client secret for the Microsoft Entra app registration used by NextAuth.
- **Where to get it:** Microsoft Entra admin center → App registrations → your app → Certificates and secrets → New client secret.
- **Why:** Server-side OAuth token exchange for Entra sign-in.
- **How:** Create new secret, copy the value immediately, then write it to Key Vault.
- **Canonical references:**
  - App registration quickstart: https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
  - Add/manage credentials: https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials

### 2) NextAuth secret (`nextauth-secret`)

- **What:** High-entropy secret used by NextAuth/Auth.js to sign/encrypt auth state.
- **Where to get it:** Generate locally (recommended via Auth.js CLI) and store in Key Vault.
- **Why:** Protects session/JWT integrity and auth token hashing.
- **How:** Run `npx auth secret` (or generate equivalent random value), then write to Key Vault.
- **Canonical references:**
  - NextAuth `NEXTAUTH_SECRET` option: https://next-auth.js.org/configuration/options#secret

### 3) OpenAI API key (`openai-api-key`)

- **What:** API key for OpenAI model access used by the app runtime.
- **Where to get it:** OpenAI platform API keys page.
- **Why:** Authenticates server-side calls to OpenAI.
- **How:** Create key in OpenAI dashboard, copy once, then write to Key Vault.
- **Canonical references:**
  - OpenAI API quickstart and key creation: https://developers.openai.com/api/docs/quickstart
  - API keys page: https://platform.openai.com/api-keys

### 4) MotherDuck token (`motherduck-token`)

- **What:** MotherDuck auth token used by server-side MCP workflows.
- **Where to get it:** MotherDuck account/admin token interface (token-based auth path for MCP).
- **Why:** Enables the app backend to run MCP-driven database workflows securely.
- **How:** Create token with least required permissions, then write to Key Vault.
- **Canonical references:**
  - MotherDuck MCP server and auth setup: https://motherduck.com/docs/sql-reference/mcp/
  - MCP connection setup (OAuth and token-based paths): https://motherduck.com/docs/key-tasks/ai-and-motherduck/mcp-setup/
  - Read-only token strategy guidance: https://motherduck.com/docs/key-tasks/ai-and-motherduck/securing-read-only-access/

### 5) MotherDuck Dive admin token (`motherduck-dive-admin-token`)

- **What:** MotherDuck token with permissions required to create/embed Dive sessions for the app.
- **Where to get it:** MotherDuck token management (admin-capable token in your org/workspace context).
- **Why:** Backend route creates short-lived embed sessions for live Dive rendering.
- **How:** Issue a dedicated token for Dive embedding workflows (prefer separate token from general query token), then write to Key Vault.
- **Canonical references:**
  - Dives workflow and embedding context: https://motherduck.com/docs/key-tasks/ai-and-motherduck/dives/
  - MotherDuck MCP capabilities (includes Dive tooling): https://motherduck.com/docs/sql-reference/mcp/

### 6) PostgreSQL admin password (`postgres-admin-password`)

- **What:** Administrator password for Azure Database for PostgreSQL Flexible Server.
- **Where to get it:** During server creation or via password reset flow in Azure.
- **Why:** Required for DB bootstrap/admin access and connection string construction.
- **How:** Set or reset a strong password, then store in Key Vault.
- **Canonical references:**
  - Flexible Server quickstart: https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/quickstart-create-server
  - Reset admin password: https://learn.microsoft.com/en-us/azure/postgresql/security/security-reset-admin-password

## Secure handling requirements

- Never commit secrets to git.
- Never paste secrets into workflow YAML.
- Prefer Key Vault storage and reference-based deployment parameters.
- Rotate any secret immediately if exposed in terminal history, logs, or screenshots.

## GitHub Environment Secrets and Variables (CI/CD inputs)

The deploy workflow reads configuration from **GitHub Environments**:

- Environment management: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- Environment secrets: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- Environment variables: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables

### Secrets (Azure login only)

Set these as GitHub Environment **Secrets**:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Source and purpose:

- These come from Azure workload identity/OIDC setup for GitHub Actions.
- They are used only by `azure/login` for federated authentication.

Canonical references:

- GitHub OIDC in Azure: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure
- Azure OIDC setup from GitHub: https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
- Azure Login action: https://github.com/Azure/login

### Variables (deployment/runtime mapping)

Set these as GitHub Environment **Variables**:

- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_PREFIX`
- `AZURE_ENVIRONMENT_NAME`
- `ACR_NAME`
- `KEY_VAULT_NAME`
- `PUBLIC_APP_URL`
- `APP_AZURE_AD_TENANT_ID`
- `APP_AZURE_AD_CLIENT_ID`
- `MOTHERDUCK_DIVE_SERVICE_ACCOUNT_USERNAME`
- `MOTHERDUCK_ALLOWED_DATABASES`
- `MOTHERDUCK_DEFAULT_DATABASE`
- `MOTHERDUCK_METADATA_FILE`
- `KV_SECRET_AZURE_AD_CLIENT_SECRET`
- `KV_SECRET_NEXTAUTH_SECRET`
- `KV_SECRET_OPENAI_API_KEY`
- `KV_SECRET_MOTHERDUCK_TOKEN`
- `KV_SECRET_MOTHERDUCK_DIVE_ADMIN_TOKEN`
- `KV_SECRET_POSTGRES_ADMIN_PASSWORD`

Where they come from:

- Azure resource names/region from deployed infra plan and resources.
- Entra IDs from app registration.
- MotherDuck service account username from your MotherDuck workspace setup.
- MotherDuck database scope variables from your environment-specific data access policy and metadata file location.
- `KV_SECRET_*` values are Key Vault **secret names** (not secret values).

For full field-by-field what/where/why/how guidance, use the root
`README.md` section **"GitHub Environment config guide (what, where, why, how)"**.
