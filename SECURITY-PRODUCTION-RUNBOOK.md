# Production Security Checklist & Runbook

This runbook outlines the critical security considerations and actionable next steps required to safely transition the Insights Chat Teams application from a local development/preview state to a production environment.

## 1. Identity & Access Management (Entra ID)
*Current State: Using Entra ID SSO and On-Behalf-Of (OBO) flow with client secrets.*

- [ ] **Transition to Managed Identities:** Replace the usage of Entra Client Secrets in Azure with [Managed Identities](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview). Azure Container Apps should authenticate to Azure Key Vault using a System-Assigned or User-Assigned Managed Identity.
- [ ] **Publisher Verification:** Complete [Publisher Verification](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview) for your Entra App Registration to remove the "unverified" warning during user consent and comply with Teams Store policies.
- [ ] **Enforce Least Privilege:** Audit the `TEAMS_OBO_SCOPES` and Entra API permissions. Ensure the app only requests the bare minimum scopes required (e.g., `User.Read`).
- [ ] **Implement App Roles / Group Restrictions:** Update the `TEAMS_ALLOWED_ROLES` and `TEAMS_ALLOWED_GROUPS` environment variables (and Entra Enterprise App properties) to restrict application access to authorized Zoo personnel.
- [ ] **Review Conditional Access:** Ensure your tenant's [Conditional Access policies](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview) (e.g., MFA enforcement, device compliance) apply to this App Registration.

## 2. Secrets & Configuration Management
*Current State: Secrets stored in Azure Key Vault, mapped via Bicep parameters.*

- [ ] **Key Vault Network Isolation:** Restrict access to the Azure Key Vault. Disable public network access and use [Azure Private Link / Private Endpoints](https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service) to ensure only your Container App environment and CI/CD runners can access the vault.
- [ ] **Secret Rotation Policy:** Establish an automated or documented manual rotation schedule for the MotherDuck tokens, OpenAI API keys, and Postgres connection strings. 
- [ ] **Remove Local Secrets:** Ensure `.env.local` is fully added to `.gitignore` and never committed. (Already verified, but continuous monitoring is required).

## 3. Network & Infrastructure Security (Azure Container Apps)
*Current State: Publicly accessible Azure Container App over HTTPS.*

- [ ] **Restrict Ingress Traffic:** If the app is only used within Teams, consider restricting ingress traffic. While Teams requires a public endpoint for the manifest, you can place [Azure Front Door with a Web Application Firewall (WAF)](https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/afds-overview) in front of the Container App to filter malicious traffic and enforce rate limiting.
- [ ] **VNet Integration:** If the application needs to communicate with internal on-premises Zoo resources or private databases, deploy the Azure Container App into a [custom Virtual Network (VNet)](https://learn.microsoft.com/en-us/azure/container-apps/vnet-custom).

## 4. Teams App & Manifest Security
*Current State: Sideloaded dev package using a Dev Tunnels URL.*

- [ ] **Update Valid Domains:** Ensure the `validDomains` array in `teams/manifest.prod.json` strictly contains only your production Azure Container App domain (and optionally Azure Front Door domain). Do not use wildcards (`*.azurecontainerapps.io`).
- [ ] **Content Security Policy (CSP):** Ensure the Next.js `middleware.ts` or `next.config.js` enforces strict CSP headers, particularly `frame-ancestors teams.microsoft.com *.teams.microsoft.com *.skype.com` to prevent clickjacking outside of Teams.
- [ ] **Publish to Org Catalog:** Submit the finalized production app package directly to the [Teams Admin Center Org Catalog](https://learn.microsoft.com/en-us/microsoftteams/manage-apps) rather than relying on sideloading policies.

## 5. Data & AI Security
*Current State: MotherDuck for analytics, OpenAI for orchestration.*

- [ ] **MotherDuck Service Account:** Ensure `MOTHERDUCK_DIVE_SERVICE_ACCOUNT_USERNAME` has strictly **read-only** access to the targeted reporting databases (`za_edw_pov`). It should not have `DROP`, `CREATE`, or `INSERT` privileges.
- [ ] **AI Prompt Injection Guardrails:** Since the app uses LLMs to interpret user chat into queries, evaluate implementing [Azure AI Content Safety](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview) or strict input validation to detect and mitigate prompt injection attacks.
- [ ] **Data Residency & Logging:** Confirm that the OpenAI API configuration (or Azure OpenAI Foundry) is set to zero-data retention if processing sensitive internal data, ensuring Microsoft/OpenAI does not use your chat logs to train models.

---
*References:*
* [Microsoft Teams Security Guide](https://learn.microsoft.com/en-us/microsoftteams/teams-security-guide)
* [Azure Container Apps Security Baseline](https://learn.microsoft.com/en-us/security/benchmark/azure/baselines/azure-container-apps-security-baseline)
* [Securing Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/security-features)