// No import needed as Variable and VariableCollection are global types in Figma environment.

export interface SyncPreview {
  toCreate: number;
  toUpdate: number;
  toRename: number;
  total: number;
}

// Counts how many variables would be created, updated, or renamed without writing anything.
export function computeSyncPreview(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any,
  localVars: Variable[],
  collections: VariableCollection[],
): SyncPreview {
  const tokenColName = config.tokenCollectionName || 'color tokens';
  const scaleColName = config.scaleCollectionName || '_scale';
  const sourceColName = config.sourceCollectionName || '_constants';

  const tokenCol = collections.find((c) => c.name === tokenColName) || null;
  const scaleCol = collections.find((c) => c.name === scaleColName) || null;
  const sourceCol = collections.find((c) => c.name === sourceColName) || null;

  let toCreate = 0;
  let toUpdate = 0;
  let toRename = 0;

  function checkVars(col: VariableCollection | null, prefix: 'token:' | 'scale:' | 'source:',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entries: Array<{ tokenRef: string; name: string; value: any; description?: string }>,
    modeId: string,
  ) {
    if (!col) {
      toCreate += entries.length;
      return;
    }
    const map = buildMetadataMap(col, localVars, prefix);
    for (const entry of entries) {
      const existing = map.get(entry.tokenRef);
      if (!existing) {
        toCreate++;
      } else {
        let changed = false;
        if (existing.name !== entry.name) { toRename++; changed = true; }
        const currentVal = existing.valuesByMode[modeId];
        if (currentVal === undefined || currentVal === null) { if (!changed) { toUpdate++; } changed = true; }
        if (!changed && entry.description && existing.description !== entry.description) { toUpdate++; changed = true; }
        // Rough colour diff check (skip alias values)
        if (!changed && entry.value && typeof entry.value === 'string' &&
            typeof currentVal === 'object' && currentVal !== null &&
            !('type' in currentVal && (currentVal as { type: string }).type === 'VARIABLE_ALIAS')) {
          const rgb = currentVal as { r?: number; g?: number; b?: number };
          const hex = entry.value.replace(/^#/, '').padEnd(6, '0').slice(0, 6);
          const n = parseInt(hex, 16);
          const r = ((n >> 16) & 0xff) / 255;
          const g = ((n >> 8) & 0xff) / 255;
          const b = (n & 0xff) / 255;
          if (Math.abs(r - (rgb.r ?? 0)) > 0.001 ||
              Math.abs(g - (rgb.g ?? 0)) > 0.001 ||
              Math.abs(b - (rgb.b ?? 0)) > 0.001) {
            toUpdate++;
            changed = true;
          }
        }
      }
    }
  }

  // Count token variables (first theme only for preview purposes)
  if (result?.tokens) {
    const firstTheme = Object.keys(result.tokens)[0];
    const modeId = tokenCol ? (tokenCol.modes[0]?.modeId ?? '') : '';
    if (firstTheme) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries: Array<{ tokenRef: string; name: string; value: any; description?: string }> = [];
      for (const [colorName, roles] of Object.entries(result.tokens[firstTheme] as Record<string, any>)) {
        const colorObj = config.colors?.find((c: any) => c.name === colorName);
        const colorId = colorObj?._id || colorName;
        for (const [roleId, variations] of Object.entries(roles as Record<string, any>)) {
          const roleObj = (config.roles && config.roles[roleId]) || {};
          const roleIdStr = roleObj._id || roleId;
          const variationDefs = roleObj.customVariationList && roleObj.customVariations?.length
            ? roleObj.customVariations : config.variations || [];
          for (let vi = 0; vi < variationDefs.length; vi++) {
            const token = (variations as any)[String(vi)];
            if (!token) continue;
            const varDef = variationDefs[vi];
            const varIdStr = varDef._id || String(vi);
            entries.push({
              tokenRef: `token:${colorId}/${roleIdStr}/${varIdStr}`,
              name: `${colorName}/${roleObj.name || roleId}/${varDef.name || vi}`,
              value: token.value,
              description: token.roleDescription,
            });
          }
        }
      }
      checkVars(tokenCol, 'token:', entries, modeId);
    }
  }

  // Count scale variables (first theme only)
  if (result?.scales) {
    const modeId = scaleCol ? (scaleCol.modes[0]?.modeId ?? '') : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: Array<{ tokenRef: string; name: string; value: any }> = [];
    for (const [colorName, scale] of Object.entries(result.scales as Record<string, any>)) {
      const colorObj = config.colors?.find((c: any) => c.name === colorName);
      const colorId = colorObj?._id || colorName;
      for (const [step, entry] of Object.entries(scale as Record<string, any>)) {
        entries.push({ tokenRef: `scale:${colorId}/${step}`, name: `${colorName}/${step}`, value: entry?.value });
      }
    }
    checkVars(scaleCol, 'scale:', entries, modeId);
  }

  // Count source constants
  if (config.includeSourceColors && config.colors) {
    const modeId = sourceCol ? (sourceCol.modes[0]?.modeId ?? '') : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: Array<{ tokenRef: string; name: string; value: any }> = [];
    for (const color of config.colors) {
      const colorId = color._id || color.name;
      entries.push({ tokenRef: `source:${colorId}`, name: `${color.name}/${color.name}`, value: color.value });
      if (config.alphaValues?.length) {
        for (const opacity of config.alphaValues) {
          entries.push({ tokenRef: `source:${colorId}/${opacity}`, name: `${color.name}/Opacities/${opacity}`, value: color.value });
        }
      }
    }
    checkVars(sourceCol, 'source:', entries, modeId);
  }

  return { toCreate, toUpdate, toRename, total: toCreate + toUpdate + toRename };
}

