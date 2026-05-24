# Token Wand — Vanilla Build: Feature Source of Truth

> Deep inventory of `vanilla_archive/`. Every feature, every mechanism, every data shape.
> This is the canonical reference for what the plugin must do.

---

## 1. File Structure

```
vanilla_archive/
├── src/
│   ├── color/
│   │   ├── clrEngine.js        — Pure color engine (scale gen + token solver)
│   │   └── clrUtils.js         — WCAG math, color space conversions
│   ├── figma/
│   │   ├── main.js             — Figma sandbox: message router, config translator, export runners
│   │   └── figmaVars.js        — Figma Variable API CRUD (VariableManager)
│   ├── shared/
│   │   ├── config.js           — translateConfig() + buildVariableRenameMap()
│   │   ├── docGen.js           — Variable description generator
│   │   └── exportEng/
│   │       ├── bundler.js      — buildExportBundle() — ZIP multi-format assembler
│   │       ├── fmtCSS.js
│   │       ├── fmtSCSS.js
│   │       ├── fmtTailwind.js
│   │       ├── fmtDTCG.js
│   │       ├── fmtStyleDictionary.js
│   │       ├── fmtSwift.js
│   │       ├── fmtAndroid.js
│   │       ├── fmtReactNative.js
│   │       ├── helpers.js
│   │       ├── zipBuilder.js
│   │       └── jszip.min.js
│   ├── presets/
│   │   ├── index.js + apple/atlassian/blank/carbon/material/polaris/radix/tailwind/wand.js
│   ├── ui/
│   │   ├── store.js            — appState + dirty tracking + version snapshots
│   │   ├── runtime.js          — Message handling, keyboard shortcuts, resize
│   │   ├── router.js           — Sidebar tab routing
│   │   ├── screens/
│   │   │   ├── project.js      — Project tab (name, themes, versions, quick-start)
│   │   │   ├── colors.js       — Palette tab (color group CRUD + drag-drop)
│   │   │   ├── roles.js        — Roles tab (role CRUD + drag-drop + variation override)
│   │   │   ├── settings.js     — Settings overlay (all 6 cards)
│   │   │   ├── preview.js      — Preview: scale spectrum + token grid
│   │   │   ├── labPreview.js   — Beta Lab: color space visualizer
│   │   │   └── themeShop.js    — Theme Shop overlay (preset picker)
│   │   ├── components/
│   │   │   ├── primitives.js   — debounce, drag-drop, DOM factory
│   │   │   └── organisms.js    — inputsUI.*, panelUI.* component library
│   │   ├── services/
│   │   │   ├── crud.js         — Add/remove/move helpers
│   │   │   ├── notifications.js — Toast + banner
│   │   │   └── publish.js      — Run/export triggers
│   │   └── lang/
│   │       ├── en.json / es.json / hi.json
│   │       └── lang.js         — t() template substitution
│   └── ui.html                 — Entry HTML (inlined at build time)
├── Vanilla Build/
│   ├── scripts.js              — Compiled Figma sandbox code
│   └── ui.html                 — Compiled + inlined UI
└── build.js                    — Build script (bundle + inline)
```

---

## 2. AppState Data Shape

Full state persisted to `figma.root.getPluginData("tw_state")`.

