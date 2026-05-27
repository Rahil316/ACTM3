# Token Wand — Full System Blueprint

A complete map of every execution path from plugin open to Figma apply or file export.
Logic is written in pseudocode/TypeScript to eliminate ambiguity.

---

## 1. Plugin Startup

```
figma.showUI(__html__, { width, height })          // open iframe

// Capability probe — detect free vs paid plan
try {
  probe = figma.variables.createVariableCollection('__tw_probe__')
  probe.addMode('probe2')                          // throws on free plan
  capabilities.multiMode = true
} catch {
  capabilities.multiMode = false                   // single-mode only
} finally {
  probe.remove()
}

postMessage({ type: 'capabilities', capabilities })

// Load persisted state
savedConfigStr = figma.root.getPluginData('tw_state')

if (savedConfigStr) {
  postMessage({ type: 'load-config', state: JSON.parse(savedConfigStr) })
} else {
  postMessage({ type: 'load-config', state: null })   // first launch
}
```

### UI receives `load-config`

```
if (state === null) {
  show QuickStart overlay              // first-launch wizard
} else {
  appStore.loadState(state)            // hydrate store from saved JSON
  ensureIds(state)                     // fill any missing _id fields
  ensureVariations(state)              // backfill global variations if absent
}
```

---

## 2. AppState — The Source of Truth

All user configuration lives in a single Zustand store (`appStore`).

```ts
interface AppState {
  name: string
  description: string
  versions: Version[]               // saved snapshots (no engine involvement)

  // Engine behaviour
  pluginMode: 'scale' | 'direct'
  scaleAlgorithm: ScaleAlgorithm    // global default
  scaleLength: number               // number of steps in each palette ramp
  useUniformAlgorithm: boolean      // if false: per-color or per-role algorithm overrides
  algorithmScopeLevel: 'color' | 'role'
  solverMode: SolverMode            // global default

  // Token naming
  tokenNameSegments: ('color' | 'role' | 'variation')[]
  useShorthandColors: boolean
  useShorthandRoles: boolean
  useShorthandVariations: boolean
  useShorthandSteps: boolean

  // Output options
  resolveTokensDirectly: boolean    // store hex in tokens instead of variable alias
  includeSourceColors: boolean      // emit raw seed hex collection
  sourceCollectionName: string
  includeAlphaTints: boolean
  alphaValues: string               // "10, 25, 50" — parsed to number[]
  tokenGrouping: 'color' | 'role'   // legacy field; tokenNameSegments is used instead
  includeColorScalesCollection: boolean
  includeDescriptions: boolean
  scaleCollectionName: string
  tokenCollectionName: string

  // Entities
  scaleStepNames: ScaleStepName[] | null   // null = numeric 1…N
  variations: Variation[] | null           // global variation list
  perRoleVariationOverride: boolean        // allow roles to override variations
  colors: Color[]
  roles: Role[]
  themes: Theme[]

  _presetId?: string
}
```

### Key entity shapes

```ts
interface Color {
  _id: string
  name: string              // supports "/" nesting: "Brand/Primary"
  shorthand: string
  value: string             // hex without #
  description: string
  scaleAlgorithm?: ScaleAlgorithm   // per-color override (when useUniformAlgorithm=false)
  solverMode?: SolverMode
}

interface Role {
  _id: string
  name: string              // supports "/" nesting: "status/success"
  shorthand: string
  minContrast: number
  mappingMethod: 'contrast' | 'index'
  variationTargets: number[]         // one per variation — contrast ratio or step index
  customVariationList: boolean
  customVariations: Variation[]      // used when customVariationList=true
  scaleAlgorithm?: ScaleAlgorithm
  solverMode?: SolverMode
  scopedColorIds?: string[] | null   // null = all colors; [] = no colors; [...] = specific ids
  localBg?: RoleLocalBg | null
  description?: string
}

interface RoleLocalBg {
  kind: 'token' | 'color' | 'hex'
  value: string | Record<string, string>   // token/color: string; hex: { themeName: hexString }
  dynamic?: boolean                        // token kind only: value contains [color] placeholder
}

interface Theme {
  _id: string
  name: string
  bg: string    // hex without #
}
```

---

## 3. Config Translation

Before any engine call, `translateConfig(appState)` converts AppState into the engine's flat format.

