// CONFIG TRANSLATOR: Converts appState (UI format) into the format expected by variableMaker.
// Ported from vanilla_archive/src/shared/config.js

const _FALLBACK_VARIATION_TARGETS = [1.5, 3.0, 4.5, 7.0, 12.0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function translateConfig(appState: any): any {
  const count = Math.max(1, parseInt(appState.scaleLength) || 23);
  const stepNames = _parseStepNames(appState, count);
  const stepShorthands = _parseStepShorthands(appState, stepNames);
  const variations = _parseVariations(appState);
  const roleStepNames = variations.map((v: any) =>
    appState.useShorthandVariations && v.shorthand ? v.shorthand : v.name,
  );
  const themes = appState.themes || [{ bg: 'FFFFFF' }, { bg: '000000' }];

  return {
    name: appState.name || 'token-wand',
    colors: (appState.colors || []).map((g: any) => ({
      name: g.name,
      shorthand: g.shorthand,
      value: g.value,
      solverMode: g.solverMode || 'natural',
      scaleAlgorithm: g.scaleAlgorithm || null,
      description: g.description || '',
    })),
    roles: _mapRoles(appState, variations),
    scaleLength: count,
    scaleAlgorithm: appState.scaleAlgorithm || 'Natural',
    pluginMode: appState.pluginMode || 'scale',
    scaleStepNames: stepNames,
    roleStepNames,
    variations: variations.map((v: any) => Object.assign({}, v)),
    themes: _deduplicateThemeNames(themes),
    resolveTokensDirectly: appState.resolveTokensDirectly || false,
    tokenGrouping: appState.tokenGrouping || 'color',
    tokenNameSegments: appState.tokenNameSegments || ['color', 'role', 'variation'],
    useShorthandColors: appState.useShorthandColors || false,
    useShorthandRoles: appState.useShorthandRoles || false,
    useShorthandVariations: appState.useShorthandVariations || false,
    useShorthandSteps: appState.useShorthandSteps || false,
    scaleStepShorthands: stepShorthands,
    includeSourceColors: appState.includeSourceColors || false,
    sourceCollectionName: appState.sourceCollectionName || '_constants',
    scaleCollectionName: appState.scaleCollectionName || '_scale',
    tokenCollectionName: appState.tokenCollectionName || 'color tokens',
    includeAlphaTints: appState.includeAlphaTints || false,
    alphaValues: (appState.alphaValues || '10, 25, 50, 75, 90')
      .split(',')
      .map((v: string) => Math.max(0, Math.min(100, parseInt(v.trim()))))
      .filter((v: number) => !isNaN(v)),
    includeDescriptions: appState.includeDescriptions !== false,
    includeColorScalesCollection: appState.includeColorScalesCollection !== false,
    useUniformAlgorithm: appState.useUniformAlgorithm !== false,
    algorithmScopeLevel: appState.algorithmScopeLevel || 'color',
    solverMode: appState.solverMode || 'natural',
  };
}

function _parseStepNames(appState: any, count: number): string[] | null {
  const items = Array.isArray(appState.scaleStepNames) ? appState.scaleStepNames : [];
  const userNames =
    items.length > 0 ? items.map((s: any) => (typeof s === 'string' ? s : s.name || '')) : null;
  if (!userNames || userNames.length === 0) return null;

  const names = userNames.slice();
  while (names.length < count) names.push(String(names.length + 1));
  return names.slice(0, count);
}

function _parseStepShorthands(
  appState: any,
  resolvedNames: string[] | null,
): Record<string, string> {
  if (!resolvedNames) return {};
  const items = Array.isArray(appState.scaleStepNames) ? appState.scaleStepNames : [];
  const map: Record<string, string> = {};
  items.forEach((item: any, i: number) => {
    if (typeof item === 'object' && item.shorthand && item.shorthand !== item.name) {
      const key = resolvedNames[i];
      if (key) map[key] = item.shorthand;
    }
  });
  return map;
}

function _deduplicateThemeNames(themes: any[]): any[] {
  const seen: Record<string, number> = {};
  return (themes || [{ name: 'Light', bg: 'FFFFFF' }, { name: 'Dark', bg: '000000' }]).map(
    (t: any) => {
      const base = (t.name || 'Theme').trim();
      if (!seen[base]) {
        seen[base] = 1;
        return { name: base, bg: t.bg || 'FFFFFF' };
      }
      seen[base]++;
      return { name: `${base} ${seen[base]}`, bg: t.bg || 'FFFFFF' };
    },
  );
}

function _parseVariations(appState: any): any[] {
  return appState.variations && appState.variations.length > 0
    ? appState.variations
    : [1, 2, 3, 4, 5].map((n) => ({
        _id: String(n),
        name: String(n),
        shorthand: String(n),
        description: '',
      }));
}

function _mapRoles(appState: any, variations: any[]): any[] {
  return (appState.roles || []).map((role: any) => ({
    name: role.name,
    shorthand: role.shorthand || role.name.substring(0, 2).toLowerCase(),
    minContrast: parseFloat(role.minContrast !== undefined ? role.minContrast : 4.5),
    mappingMethod: role.mappingMethod === 'index' ? 'index' : 'contrast',
    variationTargets:
      role.variationTargets ||
      variations.map((_: any, i: number) => _FALLBACK_VARIATION_TARGETS[i] || 4.5),
    scaleAlgorithm: role.scaleAlgorithm || null,
    solverMode: role.solverMode || null,
    description: role.description || '',
    customVariationList: role.customVariationList || false,
    customVariations:
      role.customVariationList && role.customVariations && role.customVariations.length > 0
        ? role.customVariations.map((v: any) => Object.assign({}, v))
        : [],
  }));
}

// ── RENAME MAP ────────────────────────────────────────────────────────────────

export interface RenameMap {
  scale: Record<string, string>;
  tokens: Record<string, string>;
  summary: { scaleCount: number; tokenCount: number; changes: Array<Record<string, string>> };
}

export function buildVariableRenameMap(
  savedAppState: any,
  newAppState: any,
): RenameMap {
  if (!savedAppState || !newAppState) {
    return { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };
  }

  const oldCfg = translateConfig(savedAppState);
  const newCfg = translateConfig(newAppState);
  const oldStepNames = oldCfg.scaleStepNames || _seriesMaker(oldCfg.scaleLength);
  const newStepNames = newCfg.scaleStepNames || _seriesMaker(newCfg.scaleLength);

  const colorLabels = _mapIdToLabel(
    savedAppState.colors,
    newAppState.colors,
    oldCfg.useShorthandColors,
    newCfg.useShorthandColors,
  );
  const roleLabels = _mapIdToLabel(
    savedAppState.roles,
    newAppState.roles,
    oldCfg.useShorthandRoles,
    newCfg.useShorthandRoles,
  );

  const scaleRenames = _getScaleRenames(
    colorLabels.pairs,
    oldStepNames,
    newStepNames,
    Math.min(oldCfg.scaleLength, newCfg.scaleLength),
  );
  const tokenRenames = _getTokenRenames(colorLabels.pairs, roleLabels.pairs, oldCfg, newCfg);

  return {
    scale: scaleRenames,
    tokens: tokenRenames,
    summary: {
      scaleCount: Object.keys(scaleRenames).length,
      tokenCount: Object.keys(tokenRenames).length,
      changes: _getSummaryChanges(
        colorLabels.pairs,
        roleLabels.pairs,
        oldCfg,
        newCfg,
        oldStepNames,
        newStepNames,
      ),
    },
  };
}

function _seriesMaker(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String(i + 1));
}

