# Token Wand — Backlog

> Merged from codebase analysis + feature backlog + performance backlog  
> Validated against source on 2026-05-30  
> Severity: 🔴 Critical · 🟠 Major · 🟡 Minor · 🟢 Low · ⚪ Future  
> Status: 🔲 Open · ✅ Resolved

---

## Bugs

### 🔴 Critical — data loss or silent corruption

#### BUG-001 · Dirty hash misses ~10 fields
**File:** `src/ui/store/appStore.ts` — `computeHash()`  
`isDirty()` stays false after changes to `solverMode`, `alphaValues`, `algorithmScopeLevel`, `includeSourceColors`, `perRoleVariationOverride`, `includeDescriptions`, `useUniformAlgorithm`, or role `scopedColorIds` / `localBg` / `scopes`. Version saves are blocked when they shouldn't be.  
**Fix:** Hash the entire state minus `versions`, or explicitly include all mutable fields.

#### BUG-002 · Invalid hex produces all-black scale silently
**File:** `src/shared/clrEngine.ts` — `scaleMaker()`  
Malformed hex falls back to 23 steps of `#000000`. No error is pushed to `result.errors`. Sync proceeds and overwrites Figma variables with black.  
**Fix:** Push a `critical` error and abort scale generation instead of returning the black fallback.

#### BUG-003 · Name-swap renames fail and report success
**File:** `src/plugin/figmaVars.ts` — `applyRenames()` two-pass loop  
A↔B swaps fail in pass 2 because pass 1 already occupies the target name. `mutations` Map records both as done before the attempt, so the tally reports success on a silent failure.  
**Fix:** Rename all targets to temp names first, then to finals (3-pass), or use a proper swap algorithm.

#### BUG-004 · Debounced auto-save can write stale state
**File:** `src/ui/hooks/useFigmaBridge.ts` (~line 312)  
The debounce closure captures `state` at callback creation. On rapid edit + plugin close, the flush saves an intermediate `pendingState`, not the latest committed state.  
**Fix:** Read `appStore.getState().appState` directly at flush time.

#### BUG-005 · Variable metadata erased on prefix mismatch
**File:** `src/plugin/variableTracker.ts` — `buildMetadataMap()` (~line 161)  
When a variable is found in the wrong collection, `setPluginData('tokenRef', '')` permanently erases its tracking identity. Future syncs create duplicates.  
**Fix:** Log a warning and skip — never erase metadata.

---

### 🟠 Major — logic errors, crashes, wrong output

#### BUG-006 · `_splitTokenRef` breaks on color names containing `-`
**File:** `src/plugin/exportEng/helpers.ts` — `_splitTokenRef()`  
Splits on `lastIndexOf('-')`. Color names with dashes produce ambiguous splits, generating wrong variable names in CSS/SCSS/Swift/Android exports silently.  
**Fix:** Use an unambiguous delimiter (`:` or `/`) in tokenRef, or disallow `-` in color names.

#### BUG-007 · `fmtSCSS` crashes in direct mode (no `tokenRef`)
**File:** `src/plugin/exportEng/fmtSCSS.ts` (~line 60)  
`_splitTokenRef(token.tokenRef)` called without null check. In direct mode `tokenRef` is absent — this throws and aborts the export.  
**Fix:** Guard: `if (token.tokenRef) { ...use split... } else { use token.value }`

#### BUG-008 · Empty CSV/JSON files silently included in export zip
**File:** `src/plugin/exportEng/bundler.ts` (~lines 82–88)  
Files pushed with `content: ""` relying on docGen to fill them later. If docGen fails, empty files appear in the user's download with no error.  
**Fix:** Assert content is non-empty before adding to bundle, or populate inline.

#### BUG-009 · Dark mode `@media` block is empty in CSS export
**File:** `src/plugin/exportEng/fmtCSS.ts` (~lines 54–58)  
Emits `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { } }` with no declarations. Users relying on OS-level dark mode get non-functional CSS.  
**Fix:** Populate with dark theme token declarations, or remove until implemented.

#### BUG-010 · `docGen.ts` uses `as any` on contrast data
**File:** `src/plugin/docGen.ts` (~lines 26, 32, 58)  
Contrast data cast through `any`/`unknown`. Shape changes cause silent empty CSV columns with no compile-time error.  
**Fix:** Use type guards or optional chaining (`entry?.ratio ?? ''`).

#### BUG-011 · File input cannot re-import the same file
**File:** `src/ui/App.tsx` (~line 114)  
After import, `e.target.value = ''` resets the input. Re-selecting the same file silently does nothing because Chrome doesn't fire `onChange` when the value is already `''`.  
**Fix:** Reset `value` before the picker opens, not after close.

#### BUG-012 · `hiddenRenameCount` can be negative in RunDialog
**File:** `src/ui/screens/RunDialog.tsx` (~line 146)  
`renameChanges.length - RENAME_PREVIEW_LIMIT` not clamped. Negative when fewer renames exist than the limit.  
**Fix:** `Math.max(0, renameChanges.length - RENAME_PREVIEW_LIMIT)`

