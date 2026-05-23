# Behaviour Specification — Token Wand Current Version

This document captures every observable behaviour the React version must reproduce exactly.
It is the acceptance checklist for the migration.

---

## 1. Boot sequence

1. Plugin thread (`main.js`) starts; sends `load-state` message with saved `tw_state` JSON from `figma.root.getPluginData`.
2. If no saved state exists, plugin sends empty payload → UI boots with TW Regular preset as default config.
3. UI thread receives `load-state`, calls `ensureIds()` on state (assigns `_id` to any entity missing one), sets `appState`, renders all screens.
4. UI thread sends `get-ui-prefs` → plugin thread responds with `ui-prefs` payload (`scale`, `theme`).
5. `uiPrefs.scale` is applied to `document.documentElement` as a CSS class (`ui-sm`, `ui-md`, `ui-lg`).
6. `uiPrefs.theme` is applied as `data-theme` attribute (`figma-light`, `figma-dark`). If `auto`, a MutationObserver on `<html>` + `matchMedia` detects Figma's current theme.
7. Color group cards render in sidebar. Role cards render in sidebar. Preview panel renders.
8. Active sidebar tab defaults to Colors.

---

## 2. Two-thread message contract

All cross-thread communication uses `parent.postMessage({ pluginMessage: { type, ...payload } }, '*')` from UI, and `figma.ui.postMessage({ type, ...payload })` from plugin.

### UI → Plugin messages

| type | payload | purpose |
|------|---------|---------|
| `check-collections` | `{ state }` | Before run dialog: ask plugin what collections already exist |
| `run-creator` | `{ state, scope }` | Trigger Figma variable creation/update |
| `get-ui-prefs` | — | Load persisted scale+theme prefs |
| `set-ui-prefs` | `{ scale, theme }` | Persist scale+theme prefs |
| `export-zip` | `{ files: [{name, content}] }` | Ask plugin to trigger browser download |

### Plugin → UI messages

| type | payload | purpose |
|------|---------|---------|
| `load-state` | `{ state }` | Deliver saved config on open |
| `collection-check-result` | `{ existing, renames }` | Response to check-collections |
| `finish` | `{ tally, errors, result }` | Variable sync complete |
| `ui-prefs` | `{ scale, theme }` | Deliver persisted prefs |

**Critical:** The React version must maintain this exact message schema. `main.js` does not change.

---

## 3. Sidebar navigation

- Four tabs: **Colors**, **Roles**, **Preview**, **Project**.
- Tabs are always visible. Only one screen content area is shown at a time.
- Switching tabs does **not** reset any state on the outgoing or incoming screen.
- Switching to Preview triggers a preview render if the current token output is stale.

---

## 4. Colors screen

### Color group card

Each entry in `appState.colors` renders as a card with:
- Hex color picker input (inline swatch + text field)
- Display name input
- Shorthand input (shown when `useShorthandColors: true`)
- `scaleAlgorithm` selector — shown only when `pluginMode === 'scale'` AND `useUniformAlgorithm === false`
- `solverMode` selector — shown only when `pluginMode === 'direct'` AND `useUniformAlgorithm === false`
- Delete button (disabled if only one color exists)

### Color input behaviour
- Typing in the hex field: validates on input, updates color swatch preview in-place **without a full card re-render**.
- Color picker (native `<input type="color">`): syncs hex field on every `input` event.
- Invalid hex values are clamped/ignored; the last valid color is preserved.
- Changing the color does **not** move focus away from the input.

### Add / delete
- Add: appends a new color with a generated `_id`, sensible default name, default hex `#6750A4`.
- Delete: removes by `_id`, not by index. If only one color exists, the delete button is hidden or disabled.

### Drag-to-reorder
- Cards can be dragged vertically to reorder.
- On drop, `appState.colors` is spliced to new order.
- Preview re-renders after reorder.
- Focus is not disturbed by reorder if the user is not dragging.

---

## 5. Roles screen

Same structural pattern as Colors screen. Each entry in `appState.roles` renders as a card with:
- Name input
- Shorthand input (shown when `useShorthandRoles: true`)
- Mapping method toggle: **Contrast** (walk scale for WCAG) or **Index** (pin to step)
- Variation override toggle: when on, shows custom variation controls instead of global variations
- Per-role custom variations list (shown when override is on)
- Delete button

