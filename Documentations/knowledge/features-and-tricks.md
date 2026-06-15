# Features & Tricks

## Core Features

### Scale Mode with 7 Algorithms

Generates a tonal ramp of N steps from a seed hex color. Steps are distributed geometrically in log-luminance so perceptual contrast between adjacent steps is consistent across the full lightness range. Seven algorithms: Natural (recommended), Uniform, Expressive, Symmetric, OKLCH, Material, Linear. The `_scale` Figma variable collection stores the raw ramp.

### Direct Mode with 5 Solver Modes

Solves each token color directly to a WCAG contrast target without generating an intermediate tonal scale. The solver binary-searches OKLCH lightness while shaping chroma according to the chosen mode: `natural`, `constant-chroma`, `symmetric`, `hue-locked`, or `max-chroma`. Output always meets or exceeds the target contrast. Useful when exact per-token accessibility guarantees matter more than palette harmony.

### Per-Role Variation Override

A role can define its own variation set independently from the global list. Enable `customVariationList: true` on a role and provide `customVariations` with name and shorthand per slot. The engine uses these slots instead of the global list for that role only. Enable via the **Role-specific Variations** toggle in Token Settings, then toggle the per-role custom option on the role card.

### Mapping Method: Contrast vs Index (Scale Mode)

Two methods for mapping scale steps to role variations:

- **Contrast** (default, `mappingMethod: "contrast"`) — walks the scale for the first step whose pre-computed contrast ratio against the theme background is `≥ variationTargets[i]`. Walk direction reverses for dark themes.
- **Index** (`mappingMethod: "index"`) — treats `variationTargets[i]` as a zero-based step index. Pins the variation to that exact position regardless of contrast.

### Algorithm Scoping

By default (`useUniformAlgorithm: true`), all colors use the single global algorithm. When disabled, each color card exposes its own algorithm/solver dropdown. `algorithmScopeLevel` controls whether per-color or per-role solver mode is used in Direct mode.

### Alpha Tints

When `includeAlphaTints` is enabled, the plugin writes opacity variants of each seed color into the source color collection. Percentages are configurable via `alphaValues` (e.g. `10, 25, 50, 75, 90`). Variable names follow the pattern `ColorName/Opacities/10`. Written as RGBA values with fractional alpha.

### Source Colors Collection

Writes the raw seed hex values into a separate Figma variable collection (name from `sourceCollectionName`, default `_constants`). One mode only, never changes per theme, not aliased into the token collection. Enable via `includeSourceColors: true`.

### Resolve Tokens Directly (formerly Embed Directly)

When `resolveTokensDirectly: true`, token variables store hex values instead of Figma variable aliases. The `_scale` collection is not created. Controlled via the **Link tokens to color scale** toggle in Token Settings (when off = resolve directly).

### Variable Descriptions

When `includeDescriptions` is enabled, the engine writes metadata into each Figma variable's description field. For scale variables: contrast ratios against all themes. For token variables: the role description plus the theme name. Adjusted tokens are flagged with a warning marker.

### Stable Rename Safety (`_id` Tracking)

Every color, role, and variation carries a stable `_id` generated at creation. When names change, the engine compares saved state to new state by `_id` — not by array position — and builds a rename map. Existing Figma variables are renamed in place, preserving all component references. Reordering by dragging is safe. **Limitation:** Per-role custom variation renames are not tracked.

### Token Name Segments

The Figma variable path for each token is assembled from segments in a configurable order (`tokenNameSegments`). Accepts any permutation of `["color", "role", "variation"]`, or a 2-element array to omit the role segment. Combined with shorthand flags, this produces naming patterns from `Brand/Primary/Text/Default` to `Blue/500`.

### Shorthand Compression

Four independent shorthand toggles: `useShorthandColors`, `useShorthandRoles`, `useShorthandVariations`, `useShorthandSteps`. When enabled, the shorthand string replaces the full name in Figma variable paths.

### Multi-Theme

Each theme is a name + background hex. The token collection gets one Figma variable mode per theme. On Figma free plan, only one mode per collection is allowed (the plugin detects this and warns).

### Scale Step Labels

Override the default numeric step names by adding step label entries (each has a name and optional shorthand). Steps without labels are numbered 1…N. Labels appear in `_scale` collection variable names and in token descriptions.

### Suppress Scale Collection

`includeColorScalesCollection: false` suppresses the `_scale` ramp collection from being written to Figma. Tokens in Scale mode still alias scale variables internally; the Palettes collection is simply not created. Controlled via the **Palettes collection** toggle in Token Settings.

---

## Tricks

### 1. Folder Nesting with `/`

Any `/` in a color name, role name, or variation name creates a nested folder group in the Figma variable panel. Use `Brand/Primary`, `Status/Error`, `Surface/Raised`, `State/Hover` to build a clean hierarchy.