#### BUG-013 · `jszip` dynamic import failure is silent
**File:** `src/ui/screens/ExportSheet.tsx` (~line 141)  
No `.catch()` on `import('jszip')`. If the module fails to load, the export silently stops with no user feedback.  
**Fix:** `.catch(() => toast.error('Failed to load export library'))`

#### BUG-014 · `path.split('/').pop()!` non-null assertion on file download
**File:** `src/ui/screens/ExportSheet.tsx` (~line 137)  
`Array.pop()` returns `undefined` on empty arrays. The `!` hides the TypeScript error but the runtime crash remains.  
**Fix:** `const filename = f.path.split('/').pop() ?? 'export';`

#### BUG-015 · `isColorDark()` uses incorrect YIQ formula
**File:** `src/plugin/figmaComponents/helpers.ts`  
Multiplies already-0–255 RGB values by 255 again before dividing by 1000. Wrong threshold — badge text color is incorrect on mid-range swatches in canvas preview.  
**Fix:** Replace with `relLum()` from `clrUtils` (already imported in shared).

#### BUG-016 · Cycle detection discards valid resolutions in other themes
**File:** `src/plugin/config.ts` — `resolveTokenRefBgs()` (~lines 175–199)  
Any cycle in any one theme causes `null` to be returned for all themes, dropping valid background resolutions globally.  
**Fix:** Track cycles per-theme; return partial results with only the affected theme nulled.

#### BUG-017 · `JSON.stringify` used for RGB equality check
**File:** `src/plugin/figmaVars.ts` — `isDifferentValue()` (~line 60)  
Key-order differences in `{r,g,b}` objects produce false positives — unchanged variables get rewritten to Figma on every sync.  
**Fix:** Compare `r`, `g`, `b` channels individually with the existing 0.001 delta.

#### BUG-018 · `_tokenSegments` silently emits `undefined` for unknown keys
**File:** `src/plugin/exportEng/helpers.ts` — `_tokenSegments()`  
If `order` contains a key not in `parts`, `undefined` is pushed into the output, producing token names with a literal `"undefined"` segment in all export formats.  
**Fix:** Validate all `order` keys exist in `parts`; throw or warn on unknown keys.

#### BUG-019 · Per-role variation rename detection missing
**File:** `src/plugin/config.ts` — `buildVariableRenameMap()`  
Only handles shared variations. Per-role custom variation renames (`customVariationList: true`) silently create new variables instead of renaming.  
**Fix:** Extend rename map to diff per-role `customVariations[]` by `_id`, or document the limitation in RunDialog.

---

### 🟡 Minor — edge cases, code quality

#### BUG-020 · `canvasPreview.ts` uses file-level `any` alias
**File:** `src/plugin/canvasPreview.ts` (~line 1)  
`type AnyObj = any` applied to `appState` and `result` — eliminates TypeScript coverage on the most complex data paths.

#### BUG-021 · `ensureIds` mutates input and returns it
**File:** `src/ui/store/appStore.ts` (~lines 115–126)  
Dual mutation+return contract causes unexpected side-effects for callers relying on immutability. Choose one behavior.

#### BUG-022 · Dark theme detection duplicated across formatters
**Files:** `fmtCSS.ts`, `fmtSCSS.ts`, `docGen.ts`  
`k.toLowerCase() === "dark"` repeated 3+ times. Extract to `_findDarkTheme(keys)` in `helpers.ts`.

#### BUG-023 · `_hexComponents` does not validate hex format
**File:** `src/plugin/exportEng/helpers.ts`  
Malformed hex produces `NaN` RGB channels, silently corrupting Swift (`UIColor(red: NaN, ...)`) and Android XML output.

#### BUG-024 · Scale entry null check inconsistent across formatters
**Files:** Multiple `fmt*.ts`  
`if (!entry || !entry.value) continue` exists in `fmtSCSS` and `fmtAndroid` but not `fmtCSS`, `fmtTailwind`, or `fmtDTCG`. Malformed data produces divergent output per format.

#### BUG-025 · `fmtDTCG` overwrites `$description` on adjusted tokens
**File:** `src/plugin/exportEng/fmtDTCG.ts` (~lines 57–59)  
`token.isAdjusted` replaces any existing description. Should append: `(existing ?? '') + ' ⚠ Adjusted for contrast'`.

#### BUG-026 · `NaN`/`Infinity` not guarded in color utils
**File:** `src/shared/clrUtils.ts` — `rgbToHsl`, `hslToRgb`  
Range checks (`v < 0 || v > 255`) don't catch `NaN` or `Infinity`. `isNaN(v)` never checked.

#### BUG-027 · `contrastRatio` uses string round-trip
**File:** `src/shared/clrUtils.ts`  
`parseFloat(ratio.toFixed(2))` — convert to string then back. Use `Math.round(ratio * 100) / 100`.

#### BUG-028 · `snapWithoutVersions` does full JSON deep-copy to remove one field
**File:** `src/ui/store/appStore.ts`  
Use `const { versions: _, ...rest } = state; return rest;` instead.