```js
{
  // Project
  name: string,
  description: string,

  // Mode
  pluginMode: "scale" | "direct",
  scaleAlgorithm: "Natural" | "Uniform" | "Expressive" | "Symmetric" | "OKLCH" | "Material" | "Linear",
  scaleLength: number,           // e.g. 25
  useUniformAlgorithm: boolean,  // true = one algo for all colors
  algorithmScopeLevel: "color" | "role",
  solverMode: "natural" | "saturated" | "luminance" | "hue-locked" | "chroma-maximized",

  // Entities
  colors: [{
    _id: string,
    name: string,
    shorthand: string,
    value: "#RRGGBB",
    description: string,
    scaleAlgorithm?: string,   // per-color override (null = inherit global)
    solverMode?: string,       // per-color solver override
  }],

  roles: [{
    _id: string,
    name: string,
    shorthand: string,
    minContrast: number,
    mappingMethod: "contrast" | "index",
    variationTargets: number[],         // contrast ratios or step indices
    description: string,
    customVariationList?: boolean,
    customVariations?: [{ _id, name, shorthand }],
  }],

  themes: [{ _id?, name: string, bg: "#RRGGBB" }],    // one per Figma mode

  variations: [{                          // shared global variation list
    _id: string,
    name: string,
    shorthand: string,
    description?: string,
  }],

  versions: [{                            // version history snapshots
    _id: string,
    name: string,
    description: string,
    createdAt: number,                    // timestamp ms
    state: { /* full appState copy */ },
  }],

  // Collection Naming
  scaleCollectionName: string,           // default "_scale"
  tokenCollectionName: string,           // default "color tokens"
  sourceCollectionName: string,          // default "_constants"

  // Feature Flags
  useShorthandColors: boolean,
  useShorthandRoles: boolean,
  useShorthandVariations: boolean,
  useShorthandSteps: boolean,
  resolveTokensDirectly: boolean,        // raw hex instead of VARIABLE_ALIAS
  includeColorScalesCollection: boolean,
  includeSourceColors: boolean,
  includeDescriptions: boolean,
  includeAlphaTints: boolean,

  // Advanced
  tokenNameSegments: ["color","role","variation"],  // drag-reorderable
  tokenGrouping: "color" | "role",
  alphaValues: string,                  // CSV "10, 25, 50, 75, 90"
  scaleStepNames: [{ name: string, shorthand?: string }],
  perRoleVariationOverride: boolean,
}
```

---

## 3. Color Engine (`src/color/clrEngine.js`)

### Entry Points

| Function | Purpose |
|----------|---------|
| `variableMaker(config)` | **Main pipeline**: scales → tokens → errors |
| `scaleMaker(hex, length, algo)` | Generate one tonal scale as hex[] |
| `solveColorForContrast(src, target, bg, mode)` | Direct mode: solve exact color |
| `hexToOklch(hex)` | Hex → `{L, C, H}` |
| `oklchToHex(L, C, H)` | OKLCH → hex |
| `hexToHct(hex)` | Hex → Material HCT |
| `hctToHex(h, c, t)` | HCT → hex |

### Scale Algorithms

| Name | Description |
|------|-------------|
| `Linear` | HSL lightness increments — fast, not perceptually uniform |
| `Uniform` | Perceptually uniform relative-luminance steps |
| `Natural` | Uniform + chroma tapering near white/black (default) |
| `Expressive` | Natural + subtle hue rotation (warm light end, cool dark end) |
| `Symmetric` | Log-luminance anchored to source color (source = midpoint of scale) |
| `OKLCH` | Uniform steps in OKLCH space (preserves hue + chroma) |
| `Material` | HCT color space (Material You tonal palettes) |

### Plugin Modes

**Scale Mode**: generates a `scaleLength`-step tonal scale per color, then maps roles to scale positions via:
- `"contrast"` mapping: walk scale light→dark (or dark→light for dark themes), pick first step ≥ target WCAG ratio
- `"index"` mapping: pin variation to an explicit step index

**Direct Mode**: no scale generation; solves hex color per `role × variation` combination using `solveColorForContrast()`. Uses `solverMode` to control search strategy:
- `natural` — balanced hue/saturation/luminance
- `saturated` — maximize chroma
- `luminance` — minimize hue/chroma drift
- `hue-locked` — preserve exact input hue
- `chroma-maximized` — maximize hue + chroma

### `variableMaker(config)` Output

```js
{
  scales: {
    [colorName]: {
      [stepName]: {
        value: "#RRGGBB",
        stepName: string,
        shorthand: string,
        description: string,
        contrast: { [themeName]: { ratio, rating } }
      }
    }
  },
  tokens: {
    [themeName]: {
      [colorName]: {
        [roleIdx]: {
          [variationIdx]: {
            tokenName: string,
            color: string,
            role: string,
            variation: string,
            value: "#RRGGBB",
            contrast: { ratio, rating },
            contrastTarget: number,
          }
        }
      }
    }
  },
  errors: {
    critical: [],
    warnings: [],
    notices: [],
  }
}
```

---

## 4. Config Translator (`src/shared/config.js`)

`translateConfig(appState) → engineConfig`

Normalizes appState → format expected by `variableMaker()`.

