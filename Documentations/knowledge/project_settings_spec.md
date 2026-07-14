---
name: Settings spec
description: Actual settings module design — what is in the UI, what is wired, what is not
type: project
---

Last updated: 2026-07-14
Source: `src/ui/screens/SettingsOverlay.tsx`, `src/ui/store/projectStore.ts`, `src/ui/store/snapshots.ts`, `src/ui/hooks/useAutoSave.ts` — direct code audit

---

## Settings screen layout

Full-screen overlay. Fixed header with Cancel / Done. **Three** tab pills: Tokens, Labels (internal tab value is still `"roles"` — only the display label changed), Plugin.

```
┌─────────────────────────────────────────┐
│ Settings              [Cancel]  [Done]  │
├─────────────────────────────────────────┤
│  [Tokens]  [Labels]  [Plugin]           │
├─────────────────────────────────────────┤
│  scrollable tab content                 │
└─────────────────────────────────────────┘
```

### Cancel / Done lifecycle (`src/ui/store/snapshots.ts`)

- **On open**: `takeSnapshot()` deep-clones the current `projectStore` into a module-level variable.
- **On Cancel**: `restoreSnapshot()` reverts `projectStore` to that snapshot, then `clearSnapshot()` clears it (both must run — a Cancel that only restores without clearing leaves autosave paused for the rest of the session).
- **On Done**: `clearSnapshot()` clears the snapshot, then the current `projectStore` is force-saved immediately (`save(...)` from `useAutoSave.ts`) — necessary because autosave may have skipped saving anything during the time Settings was open.
- **Autosave pause while Settings is open**: `useAutoSave`'s debounced save and its `beforeunload`/unmount flush both check `hasSnapshot()` before persisting. While a snapshot is active, no `save-config` message is sent regardless of what changes. This means **closing the plugin while Settings is open (without clicking Cancel or Done) behaves like Cancel** — nothing typed in Settings reaches Figma's persisted storage.

---

## Tokens Tab

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

Each collection is a single `CollectionRow` (`src/ui/components/SettingsCard.tsx`): a checkbox + label on the left (click anywhere on the button to toggle) and the collection's name input on the right, capped at half the row width so all rows line up. The checkbox visually dims when locked/off; the label never dims (stays legible for identifying the row).

| Control           | Type                         | State key                                                                        | Status                                                             |
| ------------------ | ---------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Token Collection   | `CollectionRow`, always checked + disabled | `projectStore.tokenCollectionName`                                | ✅ wired — mandatory, can't be turned off; name input always editable |
| Scale Collection   | `CollectionRow`               | `projectStore.includeColorScalesCollection` / `projectStore.scaleCollectionName`  | ✅ wired — Scale mode only; name input disables when unchecked        |
| Source Collection  | `CollectionRow`               | `projectStore.includeSourceColors` / `projectStore.sourceCollectionName`          | ✅ wired — name input disables when unchecked                        |
| Alpha Tint Values  | `SmallRow` + `TagInput`       | `projectStore.alphaValues`                                                        | ✅ wired — shown only when Source Collection is on                    |

---

## Labels Tab

Internal tab value is still `"roles"` (`SettingsTab` union in `src/ui/types/state.ts`) — only the display label was changed from "Roles" to "Labels". Hosts role-variation sharing and the Step Labels card (moved here from the Tokens tab).

### Role Variations card

| Control                       | Type   | State key                            | Status                                                                                          |
| ------------------------------ | ------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Custom Variations per role     | toggle | `projectStore.useSharedRoleVariants` (inverted) | ✅ wired — UI shows `on` when `useSharedRoleVariants === false`; toggling is a one-way sync (see below) |

**Toggle semantics** — `useSharedRoleVariants: true` means every role defers to the global `variations` list; `false` means each role owns its own array. Flipping this in `setProjectField` is a one-time sync, not just a display switch:
- Turning it **off** (custom per-role ON) rebuilds every role's array from the current shared variations — name/shorthand/count always match shared, but a target the role already had at that index is preserved rather than overwritten; only indices the role didn't have before pick up the shared default target.
- Turning it **on** (shared ON) sets every role's `variations` to `null`.
- `ensureVariations()` (`src/ui/store/projectStore.ts`) respects this on every reload: when `useSharedRoleVariants` is `true` it does NOT backfill roles' `null` variations — otherwise the toggle's ON state couldn't survive a reload, since the engine reads `role.variations ?? globalVariations`.

### Shared Variations card (hidden when Custom Variations per role is ON)

| Control                | Type          | State key                                     | Status                                                        |
| ------------------------ | ------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| Global Variations list  | `ListRow` list (Name, Short, Target) | `projectStore.variations[]`         | ✅ wired                                                       |
| + Add Variation          | button        | `addVariation()`                                | ✅ wired                                                       |
| Reset to Defaults        | button        | `resetVariations()`                             | ✅ wired — replaces with fresh `DEFAULT_VARIATIONS` (Subtle/Soft/Default/Strong/Bold), new `_id`s |

### Step Labels card (Scale mode only)

Moved here from the Tokens tab. Lives in `StepLabelsCard()`. Restyled to match Shared Variations: a `SettingsCard` with `ListHeader`/`ListRow` (no accordion), always showing the full step table rather than requiring an explicit "enable" action first.

| Control              | Type                          | State key                                            | Status                                                                      |
| --------------------- | ------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Step label list       | `ListRow` list (Name, Short)    | `projectStore.scaleSteps[]` (name, shorthand)          | ✅ wired — `null` displays as numeric defaults `1…N`; editing a cell materializes the array |
| Insert step after row | `+` button per row              | `insertScaleStepAt(i + 1)`                             | ✅ wired — grows `scaleLength` by 1 (max 100)                                    |
| Remove step           | remove button per row           | `removeScaleStepAt(i)`                                 | ✅ wired — shrinks `scaleLength` by 1 (min 5)                                    |
| Reset to Defaults     | button                          | renumbers all rows back to `1…N`, collapses to `null`  | ✅ wired — replaces the old "Enable/Disable Step Labels" toggle pair              |

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
