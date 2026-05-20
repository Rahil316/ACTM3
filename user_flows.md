# CTM316 — UI Logic, Conditions & User Flows

Every interaction a user can perform, the state it reads, the conditions that gate it, and the effect it has on appState and the DOM.

---

## 1. Plugin Boot

**Sequence:**

1. `renderColorGroups()` — draws color cards into `#sidebar-content-container` (debounced 50 ms)
2. `renderRoles()` — draws role cards (no-op until user switches to Roles tab)
3. `syncInputsFromState()` — writes all appState values into settings inputs, syncs all toggles and pills
4. `syncUiSettingsInputs()` — sets UI Scale and Theme selects from `uiPrefs`
5. `applyUiPrefs()` — applies `zoom` + `data-ui-theme` to the document

**Then the Figma backend sends messages:**

- `capabilities` → if `multiMode` is false, all `[data-requires-multimode]` elements are hidden
- `load-config` → merges saved state over demoConfig, migrates legacy fields, calls `ensureIds`, `ensureVariations`, `markClean`, `renderColorGroups`, `renderRoles`, `syncInputsFromState`
- `load-ui-prefs-meta` → validates and applies scale + theme preferences, calls `syncUiSettingsInputs`

---

## 2. Main Navigation (Sidebar Tabs)

Four sidebar tab buttons: **Project**, **Palette** (`color-groups`), **Roles** (`roles-config`), **Preview**.  
Preview behaves differently — it swaps to a full-screen overlay instead of switching the sidebar content area.

| Button  | `activeSidebarTab` value | Renderer called                                |
| ------- | ------------------------ | ---------------------------------------------- |
| Project | `"project"`              | `renderSidebarProject()`                       |
| Palette | `"color-groups"`         | `renderColorGroups()`                          |
| Roles   | `"roles-config"`         | `renderRoles()`                                |
| Preview | n/a (screen swap)        | `renderPreviewTabs()` + `renderPreviewPanel()` |

**Keyboard shortcuts (Alt + digit, no input focused, settings closed):**

- `Alt+0` → Project tab
- `Alt+1` → Palette tab
- `Alt+2` → Roles tab
- `Alt+3` → Preview: Tonal Scale panel (skipped — does nothing — if `pluginMode === "adaptiveEngine"`)
- `Alt+4` → Preview: Theme 1 panel
- `Alt+N` → Preview: Theme N−3
- `Escape` → close Preview

**renderColorGroups conditions:**

- Skips render if `activeSidebarTab !== "color-groups"`
- If `appState.colors` is empty → shows empty state message
- Each card includes: `_ColorMainRow` always, `_ColorSolverRow` conditionally, `_ColorAlgoRow` conditionally, `_ColorDescriptionRow` conditionally

**renderRoles conditions:**

- Skips render if `activeSidebarTab !== "roles-config"`
- Each card is built by `RoleGroupCard`

---

## 3. Settings Screen

### Opening

`btn-settings` → `openSettings()`

**Snapshot taken of:** `scaleLength`, `scaleAlgorithm`, `scaleStepNames`, `pluginMode`, `baseSelection`, `spreadUnit`, `tonalScaleCollectionName`, `tokenCollectionName`, `embedDirectly`, `includeGlobalColors`, `globalColorsCollectionName`, `includeAlphaTints`, `alphaValues`, `variableStructure`, `useShorthandColors`, `useShorthandRoles`, `useShorthandVariations`, `useShorthandSteps`, `includeDescriptions`, `allowRoleVariations`, `perRoleControls`, `includeTonalCollection`, `useGlobalAlgo`, `perColorAlgoScope`, `solverMode`, `tokenNameOrder`, `variations`

**Note — fields NOT in snapshot (so Cancel cannot revert them):** `themes`, `colors`, `roles`, `name`. Theme and role changes made during settings are permanent even on Cancel.

`syncInputsFromState()` is called → all inputs, toggles, pills, dropdowns are synced to current appState.  
Settings screen is opened to the **Token Settings** tab by default.

### Tabs

Two tabs: **Token Settings** (`tokens`), **Plugin** (`plugin`)

`switchSettingsTab(tab)` toggles `.active` on tab buttons and `.hidden` on panels.

### Done

`settings-done` → `closeSettings(false)` → `updateSettingsFromInputs()`

**Fields read from DOM inputs on Done:**