Key transformations:
- Parses `scaleStepNames` array of `{name, shorthand}` objects → `stepNames[]` + `scaleStepShorthands{}` map
- Resolves per-role `customVariations` vs. global `variations`
- Deduplicates theme names (appends `-2`, `-3` on collision)
- Defaults: `scaleLength → 23`, `scaleAlgorithm → "Natural"`, `tokenGrouping → "color"`, `alphaValues → "10, 25, 50, 75, 90"`
- Alpha values CSV → `int[]` clamped `0–100`

`buildVariableRenameMap(savedState, newState) → { scale: {}, tokens: {}, summary: {} }`

Detects renames by matching items by `_id` position, then comparing display labels (name or shorthand depending on toggle). Used by VariableManager to rename Figma variables non-destructively rather than delete + recreate.

---

## 5. Figma Variable Manager (`src/figma/figmaVars.js`)

`VariableManager.sync(result, config, scope, appState, savedAppState)`

Three-stage Figma sync:

### Stage 1: Scale Collection (skipped if `resolveTokensDirectly` or `pluginMode === "direct"` or `includeColorScalesCollection === false`)
- Collection name: `appState.scaleCollectionName` (default `"_scale"`)
- Structure: `{Color}/{StepName}` → hex value
- Includes WCAG contrast descriptions if `includeDescriptions`
- Single mode only (scale is theme-independent)

### Stage 2: Token Collection
- Collection name: `appState.tokenCollectionName` (default `"color tokens"`)
- One mode per theme (or limited to 1 mode on free Figma plan)
- Variable path determined by `tokenNameSegments` order + shorthand toggles
- Values: either `VARIABLE_ALIAS` pointing into scale collection, or raw hex if `resolveTokensDirectly`
- Free plan warning emitted if >1 theme is configured

### Stage 3: Source Colors Collection (only if `includeSourceColors`)
- Collection name: `appState.sourceCollectionName` (default `"_constants"`)
- Stores raw brand hex values: `{ColorName}` → hex
- If `includeAlphaTints`: adds `{ColorName}/Opacities/{pct}` variables for each alpha value

### Rename Handling (two-pass strategy)
```
Pass 1: rename all uncontested renames
Pass 2: retry any that were blocked by occupied target names
```
Only renames if position-matched by `_id` + only display name changed (not the underlying color).

### Scope Parameter
- `"all"` — sync all 3 stages
- `"groups"` — sync scale collection only
- `"roles"` — sync token collection only

### Tally
Returns `{ created, updated, renamed, failed }` counts sent back to UI in `finish` message.

---

## 6. Message Protocol

### UI → Plugin

| Type | Payload | Purpose |
|------|---------|---------|
| `run-creator` | `{ state, scope, savedState? }` | Generate + sync to Figma |
| `check-collections` | `{ colorName, tokenColName, state, savedState? }` | Check existing collections, build rename map |
| `resize` | `{ width, height }` | Resize plugin window |
| `save-ui-prefs-meta` | `{ prefs: {scale, theme, language} }` | Persist UI preferences |
| `request-processed-data` | `{ state, exportType }` | Export single format |
| `request-export-bundle` | `{ state, formats[] }` | Export multiple formats as ZIP |
| `save-config` | `{ state }` | Persist appState to document |
| `cancel` | — | Close plugin |

### Plugin → UI

| Type | Payload | Purpose |
|------|---------|---------|
| `capabilities` | `{ capabilities: { multiMode } }` | Figma plan probe result |
| `load-config` | `{ state }` | Restore saved appState on launch |
| `load-ui-prefs-meta` | `{ prefs }` | Restore UI scale/theme/language |
| `collection-check-result` | `{ existing[], renames }` | Pre-run collection check result |
| `finish` | `{ tally, errors, result }` | Sync complete |
| `processed-data-response` | `{ content, exportType }` | Single format export ready |
| `export-bundle-response` | `{ files[{path, content}] }` | Multi-format export ready |
| `error` | `{ message }` | Error in plugin thread |
| `warning` | `{ message }` | Non-fatal warning |

---

## 7. Persistence

| Storage | Key | Contents |
|---------|-----|---------|
| `figma.root.setPluginData` | `"tw_state"` | Full appState JSON (travels with file) |
| `figma.clientStorage` | `"uiPrefs"` | `{ width, height }` — window size |
| `figma.clientStorage` | `"uiPrefsMeta"` | `{ scale, theme, language }` — UI preferences |

---

## 8. Capability Probe

