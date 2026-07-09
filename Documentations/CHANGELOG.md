# Token Wand — Changelog

Entries are in reverse-chronological order. Each entry covers a logical unit of work, not necessarily a single commit.

---

## [Unreleased]

### Screens Layer — Bug Fixes and Structural Refactor

A targeted audit and cleanup of the entire `src/ui/screens/` layer. Addressed five real bugs, eliminated ~400 lines of structural duplication between `ColorsScreen` and `RolesScreen`, and applied several minor cleanups across the run dialog and preview screen.

---

#### Bug Fixes

**Bug 1 — `usePersistedString` defined inside a component (`PreviewScreen.tsx`)**

A custom hook was defined inside `PreviewContent`, violating React's Rules of Hooks. Any early return above its call site would cause a "hooks called in different order" crash at runtime.

- `src/ui/hooks/usePersistedString.ts` *(new)* — Hook extracted to module level. Generic `usePersistedString<T extends string>(key, default)` — reads initial value from `localStorage`, persists on every set, silently ignores storage errors.
- `src/ui/screens/PreviewScreen.tsx` — Inline definition removed; import added.

---

**Bug 2 — `ModeSettings` called as a plain function, not a component (`SettingsOverlay.tsx`)**

`ModeSettings` was a JSX-returning function invoked as `{ModeSettings(isScaleMode)}` rather than `<ModeSettings ... />`. React does not reconcile plain function calls as components — no stable keys, no hook lifecycle. Any future `useState`/`useEffect` inside it would silently corrupt state.

- `src/ui/screens/SettingsOverlay.tsx` — `ModeSettings` converted to a proper named component defined above its parent. Call site changed to `<ModeSettings isScale={isScaleMode} ... />`.

---

**Bug 3 — Missing `skipScales` in `useEffect` dependency array (`RunDialog.tsx`)**

`skipScales` (derived from `projectStore.pluginMode` / `includeColorScalesCollection`) was used inside a `useEffect` that initialises the sync scope on dialog open, but was absent from the dependency array. If those settings changed between opens, the scope was initialised with a stale value.

- `src/ui/screens/run-dialog/RunDialog.tsx` — `skipScales` added to `useEffect` deps.

---

**Bug 4 — `useProjectStore.getState()` inside delete callbacks (`ColorsScreen.tsx`, `RolesScreen.tsx`)**

`handleDelete` in both screens called `useProjectStore.getState().removeColor/Role(i)` — bypassing React's subscription model and reading stale indices under concurrent rendering. Fixed as part of the `useEntityTreeState` extraction below.

---

**Bug 5 — Flat-mode `MultiSelectToolbar` in `RolesScreen` inlined all callbacks**

The flat-mode `MultiSelectToolbar` re-inlined `handleGroup`, `handleUngroup`, and `handleDelete` rather than using the named handlers defined earlier in the same component. The two implementations would silently diverge on any future edit. Fixed as part of the `useEntityTreeState` extraction below.

---

#### `useEntityTreeState` — Shared Hook for Tree/DnD/Selection Logic

**Problem.** `ColorTree` and `RoleTree` were structural clones — every drag handler, selection handler, keyboard shortcut, and group operation was copy-pasted, differing only in `colors/roles`, `setColor/setRole`, `moveColor/moveRole`. ~400 lines duplicated across two files.

**Changes.**

