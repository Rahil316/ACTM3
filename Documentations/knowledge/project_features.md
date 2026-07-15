---
name: Feature registry
description: Full inventory of plugin features — implemented, needs work, and not yet started
type: project
---

Last updated: 2026-07-15
Source: direct code audit of `src/ui/`, `src/figma/`, `src/shared/` at HEAD (branch `edit/ColorLibraries`) — full rewrite, previous version (2026-05-22) described a vanilla-JS codebase (`preview.js`, `notifications.js`, `betaLab.js`, `el()` DOM factory) that no longer exists; the UI is now React/TypeScript throughout.

---

## ✅ Implemented — fully working

### Core engine

- Tonal scale generation — 8 algorithms (Natural, Uniform, Expressive, Symmetric, OKLCH, Material, Linear, Fidelity), `src/shared/engine/clrEngine.ts`.
- Direct mode — solves role colors directly to a target contrast via OKLCH binary-search solver, `src/shared/engine/solverEngine.ts`. **6 solver modes**, not 5: `natural`, `constant-chroma`, `symmetric`, `max-chroma`, `gamut-cusp`, `apca-natural`. The last two are new since 2026-05-22 — `gamut-cusp` holds chroma as a constant fraction of the seed's own gamut envelope; `apca-natural` uses the same gamut-relative chroma but searches for an APCA Lc target (converted from the WCAG-ratio target via a hand-fit anchor table) instead of a WCAG ratio. (A seventh mode, `hue-locked`, briefly existed and was removed 2026-07-15 — see `color-algorithm-roadmap.md`.)
- WCAG contrast calculation, plus a new APCA contrast implementation (`src/shared/colorMath/apca-vendor.ts`, `src/shared/colorMath/contrast.ts`) — used by `apca-natural`.
- HCT color space is now backed by a vendored copy of Google's own `material-color-utilities` `Hct` class (`src/shared/colorMath/hct-vendor/`), not hand-rolled CAM16 math — replaced after several hand-rolled-math bugs were found and root-caused (see `Documentations/knowledge/color-algorithm-roadmap.md`'s confirmed-issues section).
- Multi-theme output — any number of themes (not just light/dark), each a name + background hex, one Figma variable mode per theme.
- Semantic role mapping — roles mapped to tonal steps by contrast only. **There is no index-based mapping method** — a role-level `mappingMethod`/`variationTargets` concept from an earlier version of the codebase does not exist; every role resolves via `_mapByScaleContrast` (Scale mode) or `_solveDirectMode` (Direct mode), and contrast targets live on each `Variation` object's own `target` field.
- Variation levels — global `variations[]` list (name + shorthand + per-variation `target`).
- Per-role variation override — controlled by `useSharedRoleVariants: boolean` (note: **inverted polarity** from the old `customVariationList` name this doc previously used — `true` means roles share the global list, `false` means each role owns its own `variations[]`).
- `scaleSteps` — list of `{name, shorthand}` entries; `src/figma/config.ts` parses and passes to the engine for step naming.
- `alphaValues` — number array; there is no separate `includeAlphaTints` boolean. Alpha tint variables are written whenever `alphaValues` is non-empty AND `includeSourceColors` is true (both conditions gate `syncGlobalColors()` in `src/figma/figmaVars.ts`).
- Algorithm scoping — `useUniformAlgorithm` (one algorithm/solver for all colors) + `algorithmScopeLevel` (`"color"` / `"role"`). **Confirmed dead for Scale mode**: `_generateScales` reads `color.scaleAlgorithm` only, never `role.scaleAlgorithm` — `algorithmScopeLevel: "role"` has zero effect on which scale algorithm is used, despite a live per-role Algorithm dropdown existing in the UI (`RoleGroupCard.tsx`). Direct mode's equivalent (`_getSolverMode` reading `role.solverMode`) works correctly. See `color-algorithm-roadmap.md` for the full root cause.

### Figma variable output

