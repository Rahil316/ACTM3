# Safe Execution Plan — Token Wand React Migration

## Guiding principles

1. **The vanilla version stays green at every phase.** `dist/` is never broken. If the React version is not ready, the current build ships.
2. **Parallel development** — React version lives in a separate directory until it can produce identical output.
3. **No big-bang rewrites.** Each phase ends with something runnable and verifiable against the behaviour spec.
4. **Color engine and plugin thread are sacred.** They are not touched.
5. **One phase at a time.** Do not start Phase N+1 until Phase N passes its checklist.

---

## Component library — already built (Phases 0–3 complete)

All components listed below exist in `react-src/components/` and `react-src/store/`.
**Do not re-create them in later phases — import from these paths.**

### Stores (`react-src/store/`)
| File | What it owns |
|------|-------------|
| `appStore.ts` | Full `AppState` shape, all mutations (`setColor`, `setRole`, `setTheme`, `setVariation`, etc.), `validateState`, `computeHash`, `isDirty`, `loadState`, `saveVersion`, `restoreVersion` |
| `uiStore.ts` | Routing (`activeSidebarTab`, `activeOverlay`, `settingsTab`), `uiPrefs` (scale/theme/language), drag indices |
| `snapshots.ts` | `takeSnapshot()`, `restoreSnapshot()`, `clearSnapshot()`, `persistState()` |
| `toastStore.ts` | `useToastStore` + imperative `toast.success/error/info/warn` — usable outside React |
| `bannerStore.ts` | `useBannerStore` + imperative `banner.show/warn/error/info/success/remove/clear` |

### Atoms (`react-src/components/`)
| Component | Props summary |
|-----------|--------------|
| `Button` | `variant` (primary/secondary/ghost/danger/icon/dashed/danger-solid), `size` (xs–xl), `square`, `icon`, `label` |
| `ActionButton` | Convenience dashed full-width CTA |
| `Input` | `size` (table/sm/md/lg/xl), `width`, `label`, `hint`, `error`, `mono`, `leadingIcon`, `trailingIcon` |
| `ColorInput` | `value`, `onUpdate(cleanHex)`, `idPrefix`, `size` (sm–xl) |
| `Toggle` | `on`, `onChange`, `disabled` |
| `SegmentedControl` | `segments[]`, `value`, `onChange` |
| `Select` | `options[]`, `size`, `label`, `width` |
| `Badge` | `variant` (default/accent/danger/muted), `onClick`, `disabled` |
| `SectionLabel` | typography — uppercase muted section divider |
| `Caption` | typography — muted hint text |
| `FieldLabel` | typography — field label with `htmlFor` |
| `TabBar` | `tabs[]`, `active`, `onChange` — pill tabs |
| `Sheet` | `open` — bottom sheet (slide-up, `inert` when closed) |
| `SettingsCard` | Rounded card wrapper |
| `PanelRow` | Label + description left, control right |
| `SmallRow` | Compact label + control row |
| `icons` | All 18 SVG icon components (`IconTrash`, `IconRun`, `IconSettings`, etc.) |

### Molecules (`react-src/components/`)
| Component | Props summary |
|-----------|--------------|
| `Select` | Dropdown matching vanilla `panelUI.selectInput` |
| `Modal` | Full-screen overlay wrapper (`open`, `layer`) |
| `ConfirmOverlay` | Frosted backdrop + centred content |
| `ModalHeader` | Title + subtitle + actions header bar |
| `Collapsible` | Controlled open/close panel with chevron |
| `SectionCollapsible` | Card-level section with uppercase label + chevron |
| `EmptyState` | Icon + title + description + optional action |
| `HeaderIconButton` | 40px rounded-full toolbar button |
| `ListRow` | Drag handle ⠿ + content + remove button |
| `ListHeader` | Column label row above `ListRow` lists |
| `ActionCard` | Title + subtitle + meta + action button group |
| `ConfirmDialog` | Warning icon + title + body + confirm/cancel |
| `Backdrop` | Semi-transparent blurred backdrop (z-20) |
| `Dialogue` | Three layouts: `row` / `stacked` / `bottom-sheet` |