- `src/ui/hooks/useEntityTreeState.ts` *(new)* — Generic `useEntityTreeState<T extends { _id?: string; name: string }>`. Accepts `{ items, setName, move, remove, addChild, collapsed, setCollapsed }`. Owns all DnD state (`dndId`, `sensors`, `allIds`, `activeId`, `overGroupPath`), selection state (`selectedIds`, `toggleSelect`, keyboard shortcuts), group operations (`handleGroup`, `handleUngroup`, `handleDelete`, `renameGroup`, `ungroup`, `collapseAll`), and drag handlers (`handleDragStart`, `handleDragOver`, `handleDragEnd`). `remove` is passed as a subscribed action — never calls `getState()` (fixes Bug 4).
- `src/ui/screens/ColorsScreen.tsx` — `ColorTree` rewritten to ~40 lines: accepts `treeState` from parent, uses `colors[idx]` for `ColorGroupCard` lookups. `ColorsScreen` owns the `useEntityTreeState` call and passes state down. Flat-mode body uses hook's `sensors`/`selectedIds`/`toggleSelect`/`handleGroup` etc. — no duplicate local state. `~250 lines removed`.
- `src/ui/screens/RolesScreen.tsx` — Same pattern. `RoleTree` rewritten; flat-mode `MultiSelectToolbar` now uses named handlers from the hook (fixes Bug 5). `~280 lines removed`.

---

#### Issue 6 — Conflict Callout in `ChangesTab`

**Problem.** The `conflicts` prop was used only for the `isEmpty` check. If there were conflicts but zero preview items, the tab body was empty with no indication of why.

**Changes.**

- `src/ui/screens/run-dialog/tabs/ChangesTab.tsx` — Renders a `<Callout variant="warning">` above the preview list whenever `conflicts.length > 0`, directing users to the Summary tab for resolution.

---

#### Issue 7 — `ratingFromRatio` Duplicated from `clrUtils`

**Problem.** `useHealthReport.ts` defined a local `ratingFromRatio(ratio)` with the same WCAG thresholds already embedded in `clrUtils.contrastRating`. Two sources of truth for the same thresholds.

**Changes.**

- `src/shared/clrUtils.ts` — `ratingFromRatio(ratio: number): ContrastRating` extracted as a named export. `contrastRating` refactored to call it internally.
- `src/ui/screens/run-dialog/tabs/health/useHealthReport.ts` — Local `ratingFromRatio` deleted; import added from `clrUtils`.

---

#### Issue 9 — `TableSection` / `RoleTableSection` Merged in `PreviewScreen`

**Problem.** Both components shared an identical 5-column token row (swatch → hex → ratio → WCAG → token name) with click-to-copy. They differed only in which axis was the top-level header.

**Changes.**

- `src/ui/screens/PreviewScreen.tsx` — `TableSection` and `RoleTableSection` replaced by:
  - `TokenRow` — shared token row component; extracted once, used by both axes.
  - `TokenTableSection` — discriminated union prop `groupAxis: "color" | "role"`. Color axis: source hex header, role sub-headers. Role axis: ink-tinted header, color sub-headers with swatch. ~110 lines removed.

---

#### Minor Cleanups

| File | Fix |
|---|---|
| `ProjectScreen.tsx` | Removed `arrayMove` dead code and `void reordered` suppression — `moveTheme(oldIndex, newIndex)` called directly. `arrayMove` import removed. |
| `useRunDialogState.ts` | Removed pointless `setScope: (v) => setScope(v)` wrapper — replaced with `setScope` directly. |
| `SyncPreviewItemList.tsx` | Replaced 4× `.filter()` passes with a single `.reduce()` computing all four action counts in one pass. |
| `HealthTab.tsx` `InversionRow` | Merged 3 separate `useProjectStore` subscriptions into one selector returning `{ roles, scaleLength, canEditNames }`. |
| `SummaryTab.tsx` | Moved `ChipVariant` type and `CHIP_BG` constant to sit directly above `StatChip` where they're used. Removed orphaned `// ── Stat chip ──` comment that was left ~130 lines above. |
| `useHealthReport.ts` | Fixed section comment labels — execution order is now A (adjustments) → B (mode drift) → C (inversions) → D (name collisions). |

---

### Run Dialog — UI/UX Polish Pass

A series of incremental improvements to the "Publish to Figma" dialog covering callouts, conflict resolution, the summary tab, and the health system.

---

#### Callout Component — Icon + Action API

**Problem.** All four callout variants looked identical except for border colour, making severity hard to read at a glance. Actions (e.g. "Review conflicts →") required nesting a `<Button>` + `<div className="mt-1">` wrapper inside `children`.

