# Features & Tricks

## Core Features

### Scale Mode with 8 Algorithms

Generates a tonal ramp of N steps from a seed hex color. Steps are distributed geometrically in log-luminance so perceptual contrast between adjacent steps is consistent across the full lightness range. Eight algorithms: Natural (recommended), Uniform, Expressive, Symmetric, OKLCH, Material, Linear, Fidelity. The `_scale` Figma variable collection stores the raw ramp.

### Direct Mode with 5 Solver Modes

Solves each token color directly to a WCAG contrast target without generating an intermediate tonal scale. The solver binary-searches OKLCH lightness while shaping chroma according to the chosen mode: `natural`, `constant-chroma`, `symmetric`, `hue-locked`, or `max-chroma`. Output always meets or exceeds the target contrast. Useful when exact per-token accessibility guarantees matter more than palette harmony.

### Per-Role Variation Override

A role can define its own variation set independently from the global list. When `projectStore.useSharedRoleVariants` is `false`, each role's `variations[]` (name/shorthand/target per slot) is used by the engine instead of the global list (`role.variations ?? globalVariations` in `clrEngine.ts`). Toggle **Custom Variations per role** on the **Labels** settings tab — turning it off rebuilds every role's list from the current Shared Variations (preserving any target the role already had at each index), turning it back on reverts every role to `null` (defer to Shared Variations).

### Scale Step Mapping (Scale Mode)

There is only one mapping method: for each role/variation, `_mapByScaleContrast` walks the scale steps in order (light→dark on light themes, dark→light on dark themes) and returns the first step whose contrast ratio against the theme background is `≥` that variation's `target`. If no step meets the target, it falls back to the highest-contrast step available and flags `isAdjusted`. There is no separate index-pinning mapping mode — contrast targets always live on the `Variation` object's own `target` field, not a role-level array.

### Algorithm Scoping

By default (`useUniformAlgorithm: true`), all colors use the single global algorithm/solver. When disabled, `algorithmScopeLevel` (`"color"` or `"role"`) controls whether **Direct mode's solver** is read from `color.solverMode` or `role.solverMode`. **This only applies to Direct mode.** In Scale mode, `_generateScales` reads `color.scaleAlgorithm` only — `role.scaleAlgorithm` is never consulted anywhere in the pipeline, so setting `algorithmScopeLevel: "role"` has no effect on which scale algorithm is used, even though a live per-role Algorithm dropdown exists in the UI. See `Documentations/knowledge/color-algorithm-roadmap.md`'s "Confirmed issues" section for the full root cause.

### Alpha Tints

There is no separate `includeAlphaTints` flag — alpha tint variables are written whenever `alphaValues` is non-empty, as part of the source colors collection (so `includeSourceColors` must also be on). Percentages are configurable via `alphaValues` (e.g. `10, 25, 50, 75, 90`). Variable names follow the pattern `ColorName/Opacities/10`. Written as RGBA values with fractional alpha.

### Source Colors Collection

Writes the raw seed hex values into a separate Figma variable collection (name from `sourceCollectionName`, default `_constants`). One mode only, never changes per theme, not aliased into the token collection. Enable via `includeSourceColors: true`.

### Direct Mode / Suppressed Scale Collection

There is no `resolveTokensDirectly` field. Token variables store raw hex instead of Figma variable aliases whenever the engine's `skipScales` condition is true (`src/figma/figmaVars.ts:85`): `pluginMode === "direct"`, or `includeColorScalesCollection === false` in Scale mode, or the scale collection doesn't exist yet and the sync scope excludes it. In all of these cases the `_scale` collection is also not written.

### Variable Descriptions

When `includeDescriptions` is enabled, the engine writes metadata into each Figma variable's description field. For scale variables: contrast ratios against all themes. For token variables: the role description plus the theme name. Adjusted tokens are flagged with a warning marker.

### Stable Rename Safety (`_id` Tracking)

