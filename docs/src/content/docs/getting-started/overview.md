---
title: Overview
description: What this modernization is delivering and how the docs sidecar is organized.
---

# Overview

This documentation sidecar turns the repository into a working delivery
knowledge base.

## What is included

- **Platform docs** for Azure Container Apps, Entra auth, configuration, and deployment
- **ADRs** that capture the major implementation decisions
- **Phase tracking** so progress stays visible
- **Repository rollups** generated automatically from curated `README.md` files in the codebase
- **Orama search** across the docs corpus

## Expected deployment shape

- The main **Next.js** app runs in Azure Container Apps
- The **Astro Starlight** docs site runs as a sidecar container in the same ACA app
- The main app proxies `/docs` to the docs sidecar

## Documentation workflow

1. Update a subdirectory `README.md`
2. Run `npm run sync:content` inside `docs/`
3. The README is rolled into `src/content/docs/repository/generated/`
4. The Orama search index is regenerated automatically
