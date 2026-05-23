# Architecture Outline — Current → React

## Current architecture at a glance

```
dist/ui.html  ─── inlined CSS + all JS concatenated
                        │
              window.onmessage (pluginMessage)
                        │
         ┌──────────────▼──────────────────┐
         │           runtime.js            │  Boot, message routing, UI prefs
         │  appState (global object)        │  ← store.js owns mutations
         │  uiPrefs  (global object)        │
         └───┬──────────────────────────────┘
             │  calls render functions imperatively
     ┌───────┼───────────────────────┐
     ▼       ▼                       ▼
 colors.js  roles.js  settings.js  preview.js  project.js
 (screen renderers — each owns its DOM slot)
             │
     components/primitives.js  →  el() factory
     components/organisms.js   →  ColorGroupCard, RoleGroupCard
             │
     services/crud.js      →  mutate appState + call render fns
     services/publish.js   →  Figma postMessage + dialog DOM
     services/notifications.js → BannerManager, ToastManager
             │
     router.js  →  classList-based show/hide for all overlays/sheets
```

**Plugin thread** (`main.js` + `figmaVars.js`) is completely separate and does not change.

---

## React architecture — carry-over map

Every layer of the current system maps 1-to-1 to a React equivalent.
Nothing is thrown away; the mapping is a translation, not a redesign.

---

### 1. State layer — `store.js` → Zustand store

**Current:** `appState` is a plain global object. Mutations are functions in `store.js` (`setColor`, `setRole`, `setVariation`, etc.). Dirty tracking uses a hash. `savedState` is a deep-clone snapshot for Settings cancel.

**React equivalent:**

```
src/store/
  appStore.js      ← Zustand store wrapping appState shape
  uiStore.js       ← uiPrefs (scale, theme, activeTab)
  snapshots.js     ← savedState clone/restore helpers
```

Zustand lets you call `useStore.getState().setColor(...)` from outside components — the same imperative call site that `crud.js` uses today. No forced migration of call patterns.

```js
// appStore.js shape mirrors current appState exactly
const useAppStore = create((set, get) => ({
  colors: [],
  roles: [],
  themes: [],
  pluginMode: 'scale',
  // ... all existing keys ...

  setColor: (idx, key, val) => set(state => {
    const colors = [...state.colors];
    colors[idx] = { ...colors[idx], [key]: val };
    return { colors };
  }),
  // ... mirrors store.js mutations exactly
}));
```

**Dirty tracking:** Replace hash with `zustand/middleware` `subscribeWithSelector` — subscribe to state changes and compare to `savedState` snapshot. Or keep the existing `stableHash()` function — it's pure and reusable.

---

### 2. Message bridge — `runtime.js` → `useFigmaBridge` hook

**Current:** `window.onmessage` in runtime.js dispatches to handlers that mutate `appState` and call render functions.

**React equivalent:** A single hook that sets up the listener once and dispatches into Zustand.

```
src/hooks/
  useFigmaBridge.js   ← window.onmessage → store dispatch
  useUiPrefs.js       ← clientStorage read/write for scale + theme
```

```js
// useFigmaBridge.js
export function useFigmaBridge() {
  const loadState = useAppStore(s => s.loadState);
  useEffect(() => {
    const handler = (e) => {
      const msg = e.data?.pluginMessage;
      if (!msg) return;
      if (msg.type === 'load-state') loadState(msg.state);
      // ... other message types
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
}
```

---

### 3. Screen routing — `router.js` → React state + conditional render

**Current:** `router.js` does classList add/remove on DOM nodes. All screens are always in the DOM, shown/hidden.

**React equivalent:** A `activeScreen` string in `uiStore` controls which screen component renders. Overlays (settings, run dialog, theme shop) are portals or conditionally rendered.

```
src/store/uiStore.js
  activeScreen: 'colors' | 'roles' | 'preview' | 'project'
  activeOverlay: null | 'settings' | 'run-dialog' | 'theme-shop' | ...
  settingsTab: 'tokens' | 'plugin'
```

```jsx
// App.jsx — top-level router
function App() {
  const screen = useUiStore(s => s.activeScreen);
  return (
    <>
      <Sidebar />
      {screen === 'colors'  && <ColorsScreen />}
      {screen === 'roles'   && <RolesScreen />}
      {screen === 'preview' && <PreviewScreen />}
      {screen === 'project' && <ProjectScreen />}
      <SettingsOverlay />
      <RunDialog />
      <ThemeShopOverlay />
      <Notifications />
    </>
  );
}
```

---

### 4. Screen components — screen files → React components

Each current screen file becomes a React component. The DOM-building logic becomes JSX. Event handlers become React event handlers.

```
src/screens/
  ColorsScreen.jsx      ← colors.js
  RolesScreen.jsx       ← roles.js
  PreviewScreen.jsx     ← preview.js
  ProjectScreen.jsx     ← project.js
  SettingsOverlay.jsx   ← settings.js (two-tab layout)
  ThemeShopOverlay.jsx  ← themeShop.js
  RunDialog.jsx         ← publish.js dialog portion
  LabPreview.jsx        ← labPreview.js
```

---

### 5. Component library — `el()` + organisms → React components

**Current:** `primitives.js` has an `el()` factory and `inputsUI` namespace. `organisms.js` has `ColorGroupCard` and `RoleGroupCard`.