#### BUG-029 · `StructuralChangeKind` labels hardcoded in JSX ternary
**File:** `src/ui/screens/RunDialog.tsx` (~lines 200–211)  
Adding a new kind requires finding and updating JSX. Replace with `Record<StructuralChangeKind, string>` map.

#### BUG-030 · RGB diff logic duplicated between tracker and figmaVars
**Files:** `src/plugin/variableTracker.ts`, `src/plugin/figmaVars.ts`  
Two independent implementations of the same 0.001 delta check. Extract to shared `isSameRgbColor(a, b)`.

---

## Features

### 🟠 High

#### FEAT-001 · Canvas Preview — "Preview in Canvas" button ✅
**Status: RESOLVED** — RunDialog.tsx wires `run-preview` message correctly.

#### FEAT-002 · Rename summary in RunDialog ✅
**Status: RESOLVED** — Rename counts from `collection-check-result` are displayed.

---

### 🟡 Medium

#### FEAT-003 · Token naming — drag pills + live preview ✅
**Status: RESOLVED** — `SettingsOverlay.tsx` uses dnd-kit sortable for segment pills and renders a live `namePreview` string.

#### FEAT-004 · Preview: Grid / Table view toggle ✅
**Status: RESOLVED** — `PreviewScreen.tsx` has a SegmentedControl for Grid/Table switching.

#### FEAT-005 · Preview: Alpha tint strip ✅
**Status: RESOLVED** — `PreviewScreen.tsx` renders alpha tints when `alphaValues` is configured.

#### FEAT-006 · `tokenGrouping` UI control
**Status: 🔲 Open** — `appState.tokenGrouping` (`"color"` / `"role"`) is wired in the engine but has no settings control in the UI. Add a segmented control to the Collections section of Token Settings.

---

### 🟢 Low

#### FEAT-007 · i18n strings not wired
**Status: 🔲 Open** — Language selector renders and persists. All strings are hardcoded English. `en.json`, `es.json`, `hi.json` exist in `src/ui/lang/` but no `t()` or `useTranslation()` is called anywhere.

---

### ⚪ Future

#### FEAT-008 · Design Lab screen
**Status: 🔲 Open (partial)** — `activeOverlay === 'design-lab'` route exists and `ExportSheet.tsx` checks for it, but no dedicated screen is implemented. `testLab.tsx` exists but is not mounted in `App.tsx`.

---

## Performance

### 🟠 High

#### PERF-001 · Overlay components always mounted ✅ partially, 🔲 fix needed
**Files:** `src/ui/App.tsx` — `RunDialog`, `SettingsOverlay`, `ExportSheet`, `PreviewScreen`, `SaveVersionOverlay`, `QuickStart`, `ThemeShopOverlay`  
All overlays render unconditionally. Each returns `null` internally when closed, but component instances still mount, subscribe to store, and are checked on every render.  
**Fix:** Conditionally mount — `{activeOverlay === 'run-dialog' && <RunDialog />}`. Start with `RunDialog` and `ExportSheet` (heaviest selectors).  
**Gain:** Closed overlays stop subscribing to store entirely.

#### PERF-002 · Color picker fires store update on every change event
**File:** `src/ui/components/ColorInput.tsx` — `handlePickerChange`  
`onUpdate(clean)` fires on every `onChange` from the native color picker (~60 events/sec during drag). No debounce.  
**Fix:** Buffer intermediate value in a ref; commit to store only on `pointerup` / `onBlur`.  
**Gain:** Eliminates ~60 store updates/sec during color wheel drag.

---

### 🟡 Medium

#### PERF-003 · `versionSaveBlockedReason` runs on every keystroke ✅
**Status: RESOLVED** — Wrapped in `useMemo([appState])` in `App.tsx`.

#### PERF-004 · Inline toolbar handlers break memoization
**Files:** `src/ui/screens/ColorsScreen.tsx`, `src/ui/screens/RolesScreen.tsx`  
`onGroup`, `onUngroup`, `onDelete`, `onSelectAll` defined inline — new references on every render. `MultiSelectToolbar` re-renders unnecessarily.  
**Fix:** Wrap in `useCallback`.

---

### 🟢 Low

#### PERF-005 · Drag tree traversal at 60fps
**Files:** `src/ui/screens/ColorsScreen.tsx`, `src/ui/screens/RolesScreen.tsx`  
Recursive tree walk runs at 60fps during drag.  
**Fix:** Cache visible IDs on `dragStart`, use cache during drag, invalidate on `dragEnd`.  
**Note:** Only noticeable at 50+ groups. Defer until then.

#### PERF-006 · `useCommittedNames` string key allocation
**File:** `src/ui/components/tree/index.tsx`  
Key recomputed on every render. Cache in a ref, recompute only when `items` reference changes.  
**Note:** Negligible at typical project sizes. Skip unless profiling shows pressure.

#### PERF-007 · Preview engine blocks paint ✅
**Status: RESOLVED** — `runEngine` wrapped in `setTimeout(0)` in `PreviewScreen.tsx`.

#### PERF-008 · `buildByRole` not memoized ✅
**Status: RESOLVED** — Wrapped in `useMemo` in `PreviewScreen.tsx`.
