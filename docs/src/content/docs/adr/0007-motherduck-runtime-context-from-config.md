---
title: ADR 0007 - MotherDuck runtime context from config
description: Replace Eastlake demo assumptions with environment-driven database scope, metadata pathing, and startup preflight checks.
---

# ADR 0007: MotherDuck runtime context from config

## Status

Accepted

## Decision

Move MotherDuck runtime context from hardcoded Eastlake defaults to explicit
environment and deployment configuration:

- `MOTHERDUCK_ALLOWED_DATABASES`
- `MOTHERDUCK_DEFAULT_DATABASE`
- `MOTHERDUCK_METADATA_FILE`

Also enforce an MCP preflight in the chat API so runtime startup fails fast when
the configured default database is not visible or queryable with the provided
MotherDuck token.

## Why

- The deployed app must target the real MotherDuck database (`za_edw_pov`)
  rather than demo Eastlake data.
- Prompt context, metadata loading, and runtime access controls must stay in
  sync across local dev and ACA.
- Fast failure is better than silent drift when tokens are valid but scoped to
  the wrong data.

## Consequences

- Deployment environments now need explicit MotherDuck database-scope variables.
- Prompt templates become reusable and environment-specific.
- Metadata context can be changed without code changes by updating env values and
  metadata files.
