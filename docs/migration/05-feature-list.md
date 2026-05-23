# Token Wand — Complete Feature List

> **For future agents:** This is the single source of truth for every feature, behaviour, state field,
> conditional, side effect, and edge case in the vanilla version. Nothing in this list is aspirational —
> every item is confirmed from direct source code reading. The React migration must reproduce all of it.
>
> Status key: ✅ Fully implemented · ⚠️ Implemented but needs polish · 🔲 Placeholder UI only · ❌ Not started

---

## 1. State shape — `appState`

Every key that exists on `appState`. The Zustand store must mirror this exactly.

### Top-level scalars

| Key | Type | Default | Notes |
|-----|------|---------|-------|
| `name` | string | `"Token Wand"` | Project name |
| `description` | string | `""` | Project description |
| `pluginMode` | `"scale"` \| `"direct"` | `"scale"` | Generation mode |
| `scaleAlgorithm` | string | `"Natural"` | Global algorithm (7 options) |
| `scaleLength` | number | `25` | Number of steps in tonal scale |
| `useUniformAlgorithm` | boolean | `true` | Use same algorithm for all colors/roles |
| `algorithmScopeLevel` | `"color"` \| `"role"` | `"color"` | Per-color or per-role algorithm selection |
| `solverMode` | string | `"natural"` | Global solver mode (5 options) |
| `tokenNameSegments` | string[] | `["color","role","variation"]` | Order of token name parts |
| `useShorthandColors` | boolean | `false` | Use color shorthand in token names |
| `useShorthandRoles` | boolean | `false` | Use role shorthand in token names |
| `useShorthandVariations` | boolean | `false` | Use variation shorthand in token names |
| `useShorthandSteps` | boolean | `false` | Use step shorthand in token names |
| `resolveTokensDirectly` | boolean | `false` | Write hex values instead of aliases; suppresses `_scale` |
| `includeSourceColors` | boolean | `false` | Generate `_constants` collection |
| `sourceCollectionName` | string | `"_constants"` | Name for source colors collection |
| `includeAlphaTints` | boolean | `false` | Generate alpha tint variables |
| `alphaValues` | string | `"5,10,20,25,50,75,80,90,95"` | CSV of opacity percentages (0–100) |
| `tokenGrouping` | `"color"` \| `"role"` | `"color"` | Variable grouping hierarchy |
| `includeColorScalesCollection` | boolean | `true` | Generate `_scale` collection |
| `includeDescriptions` | boolean | `false` | Write WCAG metadata to Figma variable descriptions |
| `scaleCollectionName` | string | `"_scale"` | Name of the scale collection |
| `tokenCollectionName` | string | `"color tokens"` | Name of the token collection |
| `_presetId` | string \| undefined | — | ID of last loaded preset (for "✓ Loaded" badge) |

### `colors[]` — array of color objects

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `_id` | string | generated | Stable 8-char random ID. Never change after creation |
| `name` | string | from pool | Display name |
| `shorthand` | string | from pool | Abbreviated name for token segments |
| `value` | string | `"#6750A4"` | Hex color (always 6-digit, always valid) |
| `description` | string | `""` | Optional metadata |
| `scaleAlgorithm` | string | global value | Per-color algorithm. Only used when `useUniformAlgorithm: false` and `algorithmScopeLevel: "color"` |
| `solverMode` | string | global value | Per-color solver. Only used when `useUniformAlgorithm: false` and `pluginMode: "direct"` |

### `roles[]` — array of role objects

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `_id` | string | generated | Stable ID |
| `name` | string | from pool | Display name |
| `shorthand` | string | from pool | Abbreviated name |
| `minContrast` | number | `4.5` | Target WCAG contrast ratio (1–21) |
| `mappingMethod` | `"contrast"` \| `"index"` | `"contrast"` | How role maps to scale step |
| `variationTargets` | number[] | `[1.5,3.0,4.5,7.0,12.0]` | One per variation slot |
| `customVariationList` | boolean | `false` | If true, use `customVariations` instead of global |
| `customVariations` | object[] | `[]` | Per-role variation overrides (same shape as global variations) |
| `scaleAlgorithm` | string | global value | Per-role algorithm. Only in Scale mode + `algorithmScopeLevel: "role"` |
| `solverMode` | string | global value | Per-role solver. Only in Direct mode + `useUniformAlgorithm: false` |
| `description` | string | `""` | Optional metadata |

### `themes[]` — array of theme objects

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `_id` | string | generated | Stable ID |
| `name` | string | `"Light"` / `"Dark"` | Theme name (used as Figma mode name) |
| `bg` | string | `"#FFFFFF"` | Background hex. Drives semantic role contrast solving |

### `variations[]` — global variation list

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `_id` | string | generated | Stable ID |
| `name` | string | `"1"`, `"2"`, ... | Display name |
| `shorthand` | string | `"1"`, `"2"`, ... | Abbreviated |
| `description` | string | `""` | Optional |

