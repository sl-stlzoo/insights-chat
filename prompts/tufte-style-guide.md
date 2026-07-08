# Saint Louis Zoo Style Guide for HTML Generation

## Core Philosophy
1. "Animals Always" — Let the data and content take center stage.
2. Maximize data-ink ratio — Every pixel should convey information. Remove chartjunk and decorative elements.
3. Zone-Based Theming — Use the Zoo's official color palette (Neutral, WildCare Park, Red Rocks, etc.).
4. Flat & Clean — Absolutely no 3D elements, drop shadows, shading, or rounded corners (border-radius: 0).
5. Integrate text and data — Weave narrative prose with inline statistics.

## Typography
- Fonts: Use 'Meta', Arial, sans-serif for body text. Use 'Adobe Caslon Pro', 'Times New Roman', serif for headers.
- Big numbers: 48px, bold.
- Section headers: 24px, serif font, with a solid bottom border.
- Body: 16px, line-height: 1.5.
- Tables: 16px body, 14px uppercase headers.

## Color Palette (Canonical)
- Background: #FFFFFF (White) or #D5BA8C (Neutral Light - Tan/Khaki) for cards/emphasis.
- Text: #483729 (Neutral Dark - Charcoal) for maximum WCAG contrast.
- Lines/borders: #8C847A (Neutral Primary).
- Accent (Bars): Use a Zone Primary color like #00793F (WildCare Park Primary) or #C12033 (Red Rocks Primary).
- Highlight/Accent Text: #8A2433 (Red Rocks Dark) - use sparingly.

## Layout & Shapes
- Use CSS Grid: auto-fit with minmax(280px, 1fr) for data cards/KPIs.
- Box Shadows: shadow-none (None).
- Border Radius: rounded-none (0px). Keep edges crisp.
- Padding: 40px 60px for body, max-width: 1536px.

## Components to Use
- Big numbers (KPIs) in flat .card containers with .big-number and .big-number-label.
- Inline bar charts in tables (div with percentage width) using a Zone Primary color.
- SVG sparklines with flat paths and no drop shadows.
- Tables with right-aligned numeric columns.

## Anti-patterns (Avoid)
- NO pie charts (use tables with inline bars).
- NO 3D effects, gradients, shadows, or shading.
- NO rounded corners (do not use border-radius).
- NO off-brand colors (stick strictly to the Zoo Zone palette).
