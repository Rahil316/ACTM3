# Safe Execution Plan — Token Wand React Migration

## Guiding principles

1. **The vanilla version stays green at every phase.** `dist/` is never broken. If the React version is not ready, the current build ships.
2. **Parallel development** — React version lives in a separate directory until it can produce identical output.
3. **No big-bang rewrites.** Each phase ends with something runnable and verifiable against the behaviour spec.
4. **Color engine and plugin thread are sacred.** They are not touched.
5. **One phase at a time.** Do not start Phase N+1 until Phase N passes its checklist.

---

## Branch strategy

```
main (or devEnv)   ── production vanilla version — always shippable
  └── tw-React     ── current working branch (already exists)
       └── react-migration/phase-1   ── one branch per phase
           react-migration/phase-2
           ...
```

Each phase branch is reviewed against the behaviour spec before merging into `tw-React`.

---

## Phase 0 — Scaffold (no functionality yet)

**Goal:** Vite + React project structure exists alongside vanilla source. Both build independently.

### Tasks
- [ ] Create `react-src/` directory at repo root (sibling to `src/`)
- [ ] `npm create vite@latest` into a temp folder, copy config files (do not move `src/`)
- [ ] Install: `react`, `react-dom`, `zustand`, `@dnd-kit/core`, `@dnd-kit/sortable`, `i18next`, `react-i18next`, `vite-plugin-singlefile`
- [ ] Configure `vite.config.js`: singlefile output, ES2017 target, Tailwind
- [ ] Confirm `npm run build:react` produces a `dist-react/ui.html`
- [ ] Confirm `npm run build` (vanilla) still works unchanged
- [ ] Add both scripts to `package.json`

### Checklist
- [ ] `dist/ui.html` still builds correctly from vanilla source
- [ ] `dist-react/ui.html` produces a valid HTML file (even if it just shows "Token Wand React")
- [ ] No changes to `src/` directory

---

## Phase 1 — State layer

**Goal:** Zustand store mirrors `appStore` exactly. Can be imported and used in isolation.

### Tasks
- [ ] Create `react-src/store/appStore.js` — mirror all `appState` keys from `store.js`
- [ ] Port all mutation functions from `store.js`: `setColor`, `setRole`, `setVariation`, `setRoleVariation`, `setTheme`, `ensureIds`, `validateState`
- [ ] Create `react-src/store/uiStore.js` — `{ scale, theme, activeScreen, activeOverlay, settingsTab }`
- [ ] Create `react-src/store/snapshots.js` — `takeSnapshot()`, `restoreSnapshot()`, `isDirty()`
- [ ] Write unit tests (plain JS, no React needed): create a store instance, call mutations, assert state shape

### Checklist
- [ ] `appStore` state shape is identical to current `appState` shape
- [ ] `generateId()` produces 8+ char alphanumeric string
- [ ] `ensureIds()` adds `_id` to every color/role/theme that lacks one
- [ ] `isDirty()` returns false on clean state, true after mutation
- [ ] Snapshot → mutate → restore → `isDirty()` returns false

---

## Phase 2 — Message bridge + boot

**Goal:** React app can receive `load-state` from plugin thread and populate the Zustand store.

### Tasks
- [ ] Create `react-src/hooks/useFigmaBridge.js`
- [ ] Handle all incoming message types from the contract (section 2 of behaviour spec)
- [ ] Create `react-src/hooks/useUiPrefs.js` — reads/writes scale+theme via `set-ui-prefs`
- [ ] Create `react-src/main.jsx` with minimal `<App />` that calls `useFigmaBridge()`
- [ ] Implement standalone browser mode mock (section 16 of behaviour spec)
- [ ] Boot sequence: receive `load-state` → `ensureIds` → populate store → log to console

### Checklist
- [ ] Open `dist-react/ui.html` in a browser; console shows loaded state (bootstrap config)
- [ ] `window.postMessage({ pluginMessage: { type: 'load-state', state: {...} } }, '*')` from browser console updates store
- [ ] `uiPrefs` loads from localStorage in standalone mode

---

## Phase 3 — Primitive component library

**Goal:** All UI primitives exist as React components matching the visual design of the vanilla version.