### `scaleStepNames[]` — step label list

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Step display name. If empty list, auto-generates "1"..."N" |
| `shorthand` | string | Used in token paths when `useShorthandSteps: true` |

### `versions[]` — saved state snapshots

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | generated |
| `name` | string | User-supplied label |
| `description` | string | Optional |
| `timestamp` | number | `Date.now()` at save time |
| `state` | object | Deep snapshot of `appState` excluding `versions` itself |

---

## 2. State shape — `uiPrefs`

Persisted in `figma.clientStorage` under key `"uiPrefsMeta"`. Survives document changes.

| Key | Type | Valid values | Default |
|-----|------|-------------|---------|
| `scale` | number | `0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5` | `1.0` |
| `theme` | string | `"figma"`, `"dark"`, `"light"` | `"figma"` |
| `language` | string | `"en"`, `"es"`, `"hi"` | `"en"` |

---

## 3. Boot sequence ✅

1. Plugin thread starts; reads `figma.root.getPluginData("tw_state")`.
2. If found → sends `load-config` to UI with saved state.
3. If not found (first launch) → sends `load-config` with null → UI shows Quick Start overlay.
4. Plugin thread reads `figma.clientStorage.getAsync("uiPrefsMeta")` → sends `load-ui-prefs-meta`.
5. Plugin probes `figma.currentUser.license` → if Starter plan, sends `capabilities: { multiMode: false }`.
6. UI applies `uiPrefs`: CSS variable `--ui-scale`, zoom level, `data-theme` attribute.
7. UI runs `ensureIds()` on loaded state.
8. UI renders all screens; default active tab is Colors.

---

## 4. Two-thread message contract ✅

### UI → Plugin

| `type` | Key payload fields | Triggered by |
|--------|--------------------|-------------|
| `run-creator` | `state`, `scope` | Run dialog confirm |
| `check-collections` | `state` | Run button click |
| `resize` | `w`, `h` | Drag resize handle |
| `save-ui-prefs-meta` | `scale`, `theme`, `language` | Settings Plugin tab |
| `request-processed-data` | `format`, `state` | Individual export buttons |
| `request-export-bundle` | `formats[]`, `state` | ZIP export button |
| `save-config` | `state` | Settings Done |
| `cancel` | — | Plugin close |

### Plugin → UI

| `type` | Key payload fields | Consumed by |
|--------|--------------------|------------|
| `load-config` | `state` (null if first launch) | runtime.js boot |
| `load-ui-prefs-meta` | `scale`, `theme`, `language` | runtime.js boot |
| `collection-check-result` | `existing[]`, `renames` | Run dialog renderer |
| `finish` | `tally`, `errors`, `result` | Success/error dialog |
| `capabilities` | `multiMode: boolean` | UI visibility gating |
| `processed-data-response` | `format`, `data` | Download trigger |
| `export-bundle-response` | `files[{name,content}]` | ZIP download trigger |
| `error` | `message` | Error overlay |
| `warning` | `message` | Toast (8s auto-dismiss) |

---

## 5. Screen routing ✅

- **Sidebar tabs:** Colors · Roles · Project (no Preview tab in sidebar — Preview is a main content area).
- **Main content area:** Switches between Colors list, Roles list, Project screen, Preview panel based on active tab.
- **Overlays (full-screen):** Settings, Theme Shop, Quick Start, Design Lab.
- **Bottom sheets:** Run dialog, Save Version dialog, Export sheet.
- **Inline dialogs:** Reset confirm, Preset-load confirm (when dirty), Validation warning.
- Tab switch does not reset state of outgoing or incoming screen.
- Switching to Preview tab triggers `schedulePreview()` if stale.

---

## 6. Colors screen ✅

### List behaviour
- Renders one `ColorGroupCard` per `appState.colors` entry.
- Full list re-render is debounced at 50 ms.
- `withPreservedFocus()` wraps every re-render — active input + cursor position survive.
- Empty state shows a message when `colors` array is empty.

### ColorGroupCard fields
| Field | Visible condition | Behaviour |
|-------|------------------|-----------|
| Color swatch + hex input | Always | In-place swatch update on every keypress. Focus not lost. Invalid chars rejected via `sanitizeHex()`. |
| Native `<input type="color">` picker | Always | Syncs hex field on every `input` event |
| Name input | Always | Updates `color.name` |
| Shorthand input | `useShorthandColors: true` | Updates `color.shorthand` |
| Description input | Always | Updates `color.description` |
| `scaleAlgorithm` select | `pluginMode === "scale"` AND `useUniformAlgorithm === false` | 7 options |
| `solverMode` select | `pluginMode === "direct"` AND `useUniformAlgorithm === false` | 5 options |
| Up / Down move buttons | Always | Calls `moveGroup(idx, dir)` |
| Delete button | Always · disabled if `colors.length === 1` | Removes by index |

