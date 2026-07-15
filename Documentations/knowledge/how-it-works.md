# How It Works

## Architecture: Two-Thread Figma Plugin Model

A Figma plugin runs in two isolated JavaScript contexts that communicate by message-passing.

- **UI thread** — the `<iframe>` loaded from `dist/ui.html`. Built from `src/ui/` via Vite. It holds all application state, renders the interface, handles user interaction, and posts messages to the main thread when the user triggers a sync.
- **Figma sandbox thread** (`dist/scripts.js`) — built from `src/figma/` via esbuild. Runs inside Figma's sandbox with access to the Figma API. It receives messages from the UI, calls the color engine, writes variables to the document, and posts results back.

No shared memory exists between threads. Every data exchange is a serialized message via `figma.ui.postMessage` (main → UI) and `parent.postMessage` (UI → main).

Config is persisted by the main thread under **two** separate `figma.root.setPluginData` keys, not one (`src/figma/index.ts:95-96`):

- `"tw_ui_state"` — auto-saved on every UI store change; what gets restored into the editor on next launch.
- `"tw_state"` — written only after a successful `VariableManager.sync()`; the rename/diff baseline used by `buildVariableRenameMap()`.

On `ui-ready`, the main thread reads both and sends them together: `figma.ui.postMessage({ type: "load-config", state: uiState, syncedState })` (`src/figma/index.ts:96-100`). `state` falls back to `syncedState` if no UI-state save exists yet (first sync before any further edits).

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
     │     _mapByScaleContrast(): walk scale for first step ≥ variation.target     │
     │                                                                              │
     └── Direct mode ───────────────────────────────────────────────────────────────┤
         _solveDirectMode() — for each role/variation:                             │
         solveColorForContrast(src, target, bg, mode)                              │
         binary-search OKLCH L until contrast ≥ variation.target                  │
                                                                                    ▼
                                               { scales, tokens, errors }
                                               variableMaker() return value
                                                          │
                                               VariableManager.sync()
                                               → Figma variable collections