- `setting-tonalScaleCollectionName` → `appState.tonalScaleCollectionName` (default `"_scale"`)
- `setting-tokenCollectionName` → `appState.tokenCollectionName` (default `"contextual"`)
- `setting-scaleLength` → `appState.scaleLength` (clamped 1–100, default 25)
- `setting-scaleAlgorithm` → `appState.scaleAlgorithm`
- `setting-solverMode` → `appState.solverMode`
- `setting-globalColorsCollectionName` → `appState.globalColorsCollectionName` (default `"_constants"`)
- `setting-alphaValues` → `appState.alphaValues`

**Note — fields NOT read on Done (set live via toggles/buttons, already in appState):** `pluginMode`, `embedDirectly`, `includeGlobalColors`, `includeAlphaTints`, `variableStructure`, `tokenNameOrder`, `useShorthandColors/Roles/Variations/Steps`, `useGlobalAlgo`, `perColorAlgoScope`, `perRoleControls`, `allowRoleVariations`, `includeDescriptions`, `includeTonalCollection`, `baseSelection`, `spreadUnit`, `themes`, `variations`

After Done: `updateSettingsFromInputs()` → `renderColorGroups()`, `renderRoles()`, `schedulePreview()`. Then outer `closeSettings` also calls `renderPreviewTabs()`, `schedulePreview()`.

### Cancel

`settings-cancel` → `closeSettings(true)` → `Object.assign(appState, _settingsSnapshot)` → `syncOutputToggles()`, `syncAlgoSection()`, `renderColorGroups()`, `renderRoles()`. Then also `renderPreviewTabs()`, `schedulePreview()`.

---

## 4. Settings — Token Settings Tab

This single tab contains all algorithmic, naming, and Figma output settings. It is rendered dynamically by `renderSettingsTokensPanel()` into `#settings-panel-tokens`.

### Token Creation Mode card

Two buttons: **Tonal Scale Based** (`tonalScalesBased`) / **Adaptive Engine** (`adaptiveEngine`)  
`setPluginMode(idx)` → `appState.pluginMode` → `syncOutputToggles()`, `renderColorGroups()`, `renderRoles()`, `schedulePreview()`

**Global Algorithm / Solver toggle** (`useGlobalAlgo`):  
`toggleBoolSetting("useGlobalAlgo")` → `appState.useGlobalAlgo` → `syncOutputToggles()`, `renderColorGroups()`, `renderRoles()`, `schedulePreview()`

**Cascading effects (via `syncAlgoSection`):**

- Title text: "Global Algorithm" (tonal) / "Global Solver" (adaptive)
- Description: "Use one algorithm for all colors" / "Use one solver mode for all colors and roles"
- `setting-global-algo-row` (algorithm select): visible only when tonal mode AND `useGlobalAlgo` is true
- `setting-global-solver-row` (solver select): visible only when adaptive mode AND `useGlobalAlgo` is true
- `setting-algo-scope-row` (Color vs Role scope): visible only when adaptive mode AND `useGlobalAlgo` is false

**Global Algorithm select** (`setting-scaleAlgorithm`):  
Options: Natural, Uniform, Expressive, Symmetric, OKLCH, Material, Linear → read on Done

**Global Solver select** (`setting-solverMode`):  
Options: Balanced (`natural`), Vivid (`saturated`), Muted (`luminance`), Hue Locked (`hue-locked`), Max Chroma (`chroma-maximized`) → read on Done

**Algo Scope (Color vs Role):**  
Only visible in adaptive mode with `useGlobalAlgo` off.  
Two buttons: **By Color** / **By Role**  
`setAlgoScope(scope)` → `appState.perColorAlgoScope` → syncs scope buttons, `renderColorGroups()`, `renderRoles()`, `schedulePreview()`

**Cascading effects of mode change (via `_syncModeControls`):**

- `mode-btn-ramp` active when tonal; `mode-btn-direct` active when adaptive
- `settings-scale-section` (Palette card) hidden when adaptive
- `settings-step-labels-section` (Scale Step Labels card) hidden when adaptive
- `settings-palettes-collection-group` hidden when adaptive
- `settings-embed-directly-row` hidden when adaptive
- `base-selection-opt-byindex` hidden when adaptive; if `baseSelection === "By Index"`, forced to `"By Contrast"`
- Preview: Tonal Scale tab hidden when adaptive

---

### Palette card

Only shown in tonal mode (`settings-scale-section`).

