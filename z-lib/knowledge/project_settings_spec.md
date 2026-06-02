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

| Control                           | Type            | State key                                                  | Status                                       |
| --------------------------------- | --------------- | ---------------------------------------------------------- | -------------------------------------------- |
| Scale / Direct segmented          | segmented 2-way | `projectStore.pluginMode` = `"scale"` \| `"direct"`        | ✅ wired                                     |
| Use Global Algorithm              | toggle          | `projectStore.useUniformAlgorithm`                         | ✅ wired — engine reads it in clrEngine.js   |
| Algorithm selector                | select          | `projectStore.scaleAlgorithm`                              | ✅ wired — hidden in Direct mode             |
| Solver selector                   | select          | `projectStore.solverMode`                                  | ✅ wired — shown in Direct mode + global on  |
| Solver scope (By Color / By Role) | segmented       | `projectStore.algorithmScopeLevel` = `"color"` \| `"role"` | ✅ wired — shown in Direct mode + global off |

Visibility rules:

- Algorithm selector hidden when `pluginMode === "direct"`
- Solver selector shown when `pluginMode === "direct"` AND `useUniformAlgorithm === true`
- Solver scope shown when `pluginMode === "direct"` AND `useUniformAlgorithm === false`

### Palette card (Scale mode only — hidden in Direct)

| Control | Type         | State key                  | Status   |
| ------- | ------------ | -------------------------- | -------- |
| Steps   | number input | `projectStore.scaleLength` | ✅ wired |

### Variations card

| Control                  | Type         | State key                                     | Status                                                        |
| ------------------------ | ------------ | --------------------------------------------- | ------------------------------------------------------------- |
| Role-specific Variations | toggle       | `projectStore.canEditRoleVariantNames`        | ✅ wired — enables per-role customVariationList on role cards |
| Global Variations list   | dynamic list | `projectStore.variations[]` (name, shorthand) | ✅ wired                                                      |

### Token Naming card

| Control                   | Type         | State key                             | Status                                                                 |
| ------------------------- | ------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| Shorthand for Colors      | toggle       | `projectStore.useShorthandColors`     | ✅ wired                                                               |
| Shorthand for Roles       | toggle       | `projectStore.useShorthandRoles`      | ✅ wired                                                               |
| Shorthand for Variations  | toggle       | `projectStore.useShorthandVariations` | ✅ wired                                                               |
| Shorthand for Scale Steps | toggle       | `projectStore.useShorthandSteps`      | ✅ wired                                                               |
| Token Name Format pills   | drag-reorder | `projectStore.tokenNameSegments`      | ✅ wired — `["color","role","variation"]` or any permutation/2-element |
| Token Name Format preview | read-only    | derived                               | ✅ wired                                                               |
| Variable Descriptions     | toggle       | `projectStore.includeDescriptions`    | ✅ wired                                                               |

### Collections card

| Control                       | Type       | State key                                       | Status                                                      |
| ----------------------------- | ---------- | ----------------------------------------------- | ----------------------------------------------------------- |
| Palettes collection toggle    | toggle     | `projectStore.includeColorScalesCollection`     | ✅ wired — suppresses `_scale` collection from Figma output |
| Palettes collection name      | text input | `projectStore.scaleCollectionName`              | ✅ wired (hidden when toggle off)                           |
| Color role collection name    | text input | `projectStore.tokenCollectionName`              | ✅ wired                                                    |
| Link tokens to color scale    | toggle     | `projectStore.resolveTokensDirectly` (inverted) | ✅ wired — when OFF, tokens embed hex instead of aliases    |
| Source Colors                 | toggle     | `projectStore.includeSourceColors`              | ✅ wired                                                    |
| Source Colors collection name | text input | `projectStore.sourceCollectionName`             | ✅ wired (shown when Source Colors on)                      |
| Alpha Tints                   | toggle     | `projectStore.includeAlphaTints`                | ✅ wired (shown when Source Colors on)                      |
| Alpha Values CSV              | text input | `projectStore.alphaValues`                      | ✅ wired (shown when Alpha Tints on)                        |

Note: "Link tokens to color scale" toggle is **inverted** — the UI button renders `on` when `resolveTokensDirectly === false` (aliases enabled). Toggle-off = resolve directly.

### Scale Step Labels card (Scale mode only — hidden in Direct)

| Control         | Type         | State key                                         | Status                                  |
| --------------- | ------------ | ------------------------------------------------- | --------------------------------------- |
| Step label list | dynamic list | `projectStore.scaleStepNames[]` (name, shorthand) | ✅ wired — if empty, steps numbered 1…N |

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

## projectStore fields that exist in state but have no settings UI

| Field                        | Location                     | Notes                                                                                                                                                                   |
| ---------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectStore.name`          | Project tab input in sidebar | System name; used in CSS/SCSS export headers and save filenames                                                                                                         |
| `projectStore.themes[]`      | Project tab in sidebar       | Theme names + background hex — not in the settings overlay                                                                                                              |
| `projectStore.tokenGrouping` | Token Name Format section    | `"color"` \| `"role"` — variable structure (color-first vs role-first grouping); toggled via `setTokenGrouping()` but not currently exposed as a UI control in settings |

---

## Dead state keys (in projectStore, no UI control, no engine effect)

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

### In code / projectStore but NOT exposed in settings UI

- `tokenGrouping` (`"color"` / `"role"`) — controls whether variable structure is color-first or role-first. Logic exists in `setTokenGrouping()` but no settings UI control is rendered.
