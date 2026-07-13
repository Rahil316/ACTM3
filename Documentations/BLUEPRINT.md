# Token Wand — Full System Blueprint

A complete map of every execution path from plugin open to Figma apply or file export.
Logic is written in pseudocode/TypeScript to eliminate ambiguity.

---

## 1. Plugin Startup

```
// Plugin startup — async IIFE
(async () => {
  savedUiSize = await figma.clientStorage.getAsync('uiPrefs') || { width: 560, height: 720 }
  figma.showUI(__html__, { width, height, themeColors: true })

  // Capability probe — detect free vs paid plan
  try {
    probeCol = figma.variables.createVariableCollection('__tw_probe_<random>__')
    probeCol.addMode('probe2')                // throws on free plan
    capabilities.multiMode = true
  } catch {
    capabilities.multiMode = false
  } finally {
    probeCol?.remove()
  }
})()

// Capabilities and state are NOT sent on startup.
// They're sent lazily when the UI posts 'ui-ready'.
```

### UI receives `load-config`

The plugin responds to `ui-ready` by loading two persisted state keys:
- `tw_ui_state` — last auto-saved UI state (restored into the editor)
- `tw_state` — last successfully synced state (rename/diff baseline)

Both are sent together:
```
postMessage({ type: 'load-config', state: uiState, syncedState })
```

```
if (state === null) {
  show QuickStart overlay              // first-launch wizard
} else {
  projectStore.loadState(state)        // hydrate store from saved JSON
  ensureIds(state)                     // assign _id to any color/role/theme/scaleStep missing one
  ensureVariations(state)              // see below
}
```

### `ensureIds(state)`
Mutates state in place. Walks `colors`, `roles`, `themes`, and `scaleSteps` arrays and calls `generateId()` for any entity missing a `_id`. Safe to call on both loaded state and preset configs (presets may omit IDs).

### `ensureVariations(state)`
Mutates state in place. Three jobs:
1. **Normalise `alphaValues`** — legacy saves stored this as a comma-string (`"10, 25, 50"`). Converts to `number[]` and filters invalid values. If not an array at all, resets to `[]`.
2. **Seed global variations** — if `state.variations` is empty or absent, fills it with `DEFAULT_VARIATIONS` (each gets a fresh `_id`). Otherwise ensures every existing variation has a `_id`.
3. **Seed variation targets** — any variation with a `null`/`undefined` target gets defaulted to `4.5`.

```
```

---

## 2. ProjectStore — The Source of Truth

All user configuration lives in a single Zustand store (`projectStore`).

```ts
interface ProjectStore {
  name: string;
  description: string;
  versions: Version[]; // saved snapshots (no engine involvement)

  // Engine behaviour
  pluginMode: "scale" | "direct";
  scaleAlgorithm: ScaleAlgorithm; // global default
  scaleLength: number; // number of steps in each palette ramp
  useUniformAlgorithm: boolean; // if false: per-color or per-role algorithm overrides
  algorithmScopeLevel: "color" | "role";
  solverMode: SolverMode; // global default

  // Token naming
  tokenNameSegments: ("color" | "role" | "variation")[];
  useShorthandColors: boolean;
  useShorthandRoles: boolean;
  useShorthandVariations: boolean;
  useShorthandSteps: boolean;

  // Output options
  includeSourceColors: boolean; // emit raw seed hex collection
  sourceCollectionName: string;
  alphaValues: number[]; // alpha opacity percentages e.g. [5, 10, 15, 20, 30]
  includeColorScalesCollection: boolean;
  includeDescriptions: boolean;
  scaleCollectionName: string;
  tokenCollectionName: string;

  // Entities
  scaleSteps: ScaleStepName[] | null; // null = numeric 1…N
  variations: Variation[] | null; // global variation list
  canEditRoleVariants: boolean; // allow roles to override variations
  colors: Color[];
  roles: Role[];
  themes: Theme[];

}
```

### Key entity shapes

