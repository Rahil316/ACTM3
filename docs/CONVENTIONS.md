# Development Conventions

## UI component layers

The UI is built in three layers. Each layer can only depend on what's below it.

```
primitives   →   organisms   →   screens
```

### Primitives (`components/primitives.js`)

Low-level DOM helpers and stateless UI atoms. No knowledge of `appState`.

- `el(tag, attrs, children)` — the only way to create DOM nodes (no `innerHTML`)
- `inputsUI.*` — form atoms: `input`, `colorInput`, `toggle`, `iconButton`, `actionButton`, `btn`
- `debounce`, `copyToClipboard`, `withPreservedFocus`

**`inputsUI.colorInput(value, onUpdate, idPrefix?, extra?, size?)`**

- Self-contained: handles hex↔native-picker sync internally.
- `onUpdate(cleanHex)` receives only the 6-char uppercase hex string — no `#`, no event object.
- `size` — `"sm"` | `"md"` | `"lg"` | `"xl"` (default `"xl"`). Matches the shared size scale below.
- Do **not** wire separate `oninput` / `onchange` handlers for the child inputs; the component owns its own sync.

**Shared size scale** — used by `inputsUI.colorInput`, `inputsUI.btn`, and `panelUI.input`:

| Token | Height | Typical use |
| ----- | ------ | ----------- |
| `sm`  | 28 px  | Compact inline controls, pill selectors |
| `md`  | 32 px  | Icon-knob buttons (gear, trash in cards) |
| `lg`  | 36 px  | Labeled action buttons, tabs, Cancel/Done (default for `panelUI.input`) |
| `xl`  | 40 px  | Text inputs, header buttons, primary CTAs (default for `inputsUI.colorInput`) |

`inputsUI.btn` also has an `xs` (20 px) square-only token for very compact icon buttons.

**Rule:** primitives never import from organisms or screens. They receive everything they need as arguments.

---

### Organisms (`components/organisms.js`)

Composite components and layout systems. Can reference `appState` and call mutations.

- `panelUI.*` — layout building blocks: `card`, `row`, `smallRow`, `segmented`, `togglePill`, `selectInput`, `sectionLabel`, `input`
  - `panelUI.input` accepts a full options object including `size` (default `"lg"`), `label`, `hint`, `error`, `leadingIcon`, `trailingIcon`, `mono`, `disabled`, and all standard input event handlers. Use it in preference to a raw `<input>` anywhere inside an organism or screen.
- `Components.*` — card-level builders composed from `panelUI` and `inputsUI` atoms
  - Public methods: `ColorGroupCard`, `RoleGroupCard` — called from screen renderers
  - Private methods: prefixed `_`, e.g. `_ColorMainRow`, `_RoleAlgoRow` — called only within `Components`
- Shared helpers like `useWhiteLabel` live here when used by more than one screen

**Rule:** only put something in `organisms.js` if it is reused across multiple screens or composes existing `panelUI`/`inputsUI` atoms. Screen-specific display helpers stay in their screen file.

---

### Screens (`screens/*.js`)

One file per screen or sidebar tab. Each owns its renderer and any screen-local helpers.

- Renderer functions are named `render*` (e.g. `renderColorGroups`, `renderPreviewPanel`)
- Screen-local component helpers use a `_` prefix and a screen abbreviation, e.g. `_pvScaleStep` in `preview.js`
- Renderers call `Components.*` for card-level building blocks; they do not build raw DOM structures that belong in organisms

---

## State management

- `appState` is the single source of truth. It lives in `store.js`.
- **Never mutate `appState` directly from a screen or service.** Use the mutation functions: `setColor`, `setRole`, `setVariation`, `updateGroup`, etc.
- `router.js` is pure visibility — it only toggles CSS classes. It never reads or writes `appState`.
- `crud.js` owns all entity add/remove/move/update operations. If you're splicing an array on `appState`, it belongs there.

---

## Naming conventions

| Pattern | Meaning | Example |
| ------- | ------- | ------- |
| `_lowerCamelCase` | Screen-local helper, not exported | `_pvScaleStep` |
| `_PascalCase` inside `Components` | Private card sub-row | `_ColorMainRow` |
| `PascalCase` inside `Components` | Public card builder | `ColorGroupCard` |
| `render*` | Writes DOM from current state | `renderColorGroups` |
| `schedule*` | Debounced render trigger | `schedulePreview` |
| `sync*` | DOM ↔ state sync (settings) | `_syncTogglePills` |
| `handle*` | Event handler | `handleImportJSON` |

---

## Anti-patterns

- **No `innerHTML` template strings** — use `el()` for all DOM construction
- **No direct `appState` mutation outside `store.js`** — use mutation helpers
- **No state logic in `router.js`** — visibility only
- **No cross-screen imports** — screens are loaded in order; later screens can call earlier ones but not vice versa
- **No speculative abstractions** — don't move code into organisms until it's reused by a second screen

---

## Release workflow

Source lives in `src/`. The build pipeline produces `dist/`. Releases are packaged into `release/<version>/`. Neither `dist/` nor `release/` are committed.

```
src/   →   npm run build   →   dist/   →   npm run release -- <version>   →   release/<version>/
```

| Command | When to use |
| ------- | ----------- |
| `npm run release -- <version>` | Normal release — builds from source, prompts before overwriting |
| `npm run release:patch -- <version>` | Hot-patch an existing version slot — no overwrite prompt |
| `npm run release:flag -- <version>` | Release + git annotated tag — use when you want the code state permanently findable |

The release script (`package.js`) always re-runs the full build before packaging to guarantee `dist/` is fresh. It verifies the `dist/` mtimes are newer than the build start time before copying.

Changelog entries live in `release/changelog.md` under `## <version>` sections with `### <timestamp> UTC` subheadings. Multiple patch notes accumulate under the same version section.

After `release:flag`, publish the tag with:
```bash
git push origin <version>
```
