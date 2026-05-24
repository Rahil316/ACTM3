# Token Wand — Gap Analysis: Vanilla vs. React

> Compares `vanilla_archive/` (source of truth) against `react-src/` (current React build).
> Status codes: ✅ Complete  ⚠️ Partial  ❌ Missing

---

## Summary Scorecard

| Area | Status | Notes |
|------|--------|-------|
| AppState shape | ✅ | Full parity. All 30+ fields defined in `types/state.ts` |
| Color/Role/Theme CRUD | ✅ | All mutations in `appStore.ts` |
| Drag-drop reorder | ✅ | `@dnd-kit` wired in ColorsScreen + RolesScreen |
| Preview screen | ✅ | Token grid with contrast ratings |
| Project screen | ✅ | Name, description, versions, presets |
| Quick Start overlay | ✅ | TW-badged presets + blank start |
| Theme Shop overlay | ✅ | All 9 presets, confirm-overwrite |
| Version snapshots | ✅ | Save/restore/delete + blocked-reason |
| Dirty tracking | ✅ | `isDirty()` / `markClean()` / `setSavedState()` |
| Settings → Mode card | ✅ | Scale/Direct, Uniform toggle, algo selector, solver selector, scope |
| Settings → Palette card | ✅ | Scale length input |
| Settings → Variations card | ⚠️ | Variation CRUD present; `perRoleVariationOverride` toggle wired but **Default Mapping Method** control is non-functional |
| Settings → Naming card | ⚠️ | Shorthand toggles + descriptions toggle present; **Token Name Format drag-reorder pills** and **live preview** missing; **Variable Structure** segmented (Color/Role vs Role/Color) missing |
| Settings → Collections card | ✅ | All toggles + name inputs present |
| Settings → Step Labels card | ✅ | CRUD list present |
| Settings → Plugin panel | ✅ | Scale, theme, language selectors |
| Run Dialog | ⚠️ | Scope selector + summary present; **rename summary** from check-collections not displayed; `savedState` not passed to `run-creator` |
| Export Sheet | ⚠️ | UI complete; depends on plugin code being present (`dist/scripts.js` missing) |
| Keyboard shortcuts | ❌ | Not implemented |
| UI resize (drag handle) | ❌ | Not implemented |
| Plugin code (`dist/scripts.js`) | ❌ | Vanilla `main.js` not wired into React build pipeline |
| Config translator in plugin | ❌ | `translateConfig()` only in vanilla; React plugin thread has none |
| VariableManager | ❌ | Not ported; Figma sync only works via vanilla plugin |
| Export formatters (plugin side) | ❌ | In vanilla `main.js`; not part of React build output |
| `check-collections` rename map | ❌ | Plugin sends empty `renames` object; `buildVariableRenameMap()` missing |
| Beta Lab / Design Lab screen | ❌ | `labPreview.js` not ported |
| Per-color algorithm override UI | ❌ | Field exists in state; no UI control on ColorsScreen cards |
| Per-color solver mode UI | ❌ | Same — field in state, no UI |
| Alpha tint strip in Preview | ❌ | Not rendered |
| Copy hex on swatch click | ❌ | Not wired in PreviewScreen |
| Copy token name on footer click | ❌ | Not wired in PreviewScreen |
| Preview: Grid vs Table view toggle | ❌ | Not implemented |
| Preview: Theme selector | ⚠️ | Theme tabs present; may not update on theme bg change |
| i18n (es, hi) | ❌ | Language selector present in UI; strings are English-only |
| `.wand` file import | ⚠️ | Import reads `.json`/`.wand` but no format validation specific to wand format |
| `tokenGrouping` / `tokenNameSegments` in PluginTab | ❌ | Not exposed anywhere in Settings; `tokenGrouping` and `tokenNameSegments` exist in state but no UI control |

---

## Gap Details

---

### GAP-1: Plugin Code Missing from Build (`dist/scripts.js`) 🔴 CRITICAL

**Vanilla:** `vanilla_archive/src/figma/main.js` is the Figma sandbox entry point. Built into `dist/scripts.js`.

**React:** `manifest.json` points to `dist/scripts.js`. This file does not exist in the React build. The React build only produces `dist-react/ui.html`.

**Impact:** Plugin cannot run in Figma at all. Export, Figma variable sync, and all plugin-side operations are completely broken.

**Fix:** Create a TypeScript plugin entry file (e.g. `src/plugin/index.ts`) that contains:
- Message router
- `translateConfig()` 
- `variableMaker()` call
- `VariableManager.sync()`
- Export formatter calls
- `buildExportBundle()`

Wire it into the build pipeline so Vite (or esbuild) outputs `dist/scripts.js`.

---

### GAP-2: `translateConfig()` Not in React Plugin Thread 🔴 CRITICAL

