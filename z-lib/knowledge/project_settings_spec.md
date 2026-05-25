---
name: Settings spec
description: Actual settings module design — what is in the UI, what is wired, what is not
type: project
---

Last updated: 2026-05-22
Source: settings.js, store.js, config.js — direct code audit

---

## Settings screen layout

Full-screen overlay. Fixed header with Cancel / Done. **Two** tab pills.
Cancel snapshots state on open, restores on cancel. Done calls `updateSettingsFromInputs()`.

```
┌─────────────────────────────────────────┐
│ Settings              [Cancel]  [Done]  │
├─────────────────────────────────────────┤
│  [Token Settings]  [Plugin]             │
├─────────────────────────────────────────┤
│  scrollable tab content                 │
└─────────────────────────────────────────┘
```

---

## Token Settings Tab

### Token Creation Mode card

| Control                           | Type            | State key                                              | Status                                       |
| --------------------------------- | --------------- | ------------------------------------------------------ | -------------------------------------------- |
| Scale / Direct segmented          | segmented 2-way | `appState.pluginMode` = `"scale"` \| `"direct"`        | ✅ wired                                     |
| Use Global Algorithm              | toggle          | `appState.useUniformAlgorithm`                         | ✅ wired — engine reads it in clrEngine.js   |
| Algorithm selector                | select          | `appState.scaleAlgorithm`                              | ✅ wired — hidden in Direct mode             |
| Solver selector                   | select          | `appState.solverMode`                                  | ✅ wired — shown in Direct mode + global on  |
| Solver scope (By Color / By Role) | segmented       | `appState.algorithmScopeLevel` = `"color"` \| `"role"` | ✅ wired — shown in Direct mode + global off |

Visibility rules:

- Algorithm selector hidden when `pluginMode === "direct"`
- Solver selector shown when `pluginMode === "direct"` AND `useUniformAlgorithm === true`
- Solver scope shown when `pluginMode === "direct"` AND `useUniformAlgorithm === false`

### Palette card (Scale mode only — hidden in Direct)

| Control | Type         | State key              | Status   |
| ------- | ------------ | ---------------------- | -------- |
| Steps   | number input | `appState.scaleLength` | ✅ wired |

### Variations card

| Control                  | Type         | State key                                 | Status                                                        |
| ------------------------ | ------------ | ----------------------------------------- | ------------------------------------------------------------- |
| Role-specific Variations | toggle       | `appState.perRoleVariationOverride`       | ✅ wired — enables per-role customVariationList on role cards |
| Global Variations list   | dynamic list | `appState.variations[]` (name, shorthand) | ✅ wired                                                      |

### Token Naming card

| Control                   | Type         | State key                         | Status                                                                 |
| ------------------------- | ------------ | --------------------------------- | ---------------------------------------------------------------------- |
| Shorthand for Colors      | toggle       | `appState.useShorthandColors`     | ✅ wired                                                               |
| Shorthand for Roles       | toggle       | `appState.useShorthandRoles`      | ✅ wired                                                               |
| Shorthand for Variations  | toggle       | `appState.useShorthandVariations` | ✅ wired                                                               |
| Shorthand for Scale Steps | toggle       | `appState.useShorthandSteps`      | ✅ wired                                                               |
| Token Name Format pills   | drag-reorder | `appState.tokenNameSegments`      | ✅ wired — `["color","role","variation"]` or any permutation/2-element |
| Token Name Format preview | read-only    | derived                           | ✅ wired                                                               |
| Variable Descriptions     | toggle       | `appState.includeDescriptions`    | ✅ wired                                                               |

### Collections card

| Control                       | Type       | State key                                   | Status                                                      |
| ----------------------------- | ---------- | ------------------------------------------- | ----------------------------------------------------------- |
| Palettes collection toggle    | toggle     | `appState.includeColorScalesCollection`     | ✅ wired — suppresses `_scale` collection from Figma output |
| Palettes collection name      | text input | `appState.scaleCollectionName`              | ✅ wired (hidden when toggle off)                           |
| Color role collection name    | text input | `appState.tokenCollectionName`              | ✅ wired                                                    |
| Link tokens to color scale    | toggle     | `appState.resolveTokensDirectly` (inverted) | ✅ wired — when OFF, tokens embed hex instead of aliases    |
| Source Colors                 | toggle     | `appState.includeSourceColors`              | ✅ wired                                                    |
| Source Colors collection name | text input | `appState.sourceCollectionName`             | ✅ wired (shown when Source Colors on)                      |
| Alpha Tints                   | toggle     | `appState.includeAlphaTints`                | ✅ wired (shown when Source Colors on)                      |
| Alpha Values CSV              | text input | `appState.alphaValues`                      | ✅ wired (shown when Alpha Tints on)                        |

Note: "Link tokens to color scale" toggle is **inverted** — the UI button renders `on` when `resolveTokensDirectly === false` (aliases enabled). Toggle-off = resolve directly.

### Scale Step Labels card (Scale mode only — hidden in Direct)

| Control         | Type         | State key                                     | Status                                  |
| --------------- | ------------ | --------------------------------------------- | --------------------------------------- |
| Step label list | dynamic list | `appState.scaleStepNames[]` (name, shorthand) | ✅ wired — if empty, steps numbered 1…N |

---

## Plugin Tab

| Control  | Type   | State key       | Status                                      |
| -------- | ------ | --------------- | ------------------------------------------- |
| UI Scale | select | `uiPrefs.scale` | ✅ wired (persisted in Figma clientStorage) |
| UI Theme | select | `uiPrefs.theme` | ✅ wired (persisted in Figma clientStorage) |

---

## More-sheet (••• button in toolbar)

The more-sheet is NOT part of the settings overlay. It contains:

- Export .Wand
- Export CSS Variables
- Export CSV
- Export SCSS
- Clear All (destructive)

---

## appState fields that exist in state but have no settings UI

| Field                    | Location                     | Notes                                                                                                                                                                   |
| ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appState.name`          | Project tab input in sidebar | System name; used in CSS/SCSS export headers and save filenames                                                                                                         |
| `appState.themes[]`      | Project tab in sidebar       | Theme names + background hex — not in the settings overlay                                                                                                              |
| `appState.tokenGrouping` | Token Name Format section    | `"color"` \| `"role"` — variable structure (color-first vs role-first grouping); toggled via `setTokenGrouping()` but not currently exposed as a UI control in settings |

---

## Dead state keys (in appState, no UI control, no engine effect)

| Field                             | Status                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none confirmed as of 2026-05-22) | All previously suspected "dead" keys (`includeColorScalesCollection`, `useUniformAlgorithm`, `algorithmScopeLevel`) are now confirmed wired and working |

---

## Gap analysis: what is not yet implemented

### In PDF mockup design but NOT in code

1. **Saved States** — version history with View / Restore / Delete (Project tab)
2. **Role Labels CSV** — bulk-rename all variation names at once (Roles tab in mockup)
3. **Language selector** (Plugin tab)
4. **Beta Features** section (Plugin tab)
5. **About Token Wand** section (Plugin tab)

### In code / appState but NOT exposed in settings UI

- `tokenGrouping` (`"color"` / `"role"`) — controls whether variable structure is color-first or role-first. Logic exists in `setTokenGrouping()` but no settings UI control is rendered.
