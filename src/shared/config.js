
// Defined in state.js when running in the UI context; redeclared here for the
// Figma thread build (dist/scripts.js) where state.js is not included.
// We use a safe accessor to avoid SyntaxError collisions when bundled with state.js
const _FALLBACK_VARS = [1.5, 3.0, 4.5, 7.0, 12.0];
const _getVariationTargets = () => typeof DEFAULT_VARIATION_TARGETS !== "undefined" ? DEFAULT_VARIATION_TARGETS : _FALLBACK_VARS; // eslint-disable-line no-undef

// CONFIG TRANSLATOR: Converts appState (UI format) into the format expected by variableMaker.
function translateConfig(appState) {
  const count = Math.max(1, parseInt(appState.scaleLength) || 23);
  const stepNames = _parseStepNames(appState, count);
  const stepShorthands = _parseStepShorthands(appState, stepNames);
  const variations = _parseVariations(appState);
  const roleStepNames = variations.map((v) => (appState.useShorthandVariations && v.shorthand ? v.shorthand : v.name));
  const themes = appState.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];

  return {
    name: appState.name || "token-wand",
    colors: (appState.colors || []).map((g) => ({
      name: g.name,
      shorthand: g.shorthand,
      value: g.value,
      solverMode: g.solverMode || "natural",
      scaleAlgorithm: g.scaleAlgorithm || null, // null = fall back to global
      description: g.description || "",
    })),
    roles: _mapRoles(appState, variations),
    scaleLength: count,
    scaleAlgorithm: appState.scaleAlgorithm || "Natural",
    pluginMode: appState.pluginMode || "scale",
    scaleStepNames: stepNames,
    roleStepNames,
    variations: variations.map(function (v) {
      return Object.assign({}, v);
    }),
    themes: _deduplicateThemeNames(themes),
    resolveTokensDirectly: appState.resolveTokensDirectly || false,
    tokenGrouping: appState.tokenGrouping || "color",
    tokenNameSegments: appState.tokenNameSegments || ["color", "role", "variation"],
    useShorthandColors: appState.useShorthandColors || false,
    useShorthandRoles: appState.useShorthandRoles || false,
    useShorthandVariations: appState.useShorthandVariations || false,
    useShorthandSteps: appState.useShorthandSteps || false,
    scaleStepShorthands: stepShorthands,
    includeSourceColors: appState.includeSourceColors || false,
    sourceCollectionName: appState.sourceCollectionName || "_constants",
    scaleCollectionName: appState.scaleCollectionName || "_scale",
    tokenCollectionName: appState.tokenCollectionName || "color tokens",
    includeAlphaTints: appState.includeAlphaTints || false,
    alphaValues: (appState.alphaValues || "10, 25, 50, 75, 90")
      .split(",")
      .map((v) => Math.max(0, Math.min(100, parseInt(v.trim()))))
      .filter((v) => !isNaN(v)),
    includeDescriptions: appState.includeDescriptions !== false,
    includeColorScalesCollection: appState.includeColorScalesCollection !== false,
    useUniformAlgorithm: appState.useUniformAlgorithm !== false,
    algorithmScopeLevel: appState.algorithmScopeLevel || "color",
    solverMode: appState.solverMode || "natural",
  };
}

function _parseStepNames(appState, count) {
  const items = Array.isArray(appState.scaleStepNames) ? appState.scaleStepNames : [];
  // backward-compat: plain string items (old CSV migration may have left strings)
  const userNames = items.length > 0 ? items.map((s) => (typeof s === "string" ? s : s.name || "")) : null;
  if (!userNames || userNames.length === 0) return null;

  const names = userNames.slice();
  while (names.length < count) names.push(String(names.length + 1));
  return names.slice(0, count);
}