### Add color
- "+ Add Color" button at bottom of list.
- Picks next color from a pool of 50 named presets (Crimson, Coral, …). Wraps if pool exhausted.
- New entry unshifted to front of `appState.colors`.
- Gets fresh `_id`.

### Drag-to-reorder
- Drag handle on each card.
- During drag: card opacity → 0.5, `border-t-2 border-[var(--accent)]` shown on hovered drop target.
- On drop: `appState.colors` spliced to new order → `renderColorGroups()` → `schedulePreview()`.
- All card inputs `disabled` during drag.

---

## 7. Roles screen ✅

Parallel structure to Colors. Every pattern above applies.

### RoleGroupCard fields
| Field | Visible condition | Behaviour |
|-------|------------------|-----------|
| Name input | Always | Updates `role.name` |
| Shorthand input | `useShorthandRoles: true` | Updates `role.shorthand` |
| Mapping method toggle | Always | `"contrast"` / `"index"` segmented button |
| `minContrast` input | `mappingMethod === "contrast"` | Number, clamped 1–21 |
| Index input | `mappingMethod === "index"` | Integer step index |
| Variation target inputs | Always | One per variation slot. `variationTargets[n]` |
| Custom variation override toggle | Always | Flips `customVariationList` |
| Custom variations list | `customVariationList === true` | Name + shorthand per entry; add/remove/reorder |
| Reset to shared button | `customVariationList === true` | Calls `resetRoleVariationsToShared(idx)` |
| `scaleAlgorithm` select | Scale mode + `algorithmScopeLevel === "role"` + `useUniformAlgorithm === false` | 7 options |
| `solverMode` select | Direct mode + `useUniformAlgorithm === false` | 5 options |
| Description input | Always | Updates `role.description` |
| Up / Down | Always | `moveRole(idx, dir)` |
| Delete | Always · disabled if `roles.length === 1` | Removes by index |

### Add role
- "+ Add Color Role" at bottom of list.
- Pool of 20 named roles (Text, Fill, Background, …). Wraps if exhausted.
- Defaults: `minContrast: 4.5`, `mappingMethod: "contrast"`, `variationTargets` copied from current global variations length.

### Custom role variation override ✅⚠️
- When toggled on for the first time, copies global `appState.variations` into `role.customVariations` (with `_id` preserved).
- Toggling off discards custom list, reverts to global.
- `resetRoleVariationsToShared(idx)` sets `customVariationList: false` and clears `customVariations`.
- **Known gap:** Rename detection in `buildVariableRenameMap` only handles shared variations — custom variation renames silently create new Figma variables.

---

## 8. Preview screen ✅⚠️

### Scheduling
- `schedulePreview()` — debounced 500 ms.
- Only fires if `#preview-screen` is not hidden.
- Errors caught and logged (never crashes the UI).

### Color Scale panel (Scale mode only)
- One row per color.
- Source swatch (click to open color picker).
- Editable hex input + native color picker synced bidirectionally.
- Scale spectrum: one flex cell per step.
  - Cell background = step hex.
  - Hover: reveals hex value + WCAG contrast ratings per theme.
  - Format: `"{themeName}: {ratio}"` per theme.
  - Click: copies hex to clipboard, shows toast.
- **Alpha Tints sub-section** (if `includeAlphaTints: true`): renders RGBA swatches per opacity value. ⚠️ Currently not rendered in preview — known gap.

### "Solved Colors" label
- In Direct mode the Color Scale panel header reads **"Solved Colors"**, not "Color Scale". ✅

### Theme token panels
- One panel per `appState.themes` entry.
- Active panel background = `theme.bg` hex.
- Ink color (text on panel) auto-switches white/black based on bg luminance via CSS variable `--pv-ink`.

### Group By toggle
- **By Color** (default): Color sections → Role blocks → token tiles.
- **By Role**: Role sections → Color blocks → token tiles.
- Toggle stored in session-level `_pvState.groupBy` — survives tab switches within session.

### View Mode toggle
- **Grid** (default): Token tiles with swatch + footer.
- **Table**: Rows of Variation · Hex · Ratio · Rating · Token Name.
- Stored in `_pvState.viewMode`.

### Token tile (Grid view)
| Area | Content |
|------|---------|
| Upper swatch | Background = token hex. Click = copy hex → toast |
| Rating pill (top-right of swatch) | AAA · AA · AA Large · Fail with colour coding |
| Contrast ratio (bottom-left of swatch) | e.g. `"7.2:1"` |
| Hex overlay (on hover) | Semi-transparent hex string |
| Footer | Variation label. Click = copy full token name → toast |
| Swatch hover | Scale + shadow animation |

### WCAG rating colours
| Rating | Colour |
|--------|--------|
| AAA | `#22c55e` (green) |
| AA | `#3b82f6` (blue) |
| AA Large | `#f59e0b` (amber) |
| Fail | `#ef4444` (red) |