**Vanilla:** `config.js → translateConfig(appState)` normalizes the UI state into the format `variableMaker()` expects. Called in plugin thread for every `run-creator` and `request-export-bundle` message.

**React:** `react-src/screens/PreviewScreen.tsx` has `buildEngineConfig()` — a partial translation used only for the live preview. Not shared with the plugin thread.

**Impact:** Even if `dist/scripts.js` is rebuilt, it has no `translateConfig()`. Export and Figma sync would receive raw appState and pass it directly to `variableMaker()`, which expects a different shape. Alpha parsing, step name normalization, per-role variation resolution, theme deduplication would all fail silently.

**Fix:** Port `translateConfig()` and all helpers (`_parseStepNames`, `_parseStepShorthands`, `_parseVariations`, `_mapRoles`, `_deduplicateThemeNames`) into the plugin entry file. Consolidate `buildEngineConfig()` in PreviewScreen to call the same function.

---

### GAP-3: `VariableManager` Not Ported 🔴 CRITICAL

**Vanilla:** `figmaVars.js` — full Figma Variable API CRUD with 3-stage sync, rename detection (two-pass), tally tracking, free-plan mode handling.

**React:** Completely missing. No TypeScript equivalent exists.

**Impact:** Figma variable creation/update/rename is impossible from the React plugin.

**Fix:** Port `VariableManager` to TypeScript in the plugin entry file. Key methods: `sync()`, `applyRenames()`, `refreshCache()`, `getOrCreateCollection()`, `upsertVariables()`, `ensureMode()`.

---

### GAP-4: Export Formatters Not in React Build 🔴 CRITICAL

**Vanilla:** `src/shared/exportEng/` — 9 format handlers + bundler + zipBuilder.

**React:** These files exist in `vanilla_archive/` only. The plugin thread (`dist/scripts.js`) does not include them.

**Impact:** All 11 export formats fail when using the React UI.

**Fix:** Copy `exportEng/` into `src/plugin/exportEng/`, update imports in plugin entry. Alternatively symlink or restructure to share from a common `src/shared/` directory.

---

### GAP-5: `buildVariableRenameMap()` Missing from Plugin 🟠 HIGH

**Vanilla:** `config.js → buildVariableRenameMap(savedState, newState)` — position-matches colors/roles by `_id`, detects display-name changes, returns `{ scale: {}, tokens: {}, summary: {} }`.

**React:** The `check-collections` handler in the vanilla plugin calls this and sends renames back to UI. The React plugin does not have this function.

**Impact:** Figma variables are never renamed — they are always deleted + recreated on color/role renames. This destroys existing usage (references in Figma components). The run dialog also does not show rename summary.

**Fix:** Port `buildVariableRenameMap()` and all sub-helpers into the plugin entry.

---

### GAP-6: Run Dialog Missing `savedState` and Rename Display 🟠 HIGH

**Vanilla:** `proceedWithSync()` sends `{ type: "run-creator", state, scope, savedState }`. `savedState` is the state as of the last clean sync. The plugin uses it to detect renames. The run dialog also shows a rename summary from `collection-check-result`.

**React:** `RunDialog.tsx` line 82: `sendToPlugin({ type: 'run-creator', state: appState, scope })` — `savedState` is never passed. The plugin cannot detect renames without it.

**Fix:** Pass `savedState` from `useAppStore().savedState` in `run-creator` message. Also pass it in `check-collections`. Display rename summary (counts of renamed scale vars, token vars) in the run dialog config phase.

---

### GAP-7: Settings → Token Naming — Drag Pills + Preview Missing 🟡 MEDIUM

**Vanilla:** Card 4 "Token Naming" includes:
- Drag-reorderable pills for `tokenNameSegments` (`[color, role, variation]` in any order)
- Live preview of resulting token name format (e.g. `Primary / Foreground / Default`)
- "Variable Structure" segmented control: `Color/Role/Variation` vs `Role/Color/Variation` (sets `tokenGrouping`)

**React:** `SettingsOverlay.tsx` TokensTab shows shorthand toggles and descriptions toggle but has no `tokenNameSegments` drag UI, no live preview, and no `tokenGrouping` control.

**Fix:** Add to TokensTab:
- `tokenGrouping` segmented control (two options)
- `tokenNameSegments` drag-reorder (3 pills using `@dnd-kit`)
- Live name format preview string (computed from segments + one example color/role/variation)

---

### GAP-8: Per-Color Algorithm Override UI Missing 🟡 MEDIUM

**Vanilla:** Each color group card shows a per-color algorithm dropdown (visible when `!useUniformAlgorithm`). Also shows per-color `solverMode` dropdown in direct mode.