### Role card conditional fields (same visibility rules as Colors)
- `solverMode` selector per role — shown only in Direct mode with `useUniformAlgorithm: false`

### Drag-to-reorder — same as colors.

---

## 6. Preview screen

- Renders a live token output grid: one column per theme (light/dark), one row per role×variation.
- **Direct mode:** Section header shows "Solved Colors" (not "Token Preview").
- Color swatches show hex value on hover.
- WCAG contrast ratios shown as tooltips on hover (computed by `clrUtils.getContrast`).
- Preview **re-renders** on any of: color value change, role change, theme change, mode change, algorithm change.
- Preview render is **debounced** — not triggered on every keystroke, only after 150ms idle.
- `schedulePreview()` is the current gating function; the React version must replicate this debounce.
- Alpha tint section: currently not rendered in preview (known gap — must not regress).

---

## 7. Project screen

### Quick Start
- Shows on first run or when explicitly opened.
- Provides: Load preset, Import config (JSON), Start blank.

### Preset loading
- 10 built-in presets: blank, wand (TW Regular), tw-pro, tw-funk, apple, carbon, material, polaris, radix, tailwind, atlassian.
- Loading a preset replaces `appState` entirely (after confirm if dirty).
- `ensureIds()` is called on preset config before it is applied.

### Theme Shop
- Full-screen overlay (`theme-shop-overlay`).
- Lists available presets as cards.
- Selecting a preset previews it; confirm applies it.
- Opened from Project screen; closed by back/cancel button.

### JSON Import / Export
- Import: reads a `.json` file, validates it has expected shape (`colors`, `roles`, `themes`), calls `ensureIds()`, replaces `appState`.
- Export: serialises current `appState` to JSON, triggers browser download.

### Versions list
- Placeholder UI — shows list of version entries. Non-functional (Saved States not implemented). Must render the placeholder without errors.

---

## 8. Settings overlay

- Opened via gear icon in header.
- Full-screen overlay that slides in over everything.
- Two tabs: **Token Settings** and **Plugin**.
- **Cancel** button: reverts `appState` to the snapshot taken when the overlay opened (`savedState`).
- **Done** button: closes overlay keeping current state; saves to Figma plugin data.
- Changes inside settings take effect immediately in the preview (live update).

### Token Settings tab — controls

| Control | State key | Type |
|---------|-----------|------|
| Plugin Mode | `pluginMode` | radio: `scale` / `direct` |
| Token Grouping | `tokenGrouping` | radio: `color` / `role` — **no UI control yet, must not regress** |
| Scale Algorithm | `scaleAlgorithm` | select — 7 options — shown only in scale mode |
| Scale Length | `scaleLength` | number input |
| Use Uniform Algorithm | `useUniformAlgorithm` | toggle |
| Algorithm Scope Level | `algorithmScopeLevel` | radio: `color` / `role` — shown when `useUniformAlgorithm: false` |
| Solver Mode (global) | `solverMode` | select — 5 options — shown only in direct mode |
| Token Name Segments | `tokenNameSegments` | multi-toggle: color, role, variation |
| Shorthand toggles | `useShorthandColors`, `useShorthandRoles`, `useShorthandVariations`, `useShorthandSteps` | toggles |
| Resolve Tokens Directly | `resolveTokensDirectly` | toggle |
| Include Color Scales | `includeColorScalesCollection` | toggle |
| Include Source Colors | `includeSourceColors` | toggle |
| Source Collection Name | `sourceCollectionName` | text input |
| Include Alpha Tints | `includeAlphaTints` | toggle |
| Alpha Values | `alphaValues` | text input (CSV of integers) |
| Include Descriptions | `includeDescriptions` | toggle |
| Scale Collection Name | `scaleCollectionName` | text input |
| Themes list | `themes` | add/delete/rename/reorder |
| Variations list | `variations` | add/delete/rename/reorder |
| Scale Step Names | `scaleStepNames` | list of name+shorthand pairs |

### Plugin tab — controls

| Control | State key | Type |
|---------|-----------|------|
| UI Scale | `uiPrefs.scale` | radio: sm / md / lg |
| Theme | `uiPrefs.theme` | radio: auto / light / dark |
| Language | not yet wired | select: en / es / hi — **placeholder, must render without errors** |
| Saved States | not yet wired | **placeholder, must render without errors** |
| Beta Features | not yet wired | **placeholder, must render without errors** |
| About | not yet wired | **placeholder, must render without errors** |