### Table view
- Sticky header with source color as background.
- Columns: Variation · Hex · Ratio · Rating · Token Name.
- Sub-headers per role or color (depending on group-by).
- Row hover highlight.
- Click hex or token name → copy to clipboard.

---

## 9. Project screen ✅🔲

### Quick Start overlay
- Shown automatically on first launch (no saved state).
- Can be re-triggered from Project screen.
- Buttons:
  - **Start from blank** → loads bootstrap config, clears `savedState`, re-renders all screens.
  - **Browse templates** → opens Theme Shop overlay.

### Project Profile section
- Collapsible (click header to toggle; aria-expanded tracked).
- **Project Name** input → `appState.name`.
- **Project Description** input → `appState.description`.
- **Themes (modes)** sub-section:
  - "+ Add" button → `addTheme()` → new theme with auto-numbered name, gray background.
  - Drag-reorder rows (drag handle, up/down buttons, delete).
  - Minimum 1 theme enforced — delete disabled when only one exists.
  - Each row: name input + background color picker.

### Theme Shop preview card grid
- Shows first 4 presets as cards.
- Card contains: badge, name, "Load" / "✓ Loaded" button, color swatch strip, description, tag pills, stats ("X colors, Y roles, Z themes").
- "✓ Loaded" shown when `appState._presetId` matches preset `id`.
- "Explore more themes →" dashed button opens full Theme Shop overlay.

### Versions section ✅🔲
- "+ Save Version" button.
  - Disabled (with tooltip) if `versionSaveBlockedReason()` returns a message.
  - Block conditions: state unchanged since last save, duplicate name.
- Opens **Save Version bottom-sheet**:
  - Name input (required, defaults "Untitled version").
  - Description input (optional).
  - "Save" / "Cancel" buttons.
  - Auto-focuses name input on open.
- Version list:
  - Each card: name (truncated), description (optional), relative timestamp ("X ago").
  - **Restore** button → loads `version.state`, preserves current `versions` array, shows success banner, persists.
  - **Delete** button (trash icon).
- Empty state: icon + "No versions yet".

---

## 10. Settings overlay ✅🔲

### Lifecycle
1. Gear icon opens overlay.
2. `openSettings()` takes `savedState` deep-clone snapshot of current `appState`.
3. All controls immediately reflect current state.
4. Changes are applied live — preview updates in real time.
5. **Cancel**: `restoreSnapshot()` reverts `appState` → all screens re-render → overlay closes.
6. **Done**: Discards snapshot → `save-config` message → overlay closes.

### Token Settings tab

#### Mode card
| Control | Type | State key |
|---------|------|-----------|
| Scale / Direct | Segmented button | `pluginMode` |
| Global Algorithm | Toggle | `useUniformAlgorithm` |
| Algorithm selector | Select (7 opts) | `scaleAlgorithm` — hidden in Direct mode |
| Solver Mode selector | Select (5 opts) | `solverMode` — hidden in Scale mode |
| Algorithm scope | Segmented (Color / Role) | `algorithmScopeLevel` — shown only when `!useUniformAlgorithm` |

Visibility matrix:
- Global algo row: visible in Scale mode OR when `useUniformAlgorithm: true`
- Solver mode row: visible in Direct mode
- Algo scope row: visible only when `useUniformAlgorithm: false` AND Direct mode

#### Palette card
| Control | Type | State key | Constraint |
|---------|------|-----------|-----------|
| Scale Length | Number input | `scaleLength` | 1–100 |

#### Variations card
| Control | Type | State key |
|---------|------|-----------|
| Variation list | Reorderable rows | `variations[]` |
| Each row: name + shorthand inputs | Text | `variations[n].name`, `.shorthand` |
| Add button | — | Appends new entry |
| Delete button | — | Minimum 1 enforced |
| Drag handle / up/down | — | Reorders array |

#### Naming card
| Control | Type | State key |
|---------|------|-----------|
| Shorthand: Colors | Toggle | `useShorthandColors` |
| Shorthand: Roles | Toggle | `useShorthandRoles` |
| Shorthand: Variations | Toggle | `useShorthandVariations` |
| Shorthand: Scale Steps | Toggle | `useShorthandSteps` |
| Variable Structure | Segmented (Color→Role / Role→Color) | Reorders `tokenNameSegments` |
| Token Name Format | Draggable coloured pills | `tokenNameSegments` order |
| Name preview label | Read-only | Shows computed example: `"color/role/variation"` |
| Variable Descriptions | Toggle | `includeDescriptions` |

Token name format pill drag:
- Three coloured pills (color, role, variation).
- Draggable to any order.
- Preview label updates live.

#### Collections card
| Control | Type | State key | Nested condition |
|---------|------|-----------|-----------------|
| Include Palettes | Toggle | `includeColorScalesCollection` | — |
| Palette collection name | Text input | `scaleCollectionName` | Visible when toggle on |
| Color role collection name | Text input | `tokenCollectionName` | Always |
| Link tokens to color scale | Toggle | `resolveTokensDirectly` | Suppresses palette collection |
| Include Source Colors | Toggle | `includeSourceColors` | — |
| Source collection name | Text input | `sourceCollectionName` | Visible when toggle on |
| Include Alpha Tints | Toggle | `includeAlphaTints` | Nested under source colors |
| Alpha opacity values | Text input (CSV) | `alphaValues` | Visible when alpha toggle on |