```

> **Note:** There is no `role.mappingMethod` field and no index-pinning mapping method (`_mapByIndex`) anywhere in the codebase. Every role in Scale mode is resolved by `_mapByScaleContrast` only — there is nothing else to dispatch to. Contrast targets live on each `Variation` object's `target: number` field, not a role-level `variationTargets` array; the variations iterated for a role are `role.variations ?? globalVariations` (see `useSharedRoleVariants` below).

---

## Scale Mode Pipeline

> **Path update (2026-07-15):** `src/shared/clrEngine.ts` was split into `src/shared/engine/clrEngine.ts` (scale algorithms + mode dispatch — everything cited in this section and the next) and a new `src/shared/engine/solverEngine.ts` (Direct mode's `solveColorForContrast` and its solver-mode machinery — see the Direct Mode Pipeline section below). All citations below use the new paths.

1. **`scaleMaker(hexIn, scaleLength, scaleAlgo)`** — generates an array of N hex colors from light to dark. Steps are spaced geometrically in log-luminance (`engine/clrEngine.ts:258-264`: `uMax`/`uMin` bound a log-luminance range, `u` is linearly interpolated across the N steps in `stepLum`, then exponentiated back to a luminance target) so perceptual contrast between adjacent steps is consistent across the full lightness range. **Caveat:** for `Natural`/`Uniform`/`Expressive`/`Symmetric`, the actual binary search that hits this luminance target operates in HSL lightness via plain sRGB relative luminance, which is not hue-uniform — see `Documentations/knowledge/color-algorithm-roadmap.md`'s "Confirmed issues" entry on this. `OKLCH`/`Material`/`Fidelity` search in genuinely perceptual coordinates instead and don't have this skew.

2. **`_generateScales()`** — calls `scaleMaker` for each color. For every step, it stores (`engine/clrEngine.ts:326-339`): `value` (hex), `stepName` (**not** the bare step key — it's `` `${color.name}-${step}` ``, e.g. `Primary-12`, hyphen-joined and distinct from the `/`-joined Figma variable path built later by `makeLabelHelpers`), `shorthand` (`` `${color.shorthand}-${step}` ``), `description`, and pre-computed `contrast` keyed by theme name (`{ ratio, rating }` per theme).

3. **`_processScaleMode()`** — for each role and each variation, calls **`_mapByScaleContrast()`** — the only mapping path in Scale mode. It walks the scale steps in order (light→dark on light themes, dark→light on dark themes) and returns the first step whose contrast ratio against the effective background is `≥ variation.target`. If no step meets the target, it falls back to the highest-contrast step available and emits a warning (`isAdjusted: true`).

---

## Direct Mode Pipeline

There is no tonal scale. For each role and variation, `_solveDirectMode()` (`engine/clrEngine.ts:351`) calls a function of the same name, but it now lives in a separate file:

```
solveColorForContrast(sourceHex, targetContrast, bgHex, solverMode)
```

— `src/shared/engine/solverEngine.ts:199`, not `clrEngine.ts` (the engine was split 2026-07-15; see the note at the top of the Scale Mode Pipeline section above).

This function binary-searches OKLCH lightness (L, 0–1) while shaping chroma (C) according to the chosen solver mode, until the contrast of the output against `bgHex` is `≥ targetContrast` — WCAG ratio for six of the seven modes, APCA Lc for `apca-natural` (see below). The solver guarantees it never undershoots on the metric it's targeting.

There are **six** solver modes — `gamut-cusp` and `apca-natural` were added later; `hue-locked` was removed entirely as of 2026-07-15 (it was a no-op alias for `natural`, see the caveat this section used to carry, now in `color-algorithm-roadmap.md`'s history):

| Mode              | Chroma behavior                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `natural`         | C tapers as L moves away from mid — most natural-looking results                                                                                                                                                                                                                      |
| `constant-chroma` | C held fixed at seed value — maximum color retention throughout the scale                                                                                                                                                                                                             |
| `symmetric`       | C follows a bell curve peaking at mid-L, collapsing toward zero at white and black                                                                                                                                                                                                    |
| `max-chroma`      | L solved for contrast, then C pushed to maximum in-gamut value at that L                                                                                                                                                                                                              |
| `gamut-cusp`      | C held as a constant _fraction_ of the seed's own gamut envelope (`_gamutRelativeChroma`, `solverEngine.ts:102`), scaled per candidate L; searches for the WCAG target                                                                                                                |
| `apca-natural`    | Same gamut-relative chroma as `gamut-cusp`, but the bisection (`_searchLApca`, `solverEngine.ts:160`) targets an APCA Lc value converted from the WCAG-ratio target via a hand-fit anchor table (`WCAG_TO_LC_ANCHORS`, `solverEngine.ts:47`), not a real APCA font-size/weight lookup |

---

## Per-Role Variation Override

By default (`useSharedRoleVariants: true`), every role uses the global `variations` list — a role's own `variations` field is `null`, which `clrEngine` reads as "defer to global" (`role.variations ?? globalVariations`).

When `useSharedRoleVariants` is `false`, each role owns its own populated `variations` array instead, substituted in place of the global list for that role only. There is no separate `customVariationList`/`customVariations` field pair — `useSharedRoleVariants` is the single toggle, and its polarity is the opposite of what a `customVariationList: true` name would suggest (the flag is _true_ when roles share the global list, not when they have custom ones).

This path is taken in both `_processScaleMode` and `_solveDirectMode` via the identical `role.variations ?? globalVariations` fallback (`engine/clrEngine.ts:402`, `engine/clrEngine.ts:361`) — not a guard in `projectStore.ts`. The UI-side backfill logic that keeps saved state consistent with this toggle (`ensureVariations()`) does live in `src/ui/store/projectStore.ts`.

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

- **`useUniformAlgorithm`** — when `true` (default), all colors use the global `scaleAlgorithm`/`solverMode`. When `false`, per-color or per-role overrides apply per `algorithmScopeLevel`.
- **`algorithmScopeLevel`** — `"color"` (default) or `"role"`. Priority chain in `_getSolverMode` (`engine/clrEngine.ts:345-349`): (1) `useUniformAlgorithm !== false` → always `config.solverMode`, ignoring role/color; (2) `algorithmScopeLevel === "role"` → `role.solverMode ?? config.solverMode`; (3) else → `color.solverMode ?? config.solverMode`.

**Scale mode caveat — role-scoping is dead here.** The priority chain above is real, but only for **Direct mode's solver**. In **Scale mode**, `_generateScales` (`engine/clrEngine.ts:313`) reads `color.scaleAlgorithm` only — `role.scaleAlgorithm` is never consulted anywhere in the pipeline, so `algorithmScopeLevel: "role"` has no effect on which scale algorithm gets used. This is a known, documented gap (`Documentations/knowledge/color-algorithm-roadmap.md`'s "Confirmed issues" section) — the field is fully wired through the UI (a live per-role Algorithm dropdown exists, is persisted, and is exported), so users can set it believing it does something, and it's silently ignored. Structurally this follows from the one-scale-per-color data model (a scale is generated once per color; two roles sharing that color's scale can't each get a different ramp) — but nothing in the UI currently communicates the limitation.

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

### Direct mode / `includeColorScalesCollection: false`

There is no `resolveTokensDirectly` field anywhere in the codebase — the real gate is a single computed flag, `skipScales` (`src/figma/figmaVars.ts:85`):

```
skipScales = config.pluginMode === "direct"
          || config.includeColorScalesCollection === false
          || (!scaleColExists && scope !== "all" && scope !== "scale")