```
translateConfig(appState) → EngineConfig

  count        = parseInt(scaleLength)            // clamped to ≥1
  stepNames    = _parseStepNames(appState, count) // null if not set → numeric
  variations   = appState.variations || [1,2,3,4,5]
  themes       = _deduplicateThemeNames(appState.themes)

  colors[] = appState.colors.map(c => {
    name, shorthand, value, _id, description
    solverMode  = c.solverMode || 'natural'
    scaleAlgorithm = c.scaleAlgorithm || null
  })

  roles[] = _mapRoles(appState, variations)
    → for each role:
        mappingMethod = role.mappingMethod === 'index' ? 'index' : 'contrast'
        variationTargets = role.variationTargets || fallback[4.5,…]
        scopedColorIds = role.scopedColorIds ?? null
        localBg = _resolveLocalBg(role, appState)      // see §4
        localBgTokenRef  = (kind=token && !dynamic) ? value : null
        localBgDynamicRef = (kind=token && dynamic) ? value : null
```

### `_resolveLocalBg` — pre-engine resolution

```
_resolveLocalBg(role, appState):
  if !role.localBg → return null

  if kind === 'hex':
    return role.localBg.value          // already { themeName: hex }

  if kind === 'color':
    color = appState.colors.find(c => c.name === role.localBg.value)
    if !color → return null
    return { themeName: color.value }  // same hex for every theme

  if kind === 'token':
    return null                        // resolved post-engine (see §5)
```

---

## 4. The Color Engine — `variableMaker(config)`

> **Note:** The engine is a pure function. It computes scales and solves contrast targets — no Figma API calls. Full algorithm internals (scale generation, solver iterations) are complex; only inputs/outputs and the key branching paths are described here.

### Engine entry point

```
variableMaker(config: EngineConfig): EngineResult

  result = { scales: {}, tokens: {}, errors: { critical:[], warnings:[], notices:[] } }

  // Build scales only in scale mode. Skipped entirely in direct mode.
  // result.scales is an empty object when pluginMode === 'direct'.
  if config.pluginMode !== 'direct':
    _generateScales(config.colors, config) → result.scales

  // For each theme × color, compute tokens
  for each theme in config.themes:
    for each color in config.colors:

      // Scope guard: skip this color if any role scopes it out — done per-role inside loops

      if config.pluginMode === 'direct':
        _solveDirectMode(color, theme, config, result)
      else:
        _processScaleMode(color, theme, config, result)
```

### `_generateScales`

```
for each color:
  algo = color.scaleAlgorithm || config.scaleAlgorithm   // per-color or global
  if config.useUniformAlgorithm:
    algo = config.scaleAlgorithm                          // override — always global

  steps[] = scaleMaker(color.value, config.scaleLength, algo)
  // → array of hex strings, length = scaleLength
  // → for each step: compute contrast against EACH theme's actual bg hex
  //   (not hardcoded #FFF/#000 — stored as scale[step].contrast[themeName])
  result.scales[color.name] = { step1: {value, contrast, description}, … }
```

**Scale algorithms:**
- `Natural` — perceptually smooth, follows luminance curve
- `Uniform` — mathematically even luminance steps
- `Expressive` — pushes mid-tones for more chroma
- `Symmetric` — mirror-symmetric around the seed
- `OKLCH` — interpolated in OKLCH space
- `Material` — HCT tonal palette (Google M3)
- `Linear` — linear RGB interpolation

### `_solveDirectMode`

```
for each role in config.roles:

  // Scope guard
  if role.scopedColorIds !== null && !role.scopedColorIds.includes(color._id):
    continue

  solverMode = _getSolverMode(config, color, role)

  // Local bg resolution
  perColorBg = role.localBgPerColor?.[color.name]?.[theme.name.lower()]
  bgHex = perColorBg ?? role.localBg?.[theme.name.lower()] ?? theme.bg

  // Solve each variation
  for each variation at index i:
    target = role.variationTargets[i]

    // mappingMethod is always 'contrast' in direct mode
    solved = _solveForContrast(color.value, bgHex, target, solverMode)
    // → iterates lightness/chroma to reach WCAG contrast ratio `target` vs bgHex
    // → returns { value: hex, isAdjusted: bool }

    result.tokens[theme][color.name][roleIdx][i] = {
      value: solved.value,
      tokenRef: null,          // direct mode: no scale step reference
      tokenName: buildTokenName(config, color.name, role.name, variation.name),
      isAdjusted: solved.isAdjusted,
      role: role.name,
      roleDescription: role.description,
    }
```