```ts
interface Color {
  _id: string;
  name: string; // supports "/" nesting: "Brand/Primary"
  shorthand: string;
  value: string; // hex without #
  description: string;
  scaleAlgorithm?: ScaleAlgorithm; // per-color override (when useUniformAlgorithm=false)
  solverMode?: SolverMode;
}

interface Role {
  _id: string;
  name: string; // supports "/" nesting: "status/success"
  shorthand: string;
  mappingMethod: "contrast" | "index";
  variations: Variation[]; // used when customVariationList=true
  scaleAlgorithm?: ScaleAlgorithm;
  solverMode?: SolverMode;
  scopedColorIds?: string[] | null; // null = all colors; [] = no colors; [...] = specific ids
  localBg?: RoleLocalBg | null;
  description?: string;
  scopes?: VariableScope[] | null;  // Figma variable scopes (FRAME_FILL, TEXT_FILL, etc.)
}

export type RoleLocalBgKind = "theme" | "token-static" | "token-dynamic" | "color" | "hex";

interface RoleLocalBg {
  kind: RoleLocalBgKind;
  // token-static/token-dynamic/color: value is a string (token ref or color name)
  // hex: value is Record<themeName, hexString>
  // theme: no value needed (use global theme bg)
  value?: string | Record<string, string>;
}

interface Theme {
  _id: string;
  name: string;
  bg: string; // hex without #
}
```

---

## 3. Config Translation

Before any engine call, `translateConfig(projectStore)` converts ProjectStore into the engine's flat format.

```
translateConfig(projectStore) → EngineConfig

  count        = parseInt(scaleLength)            // clamped to ≥1
  stepNames    = _parseStepNames(projectStore, count) // null if not set → numeric
  variations   = projectStore.variations || [1,2,3,4,5]
  themes       = _deduplicateThemeNames(projectStore.themes)

  colors[] = projectStore.colors.map(c => {
    name, shorthand, value, _id, description
    solverMode  = c.solverMode || 'natural'
    scaleAlgorithm = c.scaleAlgorithm || null
  })

  roles[] = _mapRoles(projectStore, variations)
    → for each role:
        mappingMethod = role.mappingMethod === 'index' ? 'index' : 'contrast'
        variationTargets = role.variationTargets || fallback[4.5,…]
        scopedColorIds = role.scopedColorIds ?? null
        localBg = _resolveLocalBg(role, projectStore)      // see §4
        localBgTokenRef  = (kind='token-static')  ? value : null
        localBgDynamicRef = (kind='token-dynamic') ? value : null
```

### `_resolveLocalBg` — pre-engine resolution

```
_resolveLocalBg(role, projectStore):
  if !role.localBg → return null

  if kind === 'hex':
    return role.localBg.value          // already { themeName: hex }

  if kind === 'color':
    color = projectStore.colors.find(c => c.name === role.localBg.value)
    if !color → return null
    return { themeName: color.value }  // same hex for every theme

  if kind === 'token-static':
    return null   // localBgTokenRef set; resolved post-engine (see §5)

  if kind === 'token-dynamic':
    return null   // localBgDynamicRef set; resolved post-engine with [color] substitution (see §5)

  if kind === 'theme':
    return null   // use global theme.bg — no override needed
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

- `Natural` — perceptual lightness steps with chroma that tapers toward white and black
- `Uniform` — perceptual lightness steps with chroma held constant throughout
- `Expressive` — perceptual lightness steps with chroma tapering and a subtle hue shift (lighter → yellow, darker → blue)
- `Symmetric` — perceptual lightness steps anchored on the seed; seed appears at the midpoint
- `OKLCH` — perceptual lightness steps with chroma and hue held constant in OKLCH space
- `Material` — perceptual lightness steps in HCT color space (Google Material 3)
- `Linear` — linear HSL lightness steps, fixed saturation
- `Fidelity` — perceptual lightness steps in OKLCH space; chroma held as a fraction of the seed hue's real max-chroma envelope (not a raw value or a guessed taper curve), and the seed's exact hex always appears as one step

### `_solveDirectMode`

```
for each role in config.roles:

  // Scope guard
  if role.scopedColorIds !== null && !role.scopedColorIds.includes(color._id):
    continue

  solverMode = _getSolverMode(config, color, role)
  // Priority chain:
  //   1. useUniformAlgorithm=true  → always config.solverMode (global, no overrides)
  //   2. algorithmScopeLevel='role' → role.solverMode ?? config.solverMode
  //   3. algorithmScopeLevel='color'→ color.solverMode ?? config.solverMode

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

- `natural` — chroma tapers as lightness moves away from mid; most natural-looking results
- `constant-chroma` — holds chroma fixed at the seed value throughout the scale
- `symmetric` — chroma follows a bell curve peaking at mid-lightness and collapsing toward zero at both white and black
- `hue-locked` — stays on the seed's exact hue, pushes to maximum in-gamut chroma at the target contrast
- `max-chroma` — ignores seed chroma entirely, always uses the most vivid in-gamut color at the target contrast

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

