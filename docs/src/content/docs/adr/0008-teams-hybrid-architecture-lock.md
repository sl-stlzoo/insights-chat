---
title: ADR 0008 - Teams hybrid architecture lock
description: Lock Teams personal tab as primary UX with bot-assisted workflows and enforce SSO/OBO plus least-privilege authorization.
---

# ADR 0008: Teams hybrid architecture lock

## Status

Accepted

## Decision

Adopt and lock the PRD-aligned Teams target architecture:

1. Teams **personal tab** is the primary user experience.
2. Teams **bot** provides assistive/proactive workflows and deep-link handoff.
3. Entra-backed Teams **SSO + OBO** is required for secure API/downstream access.
4. Authorization is enforced with **app roles/groups** and least-privilege policy mapping.
5. Delivery follows gated promotion: **dev -> pilot -> prod**.

## Why

- The personal tab best supports dense analytics and embedded Dive workflows.
- Bot interactions are strongest for command entry points and proactive nudges.
- SSO/OBO is necessary for tenant-safe identity propagation and auditability.
- A staged promotion model reduces risk before tenant-wide rollout.

## Consequences

- Identity, manifest, and CI/CD work become release-critical dependencies.
- Teams-specific observability is required before GA promotion.
- Pilot acceptance criteria gates production rollout.