#### Scale Step Labels card (hidden in Direct mode)
- Table with Label / Short columns.
- Each row: name input + shorthand input + up/down buttons + delete.
- "+ Add" button appends new row.
- If list is empty, "1…N" auto-generated at engine time.

### Plugin tab 🔲

| Control | Type | State key | Status |
|---------|------|-----------|--------|
| UI Scale | Dropdown (7 levels) | `uiPrefs.scale` | ✅ wired |
| UI Theme | Dropdown (3 options) | `uiPrefs.theme` | ✅ wired |
| Language | Dropdown (en/es/hi) | `uiPrefs.language` | 🔲 placeholder — not wired to i18n loader |
| Saved States section | — | — | 🔲 placeholder only |
| Beta Features section | — | — | 🔲 placeholder only |
| About section | — | — | 🔲 placeholder only |

---

## 11. Run dialog (Figma sync) ✅

1. Run button → `handleSubmit()` → `validateState()`.
2. If validation issues exist → **Validation Warning dialog** (blocking):
   - Lists issues with icons.
   - "Go back" / "Continue Anyway" buttons.
3. On continue → sends `check-collections` to plugin thread.
4. Loading state shown while waiting.
5. `collection-check-result` arrives → **Run dialog** rendered:
   - Scope radio group:
     - **All** — creates/updates scale + token collections
     - **Color groups** — scale collection only
     - **Roles** — token collection only
   - Existing collections list (names, will be updated in-place).
   - Rename summary (old → new variable names if renames detected).
   - "Apply to Figma" (primary) + "Cancel" buttons.
6. Confirm → `proceedWithSync()` → sends `run-creator` with `{ state, scope }`.
7. Loading overlay shown.
8. `finish` message arrives:
   - **Success dialog**: tally table (Created / Updated / Renamed / Failed with colour coding). "Back to Editor" button.
   - **Error dialog**: error message text. "Dismiss" button.
9. `setSavedState()` + `markClean()` called on success.

---

## 12. Theme Shop overlay ✅

- Full-screen overlay with back button + Escape key close.
- Grid of all 10 presets as cards (same card structure as Project screen preview but full grid).
- Each card: badge (TW = accent bg / community = muted bg), name, Load button ("✓ Loaded" if active), color swatch strip, description, tag pills, stats.
- **Load action:**
  1. Calls `loadState(preset.config)`.
  2. Sets `appState._presetId = preset.id`.
  3. Hides theme-shop + quickstart overlays.
  4. Re-renders: colors, roles, project screen, settings (if open).
  5. Switches active sidebar tab to Colors.
  6. Shows success banner: `"{name} loaded — everything is editable."`.

### Built-in presets (10)
`blank` · `wand` (TW Regular) · `tw-pro` · `tw-funk` · `apple` · `carbon` · `material` · `polaris` · `radix` · `tailwind` · `atlassian`

---

## 13. JSON Import / Export ✅

### Export
- Serialises current `appState` to JSON.
- Triggers browser download via `data:` URL + `<a>.click()`.
- File name: `"token-wand-config.json"` (or project name slug).

### Import
- File input (`<input type="file" accept=".json,.wand">`).
- Drag-and-drop onto plugin window also accepted.
- Validation: must have `colors`, `roles`, `themes` keys.
- `ensureIds()` called on import.
- Warns if dirty before replacing state.
- Shows success banner on completion.

---

## 14. Multi-format export engine ✅

All exports run in the **plugin thread** (postMessage triggers generation). UI sends `request-processed-data` or `request-export-bundle`.

### Single-format exports
Triggered by individual format buttons. Each posts `{ type: "request-processed-data", format, state }`.

| Format | Output file |
|--------|------------|
| CSS | `scale.css` + `themes/{slug}.css` per theme |
| SCSS | `scale.scss` + `tokens.scss` + `index.scss` |
| Tailwind | `tailwind.config.js` |
| DTCG | `scale.json` + `themes/{slug}.json` |
| Style Dictionary | `global.json` + `{slug}.json` per theme |
| CSV | `tokens.csv` |
| iOS Swift | `{ThemeName}Colors.swift` per theme |
| Android | `res/values/colors.xml` + `res/values-{slug}/colors.xml` |
| React Native | `tokens/index.ts` + `tokens/{slug}.ts` |
| Wand (JSON) | `config.wand` |

### ZIP bundle export
- Sends `request-export-bundle` with selected format list.
- Plugin generates all files, sends `export-bundle-response` with `files[{name, content}]`.
- UI builds ZIP via `jszip.min.js` and triggers download.
- File name: `"{project-slug}-tokens.zip"`.