## 5. Variable Naming — Segments, Shorthands, and "/" Grouping

### How Figma variable names are built

Every Figma variable name is a `/`-joined path assembled from three segments in the order defined by `tokenNameSegments`:

```
tokenNameSegments: ["color", "role", "variation"]   // default order

segments = {
  color:     useShorthandColors ? color.shorthand : color.name
  role:      useShorthandRoles  ? role.shorthand  : role.name
  variation: useShorthandVariations ? var.shorthand : var.name
}

figmaName = tokenNameSegments.map(s => segments[s]).join("/")
// e.g. ["color","role","variation"] + shorthands on → "n/tx/primary"
// e.g. ["color","role","variation"] + shorthands off → "Neutral/text/Primary"
// e.g. ["role","variation"]                          → "text/primary"  (color omitted)
```

The segment order is user-configurable. Omitting a segment drops it entirely from the path — e.g. `["role","variation"]` produces `text/primary` with no color prefix.

### "/" in color and role names creates Figma groups

Figma treats `/` in variable names as a folder separator. So a role named `fill/button` automatically nests under a `fill` group in the Figma UI. This is intentional — roles like `fill/button` and `text/button` appear as sub-items of `fill` and `text` groups.

```
// Example: color "Neutral" (shorthand "n"), role "fill/button" (shorthand "fi/btn"), variation "Default"
// tokenNameSegments = ["color","role","variation"], all shorthands on:
figmaName = "n/fi/btn/default"
// → Figma renders this as: n → fi → btn → default (4-level group)

// Shorthands off:
figmaName = "Neutral/fill/button/Default"
// → Figma renders: Neutral → fill → button → Default
```

### Scale variable names

Scale variables use a simpler two-segment path — no `tokenNameSegments` involved:

```
scaleFigmaName = colorLabel(colorName) + "/" + stepLabel(stepName)
// e.g. "n/100", "Brand/Step-3"
// colorLabel: shorthand if useShorthandColors, else full name
// stepLabel:  shorthand if useShorthandSteps and scaleStepShorthands defined, else step name
```

### Source color variable names

Source color variables use a doubled label path — one variable per color:

```
sourceFigmaName = colorLabel + "/" + colorLabel
// e.g. "n/n" or "Neutral/Neutral"
```

### `makeLabelHelpers(config)`

All label resolution is centralised in `makeLabelHelpers`, which returns three functions:

```ts
colorLabel(name)         // → shorthand if useShorthandColors, else full name
roleLabel(name, roleIdx) // → shorthand if useShorthandRoles, else full name
stepLabel(name)          // → shorthand if useShorthandSteps && scaleStepShorthands[name], else name
```

Used by `VariableManager.sync`, `computeSyncPreview`, and `analyzeNameConflicts` — all three use the same helpers so rename detection and sync write identical names.

---

## 6. Two-Pass Engine (Token-Ref LocalBg)

When any role has `localBg.kind === 'token-static'` or `'token-dynamic'`, a second engine pass is needed because the referenced token doesn't exist until the first pass runs.

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

## 7. Message Router — All Plugin Events