**Solver modes (direct):**
- `natural` — adjusts lightness, preserves hue and chroma where possible
- `saturated` — pushes chroma up while solving
- `luminance` — pure luminance axis, desaturates
- `hue-locked` — only moves lightness, never shifts hue
- `chroma-maximized` — maximizes chroma at the target contrast level

### `_processScaleMode`

```
for each role in config.roles:

  // Scope guard
  if role.scopedColorIds !== null && !role.scopedColorIds.includes(color._id):
    continue

  perColorBg = role.localBgPerColor?.[color.name]?.[theme.name.lower()]
  effectiveBg = perColorBg ?? role.localBg?.[theme.name.lower()] ?? null
  bgForContrast = effectiveBg ?? theme.bg
  isDark = relLum(bgForContrast) < 0.4

  if role.mappingMethod === 'index':
    _mapByIndex(color, role, variations, scale, stepNames, result)
  else:
    _mapByScaleContrast(color, role, variations, scale, stepNames,
                        theme.name, bgForContrast, isDark, result)
```

### `_mapByIndex`

```
for each variation at index i:
  stepIndex = Math.round(role.variationTargets[i])   // treat target as a step index
  stepIndex = clamp(0, scaleLength-1)
  stepName = stepNames[stepIndex]

  result token = {
    value: scale[stepName].value,
    tokenRef: scale[stepName].stepName,   // alias to this scale step in Figma
    tokenName: buildTokenName(…),
  }
```

### `_mapByScaleContrast`

```
for each variation at index i:
  target = role.variationTargets[i]

  if effectiveBg is set (localBg override):
    // compute contrast on-the-fly against localBg — do NOT use pre-stored scale contrast
    best = null
    for each step in scale:
      ratio = contrastRatio(step.value, bgForContrast)
      if |ratio - target| < |best.ratio - target|:
        best = { step, ratio }
    winner = best.step

  else:
    // use pre-stored contrast for this theme (fast path)
    // scale[step].contrast[modeName] was computed against this exact theme.bg
    // during _generateScales — no approximation, values are per-theme-accurate
    winner = scale step whose contrast[modeName].ratio is closest to target

  // minContrast guard: if winner.contrast < role.minContrast → flag isAdjusted
  isAdjusted = winner.contrast < role.minContrast

  result token = {
    value: winner.value,
    tokenRef: winner.stepName,    // for Figma variable alias
    tokenName: buildTokenName(…),
    isAdjusted,
  }
```

### Token name construction

```
buildTokenName(config, colorName, roleName, variationName):
  segments = {
    color:     useShorthandColors ? color.shorthand : colorName,
    role:      useShorthandRoles  ? role.shorthand  : roleName,
    variation: useShorthandVariations ? var.shorthand : variationName,
  }
  return config.tokenNameSegments.map(s => segments[s]).join('/')
  // e.g. ['color','role','variation'] → "Brand/Primary/fill/default"
  // e.g. ['role','variation']         → "fill/default"
```

### Engine output shape

```ts
EngineResult = {
  scales: {
    [colorName]: {
      [stepName]: {
        value: string           // hex
        description?: string
        contrast: {
          light: { ratio: number, rating: 'Fail'|'AA-Large'|'AA'|'AAA' }
          dark:  { ratio: number, rating: … }
        }
        stepName: string        // matches key, used as tokenRef
      }
    }
  },
  tokens: {
    [themeName]: {
      [colorName]: {
        [roleIndex]: {
          [variationIndex]: {
            value: string           // resolved hex
            tokenRef: string|null   // scale step key (null in direct mode)
            tokenName: string       // full "/"-joined path
            isAdjusted: boolean
            role: string
            roleDescription: string
          }
        }
      }
    }
  },
  errors: {
    critical: unknown[]
    warnings: { color, role, variation, theme, warning }[]
    notices:  { color, role, variation, theme, notice }[]
  }
}
```

---

## 5. Two-Pass Engine (Token-Ref LocalBg)

When any role has `localBg.kind === 'token'`, a second engine pass is needed because the referenced token doesn't exist until the first pass runs.