// Returns a map of {stepName → shorthand} for use in token naming.
// Only entries that actually have a distinct shorthand are included.
function _parseStepShorthands(appState, resolvedNames) {
  if (!resolvedNames) return {};
  const items = Array.isArray(appState.scaleStepNames) ? appState.scaleStepNames : [];
  const map = {};
  items.forEach((item, i) => {
    if (typeof item === "object" && item.shorthand && item.shorthand !== item.name) {
      const key = resolvedNames[i];
      if (key) map[key] = item.shorthand;
    }
  });
  return map;
}

function _deduplicateThemeNames(themes) {
  const seen = {};
  return (themes || [{ name: "Light", bg: "FFFFFF" }, { name: "Dark", bg: "000000" }]).map((t) => {
    const base = (t.name || "Theme").trim();
    if (!seen[base]) { seen[base] = 1; return { name: base, bg: t.bg || "FFFFFF" }; }
    seen[base]++;
    return { name: `${base} ${seen[base]}`, bg: t.bg || "FFFFFF" };
  });
}

function _parseVariations(appState) {
  return appState.variations && appState.variations.length > 0 ? appState.variations : [1, 2, 3, 4, 5].map((n) => ({ _id: String(n), name: String(n), shorthand: String(n), description: "" }));
}

function _mapRoles(appState, variations) {
  return (appState.roles || []).map((role) => ({
    name: role.name,
    shorthand: role.shorthand || role.name.substring(0, 2).toLowerCase(),
    minContrast: parseFloat(role.minContrast !== undefined ? role.minContrast : 4.5),
    mappingMethod: role.mappingMethod === "index" ? "index" : "contrast",
    variationTargets: role.variationTargets || variations.map((_, i) => _getVariationTargets()[i] || 4.5),
    scaleAlgorithm: role.scaleAlgorithm || null,
    solverMode: role.solverMode || null, // null = fall back to config.solverMode
    description: role.description || "",
    customVariationList: role.customVariationList || false,
    customVariations:
      role.customVariationList && role.customVariations && role.customVariations.length > 0
        ? role.customVariations.map(function (v) {
            return Object.assign({}, v);
          })
        : [],
  }));
}

// 3b. RENAME DETECTOR
// Builds a map of old Figma variable names → new Figma variable names so that
// variables can be renamed in-place rather than deleted and recreated.
//
// Identity is determined by the stable `_id` field on each color and role — not
// by array index.  This means:
//   • Deleting a color and adding a new one at the same slot → different _id → no rename
//   • Shuffling order → same _id at a different index → only renames if the label changed
//   • Items without _id (old snapshots) → skipped entirely → safe no-op fallback
function buildVariableRenameMap(savedAppState, newAppState) {
  if (!savedAppState || !newAppState) {
    return { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };
  }

  const oldCfg = translateConfig(savedAppState);
  const newCfg = translateConfig(newAppState);
  const oldStepNames = oldCfg.scaleStepNames || seriesMaker(oldCfg.scaleLength);
  const newStepNames = newCfg.scaleStepNames || seriesMaker(newCfg.scaleLength);

  const colorLabels = _mapIdToLabel(savedAppState.colors, newAppState.colors, oldCfg.useShorthandColors, newCfg.useShorthandColors);
  const roleLabels = _mapIdToLabel(savedAppState.roles, newAppState.roles, oldCfg.useShorthandRoles, newCfg.useShorthandRoles);

  const scaleRenames = _getScaleRenames(colorLabels.pairs, oldStepNames, newStepNames, Math.min(oldCfg.scaleLength, newCfg.scaleLength));
  const tokenRenames = _getTokenRenames(colorLabels.pairs, roleLabels.pairs, oldCfg, newCfg);

  return {
    scale: scaleRenames,
    tokens: tokenRenames,
    summary: {
      scaleCount: Object.keys(scaleRenames).length,
      tokenCount: Object.keys(tokenRenames).length,
      changes: _getSummaryChanges(colorLabels.pairs, roleLabels.pairs, oldCfg, newCfg, oldStepNames, newStepNames),
    },
  };
}