### Project slug derivation
Lowercase → spaces to dashes → strip non-alphanumeric/dash → result is used in file names.

---

## 15. Notification system ✅

### Toast (bottom of UI)
| Property | Value |
|----------|-------|
| Types | success · error · info · warn · neutral |
| Stack limit | 5 (oldest removed if exceeded) |
| Default duration | 2000 ms |
| Animation in | Fade in |
| Animation out | Fade + scale, 220 ms |
| Manual dismiss | `ToastManager.dismiss(id)` |
| Type shortcuts | `.success()` `.error()` `.info()` `.warn()` |

### Banner (top of UI)
| Property | Value |
|----------|-------|
| Types | warning · error · info · success · neutral |
| Modes | Stack (all visible) · Queue (sequential) · Carousel (nav + optional auto-advance) |
| Content | `title`, `message`, optional `detail` (expandable "Show more ▾") |
| Actions | Optional button array with `{ label, onClick }` |
| Dismissible | Default true (× button) |
| AutoClose | Optional progress bar animation |
| Carousel nav | Previous / Next arrows, dot indicators |
| Callbacks | `onDismiss` per banner |

---

## 16. Dirty state tracking ✅

- Hash computed from: `colors[].{name,shorthand,value}`, `roles`, `themes`, `variations`, `scaleLength`, `scaleAlgorithm`, `pluginMode`, `scaleStepNames`, all shorthand toggles, `tokenNameSegments`, `resolveTokensDirectly`.
- `isDirty()` → `stableHash(appState) !== _stateHash`.
- `markClean()` → updates `_stateHash` to current hash (called after successful Figma sync).
- `setSavedState()` → updates `savedState` deep-clone (called after successful sync AND on settings open).
- Used as guard for: preset load (warns), JSON import (warns), Run dialog (not gated, but tally shows 0 changes if clean).

---

## 17. ID stability and rename detection ✅⚠️

- `generateId()` → `Math.random().toString(36).slice(2,10) + Math.random().toString(36).slice(2,6)` — 10-char alphanumeric.
- `ensureIds(state)` → adds `_id` to any color/role/theme that lacks one (backward compat with old saves).
- `buildVariableRenameMap(savedAppState, newAppState)` in `config.js`:
  - Matches by `_id` (not by index or name).
  - Builds rename maps for scale and token collections separately.
  - Returns `{ scale, tokens, summary: { scaleCount, tokenCount, changes[] } }`.
  - **Known gap:** only handles shared variations; custom per-role variation renames create new Figma variables instead of renaming.

---

## 18. UI scale and theme ✅

### Scale
- Applied as CSS variable `--ui-scale` on `<html>`.
- Also sets `document.documentElement.style.zoom` for layout scaling.
- Values: `0.7` (XS) · `0.8` · `0.9` · `1.0` (default) · `1.1` · `1.25` · `1.5` (XL).

### Theme
- `"figma"` (auto): MutationObserver watches `<html>` class list for `figma-dark` / `figma-light`. Falls back to `prefers-color-scheme: dark`.
- `"dark"`: Forces `data-theme="figma-dark"` on `<html>`.
- `"light"`: Forces `data-theme="figma-light"` on `<html>`.
- Auto-detection survives Figma switching themes while plugin is open.

---

## 19. Window resize ✅

- Drag handle at bottom-right corner.
- Constraints: min `400×560`, max `1400×1400`, default `400×720`.
- On mouseup: sends `{ type: "resize", w, h }` to plugin thread → `figma.ui.resize(w, h)`.
- `figma.clientStorage` saves last size under `"uiPrefs"` (separate from `"uiPrefsMeta"`).
- Figma mobile: resize save wrapped in try-catch (silent fail).

---

## 20. Keyboard shortcuts ✅

All shortcuts require: no input/textarea/select focused AND settings overlay closed.

| Key | Action |
|-----|--------|
| `Alt+Enter` | Run (or Apply if a dialog is open) |
| `Alt+0` | Switch to Project tab |
| `Alt+1` | Switch to Colors tab |
| `Alt+2` | Switch to Roles tab |
| `Alt+3` | Switch to Preview → Color Scale (Scale mode only) |
| `Alt+4` … `Alt+N+3` | Switch to Preview → Theme 1 … Theme N |
| `Escape` | Close preview (if open, settings not open) |

---

## 21. Collapsible sections ✅

- `toggleSection(id, event)` — toggles `collapsed` class, updates `aria-expanded`.
- Guard: `event.target.closest("button")` — clicking a button inside a collapsible header does not toggle the section.

---

## 22. Tooltips ✅

- Dynamic positioning: appears above the target element by default.
- If not enough space above, falls back to below.
- Bounds clamping: never overflows the plugin window edges.
- Shown on `mouseenter`, hidden on `mouseleave`.

---

## 23. Dialogue factory ✅

`createDialogue(targetID, config)` — three layout modes:

| Layout | Description |
|--------|-------------|
| `"row"` | Floating card with side-by-side buttons |
| `"stacked"` | Centered overlay with stacked buttons |
| `"bottom-sheet"` | Slides up from bottom |

Button variants: `secondary` · `primary` · `danger` · `ghost`.
Auto-hides sheets and overlays on button click.

---

## 24. Standalone browser mode (dev) ✅

When `window.parent === window` (browser, not Figma):
- `check-collections` → mocked with empty result after 50 ms.
- `run-creator` → mocked with fake `finish` tally after 1000 ms.
- State persistence → `localStorage("tw_state")` instead of `figma.root.setPluginData`.
- `uiPrefsMeta` → `localStorage("uiPrefsMeta")`.
- All export/download functions still work normally (data URL).

---

## 25. Color engine ✅

### Scale generation — 7 algorithms

| Name | Strategy |
|------|---------|
| Linear | Even HSL lightness increments |
| Uniform | Perceptually uniform relative-luminance steps |
| Natural | Uniform + chroma tapering near white/black |
| Expressive | Natural + subtle hue rotation (warm light end, cool dark end) |
| Symmetric | Log-luminance anchored to source, geometric spread |
| OKLCH | Uniform steps in OKLCH color space (preserves source hue/chroma) |
| Material | Uniform steps in HCT space (Material You tonal palette algorithm) |

### Direct mode — 5 solver modes

| Name | Strategy |
|------|---------|
| `natural` | Balanced — preserves hue and chroma |
| `saturated` | Vivid — boosts chroma |
| `luminance` | Muted — reduces chroma |
| `hue-locked` | Preserves source hue exactly |
| `chroma-maximized` | Maximum chroma at target luminance |

Binary search solver: up to 60 iterations, convergence threshold `1e-5`.

### `variableMaker(config)` output
```js
{
  scales: { [colorName]: string[] },   // hex array per color
  tokens: { [themeName]: { [path]: string } },  // token path → hex
  errors: string[]
}
```

### Color math functions in `clrUtils.js`
- `validHex(hex)` · `normalizeHex(hex)` · `sanitizeHex(hex)`
- `hexToRgb` · `rgbToHsl` · `hslToRgb` · `hexToHsl` · `rgbToHex` · `hslToHex`
- `hexToOklch` · `oklchToHex` · `hexToHct` · `hctToHex`
- `relLum(hex)` — WCAG relative luminance
- `wcagContrast(hex1, hex2)` — WCAG 2.1 contrast ratio
- `wcagRating(ratio)` → `"AAA"` / `"AA"` / `"AA Large"` / `"Fail"`

---

## 26. Figma variable sync ✅

### VariableManager
- Cache: all existing collections and variables loaded once per sync run.
- Tally: `{ created, updated, renamed, failed }`.

### Sync flow
1. `refreshCache()` — load all collections + variables.
2. Apply renames first (two-pass strategy to handle chain renames A→B→C).
3. Stage 1 (if `scope !== "roles"` and `!resolveTokensDirectly`):
   - Get/create scale collection (`scaleCollectionName`).
   - Ensure one default mode.
   - Upsert one variable per scale step per color.
4. Stage 2 (if `scope !== "groups"`):
   - Get/create token collection (`tokenCollectionName`).
   - Ensure one mode per theme (blocked on free plan if > 1 mode).
   - Upsert semantic token variables as aliases to scale vars (or raw hex if `resolveTokensDirectly`).
5. If `includeSourceColors`:
   - Get/create source collection (`sourceCollectionName`).
   - One variable per color with raw brand hex.
6. If `includeAlphaTints`:
   - Variables grouped under `{colorName}/Opacities/` in token collection.
   - One variable per opacity value per color.

### Token path construction
Controlled by `tokenNameSegments` order and shorthand toggles.
Default: `color/role/variation` → e.g. `"Primary/Text/Default"`.

### Variable description format (if `includeDescriptions: true`)
WCAG contrast metadata written as Figma variable description string.

### Rename detection integration
`buildVariableRenameMap` compares `savedAppState` vs new `appState` by `_id`.
Rename maps passed to `VariableManager.applyRenames()` before upsert.

### Free plan limitation
`figma.currentUser.license === "starter"` → only 1 mode per collection allowed.
`capabilities: { multiMode: false }` sent to UI → multi-theme controls hidden/disabled.

---

## 27. i18n infrastructure ✅🔲

- JSON files: `en.json`, `es.json`, `hi.json` in `src/ui/lang/`.
- `lang.js` loader exists with `loadLanguage(code)` function.
- All UI strings have `data-t="key"` attributes on DOM nodes.
- String keys cover: navigation, buttons, export, import, onboarding, shop.
- **Not wired:** Language selector in Settings Plugin tab does not call `loadLanguage()`. ✅ infrastructure, 🔲 selector wiring.

---

## 28. Design Lab (Beta) 🔲

