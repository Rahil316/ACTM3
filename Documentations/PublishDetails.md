## Short Description (160 chars)

Generate color scales, solve WCAG contrast tokens, and publish Figma variables — all from seed colors.

---

## Full Description

Token Wand turns seed hex colors into a complete, publish-ready color token system inside Figma variables. Pick your colors, configure your semantic roles, set your contrast targets, and click Run. The plugin writes everything — tonal scales, semantic tokens, alias chains, alpha tints, source constants — directly into your Figma file.

No manual hex juggling. No spreadsheets. Just a system that holds together when you change a brand color.

---

### Two Modes, One System

**Scale Mode** generates a tonal ramp for each color using one of seven algorithms — Natural, Uniform, Expressive, Symmetric, OKLCH, Material, or Linear. Each role maps to the scale step that first meets your contrast target. Light and dark themes resolve automatically from the same scale.

**Direct Mode** skips the scale entirely and solves each token directly to an exact WCAG contrast ratio using a binary search in OKLCH color space. Five solver modes control how chroma behaves as lightness shifts: Natural, Saturated, Luminance, Hue-Locked, and Chroma-Maximized. Every token is guaranteed to meet or exceed the target — no rounding, no guessing.

---

### What Gets Written to Figma

- **Color scale collection** — one variable per color × step, named and grouped by your conventions (`_scale`, `Brand/Primary/100`, etc.)
- **Semantic token collection** — one variable per color × role × variation × theme mode, aliased into the scale collection in Scale mode
- **Source colors collection** — raw seed hex values as fixed brand primitives, with optional alpha tint variants at configurable opacities
- **Multi-mode support** — every theme you define becomes a Figma variable mode; light, dark, brand, high-contrast, or anything else

---

### Built for Real Systems

**Rename-safe.** Every color, role, and theme carries a stable internal ID. Rename "Primary" to "Brand/Primary" and all existing Figma variables rename in place — no broken component references.

**Drag to reorder freely.** Colors and roles can be reordered at any time. The ID system tracks identity, not position.

**Scoped roles.** Pin a role to specific colors only. A "Text on Surface" role can be scoped to Brand and Neutral while leaving Status colors unaffected.

**Per-role backgrounds.** Each role can contrast against a custom background instead of the theme background — a static hex, another color in the palette, or a token from the system itself. Useful for text-on-card, text-on-button, and layered surface patterns.

**Per-role variations.** Override the global variation set on any individual role. A Status role can have Background, Fill, Foreground, and Border variations at specific contrast targets while every other role uses the global 3-step or 5-step set.

**Flexible naming.** Token paths are assembled from configurable segments in any order (`color/role/variation`, `role/color/variation`, or omit the role entirely for Tailwind-style `Blue/500` names). Shorthand compression on every segment. Folder nesting from `/` in any name.

**Preview before sync.** The Preview panel shows all resolved hex values, contrast ratios, WCAG ratings, and scale step assignments before a single variable is written.

**Export everywhere.** Export tokens as CSS custom properties, SCSS variables, Tailwind config, DTCG JSON, Style Dictionary, Swift, Android XML, React Native, or CSV — all from within the plugin.

---

### Presets

Presets ship out of the box covering the most common design system patterns: Material Design 3, IBM Carbon, Shopify Polaris, Apple HIG, Tailwind CSS, Radix UI, and more. Load a preset, swap your colors, run.

---

### Token Settings

Full control over every aspect of what gets written:

- Include or suppress the tonal scale collection
- Include source color constants and alpha tint variants
- Configurable collection and variable names
- Named scale steps with optional shorthand labels
- Variable descriptions with WCAG contrast data written into each variable's metadata
- Link tokens to scale aliases or resolve hex values directly

---

## Tags

`color`, `tokens`, `variables`, `design system`, `WCAG`, `contrast`, `accessibility`, `scale`, `semantic`, `dark mode`, `theming`, `export`, `CSS`, `Tailwind`, `Material`
