---
title: Azure Container Apps target
description: Planned runtime topology for the Azure deployment.
---

# Azure Container Apps target

The Azure target is a **single multi-container Container App**:

- **Primary container:** Next.js application and API routes
- **Sidecar container:** Astro Starlight static docs site
- **Ingress target:** the main web container
- **Docs pathing:** `/docs` proxied to the sidecar over the shared pod network

## Supporting services

- Azure Container Registry
- Azure Key Vault
- Azure Database for PostgreSQL Flexible Server
- Application Insights
- Log Analytics
- Microsoft Entra ID app registration
- MotherDuck embed-session backend exchange for live Dives

## Current Azure blocker

The subscription currently reports `ManagedEnvironmentCount = 0` because
`Microsoft.App` is not yet registered. Region switching alone does not resolve
this; the provider must be registered before quota is rechecked.

## Dive adaptation

The deployed app will **persist visualizations as MotherDuck Dives** and render
them through MotherDuck's embed-session flow. That gives the app a live-data
experience that aligns with the Dive Viewer workflow, while staying compatible
with a custom web client that is not itself an MCP App host.