### Settings cancel/done behaviour
1. On settings open: deep-clone current `appState` into `savedState`.
2. On cancel: replace `appState` with `savedState`; all screens revert.
3. On done: discard `savedState`; persist `appState` to `figma.root.setPluginData("tw_state", ...)`.

---

## 9. Run dialog (Sync to Figma)

- Opened via the primary **Run** button in header.
- Before showing dialog, sends `check-collections` to plugin thread.
- Plugin responds with `collection-check-result` containing existing collections and rename summary.
- Dialog shows:
  - List of existing collections that will be updated (if any)
  - Rename summary (variables that will be renamed)
  - Scope selector: **All** (create/update everything) or **Tokens only** (skip `_scale` collection)
  - Cancel and Confirm buttons
- On confirm: sends `run-creator` with `{ state: appState, scope: pendingScope }`.
- Plugin responds with `finish` message containing `tally` (created/updated/renamed/failed counts) and optional errors.
- On finish: shows success dialog with tally, or error dialog if `errors` is non-null.
- Success dialog has: Done button (closes dialog), View in Figma button (if applicable).

---

## 10. Export engine

- Accessible from… (gear/export button — verify location in current UI).
- Multi-format export: CSS, SCSS, CSV, JSON, DTCG, Android, React Native, Swift, Style Dictionary, Tailwind.
- ZIP download: bundles selected formats into a `.zip` file via `jszip.min.js`.
- Export uses `clrEngine` output → `config.js` transformer → individual format modules.
- No Figma API involvement — runs entirely in UI thread.

---

## 11. Notifications

### Banners
- Shown at the top of the plugin UI.
- Types: info, warning, error.
- Dismissed by X button or automatically after timeout.
- Only one banner visible at a time; new banner replaces old.

### Toasts
- Shown at the bottom.
- Auto-dismiss after ~3 seconds.
- Stacked (multiple toasts can be visible).

---

## 12. Dirty state tracking

- `isDirty()` returns true if current `appState` differs from `savedState` (last successful sync).
- Used to: warn before loading a preset, warn before importing JSON, show unsaved-changes indicator.
- Dirty hash is computed from a stable JSON serialisation of `appState`.
- **The React version must preserve this behaviour** — Zustand's subscribe can recompute the hash on every state change.

---

## 13. ID stability (rename detection)

- Every color, role, and theme has a `_id` field (8-char random string).
- `ensureIds()` assigns `_id` to any entity that lacks one (backward compat with old saves).
- `figmaVars.js` uses `_id` to match existing Figma variables when updating, so renames/reorders do not create duplicates.
- **The React version must never strip or change `_id` fields.**

---

## 14. UI Scale and Theme persistence

- `uiPrefs` is persisted in `figma.clientStorage` (not plugin data) so it survives across different documents.
- Scale applies a CSS class to `<html>`: `ui-sm` (compact), `ui-md` (default), `ui-lg` (comfortable).
- Theme applies `data-theme="figma-light"` or `data-theme="figma-dark"` to `<html>`.
- Auto-theme watches Figma's own dark mode via MutationObserver on `<html class="...">`.

---

## 15. Resize

- The plugin window is resizable by dragging the bottom-right corner.
- Resize sends dimensions back to plugin thread via postMessage to call `figma.ui.resize()`.
- Minimum size: 320×400. Maximum: ~800×900.

---

## 16. Standalone browser mode (dev)

When `window.parent === window` (running in a browser, not Figma):
- `check-collections` is mocked with empty result after 50ms.
- `run-creator` is mocked with a fake success `finish` after 1000ms.
- State is persisted to `localStorage` instead of Figma plugin data.
- This mode must be preserved in the React version for dev/testing without Figma open.

---

## 17. Known gaps (do not fix during migration — preserve as-is)

| Gap | Current state |
|-----|--------------|
| Alpha tints in preview | Not shown — known |
| Role variation rename detection | Custom variation renames create new variables |
| `preview.js` innerHTML remnants | Some string-built HTML remains |
| Language selector | Renders in Settings but not wired |
| Saved States | Placeholder UI only |
| Beta Features | Placeholder UI only |
| `tokenGrouping` UI control | No settings control renders it |
| Design Lab | `LAB_ENABLED = false`; button shows alert placeholder |

These must be present as working placeholders in the React version, **not fixed** during migration. Fix them afterward.