```
function runEngine(config):

  result1 = variableMaker(config)

  anyResolved = resolveTokenRefBgs(config, result1)
  // mutates config.roles[*].localBg in place

  if anyResolved:
    return variableMaker(config)    // pass 2 with resolved bgs
  else:
    return result1
```

### `resolveTokenRefBgs`

```
// Cycle protection:
// A role that itself has a token ref → its tokens are "tainted"
// Any role pointing to a tainted token → ref cleared → falls back to theme.bg

taintedRoleNames = roles.filter(r => r.localBgTokenRef).map(r => r.name.lower())

function resolveRef(ref: string) → { themeName: hex } | null:
  for each theme:
    for each token in result1.tokens[theme][*][*][*]:
      if slugify(token.tokenName) matches slugify(ref):
        if token.role ∈ taintedRoleNames → cycle → return null
        resolved[theme] = token.value
  return resolved if any, else null

// Fixed token refs — one bg map for all colors
for each role with localBgTokenRef:
  resolved = resolveRef(role.localBgTokenRef)
  if resolved:
    role.localBg = resolved
    anyResolved = true
  role.localBgTokenRef = null

// Dynamic token refs — [color] placeholder → one bg map per color
for each role with localBgDynamicRef:
  template = role.localBgDynamicRef    // e.g. "[color]/fill/default"
  for each colorName:
    ref = template.replace('[color]', colorName)
    resolved = resolveRef(ref)
    if resolved:
      role.localBgPerColor[colorName] = resolved
      anyResolved = true
  role.localBgDynamicRef = null
```

---

## 6. Message Router — All Plugin Events

```
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {

    case 'run-creator':
      config = translateConfig(msg.state)
      result = runEngine(config)
      await VariableManager.sync(result, config, msg.scope, msg.state, msg.savedState)
      // → posts 'finish' or 'error' back to UI

    case 'check-collections':
      // pre-run dialog: check which collections already exist + compute rename map
      existing = figma.variables.getLocalVariableCollectionsAsync()
               .filter(c => name matches scaleCollectionName or tokenCollectionName)
      renames = buildVariableRenameMap(msg.savedState, msg.state)
      postMessage({ type: 'collection-check-result', existing, renames })

    case 'request-processed-data':
      // single-format preview export
      config = translateConfig(msg.state)
      result = runEngine(config)
      files  = buildExportBundle(result, config, [msg.exportType], msg.state)
      if exportType === 'csv':  files[0].content = ExportFormatter.toCSV(result, config)
      if exportType === 'json': files[0].content = JSON.stringify({ scales, tokens, errors })
      postMessage({ type: 'export-bundle-response', files })

    case 'request-export-bundle':
      // multi-format download
      config = translateConfig(msg.state)
      result = runEngine(config)
      files  = buildExportBundle(result, config, msg.formats, msg.state)
      postMessage({ type: 'export-bundle-response', files })

    case 'save-config':
      figma.root.setPluginData('tw_state', JSON.stringify(msg.state))

    case 'resize':
      figma.ui.resize(max(MIN_WIDTH, msg.width), max(MIN_HEIGHT, msg.height))
      figma.clientStorage.setAsync('uiPrefs', { width, height })

    case 'cancel':
      figma.closePlugin()
  }
}
```

---

## 7. Figma Variable Sync — `VariableManager.sync`

Called after every `run-creator`. Writes scales and tokens into Figma's variable API.

