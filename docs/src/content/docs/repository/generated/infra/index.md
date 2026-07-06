---
title: Infra
description: Rolled up from infra/README.md.
---

> Source: `infra/README.md`

# Infrastructure

This directory contains the Bicep infrastructure for the Azure Container Apps
deployment target.

## Scope

- Azure Container Apps environment and multi-container app
- Azure Container Registry
- Azure Key Vault and application secrets
- Azure Database for PostgreSQL Flexible Server
- Application Insights and Log Analytics
- Required role assignments for ACR pull and Key Vault secret access

## Deployment notes

- `Microsoft.App` must be registered in the target subscription before the
  Container Apps resources can be provisioned.
- The main app expects a public application URL for Entra redirect handling.
- MotherDuck Dive embedding requires a Business-plan admin token plus a dedicated
  service-account username; both are modeled as secrets.
