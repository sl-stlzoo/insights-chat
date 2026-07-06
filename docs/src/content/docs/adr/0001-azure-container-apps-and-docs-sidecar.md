---
title: ADR 0001 - Azure Container Apps with docs sidecar
description: Choose a single multi-container ACA app for the runtime target.
---

# ADR 0001: Azure Container Apps with docs sidecar

## Status

Accepted

## Decision

Deploy the Next.js app and the Astro Starlight docs site as **two containers in
one Azure Container App**.

## Why

- Keeps the docs site close to the runtime it describes
- Allows a shared hostname with `/docs` routing
- Avoids managing a second public ingress surface for a small development-scale deployment

## Consequences

- The main app must proxy docs traffic to the sidecar
- Bicep is preferred over a higher-level deploy wrapper for this topology