function _mapIdToLabel(oldItems, newItems, oldShort, newShort) {
  const getMap = (items, useShort) => {
    const m = {};
    (items || []).forEach((item) => {
      if (item._id) m[item._id] = { label: useShort && item.shorthand ? item.shorthand : item.name, item };
    });
    return m;
  };
  const oldMap = getMap(oldItems, oldShort);
  const newMap = getMap(newItems, newShort);
  const pairs = Object.entries(newMap)
    .filter(([id]) => oldMap[id] !== undefined)
    .map(([id, { label: ncl, item: newItem }]) => ({ oldLabel: oldMap[id].label, newLabel: ncl, oldItem: oldMap[id].item, newItem }));
  return { pairs };
}

function _getScaleRenames(colorPairs, oldSteps, newSteps, count) {
  const renames = {};
  for (const { oldLabel, newLabel } of colorPairs) {
    for (let i = 0; i < count; i++) {
      if (oldSteps[i] === undefined || newSteps[i] === undefined) continue;
      const oldN = `${oldLabel}/${oldSteps[i]}`;
      const newN = `${newLabel}/${newSteps[i]}`;
      if (oldN !== newN) renames[oldN] = newN;
    }
  }
  return renames;
}

function _getTokenRenames(colorPairs, rolePairs, oldCfg, newCfg) {
  const renames = {};
  const oldOrder = oldCfg.tokenNameSegments || (oldCfg.tokenGrouping === "role" ? ["role", "color", "variation"] : ["color", "role", "variation"]);
  const newOrder = newCfg.tokenNameSegments || (newCfg.tokenGrouping === "role" ? ["role", "color", "variation"] : ["color", "role", "variation"]);
  const buildName = (order, color, role, variation) =>
    order.map((s) => ({ color, role, variation })[s] || s).join("/");

  // Returns Map<_id, displayName> — falls back to String(index) for items without _id
  const getVarMap = (cfg, roleItem) => {
    const vars =
      roleItem && roleItem.customVariationList && roleItem.customVariations && roleItem.customVariations.length > 0
        ? roleItem.customVariations
        : cfg.variations || [];
    const map = new Map();
    vars.forEach((v, i) => {
      const id = (v && v._id) ? v._id : String(i);
      const name = (cfg.useShorthandVariations && v && v.shorthand) ? v.shorthand : ((v && v.name) || String(i));
      map.set(id, name);
    });
    return map;
  };

  for (const cp of colorPairs) {
    for (const rp of rolePairs) {
      const oldVarMap = getVarMap(oldCfg, rp.oldItem);
      const newVarMap = getVarMap(newCfg, rp.newItem);
      for (const [vid, oldVarName] of oldVarMap) {
        if (!newVarMap.has(vid)) continue;
        const newVarName = newVarMap.get(vid);
        const oldName = buildName(oldOrder, cp.oldLabel, rp.oldLabel, oldVarName);
        const newName = buildName(newOrder, cp.newLabel, rp.newLabel, newVarName);
        if (oldName !== newName) renames[oldName] = newName;
      }
    }
  }
  return renames;
}

function _getSummaryChanges(colorPairs, rolePairs, oldCfg, newCfg, oldSteps, newSteps) {
  const changes = [];
  colorPairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: "color", from: p.oldLabel, to: p.newLabel });
  });
  rolePairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: "role", from: p.oldLabel, to: p.newLabel });
  });

  const sample = (s) => s.slice(0, 3).join(",") + (s.length > 3 ? "…" : "");
  if (sample(oldSteps) !== sample(newSteps)) changes.push({ type: "stepNames", from: sample(oldSteps), to: sample(newSteps) });
  const oldOrder = (oldCfg.tokenNameSegments || []).join(",");
  const newOrder = (newCfg.tokenNameSegments || []).join(",");
  if (oldOrder !== newOrder) changes.push({ type: "grouping", from: oldOrder, to: newOrder });

  return changes;
}