```
VariableManager.sync(result, config, scope, appState, savedAppState):

  tally = { created:0, updated:0, renamed:0, failed:0 }
  await refreshCache()    // load all local variables + collections into memory

  renameMap = buildVariableRenameMap(savedAppState, appState)
  // → { scale: { oldName: newName }, tokens: { oldName: newName } }

  // Decide which stages to run
  skipScales = config.resolveTokensDirectly
            || config.pluginMode === 'direct'
            || config.includeColorScalesCollection === false

  // ── STAGE 1: Color Scale collection ──────────────────────────────────────
  if !skipScales && scope ∈ ['all', 'groups', 'roles']:
    scaleCol = getOrCreateCollection(config.scaleCollectionName)
    applyRenames(scaleCol, renameMap.scale)

    for each (colorName, scale) in result.scales:
      for each (step, entry) in scale:
        varName = colorLabel(colorName) + '/' + stepLabel(step)
        upsertVariable(scaleCol, modeId, varName, COLOR, entry.value, description)

  // ── STAGE 2: Semantic token collection ───────────────────────────────────
  if scope ∈ ['all', 'roles']:
    tokenCol = getOrCreateCollection(config.tokenCollectionName)
    applyRenames(tokenCol, renameMap.tokens)

    for each theme in result.tokens:
      modeId = ensureMode(tokenCol, theme.name)
      if modeId === null:
        // free plan: cannot add more modes
        postMessage({ type: 'warning', message: 'Multiple modes require paid plan' })
        continue

      for each (colorName, roleMap) in result.tokens[theme]:
        for each (roleIdx, variationMap) in roleMap:
          for each (varIdx, token) in variationMap:
            figmaName = tokenNameOrder.map(s => {color, role, variation}[s]).join('/')

            // Value: alias to scale var OR raw hex
            if skipScales:
              value = token.value                // raw hex
            else:
              scaleVar = find variable in scaleCol whose name = scaleVarNameMap[token.tokenRef]
              value = scaleVar ? VARIABLE_ALIAS(scaleVar.id) : token.value

            upsertVariable(tokenCol, modeId, figmaName, COLOR, value, description)

  // ── STAGE 3: Source colors collection ────────────────────────────────────
  if config.includeSourceColors:
    syncGlobalColors(config)
    // → creates/updates collection named config.sourceCollectionName
    // → one variable per color: colorLabel/colorLabel = raw hex
    // → if includeAlphaTints: adds colorLabel/Opacities/10 … /90 (RGBA)

  savePluginConfig(appState)
  postMessage({ type: 'finish', tally, errors: result.errors, result })
```

### Rename logic

```
buildVariableRenameMap(savedAppState, newAppState):
  // Matches colors/roles by _id across old and new state
  // Computes old token name and new token name for each matched pair
  // Returns { scale: {old→new}, tokens: {old→new} }

  // Scale renames: colorLabel/stepName
  // Token renames: tokenNameOrder(colorLabel, roleLabel, variationLabel)

  // Two-pass rename application (to avoid collision when A→B and B→A):
  for pass in [0, 1]:
    for each variable in collection:
      newName = renameMap[variable.name]
      if newName && !alreadyOccupied(newName):
        variable.name = newName
```

### `upsertVariable`

```
upsertVariable(collection, modeId, name, type, value, description):
  existing = cache.variables.find(v => v.name === name && v.collectionId === collection.id)
  if existing:
    tally.updated++
    variable = existing
  else:
    variable = figma.variables.createVariable(name, collection, type)
    cache.variables.push(variable)
    tally.created++

  variable.description = description
  variable.setValueForMode(modeId, value)   // hex → {r,g,b} or VARIABLE_ALIAS
```

### `ensureMode`

```
ensureMode(collection, modeName):
  existing = collection.modes.find(m => m.name.lower() === modeName.lower())
  if existing → return existing.modeId

  if collection has exactly 1 mode AND its name starts with 'Mode':
    collection.renameMode(modes[0].modeId, modeName)   // rename the auto-created mode
    return modes[0].modeId

  try:
    return collection.addMode(modeName)   // throws on free plan if >1 mode
  catch:
    return null    // caller emits warning
```

---

## 8. Export — `buildExportBundle`

When the user downloads tokens instead of applying to Figma.

```
buildExportBundle(result, config, formats[], appState) → ExportFile[]

for each fmt in formats:

  'css':
    files += scale.css          // CSS custom properties for scale steps
    files += {theme}.css        // one file per theme with semantic token vars
                                // e.g. --brand-primary-fill-default: #0066FF;

  'scss':
    files += _scale.scss        // SCSS variables for scale steps
    files += _tokens.scss       // SCSS variables for semantic tokens
    files += index.scss         // @forward both

  'tailwind':
    files += tailwind.config.js // extend.colors keyed by token path
    files += tokens.css         // scale CSS (referenced by config)
    files += {theme}.css        // per-theme semantic CSS vars

  'dtcg':
    files += scale.json         // W3C Design Token Community Group format
    files += {theme}.json       // per-theme semantic tokens in DTCG format

  'style-dictionary':
    files += global.json        // Style Dictionary source (scale)
    files += {theme}.json       // per-theme semantic token overrides

  'ios-swift':
    files += {Theme}Colors.swift  // Swift enum with static Color properties

  'android':
    files += res/values/colors.xml          // default (first theme)
    files += res/values-{theme}/colors.xml  // per additional theme

  'rn-ts':
    files += rn/tokens/index.ts    // TypeScript barrel
    files += rn/tokens/{theme}.ts  // per-theme typed color object

  'csv':
    files += {project}-tokens.csv   // flat table: name, theme, value, contrast
    // content filled by ExportFormatter.toCSV in index.ts

  'json':
    files += {project}-tokens.json  // raw { scales, tokens, errors }
    // content filled directly in index.ts

  'wand':
    files += {project}.wand         // JSON snapshot of appState — re-importable
```