```
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {

    case 'run-creator':
      config = translateConfig(msg.state)
      result = runEngine(config)
      await VariableManager.sync(result, config, msg.scope, msg.state, msg.savedState)
      // → posts 'finish' or 'error' back to UI

    case 'ui-ready':
      postMessage({ type: 'capabilities', capabilities })
      // load and post ui prefs meta (theme, language, etc.)
      uiPrefsMeta = await figma.clientStorage.getAsync('uiPrefsMeta')
      if uiPrefsMeta: postMessage({ type: 'load-ui-prefs-meta', prefs: uiPrefsMeta })
      // load both persisted states
      uiRaw = figma.root.getPluginData('tw_ui_state') || figma.root.getPluginData('tw_state')
      syncedRaw = figma.root.getPluginData('tw_state')
      postMessage({ type: 'load-config', state: parse(uiRaw), syncedState: parse(syncedRaw) })

    case 'check-collections':
      // pre-run dialog: check which collections already exist + compute rename map
      existing = figma.variables.getLocalVariableCollectionsAsync()
               .filter(c => name matches scaleCollectionName or tokenCollectionName)
      renames = buildVariableRenameMap(msg.savedState, msg.state)
      syncPreview = computeSyncPreview(result, config, localVars, cols)
      conflicts = analyzeNameConflicts(result, config, localVars)
      structuralChanges = detectStructuralChanges(savedState, state)
      postMessage({ type: 'collection-check-result', existing, renames, conflicts, syncPreview, structuralChanges })

    case 'request-processed-data':
      // single-format preview export
      config = translateConfig(msg.state)
      result = runEngine(config)
      files  = buildExportBundle(result, config, [msg.exportType], msg.state)
      postMessage({ type: 'export-bundle-response', files })

    case 'request-export-bundle':
      // multi-format download
      config = translateConfig(msg.state)
      result = runEngine(config)
      files  = buildExportBundle(result, config, msg.formats, msg.state)
      postMessage({ type: 'export-bundle-response', files })

    case 'run-preview':
      config = translateConfig(msg.state)
      result = runEngine(config)
      await generateCanvasPreview(msg.state, result)
      postMessage({ type: 'preview-done' })

    case 'save-config':
      figma.root.setPluginData('tw_ui_state', JSON.stringify(msg.state))

    case 'save-ui-prefs-meta':
      figma.clientStorage.setAsync('uiPrefsMeta', msg.prefs)

    case 'resize':
      figma.ui.resize(max(MIN_WIDTH, msg.width), max(MIN_HEIGHT, msg.height))
      figma.clientStorage.setAsync('uiPrefs', { width, height })

    case 'cancel':
      figma.closePlugin()
  }
}

// ── Selection change listener (always active) ─────────────────────────────
figma.on('selectionchange', () => {
  isPreviewSelected = selection contains any node with previewRole/previewThemeId/
                      previewColorId/previewScaleColorId/previewScaleStepId plugin data
  postMessage({ type: 'selection-change', isPreviewSelected })
  // UI uses this to show/hide the canvas preview detail panel
})
```

---

## 8. Figma Variable Sync — `VariableManager.sync`

Called after every `run-creator`. Writes scales and tokens into Figma's variable API.

```
VariableManager.sync(result, config, scope, projectStore, savedProjectStore, decisions={}):
  // decisions: Record<tokenRef, 'keep'|'revert'>
  //   'keep'   → use the existing Figma variable's current name (ignore rename)
  //   'revert' → rename the variable to the new computed name

  tally = { created:0, updated:0, renamed:0, removed:0, failed:0 }
  await refreshCache()    // load all local variables + collections into memory

  renameMap = buildVariableRenameMap(savedProjectStore, projectStore)
  // → { scale: { oldName: newName }, tokens: { oldName: newName } }

  // Decide which stages to run
  skipScales = config.pluginMode === 'direct'
            || config.includeColorScalesCollection === false
            || (!scaleColExists && scope !== 'all' && scope !== 'scale')

  // ── STAGE 1: Color Scale collection ──────────────────────────────────────
  if !skipScales && scope ∈ ['all', 'scale', 'roles']:
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
    syncGlobalColors(config, decisions)
    // For each color:
    //   colorLabel/colorLabel = raw hex                    (e.g. "n/n")
    //   colorLabel/Opacities/10 … colorLabel/Opacities/90 (one per alphaValues entry)
    //     → value = { r, g, b, a: opacity/100 }  (RGBA Figma color)
    // All written to config.sourceCollectionName, single mode

  // ── STAGE 4: Purge orphaned variables ────────────────────────────────────
  if structuralChanges.length > 0:
    removed += purgeOrphanedVars(newProjectStore, savedProjectStore, structuralChanges)
    // Handles each StructuralChangeKind:
    //   mode-scale-to-direct / scale-collection-removed → remove entire scale collection
    //   source-removed                                  → remove entire source collection
    //   *-collection-renamed                            → remove old-named collection
    //   scale-shrunk                                    → remove step variables beyond newLen
    //   alpha-removed                                   → remove all Opacities/* vars from source
    //   alpha-changed                                   → remove only the specific removed opacity steps
    //   mode-direct-to-scale / alpha-changed (new)      → no purge needed, sync creates new vars
    // tally.removed is updated with count of deleted variables

  savePluginConfig(projectStore)
  postMessage({ type: 'finish', tally, errors: result.errors })
```

### `tokenRef` plugin data — the identity layer

