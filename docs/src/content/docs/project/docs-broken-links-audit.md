---
title: Docs Site Broken Links Audit
description: Guide for auditing and fixing broken links (especially localhost references) in the Astro documentation site.
---

## 🟡 Priority 2: Docs Site Broken Links

When testing or migrating the documentation site from local development to production, absolute links to `localhost` often break navigation.

### The Configuration Context
The Astro configuration (`astro.config.mjs`) has already been partially fixed to support deploying in a sub-path by setting:
```javascript
export default defineConfig({
  base: '/docs',
  // ...
});
```
However, individual Markdown and MDX content files still need to be audited to ensure they use relative paths rather than absolute local URLs.

### 1. Grep Command for Auditing Content
To locate any lingering references to `localhost` in the documentation content, run the following command from the repository root:

```bash
grep -rn "localhost" docs/src/content/docs/
```
If you are on Windows using PowerShell:
```powershell
Select-String -Path "docs\src\content\docs\**\*.md", "docs\src\content\docs\**\*.mdx" -Pattern "localhost"
```

**What to do with the results:**
- Change hardcoded `http://localhost:3000/docs/...` URLs to relative paths (e.g., `../platform/azure-container-apps.md`).
- Ensure internal asset references also respect the Astro relative linking structure.

### 2. Local Verification
Before deploying changes, verify the build output locally. The `base: '/docs'` configuration will affect how Astro builds the site.

1. Build the docs site:
   ```bash
   cd docs
   npm run build
   ```
2. Preview the local build:
   ```bash
   npm run preview
   ```
3. Navigate to `http://localhost:4321/docs` (or the port specified by the preview server).
4. Click through the sidebar links and check the network tab to ensure no 404s occur due to missing `/docs/` prefixes.