### 2. Flat Tailwind-style Names

Set `tokenNameSegments: ["color", "variation"]` (no role) and enable `useShorthandColors` + `useShorthandVariations`. With shorthand color `bl` and variation shorthand `500`, the output is `bl/500`. With full names: `Blue/500`. This is how the Tailwind CSS preset works.

### 3. Scope: Roles Only for Fast Iteration

After the initial sync, most changes touch only the semantic layer. Use **Scope: roles** in the Run dialog to skip scale regeneration. The token collection is rebuilt; the `_scale` collection is untouched. Significantly faster on large systems.

### 4. Resolve Tokens Directly for Static Exports

`resolveTokensDirectly: true` writes hex values directly into token variables instead of Figma aliases. The `_scale` collection is not created. Use when: (a) consumers copy hex values rather than consuming variable aliases, (b) you are generating a static CSS/JSON export, or (c) you are using Direct mode.

### 5. Source Colors as Brand Primitives

Enable `includeSourceColors` and set `sourceCollectionName` to `brand`, `_constants`, or a name matching your team's convention. Give the collection to developers as a fixed reference. On rebrand, update the seed hex in the plugin and re-sync both collections.

### 6. Alpha Tints for Overlay Colors

Enable **Source Colors** then **Alpha Tints** and configure `alphaValues` (e.g. `10, 25, 50, 75, 90`). The plugin writes RGBA variables at `ColorName/Opacities/10`, `ColorName/Opacities/25`, etc. Use for overlays, scrim layers, focus rings, and hover states.

### 7. Per-Role Override for Status Colors

Status colors need four specific slots: tinted background, solid background, foreground text/icon, and border. Enable **Role-specific Variations** globally, then toggle custom variations on the status role and define `customVariations: ["BG/Subtle", "BG/Default", "FG/Default", "Border"]` with `variationTargets: [1.3, 1.8, 4.5, 2.5]`.

### 8. TW Regular as the Fastest Starting Point

Load TW Regular from the Theme Shop. It provides a 12-role semantic system (Background, Background/Subtle, Surface, Surface/Raised, Border, Border/Strong, Fill, Fill/Strong, Text/Muted, Text, Text/Strong, Text/Inverse) with 5 variations each, light and dark themes, Natural algorithm at 25 steps. Change the three seed colors, click Run.

### 9. Variable Descriptions for Accessibility Audits

Enable descriptions in Token Settings. After sync, open the Figma variables panel and the description shows the achieved WCAG contrast ratio and rating (Fail / AA / AAA). Adjusted tokens are marked with a warning.

### 10. Preview Before Sync

The Preview tab shows all computed token hex values — hex colors, contrast ratios, and which scale step each token maps to — before writing anything to Figma.

### 11. JSON Export for Version Control

The JSON export contains the complete plugin state: all colors, roles, variations, themes, and settings. Commit this file alongside the codebase to version-control the token configuration. Import it to restore the exact state on any Figma file.

### 12. Drag to Reorder Without Breaking References

Colors and roles can be reordered by dragging. The `_id` tracking system ensures the correct Figma variables are renamed, not recreated. All uses in components and shared libraries remain intact after the next sync.

---

## Preset Quick Reference

| Preset            | Mode   | Algorithm  | Colors | Roles | Themes                      | Best for                                          |
| ----------------- | ------ | ---------- | ------ | ----- | --------------------------- | ------------------------------------------------- |
| TW Regular        | Scale  | Natural    | 3      | 12    | Light, Dark                 | General product design system — fastest start     |
| TW Pro            | Direct | Natural    | 4      | 16    | Light, Dark, Brand          | Comprehensive system, all features enabled        |
| TW Funk           | Direct | Expressive | 3      | 14    | Light, Dark, Vivid          | Bold creative, marketing, gaming                  |
| Apple HIG         | Direct | Natural    | 5      | 8     | Light, Dark                 | iOS/macOS apps, semantic label/fill hierarchy     |
| IBM Carbon        | Scale  | Uniform    | 5      | 13    | White, Gray-10, Gray-90, Gray-100 | Enterprise, data-heavy, Carbon compliance   |
| Material Design 3 | Scale  | Natural    | 5      | 11    | Light, Dark                 | Android, Material You, HCT tonal palette          |
| Shopify Polaris   | Direct | Natural    | 6      | 14    | Light, Dark, Inverse        | Shopify admin, Polaris token names                |
| Tailwind CSS      | Scale  | Natural    | 4      | 1     | Light                       | Utility CSS, Tailwind-matched 11-stop scale       |
| Radix UI          | Scale  | Natural    | 4      | 1     | Light, Dark                 | React component libraries, Radix 12-step scale    |
| Blank Slate       | Scale  | Natural    | 2      | 3     | Light, Dark                 | Learning, starting from scratch, minimal setup    |