- `betaLab.js` exists. `LAB_ENABLED = false`.
- Lab button in UI shows an `alert()` placeholder when clicked.
- `labPreview.js` is a fully implemented alternative preview (Variant B) that renders into `#design-lab-overlay`.
- When enabled, provides:
  - Density selector: Comfortable / Compact.
  - Token Name toggle.
  - Theme tab bar.
  - Larger, more visual token tile grid.
  - Different swatch sizing: comfortable = 80 px, compact = 52 px.
  - Grid columns: comfortable = 96 px, compact = 80 px.
- **Status:** Code complete, disabled by flag. Enable by setting `LAB_ENABLED = true`.

---

## 29. Known gaps — carry as placeholders, do not fix during migration

| Gap | Current state | File |
|-----|--------------|------|
| Alpha tints in preview | Not rendered — works in Figma output only | `preview.js` |
| Custom variation rename detection | Silently creates new Figma variables | `figmaVars.js` |
| `preview.js` innerHTML remnants | Some string-built HTML; inconsistent with `el()` | `preview.js` |
| `tokenGrouping` UI control | State key exists; no Settings control renders it | `settings.js` |
| Language selector wiring | Dropdown renders; `loadLanguage()` never called | `runtime.js`, `lang.js` |
| Saved States | Version save/restore works; UI section marked WIP | `project.js` |
| Beta Features section | Placeholder text only | `settings.js` |
| About section | Placeholder text only | `settings.js` |
| Design Lab | `LAB_ENABLED = false`; button shows alert | `betaLab.js` |
| Inline field validation | Errors shown in full overlay; no per-field feedback | `publish.js` |

---

## 30. Primitive components reference

### `el(tag, attrs, children)`
- `class`: string
- `dataset`: object → `data-*` attributes
- `on*`: event listeners (onclick, oninput, etc.)
- `style`: object or CSS string
- `disabled`: boolean
- Children: string (text node), number, Element, SVG string (Icon constants)

### `btn(variant, opts)`
Variants: `primary` · `secondary` · `ghost` · `danger` · `danger-solid` · `icon` · `dashed`
Sizes: `xs` · `sm` · `md` · `lg` · `xl`
Extra opts: `square` (for icon buttons), `disabled`, `class`, `title`

### `input(attrs, label)`
- `id`, `type`, `value`, `placeholder`, `min`, `max`, `step`, `maxlength`
- `size`: `table` · `sm` · `md` · `lg` · `xl`
- `width`: `"full"` · `"flex"` · null
- `mono`: boolean (font-mono + uppercase, for hex codes)
- `leadingIcon`, `trailingIcon`: icon element
- `hint`, `error`: supplementary text
- `disabled`
- Event: `oninput`, `onchange`, `onblur`

### `colorInput(value, onUpdate, idPrefix, extra, size)`
- Sizes: `sm` · `md` · `lg` · `xl`
- Contains: hex text input (mono) + native `<input type="color">` synced bidirectionally
- `onUpdate(hex)` called on every valid change

### `toggle(id, isOn, onChange)`
- Uncontrolled — DOM state manages appearance
- External state sync via `syncTogglePills()` passes current `isOn` value

### `panelUI.segmented([{id, label, onclick}])`
- Segmented button group
- One active at a time (classList `active` toggled)

### `panelUI.input(opts)` — richer version with icons + hint/error support

### `panelUI.row(labelText, descText, control)` / `panelUI.smallRow(labelText, control)`

---

## 31. Drag-and-drop implementation details

`bindDragDrop(cardEl, idx, { cardSelector, getIdx, setIdx, onDrop })`

- `dragstart`: sets source index via `setIdx()`, opacity 0.5, `effectAllowed = "move"`.
- `dragover`: `preventDefault()`, adds `border-t-2 border-[var(--accent)]` to target card.
- `dragleave`: removes border class.
- `drop`: calls `onDrop(srcIdx, dstIdx)`, removes all border classes from all cards.
- `dragend`: clears source index via `setIdx(null)`, restores opacity.
- All card inputs get `disabled` attribute during drag; restored on `dragend`.

---

## 32. Focus preservation

`withPreservedFocus(fn)`:
1. Captures `document.activeElement` and its selection range (`selectionStart`, `selectionEnd`).
2. Runs `fn()` (the DOM-mutating operation).
3. After render: finds the same element by `id` or `data-preserve-focus` attribute.
4. Re-focuses it and restores selection range.

Used in: `renderColorGroups`, `renderRoles`, `renderSettingsVariations`, `renderSettingsThemes`, and anywhere else a re-render could move focus.

---

## 33. Backwards compatibility

- `ensureIds()` handles states saved before `_id` was introduced.
- `config.js` handles step names saved as plain strings (old format) vs `{name, shorthand}` objects.
- `config.js` handles roles without `mappingMethod` (defaults to `"contrast"`).
- One-time migration: old STRING-type Figma variables → `setPluginData` storage. Runs once on boot if old format detected.