```

Whenever `skipScales` is true — whether because `pluginMode === "direct"`, or because `includeColorScalesCollection` was turned off in Scale mode, or because the scale collection doesn't exist yet and the sync scope excludes it (third disjunct, see below) — **both** of the following happen together, not independently:

```
color tokens collection
  └── Primary/Background/Subtle  (COLOR, hex value — no alias)
```

Hex values are written directly into token variables, and the `_scale` collection is not created (or, if it already exists from a prior sync, is simply not touched by this run). **Correction:** an earlier version of this doc claimed `includeColorScalesCollection: false` still aliases tokens to scale variables while only suppressing the collection — that is wrong. `figmaVars.ts:182` (`if (skipScales) { value = token.value; } else { ...VARIABLE_ALIAS... }`) uses the exact same `skipScales` flag to decide both things at once. Turning off `includeColorScalesCollection` in Scale mode produces raw-hex tokens, identical in kind to Direct mode — not scale-backed aliases with a hidden collection.

---

## Figma Variable Sync: Four Stages

`VariableManager.sync()` writes to Figma in **four** sequential stages, not three:

1. **Scale collection** (`_scale` by default, name from `scaleCollectionName`, `figmaVars.ts:98`) — writes one `COLOR` variable per color × step. Skipped whenever `skipScales` is true (see above — covers `pluginMode: "direct"`, `includeColorScalesCollection: false`, and the not-yet-existing-collection-plus-narrow-scope case).

2. **Token collection** (`color tokens` by default, name from `tokenCollectionName`, `figmaVars.ts:138`) — writes one `COLOR` variable per color × role × variation × theme-mode. Values are Figma variable aliases pointing into stage 1 when `skipScales` is false; raw hex when `skipScales` is true.

3. **Source colors collection** (name from `sourceCollectionName`, default `"_constants"`, `figmaVars.ts:216` via `syncGlobalColors()`) — writes raw brand hex values as a separate single-mode collection. Enabled by `includeSourceColors: true`. Alpha tint variables (e.g. `Red/Alpha/10`, `Red/Alpha/25`) are also written here when `alphaValues` is non-empty.

4. **Purge orphaned variables** (`figmaVars.ts:229-235`, via `purgeOrphanedVars()`) — deletes variables left behind by a structural change (mode switch, scale shrink, collection rename/removal, alpha value removed, etc. — see `StructuralChangeKind` in `BLUEPRINT.md`). Only runs when `structuralChanges.length > 0`; contributes to `tally.removed`.

---

## Rename-Safety: The `_id` System

Every color, role, and theme carries a stable `_id` field generated at creation time (`generateId()` in `src/ui/store/projectStore.ts`). The rename-safety system in `buildVariableRenameMap()` (`src/figma/config.ts:156` — **not** `variableTracker.ts`) uses `_id` — not array position — to track identity.

When the user renames a color from "Primary" to "Brand/Primary", the function compares saved state to new state by matching `_id` values, detects the label change, and produces a rename map:

```
{ "Primary/12": "Brand/Primary/12", ... }
```

`applyRenames()` (`src/figma/figmaVars.ts:40` — a method on `VariableManager`, **not** in `variableTracker.ts`) executes this map before upserting, using a two-pass strategy (`figmaVars.ts:46-68`) to handle chain renames (A→B when B is being renamed to C). The result: existing Figma variables are renamed in place rather than deleted and recreated.

Variation renames — including per-role custom lists, not just the global list — **are** tracked, contrary to an earlier version of this doc. `_getTokenRenames`'s `getVarMap` (`src/figma/config.ts:236-245`) reads `roleItem?.variations ?? cfg.variations` and matches entries by each `Variation`'s own `_id`, so renaming a variation — global or per-role — renames the existing Figma variable rather than creating a new one.
