---
title: ADR 0002 - App-level Entra auth
description: Use application-managed OIDC instead of platform-only easy auth.
---

# ADR 0002: App-level Entra auth

## Status

Accepted

## Decision

Use **app-level Microsoft Entra authentication** in Next.js instead of relying
solely on platform-level auth enforcement.

## Why

- Keeps local development and production behavior aligned
- Gives the app explicit control over protected routes and user context
- Makes the sign-in experience easier to theme and document

## Consequences

- The app must own auth middleware and session handling
- Entra app registration settings become part of the application contract
