---
title: App / Tab
description: Rolled up from app/tab/README.md.
---

> Source: `app/tab/README.md`

# Teams Tab Routes

This directory contains routes that are intended to support the eventual
Microsoft Teams personal tab experience.

## Current route

- `explorer/` - Teams-friendly Dive workspace host that can verify a signed
  state token and render an embedded MotherDuck Dive

## Direction

- Deep links from Teams cards should target these routes
- Signed state should carry only the minimum context required to reconstruct the
  workspace safely