**React equivalent:**

```
src/components/
  primitives/
    Input.jsx         ← inputsUI.text, inputsUI.color
    Toggle.jsx        ← inputsUI.toggle
    Select.jsx        ← inputsUI.select
    Button.jsx
    Badge.jsx
  cards/
    ColorGroupCard.jsx   ← Components.ColorGroupCard
    RoleGroupCard.jsx    ← Components.RoleGroupCard
  layout/
    Sidebar.jsx
    TabBar.jsx
    Sheet.jsx         ← bottom-sheet pattern
    SectionHeader.jsx ← collapsible section headers
  notifications/
    Banner.jsx        ← BannerManager
    Toast.jsx         ← ToastManager
```

The `el()` factory is not needed in React — JSX is the replacement. But the **design decisions** inside the components (what fields exist, how they're laid out, what events they fire) carry over directly.

---

### 6. Drag-to-reorder — `bindDragDrop()` → `@dnd-kit/sortable`

**Current:** `bindDragDrop()` in crud.js adds mousedown/mousemove/mouseup listeners and splices `appState.colors` or `appState.roles` on drop.

**React equivalent:** Wrap the color list and role list in `<SortableContext>`. Each card becomes a `<SortableItem>`. On drag end, call `arrayMove(colors, from, to)` and dispatch to store. Zero manual listener management.

---

### 7. Services layer — `crud.js` / `publish.js` → hooks + utils

**Current:** Service files are collections of functions that mutate appState and call render functions.

**React equivalent:** The mutation logic moves into the Zustand store. The "post-mutation side effects" (schedule preview, sync inputs) become `useEffect` subscriptions or are triggered by React's render cycle automatically.

```
src/services/
  publish.js      ← keep as plain JS — it sends postMessage, no DOM needed
  exportEngine/   ← keep as-is — pure formatters
src/hooks/
  usePublish.js   ← wraps publish.js, provides React-friendly interface
  useCrud.js      ← color/role/theme CRUD actions bound to store
```

---

### 8. Color engine — unchanged

```
src/color/
  clrEngine.js    ← untouched
  clrUtils.js     ← untouched
src/shared/
  config.js       ← untouched
  exportEng/      ← untouched
```

These are pure functions. React components call them directly. No wrappers needed.

---

### 9. i18n — `lang.js` + JSON → `react-i18next`

**Current:** `lang.js` loads JSON files but is not wired to any UI control.

**React equivalent:** Initialize `i18next` once at app boot. The language selector in Settings calls `i18next.changeLanguage(lang)`. Every string becomes `t('key')`. The existing JSON files (`en.json`, `es.json`, `hi.json`) are reused as-is.

---

## Full directory structure — React version

```
src/
  main.jsx              ← React entry, mounts <App />
  App.jsx               ← top-level layout + router
  store/
    appStore.js         ← Zustand: appState shape + mutations
    uiStore.js          ← Zustand: uiPrefs + screen/overlay routing
    snapshots.js        ← savedState clone/restore
  hooks/
    useFigmaBridge.js   ← message bridge
    useUiPrefs.js       ← clientStorage persistence
    useCrud.js          ← CRUD actions
    usePublish.js       ← Figma sync
    useDirty.js         ← dirty tracking
  screens/
    ColorsScreen.jsx
    RolesScreen.jsx
    PreviewScreen.jsx
    ProjectScreen.jsx
    SettingsOverlay.jsx
    ThemeShopOverlay.jsx
    RunDialog.jsx
    LabPreview.jsx
  components/
    primitives/         ← Input, Toggle, Select, Button, Badge
    cards/              ← ColorGroupCard, RoleGroupCard
    layout/             ← Sidebar, TabBar, Sheet, SectionHeader
    notifications/      ← Banner, Toast
  services/
    publish.js          ← plain JS, postMessage dispatch
    notifications.js    ← plain JS, toast/banner managers (or rewrite as React)
  lang/
    en.json             ← unchanged
    es.json             ← unchanged
    hi.json             ← unchanged
    i18n.js             ← i18next init
  color/
    clrEngine.js        ← unchanged
    clrUtils.js         ← unchanged
  figma/
    main.js             ← unchanged (plugin thread)
    figmaVars.js        ← unchanged
  shared/
    config.js           ← unchanged
    exportEng/          ← unchanged
  presets/              ← unchanged
  ui.html               ← Vite's index.html template
```

---

## What React solves that is currently painful

| Current pain | React solution |
|-------------|----------------|
| `renderColorGroups()` must be called manually after every mutation | Zustand subscription → React re-render is automatic |
| `withPreservedFocus()` hack to prevent focus loss on re-render | React reconciler preserves DOM identity; controlled inputs stay focused |
| `debounce()` wrappers on render functions | React's batched state updates + `useDeferredValue` for heavy previews |
| `innerHTML = ""` + fragment rebuild for every list change | Virtual DOM diffs; only changed cards re-render |
| `savedState` snapshot + manual revert in cancel handler | Zustand `getState()` snapshot + `setState()` restore — 2 lines |
| Language selector not wired | `i18next.changeLanguage()` call + `t()` throughout |
| `bindDragDrop()` manual event management | `@dnd-kit/sortable` — 10 lines per list |
