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