### Feedback (`react-src/components/`)
| Component | Usage |
|-----------|-------|
| `ToastHub` | Mount **once** at app root — renders all active toasts |
| `BannerSlot` | Mount **once** below the app header — renders all active banners |
| `Spinner` | `size` sm/md/lg — accent-coloured spin |
| `SectionSpinner` | Centred spinner for panel-level loading states |
| `LoadingOverlay` | Full-screen spinner + title + subtitle (z-50) |
| `SuccessOverlay` | Full-screen success with `SyncTally` stats (z-50) |
| `ErrorOverlay` | Full-screen error + dismiss (z-50) |
| `ValidationWarningOverlay` | Issues list + Go back / Continue Anyway (z-50) |
| `CentredOverlay` | Generic centred full-screen wrapper (configurable z-index) |

### Design tokens (CSS vars → Tailwind aliases)
All `var(--*)` tokens are defined in `react-src/index.css` under `:root` / `body[data-ui-theme="dark"]` / `body[data-ui-theme="light"]`.
Tailwind aliases are in `tailwind.config.js` — use `bg-bg-panel`, `text-text-muted`, `border-border-base`, `bg-accent`, `text-danger`, etc.

---

## Branch strategy

```
main (or devEnv)   ── production vanilla version — always shippable
  └── tw-React     ── current working branch (already exists)
       └── react-migration/phase-4   ── one branch per remaining phase
           react-migration/phase-5
           ...
```

---

## ✅ Phase 0 — Scaffold
**COMPLETE.** `dist-react/ui.html` builds via `npm run build:react`. Vanilla build unchanged.

---

## ✅ Phase 1 — State layer
**COMPLETE.** All store files exist, 36/36 tests pass.

---

## ✅ Phase 2 — Message bridge + boot
**COMPLETE.** `useFigmaBridge`, `useUiPrefs`, standalone mock, debug panel in `App.tsx`.

---

## ✅ Phase 3 — Primitive component library + feedback patterns
**COMPLETE (expanded scope).** All atoms, molecules, feedback components, and notification stores built. See component table above.

---

## Phase 4 — Color and Role cards

**Goal:** `ColorGroupCard` and `RoleGroupCard` components exist and render from store state.

### Available building blocks (use these, don't rebuild)
- `Input`, `ColorInput`, `Select`, `Button` (icon/danger variants), `Toggle`, `Badge`, `Collapsible`, `ListRow`, `SegmentedControl`
- `useAppStore` mutations: `setColor(idx, key, value)`, `addColor()`, `removeColor(idx)`, `setRole`, `addRole`, `removeRole`
- `IconTrash`, `IconChevronDown`

### Tasks
- [ ] `react-src/screens/ColorsScreen.tsx` — renders `.map()` over `appState.colors`, each wrapped in a draggable card shell
- [ ] `react-src/components/cards/ColorGroupCard.tsx` — 4 conditional rows: main (name/shorthand/value/delete), algo selector, solver selector, description
- [ ] `react-src/screens/RolesScreen.tsx` — renders `.map()` over `appState.roles`
- [ ] `react-src/components/cards/RoleGroupCard.tsx` — name/shorthand/delete row + `Collapsible` variation table + scope badge (Global/Role via `Badge`)
- [ ] Variation table inside role card: uses `ListRow`-style rows, `Input` for contrast targets, add/remove variations
- [ ] Add/delete buttons wired to store mutations
- [ ] Conditional field visibility wired to `pluginMode`, `useUniformAlgorithm`, `algorithmScopeLevel`

### Checklist
- [ ] ColorsScreen renders all cards matching `appState.colors` count
- [ ] Adding a color: new card appears with `_id`
- [ ] Deleting a color: card removed by `_id`, not by index
- [ ] Changing hex value: swatch updates in-place, focus not lost
- [ ] Algorithm selector visible ↔ `pluginMode === 'scale' && !useUniformAlgorithm`
- [ ] Solver mode selector visible ↔ `pluginMode === 'direct' && !useUniformAlgorithm`
- [ ] Role card variation table renders correct row count
- [ ] Scope badge shows "Global" / "Role" correctly

---

## Phase 5 — Drag-to-reorder

