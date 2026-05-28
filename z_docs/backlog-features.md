# Feature Backlog
**Last updated: 2026-05-28**

Priority: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low · ⚪ Future
Status: ✅ Done · 🔲 Open

---

## ✅ Resolved since original gap analysis

| Gap | What was done |
|-----|---------------|
| GAP-1 Plugin entry (`dist/scripts.js`) | `src/plugin/index.ts` exists, wired into build |
| GAP-2 `translateConfig()` | `src/plugin/config.ts` ported, used by plugin thread |
| GAP-3 `VariableManager` | `src/plugin/figmaVars.ts` fully ported |
| GAP-4 Export formatters | `src/plugin/exportEng/` present |
| GAP-5 `buildVariableRenameMap()` | In `src/plugin/config.ts`, called in `figmaVars.ts` |
| GAP-6 `savedState` in `run-creator` | `RunDialog.tsx` passes `savedState` |
| GAP-8 Per-color algorithm/solver UI | `ColorGroupCard` shows both selectors conditionally |
| GAP-9 Copy hex / copy token name | `PreviewScreen` wires `copyText` on swatches and footers |
| GAP-10 Keyboard shortcuts | `useKeyboardShortcuts.ts` hook exists and is wired |
| GAP-11 UI resize drag handle | `App.tsx` has resize handle + `sendToPlugin({type:'resize'})` |
| GAP-12 Default Mapping Method non-functional | `perRoleVariationOverride` wired; mapping method in card |
| GAP-13 Plugin tab stub cards | Removed |

---

## 🔲 Open

### 🟠 GAP-6b — Run Dialog rename summary not displayed
`check-collections` response includes rename counts but the RunDialog never renders them.
**Fix:** Read `renames` from the `collection-check-result` message and display a summary row in the dialog's config phase (e.g. "3 variables will be renamed").

---

### 🟡 GAP-7 — Settings → Token Naming: drag pills + live preview
`tokenGrouping` segmented control ✅ exists. Still missing:
- Drag-reorderable pills for `tokenNameSegments` (currently shown as static pills in SettingsOverlay, not reorderable)
- Live preview string showing the resulting token name format (e.g. `primary/foreground/1`)
**Fix:** Replace static pills with `@dnd-kit` sortable pills. Add a computed preview string below them.

---

### 🟡 GAP-9b — Preview: Grid vs Table view toggle
Token grid renders but there is no view mode toggle (Grid / Table).
**Fix:** Add a `SegmentedControl` for view mode in the preview toolbar. Table view shows a compact row-per-token layout.

---

### 🟡 GAP-9c — Preview: Alpha tint strip
`includeAlphaTints` state field exists but the alpha strip is never rendered in PreviewScreen.
**Fix:** When `appState.includeAlphaTints` is true, render alpha swatches below the scale spectrum in the scale tab.

---

### 🟢 GAP-15 — i18n strings not wired
Language selector renders and persists in PluginTab. All UI strings are hardcoded English.
`en.json`, `es.json`, `hi.json` exist in `src/ui/lang/`.
**Fix:** Initialise `i18next`, replace hardcoded strings with `t('key')` calls throughout.

---

### ⚪ GAP-14 — Beta Lab / Design Lab not ported
`activeOverlay === 'design-lab'` route exists in uiStore. No screen implemented.
Vanilla had LCH grid, tone curves, hue wheel, algorithm visualisation.
Not a blocker — was in beta in vanilla too.

---

## Performance backlog
See [backlog-performance.md](backlog-performance.md).
