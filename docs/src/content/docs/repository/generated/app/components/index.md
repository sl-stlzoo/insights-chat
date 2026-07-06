---
title: App / Components
description: Rolled up from app/components/README.md.
---

> Source: `app/components/README.md`

# App Components

The components in this directory render the chat interface, visualizations, and
supporting user interactions.

## Notable components

- `ChatInterface.tsx` - Main conversation shell and SSE event consumer
- `HtmlFrame.tsx` - HTML report rendering and sharing
- `DiveFrame.tsx` - Embedded MotherDuck Dive rendering
- `UserSessionControls.tsx` - Signed-in user display and sign-out action
- `SignInButton.tsx` - Entra sign-in entry point

## Design goals

- Keep the chat workflow fast and focused
- Favor readable hierarchy, generous spacing, and obvious actions
- Preserve a clean seam between data/AI orchestration and visualization rendering