**Goal:** Color and role cards can be reordered by drag. `_id` order in store matches visual order.

### Available building blocks
- `@dnd-kit/core`, `@dnd-kit/sortable` (already in `package.json`)
- `ListRow` already accepts `draggable`, `onDragStart/End/Over/Drop`, `isDragOver` props — wire directly
- `uiStore`: `colorDragSrcIdx`, `roleDragSrcIdx` + setters already exist

### Tasks
- [ ] Wrap `ColorsScreen` list in `<DndContext>` + `<SortableContext>`
- [ ] Each `ColorGroupCard` is a `useSortable` item keyed by `_id`
- [ ] On `onDragEnd`: call `moveColor(srcIdx, dstIdx)` store action
- [ ] Same for roles with `moveRole`
- [ ] Add `moveColor` / `moveRole` mutations to `appStore` if not already present

### Checklist
- [ ] Reorder 3 colors, confirm store array order matches visual order
- [ ] Drag does not lose focus on other inputs
- [ ] Reorder triggers preview debounce

---

## Phase 6 — Settings overlay

**Goal:** Settings overlay fully functional with cancel/done and savedState snapshot.

### Available building blocks
- `Modal`, `ModalHeader` for the overlay shell
- `TabBar` for settings tabs (Tokens / Roles / Themes / Plugin)
- `SettingsCard`, `PanelRow`, `SmallRow` for layout rows
- `Toggle`, `Select`, `SegmentedControl`, `Input` for all controls
- `Button` (secondary=Cancel, primary=Done)
- `Collapsible` / `SectionCollapsible` for collapsible sections
- `ListRow` + `ListHeader` for step-labels, variations, themes editable lists
- `snapshots.ts`: `takeSnapshot()`, `restoreSnapshot()`, `clearSnapshot()`
- `bannerStore` / `toastStore` for feedback on save

### Tasks
- [ ] `react-src/screens/SettingsOverlay.tsx` — full-screen `Modal` with `ModalHeader` (Cancel/Done buttons)
- [ ] Wire `takeSnapshot()` on overlay open, `restoreSnapshot()` on Cancel, `clearSnapshot()` on Done
- [ ] **Tokens tab**: Plugin Mode, Scale Length, Scale Algorithm (uniform toggle + per-color), Step Labels list
- [ ] **Roles tab**: Mapping method, Min Contrast defaults, per-role variation override toggle, Variations list (`ListRow`)
- [ ] **Themes tab**: Theme list (`ListRow`), add/remove themes
- [ ] **Plugin tab**: Language selector (`Select`), UI Scale selector, UI Theme (`SegmentedControl`), About section
- [ ] All controls wired to `appStore` / `uiStore` mutations
- [ ] Live preview updates as settings change (same debounce as Phase 7)

### Checklist
- [ ] Change plugin mode → preview re-renders
- [ ] Open settings → change 3 values → cancel → values revert
- [ ] Open settings → change 3 values → done → values persist on reload
- [ ] All placeholder sections render without errors

---

## Phase 7 — Preview screen

**Goal:** Preview panel renders correct token output from current store state.

### Available building blocks
- `Spinner` / `SectionSpinner` for loading state during computation
- `BannerSlot` already mounted — `banner.warn()` for accessibility failures (replaces `showSystemBanners`)
- `SegmentedControl` for group-by / view-mode toggles
- `Badge` for contrast rating pills (AA / AAA / Fail)
- `EmptyState` for "no scale in direct mode" case
- `Collapsible` for per-color scale sections

### Tasks
- [ ] `react-src/screens/PreviewScreen.tsx`
- [ ] Call `clrEngine` (imported from `vanilla_archive` or a copied module) with current `appState`
- [ ] Render theme columns × role×variation token grid
- [ ] `useDeferredValue` or `useTransition` wrapping the engine call
- [ ] Debounce: 150ms idle before re-compute (matches vanilla `schedulePreview`)
- [ ] "Solved Colors" label in direct mode
- [ ] Hover: show hex + contrast ratio
- [ ] Post-render: call `banner.show(...)` for accessibility failures (replaces `showSystemBanners`)