export interface NameConflict {
  tokenRef: string;
  figmaName: string;
  suggestedName: string;
  type: 'token' | 'scale' | 'source';
}

// Builds an O(1) lookup map of tokenRef to Variable and cleans duplicate metadata (Alt-drags)
export function buildMetadataMap(
  collection: VariableCollection,
  allVariables: Variable[],
  expectedPrefix?: 'token:' | 'scale:' | 'source:'
): Map<string, Variable> {
  const map = new Map<string, Variable>();
  const colVars = allVariables.filter((v) => v.variableCollectionId === collection.id);

  for (const variable of colVars) {
    const ref = variable.getPluginData('tokenRef');
    if (ref) {
      // Safeguard: Collection mismatch check
      if (expectedPrefix && !ref.startsWith(expectedPrefix)) {
        variable.setPluginData('tokenRef', '');
        continue;
      }

      if (map.has(ref)) {
        // Clear metadata on duplicate to decouple it from our tracking system
        variable.setPluginData('tokenRef', '');
      } else {
        map.set(ref, variable);
      }
    }
  }
  return map;
}

// Matches variable in Figma by tokenRef (primary) or by name (fallback for legacy)
export function findVariable(
  collection: VariableCollection,
  tokenRef: string,
  expectedName: string,
  metadataMap: Map<string, Variable>,
  allVariables: Variable[]
): Variable | null {
  // 1. Primary: Lookup via metadata
  let variable = metadataMap.get(tokenRef);
  if (variable) return variable;

  // 2. Fallback: Lookup by name in same collection for legacy migration
  const colVars = allVariables.filter((v) => v.variableCollectionId === collection.id);
  variable = colVars.find((v) => v.name === expectedName) || null;

  if (variable) {
    // Migrate legacy variable by setting tokenRef metadata
    variable.setPluginData('tokenRef', tokenRef);
    metadataMap.set(tokenRef, variable);
  }
  return variable;
}