- **Scale Length** — `setting-scaleLength` number input → read on Done → `appState.scaleLength` (integer, clamped 1–100)

---

### Variations card

- **Role-specific Variations** toggle (`allowRoleVariations`):  
  `toggleBoolSetting("allowRoleVariations")` → re-renders color groups and roles, syncs toggles

- **Shared Variations list** — rendered by `renderSettingsVariations()` into `#settings-variations-list`. Each variation has:
  - Name input → `updateSharedVariation(idx, "name", value)` → `setVariation()`, `renderRoles()`, `schedulePreview()`
  - Shorthand input → `updateSharedVariation(idx, "shorthand", value)`
  - ▲/▼ buttons → `moveSharedVariation(idx, dir)` → swaps array positions, `ensureVariations()`, re-renders
  - Delete button (disabled if only 1 variation) → `removeSharedVariation(idx)` → splices array, `ensureVariations()`
  - `+ Add` button → `addSharedVariation()` → pushes new `{_id, name, shorthand}`, `ensureVariations()`

`ensureVariations()` runs after every variation mutation: ensures all roles have `variationTargets` arrays matching the current variation count.

---

### Token Naming card

**Shorthand Toggles** (all: `toggleBoolSetting(key)` → `syncOutputToggles()`, `schedulePreview()`):

- `useShorthandColors` — "Shorthand for Colors"
- `useShorthandRoles` — "Shorthand for Roles"
- `useShorthandVariations` — "Shorthand for Variations"
- `useShorthandSteps` — "Shorthand for Scale Steps"

**Token Name Format** — rendered by `renderTokenOrderPills()`. Three coloured draggable pills: Color, Role, Variation.

**Drag-to-reorder:**

- `dragstart` → records source index, dims pill opacity to 0.4
- `dragover` target → highlights pill with white glow (`0 0 0 2px #fff8`)
- `dragleave` → restores shadow
- `drop` → `setTokenNameOrder(newOrder)` → `appState.tokenNameOrder = order`, `renderTokenOrderPills()`, `_syncNameFormatPreview()`, `schedulePreview()`
- `dragend` → clears source index, restores opacity

**Note:** `setTokenNameOrder` updates only `appState.tokenNameOrder`. The `variableStructure` field is managed separately via the Variable Structure selector in the Run Dialog.

**Name Format Preview** (`name-format-preview`):  
Shows a live example using the first color, first role, third variation as samples. Each segment is coloured to match its pill. Respects shorthand toggles.

**Variable Descriptions** toggle (`includeDescriptions`):  
`toggleBoolSetting("includeDescriptions")` → re-renders color groups and roles (shows/hides description inputs), `schedulePreview()`  
Figma output effect: when true, contrast metadata is written into Figma variable descriptions.

---

### Collections card

**Palettes collection group** (hidden when adaptive mode):

- Toggle (`includeTonalCollection`): `toggleBoolSetting("includeTonalCollection")` → `syncOutputToggles()`, `schedulePreview()`
- Name input (`setting-tonalScaleCollectionName`): visible only when `includeTonalCollection` is true. Read on Done. Default `"_scale"`.

**Color role collection name** (`setting-tokenCollectionName`): always visible. Read on Done. Default `"contextual"`.

**Map Roles with Palettes row** (id: `settings-embed-directly-row`, hidden when adaptive mode):  
Toggle (`toggle-mapRolesWithPalettes`): `toggleMapRolesWithPalettes()` → `appState.embedDirectly = !appState.embedDirectly`, reflects `!embedDirectly` on button, `schedulePreview()`  
Figma output effect: when `embedDirectly` is true, contextual token variables contain raw hex values instead of Figma variable aliases.

**Global Colors** toggle (`includeGlobalColors`):  
`toggleBoolSetting("includeGlobalColors")` → shows/hides `constants-options` sub-section  
Sub-section contains:
- Global Collection Name input (`setting-globalColorsCollectionName`) → read on Done → default `"_constants"`
- Alpha Tints toggle (`includeAlphaTints`): shows/hides `opacity-values-row`
- Alpha Values CSV input (`setting-alphaValues`) → read on Done → e.g. `"10, 25, 50, 75, 90"`, integers 0–100

---

### Scale Step Labels card

Only shown in tonal mode (id: `settings-step-labels-section`).  
Rendered by `renderSettingsStepLabels()` into `#settings-step-labels-list`. Each entry is `{_id, name, shorthand}` in `appState.scaleStepNames`.