### Checklist
- [ ] Change a color hex → preview updates within 200ms
- [ ] Direct mode label reads "Solved Colors"
- [ ] Hover on a swatch → hex and contrast shown
- [ ] Rapid input typing does not cause visible stutter
- [ ] `SectionSpinner` shows during heavy recompute

---

## Phase 8 — Run dialog + Figma sync

**Goal:** Run button opens dialog, sends correct messages to plugin thread, shows result.

### Available building blocks
- `Modal`, `ModalHeader` for dialog shell
- `SegmentedControl` for scope selector (Everything / Scale Only / Roles Only)
- `SettingsCard`, `PanelRow`, `Toggle` for output option toggles
- `ActionCard` for collection list items and rename entries
- `Button` (primary = Apply to Figma, secondary = Cancel)
- `LoadingOverlay` — show during `run-creator` in flight
- `SuccessOverlay` — show on `finish` message with tally
- `ErrorOverlay` — show on `error` message
- `ValidationWarningOverlay` — show when `validateState` returns issues
- `BannerSlot` / `banner` — already wired for post-sync system banners

### Tasks
- [ ] `react-src/screens/RunDialog.tsx`
- [ ] Send `check-collections` on open, receive `collection-check-result` via `useFigmaBridge` callbacks
- [ ] Render collections list, rename summary, scope selector, summary section
- [ ] `validateState()` check before sending `run-creator` — show `ValidationWarningOverlay` if issues
- [ ] On confirm: send `run-creator`, show `LoadingOverlay`
- [ ] On `finish`: show `SuccessOverlay` with tally
- [ ] On `error`: show `ErrorOverlay`
- [ ] `banner.show(...)` for post-sync system status (accessibility failures etc.)

### Checklist
- [ ] Run button → dialog opens → collection list shown
- [ ] Scope selector toggles correctly
- [ ] Confirm → `run-creator` message sent with correct payload
- [ ] `finish` → `SuccessOverlay` displayed with tally
- [ ] Error path → `ErrorOverlay` displayed

---

## Phase 9 — Project screen + presets + theme shop

**Goal:** Project screen, preset loading, theme shop, JSON import/export all work.

### Available building blocks
- `SectionCollapsible` for Project Profile and Versions sections
- `ActionCard` for version list items (title + date + restore/delete buttons)
- `EmptyState` for "no versions yet" state
- `ConfirmDialog` for "overwrite current config?" and "clear all?" confirms
- `Dialogue` (stacked layout) for preset-load confirmation when dirty
- `CentredOverlay` for Quick Start and Theme Shop overlays
- `Modal`, `ModalHeader` for import/export sheet
- `toast` imperative helper for export success/copy feedback

### Tasks
- [ ] `react-src/screens/ProjectScreen.tsx`
- [ ] Quick Start overlay (`CentredOverlay`, z-80) — blank start + preset buttons
- [ ] `react-src/screens/ThemeShopOverlay.tsx` — grid of preset cards
- [ ] `SectionCollapsible` for Project Profile (name, description inputs)
- [ ] `SectionCollapsible` for Versions — `ActionCard` list, `EmptyState` fallback, save-version form
- [ ] Preset loading: dirty check → `ConfirmDialog` → `ensureIds` → `loadState`
- [ ] JSON import: file picker → `validateState` → `ConfirmDialog` → `loadState`
- [ ] JSON export: serialize store → `toast.success('Copied!')` or download

### Checklist
- [ ] Load TW Regular preset → colors/roles match preset
- [ ] Load preset when dirty → `ConfirmDialog` shown
- [ ] Export → import round-trip: state identical
- [ ] Versions `EmptyState` shows when no versions saved
- [ ] Save version → `ActionCard` appears with restore/delete buttons

---

## Phase 10 — Export engine

**Goal:** Multi-format export produces identical output to vanilla version.

### Available building blocks
- `Sheet` for the export bottom sheet
- `ModalHeader` for sheet header
- `Toggle` / `Badge` for format selection checkboxes
- `Button` (primary = Export Selected as ZIP)
- `BannerSlot` / `banner.info` for "Building export package…" feedback
- `toast.warn` for "Select at least one format" validation
- `Spinner` for ZIP build in-flight state

