# App API

This directory contains the Next.js route handlers that power the application.

## Current responsibilities

- `chat/route.ts` - Conversational orchestration, MCP tool execution, and visualization output
- `auth/[...nextauth]/route.ts` - Microsoft Entra authentication entry point
- `db/route.ts` - Database health and predefined query access
- `dives/embed-session/route.ts` - Secure exchange for MotherDuck Dive embed sessions
- `suggestions/route.ts` - Follow-up prompt generation

## Azure direction

- Protected APIs should remain behind app-level auth
- Secrets should be supplied through Key Vault-backed environment variables
- Dive embed sessions must be minted server-side only