### Tasks
- [ ] `Input.jsx` — text input matching `inputsUI.text` styling
- [ ] `ColorInput.jsx` — hex text + native color picker, in-place swatch preview
- [ ] `Toggle.jsx` — matching `inputsUI.toggle`
- [ ] `Select.jsx` — matching `inputsUI.select`
- [ ] `Button.jsx` — primary, secondary, ghost variants
- [ ] `Badge.jsx`
- [ ] `SectionHeader.jsx` — collapsible, with aria-expanded
- [ ] `Sheet.jsx` — bottom sheet with inert when closed
- [ ] `TabBar.jsx`
- [ ] Visual regression: open both vanilla and React builds side-by-side; components must be pixel-comparable

### Checklist
- [ ] All primitives render without errors
- [ ] `ColorInput` updates swatch in real-time without losing focus
- [ ] `Toggle` aria attributes correct
- [ ] `Sheet` sets `inert` when closed, removes on open

---

## Phase 4 — Color and Role cards

**Goal:** `ColorGroupCard` and `RoleGroupCard` components exist and render from store state.

### Tasks
- [ ] `ColorGroupCard.jsx` — all fields from behaviour spec section 4
- [ ] `RoleGroupCard.jsx` — all fields from behaviour spec section 5
- [ ] Conditional field visibility (algorithm selector, solver mode selector) wired to store
- [ ] Add/delete wired to `appStore` mutations
- [ ] ColorsScreen renders list of cards from `appStore.colors`
- [ ] RolesScreen renders list of cards from `appStore.roles`

### Checklist
- [ ] ColorsScreen renders all cards matching `appState.colors` count
- [ ] Adding a color: new card appears with `_id`
- [ ] Deleting a color: card removed by `_id`, not by index
- [ ] Changing hex value: swatch updates in-place, focus not lost
- [ ] Algorithm selector visible ↔ `pluginMode === 'scale' && !useUniformAlgorithm`
- [ ] Solver mode selector visible ↔ `pluginMode === 'direct' && !useUniformAlgorithm`

---

## Phase 5 — Drag-to-reorder

**Goal:** Color and role cards can be reordered by drag. `_id` order in store matches visual order.

### Tasks
- [ ] Wrap `ColorsScreen` list in `<SortableContext>`
- [ ] Each `ColorGroupCard` is a `<SortableItem>`
- [ ] On `DragEndEvent`: call `arrayMove` on store colors array
- [ ] Same for roles
- [ ] Verify: drag card 1 to position 3, store `colors[0]._id` matches the moved card

### Checklist
- [ ] Reorder 3 colors, confirm store array order matches visual order
- [ ] Drag does not lose focus on other inputs
- [ ] Reorder triggers preview debounce

---

## Phase 6 — Settings overlay

**Goal:** Settings overlay fully functional with cancel/done and savedState snapshot.

### Tasks
- [ ] `SettingsOverlay.jsx` with two-tab layout
- [ ] All Token Settings controls from behaviour spec section 8
- [ ] All Plugin controls (including non-functional placeholders)
- [ ] `takeSnapshot()` called on overlay open
- [ ] Cancel: `restoreSnapshot()` → close overlay
- [ ] Done: persist to `figma.root.setPluginData` (or localStorage in standalone) → close
- [ ] Live preview updates as settings change

### Checklist
- [ ] Change plugin mode → preview re-renders
- [ ] Open settings → change 3 values → cancel → values revert
- [ ] Open settings → change 3 values → done → values persist on reload
- [ ] All placeholder sections render without errors (Saved States, Beta Features, About, Language)

---

## Phase 7 — Preview screen

**Goal:** Preview panel renders correct token output from current store state.

### Tasks
- [ ] `PreviewScreen.jsx` calls `clrEngine` with current `appState` via `config.js`
- [ ] Renders theme columns × role×variation rows
- [ ] "Solved Colors" label in direct mode
- [ ] Hover: show hex + contrast ratio
- [ ] Debounce: `schedulePreview()` equivalent — 150ms idle before re-render
- [ ] `useDeferredValue` or `useTransition` for heavy recompute

### Checklist
- [ ] Change a color hex → preview updates within 200ms
- [ ] Direct mode label reads "Solved Colors"
- [ ] Hover on a swatch → hex and contrast shown
- [ ] Rapid input typing does not cause visible stutter

---

## Phase 8 — Run dialog + Figma sync

**Goal:** Run button opens dialog, sends correct messages to plugin thread, shows result.

### Tasks
- [ ] `RunDialog.jsx` — collection check, rename summary, scope selector
- [ ] Send `check-collections` on open, receive `collection-check-result`
- [ ] Send `run-creator` on confirm with `{ state, scope }`
- [ ] Handle `finish` message: show tally or errors
- [ ] Success and error dialog states