- Name input → `updateStepLabel(idx, "name", value)` → `schedulePreview()`
- Shorthand input → `updateStepLabel(idx, "shorthand", value)`
- ▲/▼ buttons → `moveStepLabel(idx, dir)` → swaps array positions, re-renders
- Delete button → `removeStepLabel(idx)` → splices array
- `+ Add` button → `addStepLabel()` → pushes `{_id, name: "N00", shorthand: "N00"}` (where N is the new count), re-renders

**Data shape:** `appState.scaleStepNames` is `Array<{_id, name, shorthand}>`. Legacy CSV strings are migrated to this format on `loadState()`.

**If empty:** steps are numbered `1 … N` automatically by the engine.

**Token naming:** when `useShorthandSteps` is true, `figmaVars.js` replaces each step label in Figma variable paths with its shorthand.

---

## 5. Settings — Plugin Tab

Rendered by `renderSettingsPluginPanel()` into `#settings-panel-plugin`.

### UI Scale

`setting-ui-scale` select → `updateUiPref("scale", value)` → `uiPrefs.scale = value`, `applyUiPrefs()`, posts `save-ui-prefs-meta` to backend  
Options: 100% (default), 70%, 80%, 90%, 110%, 125%, 150%  
Applied as `document.body.style.zoom` and CSS var `--ui-scale`.

### UI Theme

