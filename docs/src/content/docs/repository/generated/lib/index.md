---
title: Lib
description: Rolled up from lib/README.md.
---

> Source: `lib/README.md`

# Lib

Shared server-side helpers live here.

## Current responsibilities

- MotherDuck MCP connectivity
- Database access helpers
- Authentication configuration

## Direction

- Provider-specific configuration should be isolated behind small helpers
- Environment variable access should stay centralized and well documented
- Azure-hosted secrets should flow in via environment variables or managed integrations, not hardcoded values
