---
title: Phase tracker
description: Execution tracker for the Azure modernization effort.
---

# Phase tracker

## Current status

| Phase | Scope | Status |
|---|---|---|
| 1 | Azure planning and region/quota analysis | Complete |
| 2 | Source repository import | Complete |
| 3 | Entra auth and application shell updates | Complete |
| 4 | OpenAI provider migration | Complete |
| 5 | Astro Starlight sidecar and Orama search | Complete |
| 6 | Azure infrastructure and deployment assets | Complete |
| 7 | Validation and deployment | Complete (dev) |
| 8 | MotherDuck live database runtime alignment (`za_edw_pov`) | In progress |

## Teams move program (PRD-aligned)

| Track | Scope | Status |
|---|---|---|
| T1 | Lock target architecture (tab primary + bot assistive/proactive) | Complete |
| T2 | Finalize Entra app model (registrations, redirects, scopes, consent) | Complete |
| T3 | Teams SSO and OBO flow implementation | Complete |
| T4 | Manifest hardening (`dev`, `pilot`, `prod`) | Complete |
| T5 | Tab UX readiness for Teams iframe/runtime | In progress |
| T6 | Bot command and deep-link surface | In progress |
| T7 | Group/app-role authorization + MotherDuck policy mapping | Planned |
| T8 | CI/CD promotion path (`dev -> pilot -> prod`) for Teams artifacts | Planned |
| T9 | Teams observability, diagnostics, audit, and alerting | Planned |
| T10 | Pilot rollout and GA promotion | Planned |

## Milestones

- [x] Deployment plan written to `.azure/deployment-plan.md`
- [x] Subscription, region, and quota blocker identified
- [x] Repository imported into the working directory
- [x] Entra-authenticated sign-in flow working locally
- [x] OpenAI-backed chat orchestration working locally
- [x] Docs sidecar building with generated README rollups
- [x] Bicep infrastructure complete
- [x] `.env.example` files refreshed and documented
- [x] Validation handoff complete
- [x] Replace Eastlake prompt references with environment-driven MotherDuck scope
- [x] Add runtime preflight checks for configured default MotherDuck database
- [ ] Deploy updated MotherDuck runtime configuration to dev and confirm `za_edw_pov` query path end-to-end

## Teams move milestones

- [x] Lock hybrid Teams target architecture in platform docs
- [x] Publish comprehensive implementation process and sequencing
- [x] Finalize production Entra app registrations and consent scopes
- [x] Implement Teams SSO token exchange and backend OBO
- [x] Harden and validate env-specific Teams manifests (`dev`, `pilot`, `prod`)
- [ ] Complete Teams-safe tab UX and Fluent session/auth states
- [ ] Add bot commands and deep-link handoff to tab context
- [ ] Enforce app-role/group authorization with least-privilege mapping
- [ ] Extend CI/CD for Teams package build/sign/publish with promotion gates
- [ ] Activate Teams-specific telemetry, diagnostics, and audit pipelines
- [ ] Complete pilot feedback cycle and approve GA rollout

## Latest execution evidence

- PR A: Added Teams-specific tab auth/session states and app-role/group checks on tab/API entry points.
- PR B: Added bot/card review path deep-link generation endpoint (`/api/teams/review-path`) and deterministic user-safe SSO/OBO failure handling.
