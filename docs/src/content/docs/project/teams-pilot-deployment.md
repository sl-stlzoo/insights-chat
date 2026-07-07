---
title: Teams Pilot Deployment & Rollout
description: Guide for deploying, sideloading, and managing the Teams Pilot program.
---

## 🔵 Priority 3: Teams Pilot Deployment

This document outlines the state of the Microsoft Teams delivery implementation, how to test it locally (sideloading), and the criteria for promoting the app from Pilot to Production.

### 1. Implementation Status (Built vs. Missing)
Based on the Teams Implementation Process PRD:

- **Built (T1 - In Progress):**
  - Stage 1 identity and architecture baseline.
  - Tab app registration and initial Entra ID configuration.
  - Basic Teams manifest skeleton.
- **Missing / Planned (T2-T10):**
  - **T2-T4 (Token & Manifest Plane):** Full SSO token exchange and backend OBO flow are not yet hardened. Env-specific manifests (`dev`, `pilot`, `prod`) need final validation.
  - **T5-T7 (Product Surface):** Tab UX hardening for Teams iframes (deterministic loading, Fluent controls), bot command surface, and deep-link handoffs.
  - **T8-T10 (Delivery & Rollout):** GitHub Actions package build/publish, Teams-specific telemetry (sign-in failures, OBO failures), and the Pilot Rollout program.

### 2. Dev Sideload Testing Steps
To verify the application in the Teams client during development:

1. **Package the Manifest:**
   Ensure the `teams/manifest.dev.json`, along with the app icons (color and outline), are zipped into an app package (e.g., `appPackage.dev.zip`).
2. **Enable Custom Apps in Teams:**
   Ensure your Teams tenant allows uploading custom apps (checked via the Teams Admin Center).
3. **Sideload the App:**
   - Open Microsoft Teams.
   - Go to **Apps** > **Manage your apps** > **Upload an app** > **Upload a custom app**.
   - Select the `appPackage.dev.zip` file.
4. **Verification Checklist:**
   - [ ] The app installs without manifest validation errors.
   - [ ] The Personal Tab loads the application UI correctly (no blank white screens or framing errors).
   - [ ] SSO triggers successfully (no login loops or continuous consent prompts).

### 3. Pilot Program Onboarding & Promotion Gates
Before rolling out to Production (GA), the app must successfully complete a Pilot phase.

**Onboarding Sequence:**
1. Invite a controlled group of power-users and stakeholders to the Teams Pilot group.
2. Distribute the Pilot app package to these users or assign it via Teams Admin policies.
3. Monitor daily usage, telemetry, and error rates.

**Promotion Gate Thresholds (Pilot to GA):**
To pass the Pilot phase, the system must meet or exceed the following metrics over a 14-day trailing period:
- **Task Success Rate:** >= 85% (Users complete their query/visualization workflows successfully).
- **P95 Latency:** < 8 seconds (From query submission to visualization render).
- **Auth Correctness:** >= 98% (Successful SSO/OBO token exchanges with zero critical authorization bypass incidents).