**React:** `ColorsScreen.tsx` `ColorGroupCard` component — no algorithm or solver dropdown shown. Fields exist in `AppState.colors[].scaleAlgorithm` and `.solverMode` but no UI control.

**Fix:** Add conditional algorithm/solver selector to `ColorGroupCard`, visible when `!useUniformAlgorithm`.

---

### GAP-9: Preview Screen — Missing Interactions 🟡 MEDIUM

**Vanilla:**
- Click swatch → copies hex to clipboard
- Click token name/footer → copies token name
- Alpha tint strip (if `includeAlphaTints`)
- Grid vs Table view toggle
- Theme selector tabs update what theme's contrast is shown

**React:** `PreviewScreen.tsx` has the token grid but:
- No clipboard copy on swatch click
- No clipboard copy on token name click
- No alpha tint strip
- No Grid/Table view toggle
- Theme tabs present but may not update alpha strip / copy behavior

**Fix:** Wire click handlers for copy. Add `includeAlphaTints` strip below scale spectrum. Add view toggle.

---

### GAP-10: Keyboard Shortcuts Not Implemented 🟡 MEDIUM

**Vanilla:** `runtime.js` lines 529–624 — `Alt+0–N`, `Alt+Enter`, `Escape`.

**React:** No keyboard shortcut handler anywhere.

**Fix:** Add `useEffect` with `keydown` listener in `App.tsx`. Map `Alt+0–4` to tab navigation, `Alt+Enter` to open run dialog, `Escape` to close active overlay.

---

### GAP-11: UI Resize Drag Handle Not Implemented 🟡 MEDIUM

**Vanilla:** Mouse-drag resize handle, min 440×480 max 1400×1400, persisted to `clientStorage`.

**React:** `sendToPlugin({ type: 'resize' })` is defined in message types but never called. No drag handle UI.

**Fix:** Add resize handle div at bottom-right of root container. Attach `mousedown` → `mousemove` → `mouseup` listeners. Call `sendToPlugin({ type: 'resize', width, height })` on drag end.

---

### GAP-12: Settings → Variations — Default Mapping Method Non-functional 🟢 LOW

**React:** `RolesTab` shows a "Default Mapping Method" segmented control hardcoded to `value="contrast"` with `onChange={() => {}}`. This control does nothing.

**Fix:** Either wire to a real `appState.defaultMappingMethod` field and plumb through `setAppField`, or remove the non-functional control.

---

### GAP-13: Settings → Plugin Tab — "Saved States" and "Beta Features" Placeholders 🟢 LOW

**React:** `PluginTab` has two stub cards with "coming soon" text where version history and beta features would appear.

**Vanilla:** Version history is in the Project tab (not Settings). Beta Lab is its own screen.

**Fix:** Remove stub cards from PluginTab. Version history already lives in `ProjectScreen.tsx`. Beta Lab is tracked separately (GAP-14).

---

### GAP-14: Beta Lab / Design Lab Not Ported ⚪ FUTURE

**Vanilla:** `screens/labPreview.js` — LCH grid, tone curves, hue wheel, algorithm visualization.

**React:** `activeOverlay === 'design-lab'` route exists in `uiStore`, `ExportSheet` renders for it. No lab screen implemented.

**Note:** This feature was in beta in vanilla. Not a blocker.

---

### GAP-15: i18n Strings Not Ported ⚪ FUTURE

**Vanilla:** Full i18n with `en.json`, `es.json`, `hi.json`. `t(key)` substitution on render. Changing language re-renders all components.

**React:** Language selector in PluginTab is wired but all strings are hardcoded English. No `t()` function.

**Note:** Not a blocker for functionality. Can be added after all features are working.

---

## What Already Works (No Gap)

These features have **full parity** between vanilla and React:

- AppState shape (all 30+ fields)
- All CRUD mutations (colors, roles, themes, variations, scale step names)
- Validation with error messages
- Dirty tracking (`isDirty`, `markClean`, `setSavedState`)
- Version save/restore/delete + blocked-reason check
- Quick Start overlay with TW presets
- Theme Shop with all 9 presets + confirm-overwrite dialog
- JSON config export (Project screen)
- JSON / .wand file import (Project screen)
- Settings → Mode card (Scale/Direct, algo selector, solver, scope)
- Settings → Scale card (scale length)
- Settings → Collections card (all name inputs + toggles)
- Settings → Step Labels card (CRUD)
- Settings → Plugin card (scale, theme, language)
- Settings snapshot (cancel reverts changes)
- Standalone/browser development mode (localStorage mock)
- Toast + banner notification system
- `useFigmaBridge` hook (all 8 incoming message types)
- TypeScript types for all state and messages
- Color engine (clrEngine.js + clrUtils.js ported as JS copies)
- All 9 presets ported and loadable