Every Figma variable written by Token Wand has a `tokenRef` stored as Figma plugin data on the variable itself. This is the stable identity that survives renames:

```
// Scale variable:   tokenRef = "scale:{colorId}/{stepName}"    e.g. "scale:abc123/5"
// Token variable:   tokenRef = "token:{colorId}/{roleId}/{vi}"  e.g. "token:abc123/def456/0"
// Source variable:  tokenRef = "source:{colorId}"              e.g. "source:abc123"
// Alpha tint:       tokenRef = "source:{colorId}/{opacity}"    e.g. "source:abc123/25"
```

`buildMetadataMap(collection, allVars, prefix)` reads these refs and returns a `Map<tokenRef, Variable>`, giving O(1) lookup by stable identity. This map is used by:
- `upsertVariables` — to find the existing variable to update (not by name)
- `analyzeNameConflicts` — to compare current name vs computed name
- `computeSyncPreview` — to classify each variable as create/update/rename

### Rename logic

```
buildVariableRenameMap(savedProjectStore, newProjectStore):
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

### `upsertVariables` (batch)

Variables are written in batch via `upsertVariables`. Each call resolves decisions per-variable:

```
upsertVariables(collection, modeId, vars[], metadataMap, decisions):
  for each [tokenRef, varName, value, description, type, scopes?] in vars:
    variable = metadataMap.get(tokenRef)    // look up existing var by tokenRef plugin data
    decision = decisions[tokenRef] || 'keep'
    targetName = (variable && decision === 'keep') ? variable.name : varName

    if variable:
      tally.updated++
    else:
      variable = figma.variables.createVariable(targetName, collection, type)
      tally.created++

    if scopes: variable.scopes = scopes
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

## 9. Export — `buildExportBundle`

When the user downloads tokens instead of applying to Figma.

```
buildExportBundle(result, config, formats[], projectStore) → ExportFile[]

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

  'json':
    files += {project}-tokens.json  // raw { scales, tokens, errors }

  'wand':
    files += {project}.wand         // JSON snapshot of projectStore — re-importable
```

---

## 10. Run Dialog Flow (UI Side)

Before the user hits "Publish to Figma", a preflight check runs.

```
user clicks "Run":

  postMessage({ type: 'check-collections', state, savedState })
  // → plugin checks existing collections, computes rename map, previews counts,
  //   detects structural changes, analyzes name conflicts
  // → posts 'collection-check-result' back

UI receives 'collection-check-result':
  { existing, renames, conflicts, syncPreview, structuralChanges }

  syncPreview:  SyncPreview  = { toCreate, toUpdate, toRename, total }
  conflicts:    NameConflict[] = [{ tokenRef, figmaName, suggestedName, type }]
    // Each conflict = a variable whose computed name differs from its current Figma name.
    // User can 'keep' (preserve current name) or 'revert' (rename to computed name).
  structuralChanges: StructuralChange[] = [{ kind, detail, oldValue?, newValue?, orphanedCollection? }]
    // Structural change kinds: mode-direct-to-scale, mode-scale-to-direct, scale-shrunk,
    //   scale-collection-renamed, token-collection-renamed, source-collection-renamed,
    //   source-removed, alpha-removed, alpha-changed, scale-collection-removed
    // Orphaning changes (mode switch, scale-shrunk, source-removed, alpha-removed) show a warning.

  show RunDialog:
    - list existing collections that will be updated
    - show sync preview counts (toCreate / toUpdate / toRename)
    - show rename summary (N scale vars, M token vars renamed)
    - show structural change warnings if any orphaning changes detected
    - list name conflicts with keep/revert toggles per conflict
    - scope selector (SyncScope): 'all' → "Everything" | 'scale' → "Scale Only" | 'roles' → "Roles Only"
    - confirm button

  user confirms:
    decisions = { [tokenRef]: 'keep' | 'revert' }   // one entry per conflict
    postMessage({ type: 'run-creator', state, savedState, scope, decisions })

UI receives 'finish':
  show tally: { created, updated, renamed, removed, failed }
  show engine errors/warnings if any

UI receives 'error':
  show error banner

// Preview interruption: if plugin was closed mid-preview, on next 'ui-ready' the
// plugin posts { type: 'preview-interrupted' } before 'load-config'.
// RunDialog shows a warning banner when previewWasInterrupted is true.
```

---

## 11. State Persistence