### Tasks
- [ ] `react-src/screens/ExportSheet.tsx` — bottom `Sheet` with format toggles
- [ ] Wire `request-processed-data` and `request-export-bundle` messages via `useFigmaBridge` callbacks
- [ ] ZIP download via existing `jszip.min.js` (reuse unchanged)
- [ ] All 10 format buttons: CSS, SCSS, CSV, JSON, DTCG, Android, React Native, Swift, Style Dictionary, Tailwind

### Checklist
- [ ] CSS export matches vanilla version output (same input state)
- [ ] ZIP download triggers browser download dialog
- [ ] All format buttons produce non-empty output
- [ ] `banner.info('Building export package…')` shown during build

---

## Phase 11 — Final wiring + edge cases

**Goal:** All remaining edge cases, resize handle, and Figma theme auto-detection wired up.

### Available building blocks
- `ToastHub` and `BannerSlot` — already exist, just need to be mounted in final `App.tsx`
- `useUiPrefs` — MutationObserver for Figma theme already implemented
- `useFigmaBridge` — `capabilities` message handler already implemented (multiMode banner)

### Tasks
- [ ] Mount `ToastHub` and `BannerSlot` in root `App.tsx`
- [ ] Resize handle: corner drag → `sendToPlugin({ type: 'resize', width, height })`
- [ ] Wire `capabilities` message → `banner.show(...)` for multiMode warning (already in `useFigmaBridge` handler, just needs banner call)
- [ ] One-time migration from old STRING variable storage (if needed)
- [ ] Final `App.tsx` — replace debug showcase with real screen router

### Checklist
- [ ] `toast.success(...)` call appears at bottom of screen
- [ ] Banner appears below header when shown
- [ ] Resize corner drag → plugin window resizes in Figma
- [ ] Figma dark/light switch → plugin theme follows automatically

---

## Phase 12 — Final parity check and cutover

**Goal:** React version passes the complete behaviour spec. Vanilla build is retired.

### Tasks
- [ ] Run through every section of `03-behaviour-spec.md` manually in the React build
- [ ] Test in actual Figma (not just standalone browser mode)
- [ ] Load a real saved plugin state from a Figma document
- [ ] Run the full variable sync and verify Figma variables are created correctly
- [ ] Confirm all 10 presets load correctly
- [ ] Confirm export ZIP is downloadable and non-corrupt
- [ ] Confirm cancel/done in settings with dirty state
- [ ] Update `manifest.json` to point to `dist-react/ui.html` → rename to `dist/ui.html`
- [ ] Archive vanilla source into `vanilla_archive/` (already done) or git tag

### Checklist
- [ ] All behaviour spec sections pass
- [ ] Bundle size under 300 KB (Figma limit is 10 MB; this is a quality gate)
- [ ] No console errors on boot in Figma
- [ ] `tw_state` round-trip: save → close → reopen → state identical

---

## What to learn in parallel (React fundamentals for this project)

| Phase | Concept |
|-------|---------|
| Phase 4 | Controlled inputs, `onChange`, `key` prop for list rendering |
| Phase 5 | `@dnd-kit`: `DndContext`, `SortableContext`, `useSortable`, `DragOverlay` |
| Phase 6 | Zustand: `getState()` outside hooks, selector patterns |
| Phase 7 | `useDeferredValue`, `useTransition`, `React.memo` |
| Phase 8 | Async state machines (loading → success/error) |
| Phase 11 | `useRef`, `MutationObserver` in `useEffect` (already in `useUiPrefs`) |

---

## Risk register

| Risk | Mitigation |
|------|-----------|
| Color engine output differs | Run same input through both; diff output in Phase 7 |
| `_id` fields lost during store migration | `ensureIds()` tested in Phase 1; never spread without `_id` |
| Figma clientStorage API behaves differently | Test in actual Figma in Phase 8, not standalone |
| Bundle size blows up | Currently 176 KB — check after each phase |
| Performance regression on rapid input | `useDeferredValue` gate in Phase 7; profile with React DevTools |
| Vanilla build broken by accident | `dist/` is generated; never commit it |
| Component duplicated instead of imported | Always check component table above before creating anything new |