Every color, role, and variation carries a stable `_id` generated at creation. When names change, the engine compares saved state to new state by `_id` — not by array position — and builds a rename map. Existing Figma variables are renamed in place, preserving all component references. Reordering by dragging is safe. Variation renames — including per-role custom lists, not just the global list — are tracked the same way (`src/figma/config.ts`'s `_getTokenRenames`/`getVarMap` matches variations by `_id`), so there is no known rename-tracking gap here.

### Token Name Segments

The Figma variable path for each token is assembled from segments in a configurable order (`tokenNameSegments`). Accepts any permutation of `["color", "role", "variation"]`, or a 2-element array to omit the role segment. Combined with shorthand flags, this produces naming patterns from `Brand/Primary/Text/Default` to `Blue/500`.

### Shorthand Compression

Four independent shorthand toggles: `useShorthandColors`, `useShorthandRoles`, `useShorthandVariations`, `useShorthandSteps`. When enabled, the shorthand string replaces the full name in Figma variable paths.

### Multi-Theme

Each theme is a name + background hex. The token collection gets one Figma variable mode per theme. On Figma free plan, only one mode per collection is allowed (the plugin detects this and warns).

### Scale Step Labels

Override the default numeric step names by adding step label entries (each has a name and optional shorthand). Steps without labels are numbered 1…N. Labels appear in `_scale` collection variable names and in token descriptions.

### Suppress Scale Collection

`includeColorScalesCollection: false` suppresses the `_scale` ramp collection from being written to Figma. **Correction:** tokens do *not* still alias scale variables in this case — turning this off feeds into the same `skipScales` flag that also governs aliasing (`figmaVars.ts:85`, `figmaVars.ts:182`), so tokens fall back to raw hex values, the same as Direct mode. Controlled via the Scale Collection row in the Tokens settings tab's Collections card.

---

## Tricks

### 1. Folder Nesting with `/`

Any `/` in a color name, role name, or variation name creates a nested folder group in the Figma variable panel. Use `Brand/Primary`, `Status/Error`, `Surface/Raised`, `State/Hover` to build a clean hierarchy.

### 2. Flat Tailwind-style Names

Set `tokenNameSegments: ["color", "variation"]` (no role) and enable `useShorthandColors` + `useShorthandVariations`. With shorthand color `bl` and variation shorthand `500`, the output is `bl/500`. With full names: `Blue/500`. This is how the Tailwind CSS preset works.

### 3. Scope: Roles Only for Fast Iteration

After the initial sync, most changes touch only the semantic layer. In the Run dialog's collections checklist, turn off the "Scale" toggle (keep "Tokens" on) to skip scale regeneration. The token collection is rebuilt; the `_scale` collection is untouched. Significantly faster on large systems.

### 4. Direct Mode / Suppressed Scale Collection for Static Exports

Setting `pluginMode: "direct"` (or turning off `includeColorScalesCollection` while in Scale mode) writes hex values directly into token variables instead of Figma aliases, and the `_scale` collection is not created. Use when: (a) consumers copy hex values rather than consuming variable aliases, (b) you are generating a static CSS/JSON export, or (c) you are using Direct mode.

### 5. Source Colors as Brand Primitives

Enable `includeSourceColors` and set `sourceCollectionName` to `brand`, `_constants`, or a name matching your team's convention. Give the collection to developers as a fixed reference. On rebrand, update the seed hex in the plugin and re-sync both collections.

### 6. Alpha Tints for Overlay Colors

Enable **Source Colors** then **Alpha Tints** and configure `alphaValues` (e.g. `10, 25, 50, 75, 90`). The plugin writes RGBA variables at `ColorName/Opacities/10`, `ColorName/Opacities/25`, etc. Use for overlays, scrim layers, focus rings, and hover states.

### 7. Per-Role Override for Status Colors

Status colors need four specific slots: tinted background, solid background, foreground text/icon, and border. Enable **Custom Variations per role** on the Labels settings tab (this sets `useSharedRoleVariants: false` project-wide), then give the status role its own `variations` list: `["BG/Subtle", "BG/Default", "FG/Default", "Border"]` with per-variation `target`s `[1.3, 1.8, 4.5, 2.5]`.

### 8. Regular Wand as the Fastest Starting Point

Pick **Regular Wand** on the first-launch QuickStart screen (or load it from the Theme Shop later — it's a dev-only preset, still available via `npm run build`/`watch` but not in a `--release` build). It provides a 12-role semantic system with 5 shared variations, light and dark themes, Natural algorithm at 25 steps. Change the three seed colors, click Run.

### 9. Variable Descriptions for Accessibility Audits

Enable descriptions in Token Settings. After sync, open the Figma variables panel and the description shows the achieved WCAG contrast ratio and rating (Fail / AA / AAA). Adjusted tokens are marked with a warning.

### 10. Preview Before Sync

The Preview tab shows all computed token hex values — hex colors, contrast ratios, and which scale step each token maps to — before writing anything to Figma.

### 11. Config Export for Version Control

Use the **Token Wand Config (.wand)** export — not the JSON export, which only contains raw `{scales, tokens, errors}` output — to commit the complete plugin state (colors, roles, variations, themes, settings) alongside the codebase. Import a `.wand` file to restore the exact state on any Figma file. There's also an in-plugin alternative that doesn't leave Figma at all: the Project tab's **Versions** view snapshots the current config with a name/description, and supports restore/rename/delete/export-as-.wand per snapshot — a fully working feature, not a placeholder.

### 12. Drag to Reorder Without Breaking References

Colors and roles can be reordered by dragging. The `_id` tracking system ensures the correct Figma variables are renamed, not recreated. All uses in components and shared libraries remain intact after the next sync.

---

## Preset Quick Reference

**Shipped presets** (`src/shared/presets/raw/*.ts`, included in release builds) — 7, not the 10 an earlier version of this doc listed. TW Regular/Pro/Funk, Blank Slate, and several others below are now dev-only, not shipped:

| Preset            | Mode   | Algorithm            | Colors | Roles | Themes                            | Best for                                       |
| ----------------- | ------ | --------------------- | ------ | ----- | ---------------------------------- | ----------------------------------------------- |
| Apple HIG         | Direct | natural (solver)      | 5      | 9     | Light, Dark                        | iOS/macOS apps, semantic label/fill hierarchy   |
| Atlassian Design System | Scale | Natural (25-step) | 7      | 30    | Light, Dark                        | Large enterprise systems, deep role hierarchy   |
| IBM Carbon        | Scale  | Uniform (10-step)     | 5      | 13    | White, Gray-10, Gray-90, Gray-100  | Enterprise, data-heavy, Carbon compliance       |
| Material Design 3 | Scale  | Material (25-step)    | 6      | 13    | Light, Dark                        | Android, Material You, HCT tonal palette        |
| Shopify Polaris   | Direct | natural (solver)      | 5      | 26    | Light, Dark, Inverse               | Shopify admin, Polaris token names              |
| Radix UI          | Scale  | Natural (12-step)     | 4      | 6     | Light, Dark                        | React component libraries, Radix 12-step scale  |
| Tailwind CSS      | Scale  | Natural (11-step)     | 4      | 8     | Light, Dark                        | Utility CSS, Tailwind-matched 11-stop scale     |

**Dev-only presets** (`src/shared/presets/raw/dev/*.ts`, excluded from `--release` builds — visible in `npm run build`/`npm run watch` but not shipped to end users): Blank Slate, Regular Wand, TW Pro, TW Funk, nClarity, nMobile, TW Scale Full, TW Direct Full, Token Wand UI, and a combined `showcase` file bundling the two "full" presets. These exist for internal testing/showcasing feature coverage (per-role solver overrides, `localBg`, color scoping, multi-theme, alpha tints) rather than as end-user starting points.

**First launch has no single default preset.** On first launch (no saved state), the plugin shows the **QuickStart** overlay — a picker over 8 curated presets (`QuickStart.tsx`'s `QUICK_START_PRESET_IDS`: Regular Wand, Material 3, Atlassian, Radix UI, Apple HIG, Tailwind CSS, IBM Carbon, Shopify Polaris), plus a "Browse Presets" link into the full Theme Shop. The user picks one; nothing is auto-applied.