On launch, plugin attempts to add a second mode to a temp collection `__tw_probe__`.
- Success → `multiMode: true`
- Failure → `multiMode: false` (free plan)

Free plan effect: token collection limited to 1 mode. Warning shown in UI. Multi-theme still usable but as separate collections.

---

## 9. UI Screens

### Project Tab (`screens/project.js`)
- **Quick Start overlay**: shown on first launch. Picks from TW-badged presets or "Start Blank"
- **Project Profile**: name input, description input
- **Theme Manager**: add/edit/remove themes (name + background hex)
- **Theme Shop**: browse all presets (9 built-ins), confirm-overwrite if state is dirty
- **Version History**: list of snapshots — save current, restore, delete. Blocks save if state unchanged.

### Palette Tab (`screens/colors.js`)
- Drag-reorderable list of color group cards
- Each card: name input, hex color picker (native + text input), shorthand input, description
- Add / remove colors
- Per-color algorithm override (shown when `!useUniformAlgorithm`)

### Color Roles Tab (`screens/roles.js`)
- Drag-reorderable list of role cards
- Each card: name, shorthand, mapping method toggle (Contrast / Index), min contrast input
- Variation targets: editable list of contrast ratios or step indices
- Custom variation list toggle per role (when `perRoleVariationOverride` is on)
- Add / remove roles

### Settings Overlay (`screens/settings.js`) — 6 cards

**Card 1: Token Creation Mode**
- Mode toggle: Scale / Direct
- `useUniformAlgorithm` toggle
- Algorithm selector (scale mode + uniform)
- Solver mode selector (direct mode + uniform)
- Algorithm scope selector: Per Color / Per Role (when not uniform)

**Card 2: Palette**
- Scale Length input (number, 5–100)

**Card 3: Variations**
- `perRoleVariationOverride` toggle
- Global variations CRUD list: name + shorthand per row, drag-reorderable, add/remove

**Card 4: Token Naming**
- Shorthand toggles: Colors, Roles, Variations, Scale Steps
- Variable Structure segmented: Color/Role/Variation vs Role/Color/Variation
- Token Name Format: drag-reorderable pills for `[color, role, variation]` segment order
- Live preview of resulting token name format
- Variable Descriptions toggle

**Card 5: Collections**
- Palettes collection toggle + name input
- Color role collection name input
- "Link tokens to color scale" toggle (`resolveTokensDirectly`)
- Source Colors toggle
  - Source collection name input (shown when on)
  - Alpha Tints toggle (shown when Source Colors on)
    - Alpha Values CSV input (shown when Alpha Tints on)

**Card 6: Scale Step Labels**
- CRUD list: one row per step — label + shorthand
- If empty, steps auto-numbered 1…N
- Add / remove rows

**Plugin Settings panel** (separate tab):
- UI Scale: 70%, 80%, 90%, 100%, 110%, 125%, 150%
- UI Theme: Follow Figma / Dark / Light
- Language: English / Español / हिन्दी

### Preview Tab (`screens/preview.js`)
- **Scale spectrum**: one row per color. Hover each swatch to see step name, hex, contrast ratios per theme.
- **Token grid**: cards per `color × role × variation × theme`. Shows hex swatch, token name, WCAG rating pill (AAA / AA / AA Large / Fail).
- Click swatch: copy hex to clipboard
- Click footer: copy token name to clipboard
- Alpha tint strip: if `includeAlphaTints`, shows opacity swatches per color
- Theme selector: switch which theme to preview
- View mode toggle: Grid / Table

### Beta Lab (`screens/labPreview.js`)
- LCH grid, tone curves, hue wheel visualizer
- Step-by-step algorithm visualization per color

---

## 10. Export Engine (`src/shared/exportEng/`)

`buildExportBundle(result, config, formats[], appState) → files[]`

### Formats