`setting-ui-theme` select → `updateUiPref("theme", value)` → same flow as scale  
Options: `"figma"` (follows Figma's own theme), `"dark"`, `"light"`  
Applied as `data-ui-theme` attribute on `<body>`.

**Auto-follow Figma theme:** A `MutationObserver` watches `html` and `body` class changes. When `uiPrefs.theme === "figma"`, any Figma theme class change re-calls `applyUiPrefs()`. Also listens to OS `prefers-color-scheme` changes as a fallback.

---

## 6. Colors (Sidebar Tab)

### Add Color

`+ Add Color` button → `addGroup()` → picks a random unused preset from 50-color list (avoids name + shorthand collisions); falls back to `Color N` / `cN`. Unshifts to front of `appState.colors`, `renderColorGroups()`, `schedulePreview()`

### Color Card — Main Row

Always shown. Grid layout: controls / name / shorthand / color picker / delete.

- **▲ / ▼ buttons** → `moveGroup(idx, dir)` → splices and re-inserts in `appState.colors`, `renderColorGroups()` (no preview — name order doesn't change values)
- **⠿ drag handle** (the whole card is draggable via `bindDragDrop`) → on drop: splices and re-inserts, `renderColorGroups()`, `schedulePreview()`
- **Color Name input** → `updateGroup(idx, "name", value)` → `setColor()`, `schedulePreview()`
- **Shorthand input** → `updateGroup(idx, "shorthand", value)` → `setColor()`, `schedulePreview()`
- **Color picker** (native `<input type="color">` + hex text input) → `updateGroup(idx, "value", value, el)` → `setColor()` (sanitizes hex), syncs sibling hex text input, `schedulePreview()`
- **Delete button** → `removeGroup(idx)` → `appState.colors.splice(idx, 1)`, `renderColorGroups()`, `schedulePreview()`

### Color Card — Solver Row

**Condition:** `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo === false` AND `perColorAlgoScope !== "role"`  
Shows a **Color Solver** dropdown: Balanced / Vivid / Muted / Hue Locked / Max Chroma  
→ `updateGroup(idx, "solverMode", value)`, `schedulePreview()`

### Color Card — Scale Algorithm Row

**Condition:** `pluginMode !== "adaptiveEngine"` AND `useGlobalAlgo` is false  
Shows a **Scale Algorithm** dropdown per color: Natural / Uniform / Expressive / Symmetric / OKLCH / Material / Linear  
→ `updateGroup(idx, "scaleAlgorithm", value)`, `schedulePreview()`

### Color Card — Description Row

**Condition:** `includeDescriptions` is true  
Shows a **Description** text input → `updateGroup(idx, "description", value)`, `schedulePreview()`

---

## 7. Roles (Sidebar Tab)

### Add Role

`+ Add Color Role` → `addRole()` → picks next unused preset from 20-role list; falls back to `Role N` / `rN`. Unshifts to front. New role defaults: `spread: 2`, `minContrast: 4.5`, `baseIndex: mid`, `darkBaseIndex: mid`, `variationOverride: false`, `roleVariations: []`, `mappingMode: "auto"`. `renderRoles()`, `schedulePreview()`

### Role Card — Name Row

Always shown. Grid layout: controls / name / shorthand / delete.

- **▲ / ▼ buttons** + **⠿ drag handle** → `moveRole(idx, dir)` → `renderRoles()`; drag uses `bindDragDrop` on whole card → on drop: `renderRoles()`, `schedulePreview()`
- **Role Name input** → `updateRole(idx, "name", value)` → `setRole()`, `schedulePreview()` (name/shorthand changes only trigger preview, no re-render — prevents focus loss)
- **Shorthand input** → same
- **Delete button** → `removeRole(idx)` → `appState.roles.splice(idx, 1)`, `renderRoles()`, `schedulePreview()`

### Role Card — Variations Section (Collapsible)

**Header** click → toggles `ui.open` in `_roleCardUIState[role._id]`, `renderRoles()`  
Shows: "Variations (N)" + a **Global / Role** scope badge

**Scope badge:**

- Reads `role.variationOverride`: false = "Global" (grey), true = "Role" (blue)
- Click → `toggleRoleVariationOverride(idx)` if `allowRoleVariations` is enabled
- When `allowRoleVariations` is false → badge is visually disabled (opacity 0.4, no click)

**`toggleRoleVariationOverride(idx)`:**

- If turning ON: if `role.roleVariations` is empty, copies global variations (new `_id` on each). Sets `role.variationOverride = true`
- If turning OFF: sets `role.variationOverride = false` (roleVariations array kept but ignored)
- `renderRoles()`, `schedulePreview()`

**Variation table when open:**

_Global mode_ (`variationOverride` false): columns = `#`, `Variation`, `Min Contrast`

- `#` — row number
- `Variation` — read-only label (`name (shorthand)`)
- `Min Contrast` — number input → `updateRoleVariationTarget(roleIdx, vi, value)` → `setRole("variationTarget:N", value)` (clamped 1–21), `schedulePreview()`

_Role-override mode_ (`variationOverride` true): columns = `#`, `Name`, `Short`, `Min Contrast`, `−`

- `Name` input → `updateRoleVariation(idx, vi, "name", value)` → `setRoleVariation()`, `schedulePreview()`
- `Shorthand` input → same for `"shorthand"`
- `Min Contrast` → same as global mode
- `−` delete button (disabled if only 1) → `removeRoleVariation(idx, vi)` → splices `role.roleVariations`, `ensureVariations()`, `renderRoles()`, `schedulePreview()`
- `+ Add variation` row → `addRoleVariation(idx)` → pushes new variation, `ensureVariations()`, `renderRoles()`, `schedulePreview()`

### Role Card — Solver Algorithm Row

**Condition:** `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is false AND `perColorAlgoScope === "role"`  
Shows a **Solver** dropdown per role: Balanced / Vivid / Muted / Hue Locked / Max Chroma  
→ `setRole(idx, "solverMode", value)`

---

## 8. Run / Sync Flow

### Initiate

`btn-run` → `handleSubmit("all")`

**Validation:** `validateState()` checks:

- At least one color
- At least one role
- No duplicate color names
- No duplicate color shorthands
- No duplicate role names
- No duplicate role shorthands

If validation fails → `renderErrorDialog(message)`, `showOverlay("error-overlay")`. Stops.

If valid → posts to Figma backend:
```js
{ type: "check-collections", colorName, contextualName, state: appState, savedState: getSavedState() }
```
(`pendingScope` stores the scope, `colorName` and `contextualName` are the collection name strings.)

### Run Dialog

On `collection-check-result` message:

- Stores `lastCollectionCheckResult` (existing collection names), `lastRenameData`
- `renderRunDialog()` → builds the full dialog DOM into `#run-dialog-overlay`
- `setRunScope(pendingScope || "all")` → populates scope buttons and refreshes dialog content
- `showOverlay("run-dialog-overlay")`

**Scope buttons:** Everything / Scale Only / Roles Only → `setRunScope()` → updates `pendingScope`, calls `refreshRunDialog()`

**Output Options** (live-editable in the dialog, state changes immediately):
- Embed Colors Directly toggle (`rd-toggle-embedDirectly`)
- Variable Structure buttons: Color-first (`color`) / Role-first (`role`) → `setTokenGrouping()`; this updates both `appState.variableStructure` and the name preview
- Use shorthand toggles for Colors, Roles, Variations

**Name preview** (`rd-name-preview`): live example token name built from first color + first role + third variation.

**Collections list** (`rd-collections`): shows which collections will be created or updated for the current scope.

**Renames list** (`rd-renames`): shown if `lastRenameData` indicates variables will be renamed. Lists each rename by type (Color, Role, Scale Steps, etc.) with from→to.

**Warning** (`rd-warnings`): shown if any target collection already exists.

### Confirm

`btn-run-confirm` → `hideOverlay("run-dialog-overlay")` → `proceedWithSync()`

`proceedWithSync()`:
1. `renderLoadingOverlay()` + `showOverlay("loading-overlay")`
2. After 50 ms delay: posts `{ type: "run-creator", state: appState, scope: pendingScope, savedState: getSavedState() }` to Figma backend

### Finish

On `finish` message:

- `setSavedState(appState)` — new baseline for rename detection
- `markClean()` — resets dirty hash
- `hideOverlay("loading-overlay")`, `renderSuccessDialog(msg.tally)`, `showOverlay("success-overlay")`
- Shows tally: Created / Updated / Renamed / Failed counts
- `showSystemBanners(msg.errors, msg.result)` — scans all theme token outputs for contrast failures, posts warnings

---

## 9. Preview Screen

### Opening

Preview tab button → `renderPreviewTabs()` → builds the tab bar, then renders the panel.  
Alt+3/4/N keyboard shortcut → `openPreview(panelId)` → same render, then activates the specific panel.  
Both hide `#main-nav-area` and show `#preview-screen` as `display:flex`.

### renderPreviewTabs

- Removes all `.preview-theme-tab` buttons
- Hides/shows the Tonal Scale tab (`[data-target='preview-colors']`) based on `pluginMode`: hidden when `adaptiveEngine`
- Creates one tab button per `appState.themes` entry → each targets `preview-theme-panel-{i}`

### renderPreviewPanel

Sections:

1. **Tonal Scales / Solved Colors** (`#preview-colors`) — one color spectrum strip per `appState.colors` entry. At rest each swatch shows weight + hex. Hover expands the swatch and shows a label. Click copies hex. Inline color picker (click color swatch at the start of the row) calls `updateGroup()` directly.

2. **Alpha Tints** — shown only when `includeAlphaTints` AND `includeGlobalColors` are both true. One row per color, one swatch per alpha value. Click copies `rgba()` string.

3. **Theme panels** (`#preview-theme-panels`) — one panel per theme. Each panel shows token swatches grouped by color → role → variation.  
   - **At rest:** shows contrast ratio over each swatch  
   - **On hover:** shows hex value, hides contrast ratio  
   - **Click:** copies hex  
   - **Alt+click:** copies token name (if `token.tknName` is available)

### Live preview

`schedulePreview()` is a debounced (500 ms) function. Only fires when preview screen is visible (checks `#preview-screen.hidden`). Re-runs `variableMaker(translateConfig(appState))` and `renderPreviewPanel()`.

### Tab switching inside Preview

Click any preview tab button → deactivates all tabs + panels, activates clicked tab + its target panel.  
When a theme is removed via settings while its panel is active → falls back to first visible tab.

### Closing

`preview-back` button or `Escape` key → hides preview screen, restores `#main-nav-area`, restores active sidebar tab button state, calls `BannerManager.clear()`

---

## 10. Export (More Sheet)

`btn-more` → `showSheet("more-sheet")` → slides up bottom sheet, shows overlay

Available actions:

- **Save Config (JSON)** → `exportConfig()` → directly serialises `appState` to JSON and triggers download (no backend round-trip)
- **Export CSS** → `exportToCSS()` → posts `{ type: "request-processed-data", exportType: "css" }` → `processed-data-response` → downloads `.css`
- **Export CSV** → `exportToCSV()` → same flow, `.csv`
- **Export SCSS** → `exportToSCSS()` → same flow, `.scss`
- **Reset to Defaults** → `createDialogue("confirm-clear-overlay", {...})` → custom dialog with "Cancel" / "Clear All" buttons → if confirmed: `appState = demoConfig`, `ensureIds`, `ensureVariations`, `setSavedState(null)`, re-renders everything, `hideSheets()`

All More sheet actions call `hideSheets()` after (export ones call it in the `opt-*` onclick handler).

Shortcut buttons on the main header (`btn-export-css/csv/scss/json`) call the same export functions directly.

**Import:** `btn-import` → triggers `file-input` click (hidden `<input type="file" accept=".json,.js">`)  
Or drag a `.json` file anywhere onto the plugin window → `drop-overlay` appears → on drop: `handleImportJSON()`

`handleImportJSON` parses JSON, validates that `colors` and `roles` exist. Then shows a **3-button confirmation dialog** (`confirm-import-overlay`):

- **Save Current & Import** → `exportConfig()` then `finalizeImport()`
- **Import & Replace** → `finalizeImport()`
- **Cancel** → dismisses

`finalizeImport()` → `loadState(importedData)` (merges, migrates, re-ids, re-variations, `markClean()`), `syncInputsFromState()`, `renderColorGroups()`, `renderRoles()`, `BannerManager.success(...)`

---

## 11. Overlays & Sheets

| ID                     | Shown by                                          | Hidden by                                               |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| `loading-overlay`      | `proceedWithSync()`                               | `finish` or `error` message                             |
| `success-overlay`      | `finish` message                                  | "Back to Editor" button (`hideOverlay()`)               |
| `error-overlay`        | validation fail, `error` message                  | "Dismiss" button (`hideOverlay()`)                      |
| `run-dialog-overlay`   | `collection-check-result` message                 | confirm or cancel button                                |
| `confirm-import-overlay` | `handleImportJSON()` (after parse/validate)     | any button choice                                       |
| `confirm-clear-overlay`| `opt-clear` button (Reset to Defaults)            | any button choice                                       |
| `drop-overlay`         | file drag enters window                           | drag leave or drop                                      |
| `more-sheet`           | `btn-more`                                        | overlay click, `close-more` button, any export action   |

---

## 12. Resize

`resize-handle` mousedown → records `resizeOriginX/Y` and `resizeStartW/H` → `mousemove` posts `{ type: "resize", width, height }` to Figma backend on every move.  
Clamped: width 400–1400, height 560–1400.  
`mouseup` removes listeners, clears `isResizing`.

---

## 13. Tooltips

Any element with `data-tooltip` attribute → global `mouseenter` listener (capture phase) → shows `#tooltip` element near the target, clamped to viewport.  
`mouseleave` → hides tooltip.

---

## 14. Field Visibility Summary Table

| Field / Control                                     | Visible when                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Palette card in Token Settings                      | `pluginMode !== "adaptiveEngine"`                                                                 |
| Scale Step Labels card in Token Settings            | `pluginMode !== "adaptiveEngine"`                                                                 |
| Palettes collection toggle + name group             | `pluginMode !== "adaptiveEngine"`                                                                 |
| Map Roles with Palettes row                         | `pluginMode !== "adaptiveEngine"`                                                                 |
| Tonal Collection name input                         | `pluginMode !== "adaptiveEngine"` AND `includeTonalCollection` is true                            |
| Global Algorithm select row                         | `pluginMode !== "adaptiveEngine"` AND `useGlobalAlgo` is true                                     |
| Global Solver select row                            | `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is true                                     |
| Algo Scope (Color/Role) row                         | `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is false                                    |
| Color card Solver dropdown                          | `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is false AND `perColorAlgoScope !== "role"` |
| Color card Scale Algorithm dropdown                 | `pluginMode !== "adaptiveEngine"` AND `useGlobalAlgo` is false                                    |
| Role card Solver dropdown                           | `pluginMode === "adaptiveEngine"` AND `useGlobalAlgo` is false AND `perColorAlgoScope === "role"` |
| Color card Description input                        | `includeDescriptions` is true                                                                     |
| Constants sub-options (alpha tints etc.)            | `includeGlobalColors` is true                                                                     |
| Alpha Values input row                              | `includeAlphaTints` is true                                                                       |
| Scope badge clickable on role card                  | `allowRoleVariations` is true                                                                     |
| Preview: Tonal Scale tab                            | `pluginMode !== "adaptiveEngine"`                                                                 |
| Preview: Alpha Tints section                        | `includeAlphaTints` AND `includeGlobalColors` both true                                           |
| Role-override variation columns (Name/Short/Delete) | `role.variationOverride` is true                                                                  |
| Run dialog Scope section                            | `pluginMode !== "adaptiveEngine"`                                                                 |
| Run dialog Embed Colors Directly row                | `pluginMode !== "adaptiveEngine"`                                                                 |