- Scale collection (`_scale` by default) — full tonal ramp per color as Figma variables.
- `includeColorScalesCollection` toggle — gates whether the scale collection is written, via a single `skipScales` flag in `src/figma/figmaVars.ts` that *also* controls whether tokens alias or use raw hex (these are not independent — turning off the scale collection in Scale mode makes tokens fall back to raw hex, same as Direct mode. An earlier version of this doc's sibling docs incorrectly described these as independent; corrected 2026-07-15).
- Token collection — contextual role variables referencing scale steps (aliases) or embedded hex.
- There is no `resolveTokensDirectly` field. Raw-hex-instead-of-alias behavior is driven entirely by `skipScales` (`pluginMode === "direct"`, or `includeColorScalesCollection === false`, or the scale collection doesn't exist yet and sync scope excludes it).
- Source colors collection (`_constants` by default) — raw brand hex values, no theme processing; enabled by `includeSourceColors`.
- Alpha tint variables under `ColorName/Opacities/{n}` — see alphaValues note above.
- Variable descriptions — contrast metadata written into Figma variable descriptions; enabled by `includeDescriptions`.
- Stable `_id` rename detection — reorder/rename colors, roles, *and variations* (including per-role custom lists) without duplicate variable creation. **Correction:** an earlier version of this doc listed per-role variation rename tracking as a known gap — it is not; `src/figma/config.ts`'s `_getTokenRenames`/`getVarMap` tracks variation renames by `_id` for both the global list and per-role lists.
- Two persisted state slots, not one: `tw_ui_state` (auto-saved every store change, restored on next launch) and `tw_state` (written only after a successful sync, used as the rename/diff baseline).
- Four-stage sync (`VariableManager.sync()`), not three: scale collection → token collection → source colors → **purge orphaned variables** (structural-change cleanup; this stage was previously undocumented).

### Exports

11 formats via `buildExportBundle()` (`src/shared/exportEng/bundler.ts`) and the More-options export sheet — a large expansion from the CSS/SCSS/CSV/JSON set an earlier version of this doc listed:

- Token Wand Config (`.wand`) — full re-importable `projectStore` snapshot.
- CSS custom properties.
- SCSS variable maps + mixin.
- Tailwind config (`tailwind.config.js` + companion CSS).
- W3C Design Tokens (DTCG) JSON.
- Style Dictionary JSON.
- iOS/Swift (`{Theme}Colors.swift`).
- Android XML (`res/{qualifier}/colors.xml`, with a real qualifier-collision-avoidance algorithm for 3+ themes).
- React Native (typed TypeScript token objects).
- CSV audit sheet.
- JSON — raw `{scales, tokens, errors}` only, **not** the full plugin config (use `.wand` for that).

### UI (React/TypeScript, not the old vanilla-JS `el()`/innerHTML codebase)

- Component library: `src/ui/components/` (~35 components — Button, Input, Select, Toggle, Checkbox, TagInput, NumberStepper, SegmentedControl, modals/overlays, ConflictList, etc.) and `src/ui/components/cards/` (ColorGroupCard, RoleGroupCard, RoleSettingsSheet, ShopCard, VariationTable).
- Screens: ColorsScreen, RolesScreen, ProjectScreen (themes + Versions), ExportSheet, QuickStart, SaveVersionOverlay, SettingsOverlay, ThemeShopOverlay, PreviewScreen, RunDialog, plus dev-only CanvasPreviewDevOverlay/CanvasPreviewDevTree.
- Drag-to-reorder on color and role cards, preserved by `_id` tracking.
- Two independent notification systems: **Toast** (`src/ui/components/Toast.tsx` + `toastStore.ts` — small, bottom-center, max 5 stacked, 2s auto-dismiss) and **Banner** (`Banner.tsx` + `bannerStore.ts` — full-width, top-slot, dismissable, supports title/message/detail/actions, used for warnings and preset-load feedback).
- Preview screen (`PreviewScreen/`) — live token/scale/source preview with Scale/Theme/Source tabs and Grid/Table/Tree display modes; shows achieved contrast ratio + rating per token; explicitly labels Direct mode as "No scale in Direct mode — colors are solved directly per variation target."
- Run dialog — preflight check showing existing collections, sync preview counts (create/update/rename/**delete** — a `toDelete` count exists that an earlier BLUEPRINT.md version omitted), rename summary, structural-change warnings, name-conflict keep/revert toggles, and a **collections checklist** (two independent Scale/Tokens toggles plus a separate Source Colors toggle — not a 3-way "Everything/Scale Only/Roles Only" radio, contrary to an earlier version of this doc's sibling docs).
- Full-screen settings panel with **3 tabs**: Tokens, Labels (internally still keyed `"roles"` — only the display label changed), and Plugin. (An earlier version of this doc said 2 tabs — stale.)
- Settings Cancel/Done snapshot lifecycle — unchanged in behavior from earlier docs: snapshot taken on open, Cancel reverts + clears, Done clears + force-saves, autosave is fully paused while a snapshot is active (so closing the plugin mid-edit without Cancel/Done behaves like Cancel).
- **Saved States / version history — fully shipped, not a placeholder.** `ProjectScreen.tsx`'s `VersionsScreen`: save a named/described snapshot of the current config (`saveVersion`), then list/restore/rename/delete/export-as-`.wand` any saved version. An earlier version of this doc listed this as "non-functional, placeholder visible in UI" — that is no longer true.
- UI Scale + Theme preference (persisted in Figma clientStorage).
- Keyboard shortcuts (`useKeyboardShortcuts.ts`), including Alt+L which opens a `"design-lab"` overlay value that is a dead alias routing to the same `ExportSheet` as normal export — there is no actual "Design Lab" beta feature behind it.
- Tag paste support in `TagInput.tsx` — pasting a comma- or whitespace-separated string splits it into multiple tags at once.

### Build

- `npm run build` — typecheck + lint + presets + Vite UI bundle + esbuild figma bundle → `dist/scripts.js` + `dist/ui.html`.
- `npm run build:release` — same, release mode: dev-only presets (`src/shared/presets/raw/dev/*`) excluded, `console.log` stripped, `manifest.json` written → `dist-release/`.
- No test suite exists (`test`/`test:watch` are not wired in `package.json`; the `tests/` directory that once existed for `clrEngine.ts` was removed in a later cleanup pass). QA is `typecheck` (tsc) + `lint` (eslint) only. A separate, unrelated `test-data/` harness exists for engine stress-testing (config-matrix generation, run, analyze, HTML dashboard) — not a unit test suite, and excluded from `npm run check`.

---

## 🔧 Implemented but needs verification / polish

- **Role-scoped scale algorithm** — the per-role Algorithm dropdown in Scale mode is fully wired through the UI and persisted, but has zero effect on engine output (`_generateScales` never reads `role.scaleAlgorithm`). Needs either a real fix or clear UI messaging that this control does nothing in Scale mode. See `color-algorithm-roadmap.md`.
- **`apca-natural` solver mode** — functional, but its WCAG-target-to-Lc conversion is a hand-fit anchor table (6 sample hues), not a reference APCA implementation with real font-size/weight lookup tables. Treat as experimental.
- **Alpha tints in Preview screen** — not confirmed whether `PreviewScreen`'s Source tab visually renders alpha/opacity tokens; verify.
- **Two independent, parallel token-naming implementations** — `src/figma/variableTracker.ts`'s `makeLabelHelpers` (used for Figma sync) and `src/shared/exportEng/helpers.ts`'s `_colorLabel`/`_roleLabel`/etc. (used for file export) implement the same `tokenNameSegments`/shorthand logic independently. Both are currently correct and consistent, but a future naming-rule change must be applied in both places or the two output paths will silently diverge.

---

## ⚠️ UI state with no engine effect

| Field                          | Notes                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `role.scaleAlgorithm` (Scale mode) | Fully wired in UI/persistence/export; silently ignored by `_generateScales`. See "needs verification" above. |

No other dead fields confirmed as of 2026-07-15 — a fresh audit of `ProjectStore` found every other field wired to a UI control and consumed by the engine or sync pipeline somewhere.

---

## 🚧 Designed but not yet implemented

- **Role Labels CSV** — bulk-rename all variation levels via comma-separated string (seen in the original settings PDF mockup; not in current UI — the only way to rename a variation is per-row inline in the variation list).
- **Language selector** — UI placeholder only, no i18n infrastructure.
- **Beta Features section** — no real content; only a dead `"design-lab"` overlay alias exists (see UI section above).
- **About Token Wand section** — feedback link + learn more link, not implemented.

---

## ❌ Not started — future roadmap

- **Pro mode** — concept referenced historically (`ProModeBeta`-style branch names); feature set undefined, no implementation.
- **Undo/redo** — noted gap, no plans.
- **Inline validation feedback** — per-field error display instead of a full error overlay.
- **Algorithm equalizer** — full brainstorm in `Documentations/knowledge/color-algorithm-roadmap.md` §3; explicitly dropped from scope when the "ultimate algorithm" idea shipped as `Fidelity` (Scale mode) and later `gamut-cusp`/`apca-natural` (Direct mode) — pinned, not scheduled.
