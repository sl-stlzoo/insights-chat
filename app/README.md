# App

This directory contains the Next.js application shell, route handlers, shared
report and Dive rendering surfaces, and the user-facing chat experience.

## Key areas

- `api/` - Server routes for chat orchestration, auth, database health, and Dive embedding
- `components/` - Chat UI, visualization rendering, sharing, and session-aware controls
- `[appName]/` - Model-specific entry routes for the main experience
- `share/` - Public report sharing surface

## Delivery notes

- The app is being modernized for Azure Container Apps and Microsoft Entra ID
- The UI theme is moving to a tokenized Saint Louis Zoo-inspired palette
- Live visualizations are shifting toward embedded MotherDuck Dives