| Key | Files | Notes |
|-----|-------|-------|
| `css` | `css/scale.css`, `css/themes/{theme}.css` | CSS custom properties |
| `scss` | `scss/scale.scss`, `scss/tokens.scss`, `scss/index.scss` | SCSS vars + mixins |
| `tailwind` | `tailwind/tailwind.config.js` | Tailwind `theme.extend.colors` |
| `dtcg` | `dtcg/scale.json`, `dtcg/themes/{theme}.json` | W3C Design Token Community Group |
| `style-dictionary` | `style-dictionary/global.json`, `style-dictionary/{theme}.json` | Style Dictionary v3 |
| `csv` | `tokens.csv` | Spreadsheet — scale + tokens + contrast |
| `ios-swift` | `ios/{Theme}Colors.swift` | UIColor/SwiftUI static extensions |
| `android` | `android/res/values/colors.xml`, `android/res/values-{theme}/colors.xml` | Android XML |
| `rn-ts` | `rn/tokens/index.ts`, `rn/tokens/{theme}.ts` | React Native TypeScript |
| `wand` | `config.wand` | Full appState JSON — reimportable |
| `json` | `tokens.json` | Design token JSON (engine output) |

ZIP built with JSZip. Download triggered via `<a download>` trick.

### Single Format Export (non-bundle)
`request-processed-data` → plugin runs formatter → returns raw string → UI downloads directly.

---

## 11. Presets (9 built-ins)

| ID | Name | Badge |
|----|------|-------|
| `wand` | Token Wand Regular | TW |
| `blank` | Blank | TW |
| `material` | Material Design 3 | — |
| `atlassian` | Atlassian | — |
| `radix` | Radix UI | — |
| `apple` | Apple HIG | — |
| `tailwind` | Tailwind CSS | — |
| `carbon` | IBM Carbon | — |
| `polaris` | Shopify Polaris | — |

Each preset is a partial `appState` that gets merged into `makeBootstrapState()`. TW-badged presets show in Quick Start; all appear in Theme Shop.

---

## 12. Dirty Tracking & Version System

**Dirty tracking** (`store.js`):
- `_computeHash()`: hash of all engine-affecting fields (colors, roles, themes, variations, scale config, naming config)
- `isDirty()`: compares current hash to `savedHash`
- `markClean()`: records baseline after successful Figma sync
- Purpose: powers "Run" button state (greyed when clean), Theme Shop overwrite confirmation

**Version snapshots** (`store.js`):
- `saveVersion(name, description)`: deep-clones current appState into `versions[]`
- `restoreVersion(id)`: replaces current appState from snapshot
- `deleteVersion(id)`: removes from array
- `versionSaveBlockedReason()`: returns reason string if save is disallowed (state unchanged, no changes since last version, etc.)

---

## 13. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Alt+Enter` | Run / Apply |
| `Alt+0` | Project tab |
| `Alt+1` | Palette tab |
| `Alt+2` | Roles tab |
| `Alt+3` | Preview: Scale (if not direct mode) |
| `Alt+4…N+3` | Preview: Theme 1…N |
| `Escape` | Close preview / cancel |

---

## 14. UI Resize

- Drag handle on plugin window border
- Min: 440×480, Max: 1400×1400
- Size persisted to `figma.clientStorage["uiPrefs"]`
- Restored before `figma.showUI()` to avoid resize flicker

---

## 15. Run Dialog Flow (vanilla)

1. User presses "Run" (Alt+Enter)
2. `handleSubmit(scope)` → `parent.postMessage({ type: "check-collections", colorName, tokenColName, savedState, state })`
3. Plugin: checks existing Figma collections, builds rename maps → `collection-check-result`
4. UI: shows `renderRunDialog()` — warns about existing collections, rename summary, lets user choose scope
5. User confirms → `proceedWithSync()` → `parent.postMessage({ type: "run-creator", state, scope, savedState })`
6. Plugin: `translateConfig()` → `variableMaker()` → `VariableManager.sync()`
7. Plugin: `figma.ui.postMessage({ type: "finish", tally, errors, result })`
8. UI: shows success overlay with tally, marks state clean

---

## 16. Build Process (`build.js`)

1. `npm install` (if node_modules missing)
2. Tailwind CSS: `input.css → output.css`
3. Concat `scripts.js`: color engine + config + export formatters + Figma code
4. Inline `ui.html`:
   - Replace `<script src="...">` with inlined content (strip comments/source maps)
   - Replace Tailwind `<link>` with inlined `<style>`
   - JSZip inlined verbatim (already minified)
   - Language JSON embedded into `lang.js`
5. Output: `dist/scripts.js` + `dist/ui.html`

---

## 17. i18n

Three language files: `en.json`, `es.json`, `hi.json`.
`t(key)` function substitutes template strings at render time.
Language setting stored in `uiPrefsMeta.language`.
Changing language re-renders all screen components.
