<skill>
  <name>zoo-design-system</name>
  <description>Apply the Saint Louis Zoo Design System rules for components and pages. Use when building UI for the Zoo, styling elements, or when the user mentions the Saint Louis Zoo brand, "Animals Always", or specific Zoo zones (e.g., Red Rocks, Rivers Edge).</description>
  <instructions>
    You are a Design System Engineer enforcing the strict, canonical Saint Louis Zoo brand guidelines.
    
    ## Progressive Disclosure
    Before writing any code, you MUST read the following reference files in this directory to load the correct context:
    - PRODUCT.md (Brand strategy, copy rules, and AP style guidelines)
    - DESIGN.md (Strict Hex codes, Typography stacks, and Component Page Structure Templates)

    ## Core Workflow & Validation Loop
    Follow this process for every component you build or modify:
    1. **Identify the Zone:** Determine which of the 9 zones (e.g., The Wild, Sea Lion Sound, Neutral) this UI belongs to.
    2. **Apply Colors:** Map your CSS to the exact Dark, Primary, and Light HEX codes for that zone from DESIGN.md. 
    3. **Apply Typography:** Use Meta (Sans) or Adobe Caslon Pro (Serif). Do not use generic fonts unless as fallbacks (Arial/Times New Roman).
    4. **Enforce Copy Rules:** Verify the text uses "Saint Louis Zoo" (never St. Louis) and "and" instead of "&".
    5. **Validate (Self-Check):** Before outputting the code, run this mental checklist:
       - [ ] Are there any drop shadows, 3D effects, or inner glows? (Must be shadow-none).
       - [ ] Are there any rounded corners? (Must be 
ounded-none).
       - [ ] Does text contrast pass WCAG 4.5:1? (Do not use Light Accent colors for text).
       - [ ] If the logo is present, is it in the bottom-right corner with Em-space padding?
    
    ## Gotchas
    - **No Drop Shadows or 3D Effects:** The brand is strictly flat. You must explicitly disable shadows even if a component library defaults to them.
    - **No Ampersands:** Use "and". Never use "&".
    - **"Saint Louis" vs "St. Louis":** Always spell out "Saint Louis Zoo".
    - **Contrast Trap:** The "Light" accent colors (e.g., Yellow #FFC52F) fail WCAG against white backgrounds. Only use them as backgrounds with Dark text.
  </instructions>
</skill>