function _mapIdToLabel(
  oldItems: any[],
  newItems: any[],
  oldShort: boolean,
  newShort: boolean,
): { pairs: any[] } {
  const getMap = (items: any[], useShort: boolean) => {
    const m: Record<string, { label: string; item: any }> = {};
    (items || []).forEach((item) => {
      if (item._id)
        m[item._id] = {
          label: useShort && item.shorthand ? item.shorthand : item.name,
          item,
        };
    });
    return m;
  };
  const oldMap = getMap(oldItems, oldShort);
  const newMap = getMap(newItems, newShort);
  const pairs = Object.entries(newMap)
    .filter(([id]) => oldMap[id] !== undefined)
    .map(([id, { label: ncl, item: newItem }]) => ({
      oldLabel: oldMap[id].label,
      newLabel: ncl,
      oldItem: oldMap[id].item,
      newItem,
    }));
  return { pairs };
}

function _getScaleRenames(
  colorPairs: any[],
  oldSteps: string[],
  newSteps: string[],
  count: number,
): Record<string, string> {
  const renames: Record<string, string> = {};
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

function _getTokenRenames(
  colorPairs: any[],
  rolePairs: any[],
  oldCfg: any,
  newCfg: any,
): Record<string, string> {
  const renames: Record<string, string> = {};
  const oldOrder: string[] =
    oldCfg.tokenNameSegments ||
    (oldCfg.tokenGrouping === 'role'
      ? ['role', 'color', 'variation']
      : ['color', 'role', 'variation']);
  const newOrder: string[] =
    newCfg.tokenNameSegments ||
    (newCfg.tokenGrouping === 'role'
      ? ['role', 'color', 'variation']
      : ['color', 'role', 'variation']);
  const buildName = (order: string[], color: string, role: string, variation: string) =>
    order.map((s) => ({ color, role, variation })[s as 'color' | 'role' | 'variation'] || s).join('/');

  const getVarMap = (cfg: any, roleItem: any): Map<string, string> => {
    const vars =
      roleItem && roleItem.customVariationList && roleItem.customVariations?.length > 0
        ? roleItem.customVariations
        : cfg.variations || [];
    const map = new Map<string, string>();
    vars.forEach((v: any, i: number) => {
      const id = v?._id ? v._id : String(i);
      const name =
        cfg.useShorthandVariations && v?.shorthand ? v.shorthand : v?.name || String(i);
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
        const newVarName = newVarMap.get(vid)!;
        const oldName = buildName(oldOrder, cp.oldLabel, rp.oldLabel, oldVarName);
        const newName = buildName(newOrder, cp.newLabel, rp.newLabel, newVarName);
        if (oldName !== newName) renames[oldName] = newName;
      }
    }
  }
  return renames;
}

function _getSummaryChanges(
  colorPairs: any[],
  rolePairs: any[],
  oldCfg: any,
  newCfg: any,
  oldSteps: string[],
  newSteps: string[],
): Array<Record<string, string>> {
  const changes: Array<Record<string, string>> = [];
  colorPairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: 'color', from: p.oldLabel, to: p.newLabel });
  });
  rolePairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: 'role', from: p.oldLabel, to: p.newLabel });
  });

  const sample = (s: string[]) => s.slice(0, 3).join(',') + (s.length > 3 ? '…' : '');
  if (sample(oldSteps) !== sample(newSteps))
    changes.push({ type: 'stepNames', from: sample(oldSteps), to: sample(newSteps) });
  const oldOrder = (oldCfg.tokenNameSegments || []).join(',');
  const newOrder = (newCfg.tokenNameSegments || []).join(',');
  if (oldOrder !== newOrder) changes.push({ type: 'grouping', from: oldOrder, to: newOrder });

  return changes;
}