```
// Two persistent state slots:
// tw_ui_state — auto-saved on every store change; what gets loaded on next open
// tw_state    — updated only after a successful sync; used as rename/diff baseline

// UI state auto-save:
postMessage({ type: 'save-config', state: projectStore })
// → plugin: figma.root.setPluginData('tw_ui_state', JSON.stringify(state))

// Sync baseline update — written after successful VariableManager.sync():
figma.root.setPluginData('tw_state', JSON.stringify(projectStore))

// UI preferences (theme, language, etc.):
figma.clientStorage.setAsync('uiPrefsMeta', prefs)
// clientStorage is per-user, per-plugin; not tied to the file
```

---

## 12. Preset Loading

```
user opens Theme Shop → selects preset:

  next = { ...preset.config, _presetId: preset.id }
  ensureIds(next)         // fill any missing _id fields (preserves stable ids)
  ensureVariations(next)  // backfill variations if absent
  projectStore.loadState(next)
  closeOverlay()
  // state is now live; no engine run triggered — user runs manually
```

---

## 13. Full Data Flow Summary

```
ProjectStore (Zustand store)
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
    │                    → value = VARIABLE_ALIAS to scale step (or raw hex if direct mode/skipScales)
    │         Stage 3: source colors     (raw hex + alpha opacities)
    │
    └──▶  buildExportBundle()
              → ExportFile[] (path + content strings)
              → downloaded as zip in the browser
```

---

## 14. Key Supporting Types

```ts
// ── Sync scope ────────────────────────────────────────────────────────────
type SyncScope = "all" | "scale" | "roles"
// 'all'    → write scale collection + token collection + source colors
// 'scale'  → scale collection only
// 'roles'  → token collection only (skips scale write)

// ── Sync tally ────────────────────────────────────────────────────────────
interface SyncTally {
  created: number;   // new variables written
  updated: number;   // existing variables updated
  renamed: number;   // variables renamed
  removed: number;   // orphaned variables removed
  failed:  number;   // variables that errored
}

// ── Sync preview ─────────────────────────────────────────────────────────
interface SyncPreview {
  toCreate: number;
  toUpdate: number;
  toRename: number;
  total:    number;
}

// ── Name conflict ─────────────────────────────────────────────────────────
interface NameConflict {
  tokenRef:      string;             // plugin data key linking variable to token
  figmaName:     string;             // current name of the variable in Figma
  suggestedName: string;             // what the engine would name it now
  type:          'token' | 'scale' | 'source';
}

// ── Structural change ─────────────────────────────────────────────────────
type StructuralChangeKind =
  | "mode-direct-to-scale"       // pluginMode changed → orphans old variables
  | "mode-scale-to-direct"
  | "scale-shrunk"               // scaleLength reduced → some steps no longer exist
  | "scale-collection-renamed"   // collection rename
  | "token-collection-renamed"
  | "source-collection-renamed"
  | "source-removed"             // includeSourceColors turned off → source collection orphaned
  | "alpha-removed"              // an alpha value removed → alpha variable orphaned
  | "alpha-changed"              // alpha value changed
  | "scale-collection-removed";  // includeColorScalesCollection turned off

interface StructuralChange {
  kind:                StructuralChangeKind;
  detail:              string;        // human-readable description
  oldValue?:           string;
  newValue?:           string;
  orphanedCollection?: string;        // name of collection that will be orphaned
}
```

---

## 15. Error Conditions

| Condition                                  | Handling                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Free plan + multiple themes                | `ensureMode` returns `null`; warning posted to UI; extra themes skipped                             |
| `localBg` token ref cycle (A→B→A)          | Tainted role detection; ref cleared; falls back to `theme.bg`                                       |
| `localBg` token ref not found in pass-1    | `resolveRef` returns null; role falls back to `theme.bg`                                            |
| Color not found for `localBg.kind='color'` | `_resolveLocalBg` returns null; engine uses `theme.bg`                                              |
| `minContrast` not achievable               | Token still emitted at best available contrast; `isAdjusted=true`; notice added to `errors.notices` |
| Variable create/rename fails               | `tally.failed++`; error logged; other variables continue                                            |
| `scaleLength` < 1                          | Clamped to 1                                                                                        |
| Duplicate theme names                      | `_deduplicateThemeNames` appends counter: "Dark 2"                                                  |
| First launch (no saved state)              | QuickStart overlay shown                                                                            |
