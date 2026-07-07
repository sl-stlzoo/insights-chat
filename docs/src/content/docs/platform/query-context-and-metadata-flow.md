---
title: Query context and metadata flow
description: How chat requests are contextualized, where metadata comes from, and how context is injected before LLM/tool execution.
---

# Query context and metadata flow

This document explains the **current runtime behavior** for how the app gathers
context, injects metadata, and executes queries before/with LLM responses.

## 1. Entry point and request contract

The query pipeline starts in:

- `app/components/ChatInterface.tsx` (client)
- `app/api/chat/route.ts` (server API route)

Client requests to `/api/chat` include:

- `messages`: conversation history in role/content form
- `isMobile`: viewport hint for report layout instructions
- `includeMetadata`: user toggle (default `true`, persisted in local storage)
- `model`: selected model mode (`fast`, `pro`, `blended`, etc.)
- `shareId` (optional): shared-report context token from URL/state

## 2. Runtime database scope assumptions (environment-driven)

`app/api/chat/route.ts` reads and enforces:

- `MOTHERDUCK_ALLOWED_DATABASES` (CSV allowlist)
- `MOTHERDUCK_DEFAULT_DATABASE` (default working DB)
- `MOTHERDUCK_METADATA_FILE` (metadata file path to load)
- `MOTHERDUCK_CONTEXT_AUDIENCE` (audience wording used in standalone prompt wrapper)

Defaults if not set:

- allowlist: `za_edw_pov`
- default DB: first value in allowlist
- metadata file: `metadata/za_edw_pov.md`
- context audience: `business stakeholders`

If configuration is inconsistent (for example default DB not in allowlist),
the request fails before any LLM call.

## 3. Context sources used before the first LLM call

The app can inject context from four places:

1. **Conversation messages** from the request body.
2. **Shared report HTML** (if `shareId` is present):
   - fetched from `shares` table via `fetchSharedReportHtml()`
   - prepended into the current user message using `prompts/user-shared-report-context.md`
3. **Metadata file** (if `includeMetadata=true` and file exists):
   - loaded from `MOTHERDUCK_METADATA_FILE`
   - inserted into prompt placeholders as `DATABASE METADATA`
4. **Prompt templates** loaded from `/prompts`:
   - cached in-process via `getPrompt()`
   - composed via placeholder replacement in `composePrompt()`

## 4. Prompt composition model

### Standard (single-model) mode

`getSystemPrompt()` composes:

- `prompts/standalone-system-prompt.md`
  - embeds:
    - `DATA_GATHERING_PROMPT` (from `system-prompt-data-gathering.md`)
    - `REPORT_GENERATION_PROMPT` (from `system-prompt-report-generation.md`)
    - DB scope placeholders (`ALLOWED_DATABASES`, `DEFAULT_DATABASE`)

If there is **no `shareId`**, the latest user message is additionally wrapped by
`prompts/user-standalone-query.md`, with an auto-generated short summary of the
last up-to-4 prior user/assistant turns and dynamic placeholder values for:

- `{{ALLOWED_DATABASES}}`
- `{{DEFAULT_DATABASE}}`
- `{{CONTEXT_AUDIENCE}}`

### Blended mode

Two-phase flow:

1. **Phase 1 (data gathering):**
   - system prompt from `getDataGatheringPrompt()`
   - tool-aware completion with MCP tools
2. **Phase 2 (report generation):**
   - system prompt from `getReportGenerationPrompt()`
   - text-only completion using collected data payload

Collected phase-1 output is inserted into `prompts/user-blended-opus-input.md`.

## 5. MCP tool context and preflight checks

Before any model inference loop:

1. Create MCP client (`lib/mcp-client.ts`) using `MOTHERDUCK_TOKEN`
2. Load available MCP tools
3. Run preflight:
   - check `list_databases` result contains default DB (if tool exists)
   - then run `list_tables` with default DB (or fallback `query` check)

If preflight fails, request returns an error and no LLM response is produced.

Tool exposure to model:

- `list_databases` is intentionally removed from the model tool list
- standard mode adds custom tools: `generate_chart`, `generate_map`
- blended phase 1 uses MCP tools only for data gathering

## 6. Runtime enforcement during tool execution

When the model emits tool calls:

- arguments are parsed
- access is validated (`validateToolAccess()`):
  - explicit `database` argument must be allowlisted
  - SQL references are scanned for non-allowlisted DB names
- approved calls execute against MCP
- tool outputs are appended as `tool` messages and looped back into next LLM call

This is the core mechanism by which live data context is accumulated.

## 7. Output assumptions and persistence

Current response-format assumptions in `standalone-system-prompt.md`:

- default expected output is full HTML report
- markdown/tool-first behavior is triggered when user message contains
  the word `"motherduck"`

If HTML is produced, it is stored in `shares` with embedded metadata comments:

- user question
- SQL queries + result excerpts
- intermediate reasoning text
- model and timestamp

This enables follow-up context via `shareId` in later requests.

## 8. Where this is configured in deployment

Runtime env injection path:

- IaC: `infra/modules/container-app.bicep`
- Parameter surface: `infra/main.bicep`
- Deploy workflow mapping: `.github/workflows/deploy-aca.yml`
- Human-facing contract: `.env.example` and `README.md`

## 9. Updating prompt references safely (without hardcoding)

Use these parameterized sources instead of editing tenant/demo names directly in
prompt templates:

1. **Database scope references**:
   - `MOTHERDUCK_ALLOWED_DATABASES`
   - `MOTHERDUCK_DEFAULT_DATABASE`
2. **Metadata context source**:
   - `MOTHERDUCK_METADATA_FILE`
3. **Audience/context wording in standalone wrapper**:
   - `MOTHERDUCK_CONTEXT_AUDIENCE`

Where to update:

- local/dev: `.env.local` (or `.env` in controlled dev workflows)
- Azure runtime: GitHub Environment Variables -> deploy workflow -> ACA env
  injection
- IaC defaults/examples:
  - `infra/main.bicep`
  - `infra/main.parameters.example.json`

If you change these values, no prompt text edits are required for runtime
context wording.

## 10. Current known assumption/drift points

These are important for interpreting behavior:

1. Metadata is file-based and optional; if missing, the model is expected to
   discover schema via tools.
2. SQL DB reference validation is pattern-based, not a full SQL parser.
3. Preflight DB check uses tool availability and string matching semantics from
   MCP output; it is a practical guard, not formal policy verification.

## 11. Practical tracing checklist (for debugging)

For a single request, verify in this order:

1. Client payload (`includeMetadata`, `model`, `shareId`)
2. API logs for:
   - selected model
   - allowed/default DB
   - metadata file load
   - MCP preflight success/failure
3. first-call system prompt (logged in route handler)
4. tool-call execution logs and access-denied messages
5. final output type (HTML/markdown), and share-save behavior
