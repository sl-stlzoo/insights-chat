---
title: MotherDuck Dive Persistence & Troubleshooting
description: Troubleshooting steps and fix options for MotherDuck Dive persistence issues.
---

## 🔴 Priority 1: MotherDuck Dive Persistence

### The Issue
MotherDuck Dives fail to persist or embed properly. The primary hypothesis is that the `MOTHERDUCK_DIVE_ADMIN_TOKEN` may not be configured in the developer environment or production, as this token is separate from the read-only `MOTHERDUCK_TOKEN` used for SQL execution. 

### Step-by-Step Investigation Path
1. **Verify Env Vars:** Ensure both `MOTHERDUCK_DIVE_ADMIN_TOKEN` and `MOTHERDUCK_DIVE_SERVICE_ACCOUNT_USERNAME` are set in your `.env` (or Azure Key Vault). 
2. **Trace Tool Calls:** Watch the server logs in development for the MCP preflight and tool execution steps. 
3. **Check MCP Response Handling:** Review `app/api/chat/route.ts` and `app/api/dives/embed-session/route.ts` to ensure that if the embedding fails, the error message correctly bubbles up to the client instead of failing silently.

### Fix Options (Ranked by Likelihood)

1. **Configuration Missing (Most Likely):** 
   - **Cause:** Developers copy `.env.example` but only fill in `MOTHERDUCK_TOKEN`, ignoring the `_ADMIN_TOKEN`.
   - **Fix:** Update onboarding docs to make the Dive admin token a hard requirement. Add validation at app startup to fast-fail if the token is missing when Dive tools are invoked.

2. **MCP Tool Call Parsing Error:**
   - **Cause:** The AI generates a malformed tool call or the `app/api/chat/route.ts` fails to properly pass the response back to the client application.
   - **Fix:** Enhance error logging around `executeTool(mcpClient, ...)` to catch and serialize the exact payload returned by the MCP layer.

3. **MotherDuck Embed API Drift:**
   - **Cause:** The upstream `v1/dives/{diveId}/embed-session` changes its response schema (currently expects `{ session: string }`).
   - **Fix:** Add fallback parsing and detailed downstream HTTP 502 error logging in `app/api/dives/embed-session/route.ts`.

### Acceptance Criteria
**Test Prompt:** "Create a visualization of zoo attendance for the last 30 days."
- **Expected Outcome:**
  1. The LLM successfully triggers the Dive creation tool.
  2. The frontend makes a POST to `/api/dives/embed-session`.
  3. The backend successfully authorizes using `MOTHERDUCK_DIVE_ADMIN_TOKEN`.
  4. The UI renders the embedded MotherDuck iframe cleanly without a 500 error.