export function analyzeNameConflicts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any,
  localVars: Variable[],
  tokenCol: VariableCollection | null,
  scaleCol: VariableCollection | null,
  sourceCol: VariableCollection | null
): NameConflict[] {
  const conflicts: NameConflict[] = [];

  const colorLabel = (name: string) => {
    if (!config.useShorthandColors) return name;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const col = config.colors.find((c: any) => c.name === name);
    return (col && col.shorthand) || name;
  };
  const roleLabel = (name: string, roleIdx: number) => {
    if (!config.useShorthandRoles) return name;
    const role = config.roles[roleIdx];
    return (role && role.shorthand) || name;
  };
  const stepLabel = (name: string) =>
    config.useShorthandSteps && config.scaleStepShorthands?.[name]
      ? config.scaleStepShorthands[name]
      : name;

  // 1. Check scale collection conflicts
  if (scaleCol && result?.scales) {
    const scaleMetadataMap = buildMetadataMap(scaleCol, localVars, 'scale:');
    for (const [colorName, scale] of Object.entries(result.scales as Record<string, unknown>)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colorObj = config.colors.find((c: any) => c.name === colorName);
      const colorId = colorObj?._id || colorName;
      const cLabel = colorLabel(colorName);

      for (const step of Object.keys(scale as Record<string, unknown>)) {
        const tokenRef = `scale:${colorId}/${step}`;
        const suggestedName = `${cLabel}/${stepLabel(step)}`;

        const variableInFigma = scaleMetadataMap.get(tokenRef);
        if (variableInFigma && variableInFigma.name !== suggestedName) {
          conflicts.push({
            tokenRef,
            figmaName: variableInFigma.name,
            suggestedName,
            type: 'scale',
          });
        }
      }
    }
  }

  // 2. Check token collection conflicts
  if (tokenCol && result?.tokens) {
    const tokenMetadataMap = buildMetadataMap(tokenCol, localVars, 'token:');
    const tokenNameOrder: string[] =
      config.tokenNameSegments ||
      (config.tokenGrouping === 'role'
        ? ['role', 'color', 'variation']
        : ['color', 'role', 'variation']);

    const firstTheme = Object.keys(result.tokens)[0];
    if (firstTheme) {
      const colors = result.tokens[firstTheme];
      for (const [colorName, roles] of Object.entries(colors as Record<string, unknown>)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const colorObj = config.colors.find((c: any) => c.name === colorName);
        const colorId = colorObj?._id || colorName;
        const cLabel = colorLabel(colorName);

        for (const [roleId, variations] of Object.entries(roles as Record<string, unknown>)) {
          const roleObj = config.roles[roleId] || {};
          const roleIdStr = roleObj._id || roleId;
          const rName = roleObj.name || roleId;
          const rLabel = roleLabel(rName, parseInt(roleId, 10));

          const variationDefs = roleObj.customVariationList && roleObj.customVariations?.length
            ? roleObj.customVariations
            : config.variations;

          for (let vi = 0; vi < variationDefs.length; vi++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const token = (variations as any)[String(vi)];
            if (!token) continue;

            const varDef = variationDefs[vi];
            const varIdStr = varDef._id || String(vi);
            const dispName =
              config.useShorthandVariations && varDef.shorthand
                ? varDef.shorthand
                : varDef.name || String(vi);

            const tokenRef = `token:${colorId}/${roleIdStr}/${varIdStr}`;
            const segParts: Record<string, string> = {
              color: cLabel,
              role: rLabel,
              variation: dispName,
            };
            const suggestedName = tokenNameOrder.map((s) => segParts[s] || s).join('/');

            const variableInFigma = tokenMetadataMap.get(tokenRef);
            if (variableInFigma && variableInFigma.name !== suggestedName) {
              conflicts.push({
                tokenRef,
                figmaName: variableInFigma.name,
                suggestedName,
                type: 'token',
              });
            }
          }
        }
      }
    }
  }

  // 3. Check source constants conflicts
  if (sourceCol && config.includeSourceColors && config.colors) {
    const sourceMetadataMap = buildMetadataMap(sourceCol, localVars, 'source:');
    for (const color of config.colors) {
      const colorId = color._id || color.name;
      const label =
        config.useShorthandColors && color.shorthand ? color.shorthand : color.name;

      // Base source constant
      const baseRef = `source:${colorId}`;
      const baseSuggested = `${label}/${label}`;
      const baseVar = sourceMetadataMap.get(baseRef);
      if (baseVar && baseVar.name !== baseSuggested) {
        conflicts.push({
          tokenRef: baseRef,
          figmaName: baseVar.name,
          suggestedName: baseSuggested,
          type: 'source',
        });
      }

      // Alpha tint source constants
      if (config.alphaValues?.length) {
        for (const opacityInt of config.alphaValues) {
          const alphaRef = `source:${colorId}/${opacityInt}`;
          const alphaSuggested = `${label}/Opacities/${opacityInt}`;
          const alphaVar = sourceMetadataMap.get(alphaRef);
          if (alphaVar && alphaVar.name !== alphaSuggested) {
            conflicts.push({
              tokenRef: alphaRef,
              figmaName: alphaVar.name,
              suggestedName: alphaSuggested,
              type: 'source',
            });
          }
        }
      }
    }
  }

  return conflicts;
}
