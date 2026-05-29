# Feature Backlog
**Last updated: 2026-05-29**

Priority: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low · ⚪ Future
Status: ✅ Done · 🔲 Open

---

## ✅ Resolved since original gap analysis

| Gap | What was done |
|-----|---------------|
| GAP-1 Plugin entry (`dist/scripts.js`) | `src/plugin/index.ts` exists, wired into build |
| GAP-2 `translateConfig()` | `src/plugin/config.ts` ported, `_id` propagated on roles |
| GAP-3 `VariableManager` | `src/plugin/figmaVars.ts` fully ported with metadata-based tracking, dirty-check writes, unique mutation tally |
| GAP-4 Export formatters | `src/plugin/exportEng/` present |
| GAP-5 `buildVariableRenameMap()` | In `src/plugin/config.ts`, called in `figmaVars.ts` |
| GAP-6 `savedState` in `run-creator` | `RunDialog.tsx` passes `savedState` and `decisions` |
| GAP-8 Per-color algorithm/solver UI | `ColorGroupCard` shows both selectors conditionally |
| GAP-9 Copy hex / copy token name | `PreviewScreen` wires `copyText` on swatches and footers |
| GAP-10 Keyboard shortcuts | `useKeyboardShortcuts.ts` hook wired in `App.tsx` |
| GAP-11 UI resize drag handle | `App.tsx` has resize handle + `sendToPlugin({type:'resize'})` |
| GAP-12 Default Mapping Method non-functional | Wired to `perRoleVariationOverride` |
| GAP-13 Plugin tab stub cards | Removed |

---

## ✅ Implemented post-gap-analysis

| Feature | Files |
|---------|-------|
| Metadata-based variable tracking (`tokenRef` via `setPluginData`) | `variableTracker.ts`, `figmaVars.ts` |
| Duplicate variable pruning (Alt-drag safeguard) | `variableTracker.ts:buildMetadataMap` |
| Legacy name-match migration fallback | `variableTracker.ts:findVariable` |
| Conflict detection for manual Figma renames | `variableTracker.ts:analyzeNameConflicts` |
| Conflict resolution UI (keep/revert per variable) | `ConflictList.tsx`, `useSyncSession.ts` |
| Bulk conflict actions (Keep All / Apply All) | `RunDialog.tsx` |
| Unique mutation tally (created/renamed/updated, no double-count) | `figmaVars.ts:mutations Map` |
| Type-mismatch variable recreation | `figmaVars.ts:upsertVariables` |
| Dirty-check skipping (no writes when value unchanged) | `figmaVars.ts:isDifferentValue` |
| Document-only config persistence (no clientStorage for state) | `figmaVars.ts:savePluginConfig`, `index.ts` |
| Direct mode / scale-bypass UX in RunDialog | Hides scope selector, shows Callout, defaults scope to `roles` |
| Sync preview counts (toCreate / toUpdate / toRename) | `variableTracker.ts:computeSyncPreview`, `RunDialog.tsx` |
| Null-collection fix in `computeSyncPreview` (clean doc = all toCreate) | `variableTracker.ts` |
| All 3 collections detected in check-collections | `index.ts` (sourceColName added) |
| Disable publish button when nothing to sync | `RunDialog.tsx` |
| Canvas preview (`run-preview` message + `generateCanvasPreview`) | `canvasPreview.ts`, `index.ts` |
| `isPreviewSelected` state for canvas node selection tracking | `uiStore.ts`, `index.ts:selectionchange` |
| `scopes` field on `VariableScope` in state types | `types/state.ts` |
| nClarity preset (personal mobile app preset) | `src/ui/lib/presets/raw/nclarity.ts` |

---

## 🔲 Open

### 🟠 GAP-6b — Run Dialog rename summary not displayed
`check-collections` response includes rename counts but the RunDialog never renders them for scale/token renames from `buildVariableRenameMap`.
**Fix:** Read `renames` from the `collection-check-result` message and display a summary row.
**Note:** Pending renames card exists but may need wiring to `buildVariableRenameMap` output.

---

### 🟡 GAP-7 — Settings → Token Naming: drag pills + live preview
`tokenGrouping` segmented control ✅ exists. Still missing:
- Drag-reorderable pills for `tokenNameSegments` (currently static in SettingsOverlay)
- Live preview string showing resulting token name (e.g. `primary/foreground/1`)
**Fix:** Replace static pills with `@dnd-kit` sortable. Add computed preview string below.

---

### 🟡 GAP-9b — Preview: Grid vs Table view toggle
Token grid renders but no view mode toggle (Grid / Table).

---

### 🟡 GAP-9c — Preview: Alpha tint strip
`includeAlphaTints` state field exists but alpha strip never rendered in PreviewScreen.

---

### 🟡 Canvas Preview — Feature incomplete
`canvasPreview.ts` (625 lines) and `run-preview` message exist in `index.ts`.
`isPreviewSelected` in uiStore tracks canvas node selection.
UI trigger and "Preview in Canvas" button are stubs.
**Next:** Wire the "Preview in Canvas" button in `RunDialog.tsx` to send `run-preview` message.

---

### 🟢 GAP-15 — i18n strings not wired
Language selector renders and persists. All strings are hardcoded English.
`en.json`, `es.json`, `hi.json` exist in `src/ui/lang/`.

---

### ⚪ GAP-14 — Beta Lab / Design Lab not ported
`activeOverlay === 'design-lab'` route exists. No screen implemented.

---

## Performance backlog
See [backlog-performance.md](backlog-performance.md).
