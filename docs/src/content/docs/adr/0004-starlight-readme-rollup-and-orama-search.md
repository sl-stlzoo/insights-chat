---
title: ADR 0004 - Starlight README rollups and Orama search
description: Publish repository context through generated Starlight pages and a local Orama index.
---

# ADR 0004: Starlight README rollups and Orama search

## Status

Accepted

## Decision

Use **Astro Starlight** for the docs site, generate repository guide pages from
curated `README.md` files, and index the docs corpus with **Orama**.

## Why

- The docs site needs to stay close to the codebase
- README rollups reduce duplication between repo docs and published docs
- Orama offers a lightweight client-side search layer without requiring a
  separate hosted search service for this project

## Consequences

- A content sync script becomes part of the build process
- Curated subdirectory `README.md` files are now part of the documentation contract