**Changes.**

- `src/ui/components/Callout.tsx` — Rewritten:
  - Auto icon per variant: info circle, check circle, alert triangle, alert circle. Pass `icon={false}` to suppress.
  - `action?: { label: string; onClick: () => void }` prop renders a right-aligned underline button in the title row.
  - Body text indents to align under the icon when one is present.
- `src/ui/components/icons.tsx` — Added `IconInfo`, `IconCheckCircle`, `IconAlertCircle`.
- `src/ui/screens/run-dialog/tabs/SummaryTab.tsx` — Conflict callout collapsed to a single self-closing line using the new `action` prop; `Button` import removed.

---

#### Name Conflict Sheet — Interactive Segmented Toggle UX

**Problem.** The conflict resolution surface had no overlay, no bulk action, and no per-row interactivity.

**Changes.**

- `src/ui/components/ConflictList.tsx` *(new)* — Bottom sheet (`Sheet` + `Backdrop`) within the dialog. Three-column header: close icon / title+subtitle / "Apply" ghost button. Bulk `SegmentedControl` (Keep Figma Names / Change Names) with indecision state (`null`) when rows are mixed. Per-row: stacked name display with active name highlighted (`bg-n-sf-active` for Figma, `bg-b-fi-subtle` for System), plus a segmented toggle.
- `src/ui/components/SegmentedControl.tsx` — `value` type widened from `T` to `T | null` to support indecision state; `overflow-hidden` added to container to prevent label bleed.
- `src/ui/screens/run-dialog/RunDialog.tsx` — `conflictsOpen` state lifted to modal root; `ConflictList` rendered once at root level so both Summary and Changes tabs can open it without duplication.
- `src/ui/screens/run-dialog/tabs/ChangesTab.tsx` — Own `ConflictList` removed; replaced with an amber banner that calls `onOpenConflicts()`.
- `src/ui/screens/run-dialog/tabs/SummaryTab.tsx` — Conflict callout uses `action` prop to call `onOpenConflicts()` directly.

---

#### Changes Tab — Conflict Banner Legibility

**Problem.** The amber warning banner used `bg-w-fi-subtle` (very light orange) with `text-w-tx-muted` (dark amber), producing low contrast that was difficult to read.

**Changes.**

- `src/ui/screens/run-dialog/tabs/ChangesTab.tsx` — Banner replaced with a full-width `<button>` using `bg-w-fi-btn-default` (solid amber), white text for both the label and "Review →" affordance, and proper hover/active states. `Button` import removed.

---

#### Settings Tab — Removed; Summary Tab — Absorbs Scope + Config

**Problem.** The Settings tab duplicated information already derivable from the Summary tab, and required an extra tab switch for a common pre-publish task (adjusting scope).

**Changes.**

- `src/ui/screens/run-dialog/useRunDialogState.ts` — `RunDialogTab` narrowed to `"summary" | "changes" | "health"`.
- `src/ui/screens/run-dialog/RunDialog.tsx` — Settings tab entry removed from tab array.
- `src/ui/screens/run-dialog/tabs/SummaryTab.tsx` — Absorbed Sync Scope selector and Configuration card from the deleted Settings tab. Stat chips are now `<button>` elements that set a filter and navigate directly to the filtered Changes view.

---

#### Summary Tab — Sync Scope Checklist

**Problem.** The segmented control for Sync Scope (`Everything / Scale Only / Roles Only`) gave no visibility into collection names and no way to toggle Source Colors.

**Changes.**

- `src/ui/screens/run-dialog/tabs/SummaryTab.tsx` — Segmented control replaced with `ScopeChecklist`: three rows (Scale, Tokens, Source Colors), each with a checkbox and an inline right-aligned mono input for the collection name. Scale and Tokens map to the existing `scope` state; Source Colors maps to `projectStore.includeSourceColors`. Collection name fields write directly to the project store via `setProjectField`. Disabled rows dim to 40% opacity.