---

## 9. Run Dialog Flow (UI Side)

Before the user hits "Apply to Figma", a preflight check runs.

```
user clicks "Run":

  postMessage({ type: 'check-collections', state, savedState })
  // → plugin checks existing collections, computes rename map
  // → posts 'collection-check-result' back

UI receives 'collection-check-result':
  if existing collections:
    show RunDialog:
      - list existing collections that will be updated
      - show rename summary (N scale vars, M token vars renamed)
      - scope selector: 'all' | 'groups' (scale only) | 'roles' (tokens only)
      - confirm button

  user confirms:
    postMessage({ type: 'run-creator', state, savedState, scope })

UI receives 'finish':
  show tally: { created, updated, renamed, failed }
  show engine errors/warnings if any

UI receives 'error':
  show error banner
```

---

## 10. State Persistence

```
// On every significant store change:
postMessage({ type: 'save-config', state: appState })
// → plugin calls figma.root.setPluginData('tw_state', JSON.stringify(appState))
// → survives plugin close; loaded on next open

// UI preferences (theme, scale, language) stored separately:
figma.clientStorage.setAsync('uiPrefsMeta', prefs)
// → clientStorage is per-user, per-plugin; not tied to the file
```

---

## 11. Preset Loading

```
user opens Theme Shop → selects preset:

  next = { ...preset.config, _presetId: preset.id }
  ensureIds(next)         // fill any missing _id fields (preserves stable ids)
  ensureVariations(next)  // backfill variations if absent
  appStore.loadState(next)
  closeOverlay()
  // state is now live; no engine run triggered — user runs manually
```

---

## 12. Full Data Flow Summary

```
AppState (Zustand store)
    │
    ▼  translateConfig()
EngineConfig (flat, engine-ready)
    │
    ▼  variableMaker()   [pass 1]
EngineResult (scales + tokens)
    │
    ▼  resolveTokenRefBgs()   [if any localBg token refs]
EngineConfig (mutated: localBg resolved per color/theme)
    │
    ▼  variableMaker()   [pass 2, only if refs were resolved]
EngineResult (final)
    │
    ├──▶  VariableManager.sync()
    │         Stage 1: scale collection  (COLOR variables, 1 mode)
    │         Stage 2: token collection  (COLOR variables, N modes = N themes)
    │                    → value = VARIABLE_ALIAS to scale step (or raw hex if direct/resolveDirectly)
    │         Stage 3: source colors     (raw hex + alpha opacities)
    │
    └──▶  buildExportBundle()
              → ExportFile[] (path + content strings)
              → downloaded as zip in the browser
```

---

## 13. Error Conditions

| Condition | Handling |
|---|---|
| Free plan + multiple themes | `ensureMode` returns `null`; warning posted to UI; extra themes skipped |
| `localBg` token ref cycle (A→B→A) | Tainted role detection; ref cleared; falls back to `theme.bg` |
| `localBg` token ref not found in pass-1 | `resolveRef` returns null; role falls back to `theme.bg` |
| Color not found for `localBg.kind='color'` | `_resolveLocalBg` returns null; engine uses `theme.bg` |
| `minContrast` not achievable | Token still emitted at best available contrast; `isAdjusted=true`; notice added to `errors.notices` |
| Variable create/rename fails | `tally.failed++`; error logged; other variables continue |
| `scaleLength` < 1 | Clamped to 1 |
| Duplicate theme names | `_deduplicateThemeNames` appends counter: "Dark 2" |
| First launch (no saved state) | QuickStart overlay shown |
