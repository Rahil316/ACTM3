# How It Works

## Architecture: Two-Thread Figma Plugin Model

A Figma plugin runs in two isolated JavaScript contexts that communicate by message-passing.

- **UI thread** — the `<iframe>` loaded from `dist/ui.html`. It holds all application state, renders the interface, handles user interaction, and posts messages to the main thread when the user triggers a sync.
- **Main thread** (`dist/scripts.js`) — runs inside Figma's sandbox with access to the Figma API. It receives messages from the UI, calls the color engine, writes variables to the document, and posts results back.

No shared memory exists between threads. Every data exchange is a serialized message via `figma.ui.postMessage` (main → UI) and `parent.postMessage` (UI → main).

Config is persisted by the main thread using `figma.root.setPluginData("tw_state", JSON.stringify(projectStore))`. On the next launch, the main thread reads this string and sends it back to the UI as a `load-config` message.

---

## The Color Pipeline

Both modes share the same entry point and output contract. The difference is what happens between seed colors and token output.

```
Seed hex colors
     │
     ├── Scale mode ──────────────────────────────────────────────────────────────┐
     │   scaleMaker(hex, length, algo)                                             │
     │   → N-step hex[] (light → dark)                                            │
     │   _generateScales() — wraps all colors, stores contrast per theme          │
     │   _processScaleMode() — for each role/variation:                            │
     │     _mapByScaleContrast(): walk scale for first step ≥ variationTarget      │
     │     _mapByIndex(): pin variation to explicit step index                     │
     │                                                                              │
     └── Direct mode ───────────────────────────────────────────────────────────────┤
         _solveDirectMode() — for each role/variation:                             │
         solveColorForContrast(src, target, bg, mode)                              │
         binary-search OKLCH L until contrast ≥ variationTarget                   │
                                                                                    ▼
                                               { scales, tokens, errors }
                                               variableMaker() return value
                                                          │
                                               VariableManager.sync()
                                               → Figma variable collections
```

---

## Scale Mode Pipeline

1. **`scaleMaker(hexIn, scaleLength, scaleAlgo)`** — generates an array of N hex colors from light to dark. Steps are spaced geometrically in log-luminance so perceptual contrast between adjacent steps is consistent across the full lightness range.

2. **`_generateScales()`** — calls `scaleMaker` for each color. For every step, it stores the hex value, a `stepName`, and pre-computed contrast ratios against every theme background.

3. **`_processScaleMode()`** — for each role and each variation, delegates to one of two mapping methods:
   - **`_mapByScaleContrast()` (default, `mappingMethod: "contrast"`)** — walks the scale steps in order (light→dark on light themes, dark→light on dark themes) and returns the first step whose pre-computed contrast ratio against the theme background is `≥ variationTargets[vi]`. If no step meets the target, it falls back to the highest-contrast step available and emits a warning.
   - **`_mapByIndex()` (`mappingMethod: "index"`)** — treats each value in `variationTargets` as a zero-based array index into the scale. Pins the variation to that exact step, regardless of contrast.

---

## Direct Mode Pipeline

There is no tonal scale. For each role and variation, `_solveDirectMode()` calls:

```
solveColorForContrast(sourceHex, targetContrast, bgHex, solverMode)
```

This function binary-searches OKLCH lightness (L, 0–1) while shaping chroma (C) according to the chosen solver mode, until the WCAG contrast ratio of the output against `bgHex` is `≥ targetContrast`. The solver guarantees it never undershoots.

The five solver modes control how chroma changes as L is adjusted:

| Mode               | Chroma behavior                                                                |
| ------------------ | ------------------------------------------------------------------------------ |
| `natural`          | C scales linearly through the source C at source L — decreases toward extremes |
| `saturated`        | C held constant at source C — maximum color retention                          |
| `luminance`        | C drops parabolically near white and black — calm, desaturated at extremes     |
| `hue-locked`       | H fixed to source; C follows natural curve, gamut-clamped                      |
| `chroma-maximized` | L solved for contrast, then C pushed to maximum in-gamut value at that L       |

---

## Per-Role Variation Override

By default, every role uses the global `variations` list.

When a role has `customVariationList: true` and a non-empty `customVariations` array, the engine substitutes that array in place of the global list for that role only. The number of entries in `customVariations` must match the number of entries in the role's `variationTargets`.

This path is taken in both `_processScaleMode` and `_solveDirectMode` via the same guard in `store.js`:

```js
const roleVars = role.customVariationList && role.customVariations && role.customVariations.length > 0 ? role.customVariations : projectStore.variations;
```

---

## `variableMaker()` — Engine Entry Point

```
variableMaker(config) → { scales, tokens, errors }
```

- **`scales`** — flat object keyed by color name → step name → `{ value, stepName, shorthand, description, contrast }`. Empty object in Direct mode.
- **`tokens`** — nested object keyed by theme name → color name → role index → variation index → token data object. Token data includes `value`, `tokenRef` (scale step name, or `null` in Direct mode), `contrast`, `contrastTarget`, and `isAdjusted`.
- **`errors`** — `{ critical: [], warnings: [], notices: [] }`. Warnings when a contrast target is unachievable; notices when chroma is reduced for gamut-fitting.

`variableMaker` is pure and stateless.

---

## Token Naming

The Figma variable path for each token is assembled in `VariableManager.sync()` using two config fields:

- **`tokenNameSegments`** — an array controlling segment order and presence, e.g. `["color", "role", "variation"]` or `["color", "variation"]` (no role segment).
- **Shorthand flags** — `useShorthandColors`, `useShorthandRoles`, `useShorthandVariations`, `useShorthandSteps`. When enabled, the shorthand string replaces the full name in the path.

The `/` character in any name segment creates a Figma variable folder group.

---

## Algorithm Scoping

Two fields control how scale algorithms and solver modes are assigned per color:

- **`useUniformAlgorithm`** — when `true` (default), all colors use the global `scaleAlgorithm`. When `false`, each color can specify its own `color.scaleAlgorithm` field.
- **`algorithmScopeLevel`** — `"color"` (default) or `"role"`. In Direct mode with `useUniformAlgorithm: false`, this controls whether solver mode is read from `color.solverMode` or `role.solverMode`.

---

## Figma Variable Alias Chain

### Scale mode (default)

```
_scale collection
  └── Primary/12  (COLOR, hex value)

color tokens collection
  └── Primary/Background/Subtle  → VARIABLE_ALIAS → _scale/Primary/12
```

Token variables alias into scale variables. Changing a seed color regenerates the scale hex values; all token aliases update automatically in Figma.

### Direct mode / `resolveTokensDirectly: true`

```
color tokens collection
  └── Primary/Background/Subtle  (COLOR, hex value — no alias)
```

Hex values are written directly into token variables. The `_scale` collection is not created.

### `includeColorScalesCollection: false`

Same result as Direct mode above — the `_scale` collection is suppressed even in Scale mode. Tokens still alias scale variables; the scale collection just isn't written. (This flag is wired in `config.js` and checked in `figmaVars.js`.)

---

## Figma Variable Sync: Three Stages

`VariableManager.sync()` writes to Figma in three sequential stages:

1. **Scale collection** (`_scale` by default, name from `scaleCollectionName`) — writes one `COLOR` variable per color × step. Skipped when `resolveTokensDirectly: true`, `pluginMode: "direct"`, or `includeColorScalesCollection: false`.

2. **Token collection** (`color tokens` by default, name from `tokenCollectionName`) — writes one `COLOR` variable per color × role × variation × theme-mode. In Scale mode, values are Figma variable aliases pointing into stage 1. In Direct mode or when `resolveTokensDirectly` is true, values are raw hex.

3. **Source colors collection** (name from `sourceCollectionName`, default `"_constants"`) — writes raw brand hex values as a separate single-mode collection. Enabled by `includeSourceColors: true`. Alpha tint variables (`Opacities/10`, `Opacities/25`, etc.) are also written here when the sting is not empty.

---

## Rename-Safety: The `_id` System

Every color, role, and theme carries a stable `_id` field generated at creation time (`generateId()` in `store.js`). The rename-safety system in `buildVariableRenameMap()` uses `_id` — not array position — to track identity.

When the user renames a color from "Primary" to "Brand/Primary", the function compares saved state to new state by matching `_id` values, detects the label change, and produces a rename map:

```
{ "Primary/12": "Brand/Primary/12", ... }
```

`VariableManager.applyRenames()` executes this map before upserting, using a two-pass strategy to handle chain renames (A→B when B is being renamed to C). The result: existing Figma variables are renamed in place rather than deleted and recreated.

**Current limitation:** Per-role custom variation renames (when `customVariationList: true`) are not tracked by `buildVariableRenameMap`. Renaming a custom variation creates a new variable instead of renaming the existing one.