---

#### Summary Tab — Health Indicators

**Problem.** The only way to see health metrics was to navigate to the Health tab.

**Changes.**

- `src/ui/screens/run-dialog/tabs/health/HealthTab.tsx` — Extracted and exported `MetricTile`, `MetricTileRow`, `TileState`, `MetricKey`, and `METRIC_LABELS`. `MetricTileRow` accepts `onNavigateToHealth?: () => void` — when provided, clicking a tile navigates first then selects; when absent (inside HealthTab itself) it just toggles the selected metric.
- `src/ui/screens/run-dialog/tabs/SummaryTab.tsx` — New **Health** section between "What Will Change" and "Sync Scope": renders `MetricTileRow` with `onNavigateToHealth` wired to set the target metric and switch to the Health tab in one click. Summary line shows "All tokens healthy" or "N issues detected" in the appropriate status colour.
- `src/ui/screens/run-dialog/RunDialog.tsx` — `healthMetric` state added; passed as `initialMetric` to `HealthTab` so the tab opens pre-scrolled to the tile the user clicked from Summary.

---

### RunDialog — Full Overhaul

**Problem.** The "Publish to Figma" dialog had accumulated 9 independent structural problems: inverted information hierarchy (config summary at the bottom, change counts at the top), a thin "What Will Change" section with no context, two separate cards for what are conceptually the same thing (pending renames and name conflicts), a useless "Existing Collections" list, a static footer button label, raw HTML for the preview-interrupted warning, and makeshift loading states bolted onto the footer.

**Changes.**

- `src/ui/components/ResultOverlay.tsx` — Replaced `LoadingOverlay` (generic, static text) with `OperationOverlay`. Accepts a `kind` prop (`"sync"` | `"preview"`) and shows operation-specific titles and subtitles. Both operations now get a full-screen overlay with proper context rather than a spinner-and-text generic.

- `src/ui/hooks/useRunDialogState.ts` *(new file)* — Centralises all mutable RunDialog state (previously 10+ scattered `useState` calls in the component). Owns the `RunPhase` type (`"config"` | `"validation-warning"` | `"loading-sync"` | `"loading-preview"` | `"success"` | `"error"`), exposes named actions (`onDialogOpen`, `handleConfirmRun`, `handleStartPreview`, `onPreviewDone`, `onPreviewInterrupted`, `onFinish`, `onError`), and composes `useSyncSession` internally.

- `src/ui/screens/RunDialog.tsx` — Rewritten to use `useRunDialogState`. New layout order: (1) scope selector, (2) warnings block, (3) unified "What Will Change" card. Changes:
  - Config summary promoted to the `ModalHeader` subtitle (`"3 colors · 8 roles · 2 themes · scale mode"`), removing the bottom summary card.
  - Existing Collections card removed — redundant information.
  - Pending Renames and Name Conflicts merged into a single `SettingsCard` with labelled sections ("Pending Renames", "Name Divergence"). One card, one mental model.
  - Structural change warnings and free-plan warning grouped in a single `<div>` block.
  - Scope selector label changed from "What to Update/Create" → "Collections to Write".
  - Footer button label is now dynamic: `"Create Variables"` / `"Update Variables"` / `"Apply Renames"` / `"Create / Update Variables"` / `"Up to Date"` based on `SyncPreview` counts.
  - Preview-interrupted warning converted from raw HTML to `<Callout variant="warning">`.
  - Preview loading state is now a full-screen `OperationOverlay` instead of a footer spinner div.

- `src/ui/stories/Feedback.stories.tsx` — Updated `Overlays` story to use `OperationOverlay` with `kind="sync"` and `kind="preview"` buttons.

---

### Diff & Validation Centralisation — `variableTracker.ts` as Single Source of Truth

**Problem.** Pre-publish analysis (what will change, what names conflict, what structural breaks exist) was split across three files with no shared logic:

| Logic | Previous location | Problem |
|---|---|---|
| `computeSyncPreview` | `variableTracker.ts` | Built variable names without shorthand resolution → inflated rename counts |
| `VariableManager` tally | `figmaVars.ts` | Independent value comparison; no shared classifier with preview |
| `detectStructuralChanges` | `config.ts` | Pre-publish validation logic in a config utility file |
| `check-collections` orchestration | `index.ts` | Manually called 4 functions and patched counts together |

**Changes.**

- `src/figma/variableTracker.ts` — Now owns all pre-publish analysis. Added:

  - `valuesEqual(a, b, varType)` — Shared value comparator for COLOR (hex string or RGBA object), VARIABLE_ALIAS, and scalar values. Extracted from the old `isDifferentValue` in `figmaVars.ts` and inverted (returns `true` when equal, cleaner call sites). Handles alpha channel correctly (defaults to 1.0 when absent, consistent with Figma's own behaviour for opaque colours).

  - `classifyEntry(entry, existing, modeId) → EntryClass` — Pure diff classifier. Takes one intended variable entry and its current Figma state, returns `"create"` | `"update"` | `"rename"` | `"rename+update"` | `"noop"`. Used by `computeSyncPreview` for dry counts. The `"rename+update"` class also fixes a prior bug where a variable being both renamed and value-changed was counted only as a rename.

  - `detectStructuralChanges(savedState, newState)` + `StructuralChange` / `StructuralChangeKind` types — Moved from `config.ts`. Detects 10 kinds of breaking config changes: mode switches, scale shrink, collection renames, source/alpha removal, scale collection disable.

  - `runPrePublishAnalysis(state, savedState, config, result, renames)` — Single async entry point. Fetches `localVars` and `collections` from the Figma API once (previously fetched separately by the caller and passed in fragments), then runs `analyzeNameConflicts`, `computeSyncPreview`, and `detectStructuralChanges`, returns a `PrePublishReport`. The caller (`index.ts`) pre-computes `renames` via `buildVariableRenameMap` to avoid a circular import.

  - `computeSyncPreview` fixed — Now uses `makeLabelHelpers(config)` for name building (was using raw names before), so shorthand-enabled configurations no longer produce inflated rename counts. Internally uses `classifyEntry` for classification, eliminating independent logic.

- `src/figma/config.ts` — Removed `detectStructuralChanges`, `StructuralChange`, `StructuralChangeKind`. Added one-line re-export shim so all existing imports from `config.ts` continue to resolve without changes:
  ```ts
  export type { StructuralChangeKind, StructuralChange } from "./variableTracker";
  export { detectStructuralChanges } from "./variableTracker";
  ```
  `config.ts` now owns only pure data transforms: `translateConfig`, `buildVariableRenameMap`, and supporting helpers.

- `src/figma/figmaVars.ts` — Removed `isDifferentValue`. `upsertVariables` now calls `valuesEqual` (imported from `variableTracker.ts`) for value comparison, ensuring the same epsilon and alias-handling logic is used during live writes as during the preview diff.

- `src/figma/index.ts` — `check-collections` handler reduced from 20 lines of manual orchestration to 4:
  ```ts
  const config = translateConfig(msg.state);
  const result = runEngine(config);
  const renames = buildVariableRenameMap(msg.savedState ?? null, msg.state);
  const report = await runPrePublishAnalysis(msg.state, msg.savedState ?? null, config, result, renames);
  figma.ui.postMessage({ type: "collection-check-result", ...report });
  ```

---

### SyncScope Rename — `"groups"` → `"scale"`

**Problem.** The internal value `"groups"` for the scope option didn't match the UI label "Scale Only", making the codebase inconsistent.

**Changes.**

- `src/ui/types/messages.ts` — `SyncScope = "all" | "scale" | "roles"` (was `"groups"`).
- `src/ui/screens/RunDialog.tsx` — `SCOPE_SEGMENTS` value updated.
- `src/figma/figmaVars.ts` — All three condition checks in `sync()` updated.
- `Documentations/BLUEPRINT.md` — Type definition, stage guards, and run dialog description updated.
- `Documentations/knowledge/how-to-use.md` — Scope selector list updated.

---

### Theme Token Updates — Card Backgrounds and Input Fill

**Problem.** Card components were using the panel background token (`--n-bg-panel`) instead of a dedicated card surface, making cards visually indistinguishable from the panel. Input fill colour was too close to the app background.

**Changes.**

- `src/ui/theme/theme2.0/dark.css` — Added `--n-bg-card: #141414` and `--n-card-border: #232323`. Updated `--n-sf-input` to `#1e1e1e`.
- `src/ui/theme/theme2.0/light.css` — Added `--n-bg-card: #f5f5f5` and `--n-card-border: #d1d1d1`. Updated `--n-sf-input` to `#eaeaea`.
- `tailwind.config.js` — Added `'bg-card'` and `'card-border'` to the `theme2Colors()` token list so the new CSS variables generate valid Tailwind utility classes.
- `src/ui/components/cards/ColorGroupCard.tsx`, `RoleGroupCard.tsx`, `ShopCard.tsx` — Card containers updated from `bg-n-bg-panel border-n-br-default` → `bg-n-bg-card border-n-card-border`.
- `src/ui/components/SettingsCard.tsx` — Same token update.
- `src/ui/screens/ProjectScreen.tsx` — Both card containers updated.

---

### Floating Toolbar Icon Stroke Weight

**Problem.** Icons in the floating card toolbars (grip, trash, settings) were visually light at `strokeWidth={1.75}`.

**Changes.**

- `src/ui/components/CardToolbar.tsx` — GripVertical and Trash2 icons: `1.75` → `2`.
- `src/ui/components/cards/RoleGroupCard.tsx` — Settings icon: `1.75` → `2`.
- `src/ui/screens/ProjectScreen.tsx` — All 3 toolbar icons: `1.75` → `2`.

---

### Preset Update — `token-wand-ui` `it-3`

**Changes.**

- `src/shared/presets/raw/dev/token-wand-ui.ts` — Updated to `it-3` state: added `Stronger`/`Strongest` fill role variations, updated `fill/button` contrast targets (Default: 5, Hover: 6.5, Pressed: 8), changed `text/button` solver to `hue-locked`, removed `Dark/Panel` theme. Themes now: `[{ name: "Light", bg: "F2F2F7" }, { name: "Dark", bg: "0D0D0D" }]`.
- `src/shared/presets/presets.json` — Rebuilt via `npx tsx scripts/build-presets.ts` (17 total presets).

---

### `makeLabelHelpers` and `hexToRgb` — De-duplication

**Problem.** `colorLabel`, `roleLabel`, `stepLabel` helper closures and hex-to-RGB bit-math were independently defined in both `figmaVars.ts` and `variableTracker.ts`, diverging silently.

**Changes.**

- `src/figma/variableTracker.ts` — `makeLabelHelpers(config)` and `hexToRgb(hex)` exported as shared utilities.
- `src/figma/figmaVars.ts` — Imports both from `variableTracker.ts`; local definitions removed.

---

### BLUEPRINT.md — Accuracy Overhaul

**Problem.** Blueprint had stale type definitions, missing subsystems, and one-liner descriptions of complex mechanisms.

**Changes to `Documentations/BLUEPRINT.md`:**

- New §5: Variable Naming — Segments, Shorthands, and `/` Grouping.
- §1 expanded: `ensureIds` / `ensureVariations` full behaviour documented.
- §8/§9 expanded: Source colors, alpha tints, `purgeOrphanedVars` (Stage 4), `tokenRef` plugin data format.
- New `makeLabelHelpers` subsection in sync section.
- New §14: Key Supporting Types (`SyncScope`, `SyncTally`, `SyncPreview`, `NameConflict`, `StructuralChange`).
- All `"groups"` scope references updated to `"scale"`.
- Removed stale: `_presetId`, `resolveTokensDirectly`, `result` in finish message, old CSV comment.