### Checklist
- [ ] Run button → dialog opens → collection list shown
- [ ] Scope selector toggles between All and Tokens Only
- [ ] Confirm → `run-creator` message sent with correct payload
- [ ] `finish` → tally displayed (created/updated/renamed/failed)

---

## Phase 9 — Project screen + presets + theme shop

**Goal:** Project screen, preset loading, theme shop, JSON import/export all work.

### Tasks
- [ ] `ProjectScreen.jsx` with Quick Start, Versions placeholder
- [ ] Preset loading: confirm if dirty, call `ensureIds`, replace store state
- [ ] `ThemeShopOverlay.jsx` — list all 10 presets as cards
- [ ] JSON import: file picker → validate → `ensureIds` → replace store
- [ ] JSON export: serialize store → download

### Checklist
- [ ] Load TW Regular preset → all colors/roles match preset definition
- [ ] Load preset when dirty → confirmation dialog shown
- [ ] Export → import round-trip: state identical before and after
- [ ] Versions section renders placeholder without errors

---

## Phase 10 — Export engine

**Goal:** Multi-format export produces identical output to vanilla version.

### Tasks
- [ ] Wire export UI to `exportEng/bundler.js` (reuse unchanged)
- [ ] ZIP download via `jszip.min.js` (reuse unchanged)
- [ ] All format buttons: CSS, SCSS, CSV, JSON, DTCG, Android, React Native, Swift, Style Dictionary, Tailwind

### Checklist
- [ ] CSS export from React version matches CSS export from vanilla version (same input state)
- [ ] ZIP download triggers browser download dialog
- [ ] All format buttons produce non-empty output

---

## Phase 11 — Notifications + edge cases

**Goal:** Banner and Toast notifications work. All edge cases from behaviour spec covered.

### Tasks
- [ ] `Banner.jsx` — info/warning/error, dismiss, auto-timeout
- [ ] `Toast.jsx` — stacked, auto-dismiss 3s
- [ ] Resize handle wired to `figma.ui.resize` postMessage
- [ ] Figma theme auto-detection MutationObserver
- [ ] One-time migration from old STRING variable storage

### Checklist
- [ ] Trigger an info banner → shows → dismiss → gone
- [ ] Trigger 3 toasts rapidly → all 3 stack → auto-dismiss in order
- [ ] Resize corner drag → plugin window resizes

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
- [ ] Update `manifest.json` to point to `dist-react/ui.html` → `dist/ui.html` rename
- [ ] Archive vanilla `src/` into `src-vanilla/` or a git tag before removing

### Checklist
- [ ] All behaviour spec sections pass
- [ ] Bundle size under 300 KB (Figma limit is 10 MB; this is a quality gate)
- [ ] No console errors on boot in Figma
- [ ] `tw_state` round-trip: save → close → reopen → state identical

---

## What to learn in parallel (React fundamentals for this project)

You will encounter these React concepts in this exact order during the phases above. Learn each one just before the phase that needs it.

| Phase | Concept to learn first |
|-------|----------------------|
| Phase 0–1 | Vite setup, JSX basics, `useState`, `useEffect` |
| Phase 2 | `useEffect` cleanup, `useCallback` |
| Phase 3 | Component props, conditional rendering, `className` |
| Phase 4 | Controlled inputs, `onChange`, event handlers |
| Phase 5 | `@dnd-kit` docs: `SortableContext`, `useSortable`, `DragOverlay` |
| Phase 6 | Zustand: `create`, `set`, `getState`, `subscribe` |
| Phase 7 | `useDeferredValue`, `useTransition`, `React.memo` |
| Phase 8 | `useReducer` (optional), async patterns |
| Phase 11 | `useRef`, `MutationObserver` in `useEffect` |

---

## Risk register

| Risk | Mitigation |
|------|-----------|
| Color engine output differs between versions | Run same input through both; diff the output in Phase 7 |
| `_id` fields lost during store migration | `ensureIds()` test in Phase 1; never spread without `_id` |
| Figma clientStorage API behaves differently | Test in actual Figma in Phase 8, not just standalone |
| Bundle size blows up | Check after Phase 3 (first real build with all deps) |
| Performance regression on rapid input | `useDeferredValue` gate in Phase 7; profile with React DevTools |
| Vanilla build broken by accident | `dist/` is generated; never commit it; CI check vanilla build in every phase |
