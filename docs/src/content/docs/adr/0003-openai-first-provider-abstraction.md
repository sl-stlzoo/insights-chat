---
title: ADR 0003 - OpenAI-first provider abstraction
description: Replace OpenRouter assumptions while keeping Azure AI Foundry migration ready.
---

# ADR 0003: OpenAI-first provider abstraction

## Status

Accepted

## Decision

Move the application to an **OpenAI-first** provider contract and preserve a
separate configuration seam for a future Azure AI Foundry adapter.

## Why

- The immediate deployment target will use an OpenAI API key
- Azure AI Foundry remains a near-term evolution path
- A thin provider seam avoids repeating prompt, tool, and streaming logic later

## Consequences

- Existing OpenRouter model identifiers and assumptions must be removed or mapped
- The environment contract must clearly separate current and future provider settings
