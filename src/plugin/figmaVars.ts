// FIGMA VARIABLE API — CRUD
// Ported from vanilla_archive/src/figma/figmaVars.js

import { translateConfig, buildVariableRenameMap } from './config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

function hexToFigmaRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#/, '').padEnd(6, '0').slice(0, 6);
  const n = parseInt(clean, 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

export function savePluginConfig(appState: AnyObj): void {
  try {
    figma.root.setPluginData('tw_state', JSON.stringify(appState));
  } catch (e) {
    console.warn('savePluginConfig failed:', e);
  }
}

export const VariableManager = {
  tally: { created: 0, updated: 0, renamed: 0, failed: 0 },
  cache: { variables: [] as Variable[], collections: [] as VariableCollection[] },
  scaleVarNameMap: {} as Record<string, string>,

  async applyRenames(
    collection: VariableCollection,
    renameMap: Record<string, string>,
  ): Promise<number> {
    if (!collection || !renameMap || Object.keys(renameMap).length === 0) return 0;
    let renamed = 0;
    const colVars = this.cache.variables.filter(
      (v) => v.variableCollectionId === collection.id,
    );
    const occupiedNames = new Set(colVars.map((v) => v.name));

    for (let pass = 0; pass < 2; pass++) {
      for (const variable of colVars) {
        const newName = renameMap[variable.name];
        if (!newName || newName === variable.name) continue;
        if (occupiedNames.has(newName)) continue;
        try {
          const oldName = variable.name;
          occupiedNames.delete(oldName);
          variable.name = newName;
          const confirmed = variable.name;
          occupiedNames.add(confirmed);
          if (confirmed === newName) renamed++;
        } catch (e) {
          console.warn('Rename failed for variable:', variable.name, e);
        }
      }
    }

    this.tally.renamed += renamed;
    return renamed;
  },

  async sync(
    result: AnyObj,
    config: AnyObj,
    scope: 'all' | 'groups' | 'roles' = 'all',
    appState: AnyObj | null = null,
    savedAppState: AnyObj | null = null,
  ): Promise<void> {
    this.tally = { created: 0, updated: 0, renamed: 0, failed: 0 };
    this.scaleVarNameMap = {};
    await this.refreshCache();

    const renameMap =
      savedAppState && appState
        ? buildVariableRenameMap(savedAppState, appState)
        : { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };

    const scaleCollectionName = (appState && appState.scaleCollectionName) || '_scale';
    const tokenColName = (appState && appState.tokenCollectionName) || 'color tokens';
    const skipScales =
      config.resolveTokensDirectly ||
      config.pluginMode === 'direct' ||
      config.includeColorScalesCollection === false;
    const tokenNameOrder: string[] =
      config.tokenNameSegments ||
      (config.tokenGrouping === 'role'
        ? ['role', 'color', 'variation']
        : ['color', 'role', 'variation']);
    const useShortColor: boolean = config.useShorthandColors || false;
    const useShortRole: boolean = config.useShorthandRoles || false;
    const useShortStep: boolean = config.useShorthandSteps || false;
    const stepShorthands: Record<string, string> = config.scaleStepShorthands || {};

    const colorLabel = (name: string) => {
      if (!useShortColor) return name;
      const col = config.colors.find((c: AnyObj) => c.name === name);
      return (col && col.shorthand) || name;
    };
    const roleLabel = (name: string, roleIdx: number) => {
      if (!useShortRole) return name;
      const role = config.roles[roleIdx];
      return (role && role.shorthand) || name;
    };
    const stepLabel = (name: string) =>
      useShortStep && stepShorthands[name] ? stepShorthands[name] : name;

    for (const [colorName, scale] of Object.entries(result.scales as Record<string, AnyObj>)) {
      for (const [step, entry] of Object.entries(scale as Record<string, AnyObj>)) {
        this.scaleVarNameMap[entry.stepName] = `${colorLabel(colorName)}/${stepLabel(step)}`;
      }
    }

    const needsScaleCol =
      !skipScales && (scope === 'all' || scope === 'groups' || scope === 'roles');
    const scaleCol = needsScaleCol
      ? await this.getOrCreateCollection(scaleCollectionName)
      : null;

    if (scaleCol && renameMap.scale && Object.keys(renameMap.scale).length > 0) {
      await this.applyRenames(scaleCol, renameMap.scale);
    }

    // STAGE 1: Color Scale → scale collection
    if (scaleCol && (scope === 'all' || scope === 'groups')) {
      const modeId = scaleCol.modes[0].modeId;
      const include = config.includeDescriptions !== false;
      const allScaleVars: [string, string, string, string][] = [];

      for (const [colorName, scale] of Object.entries(result.scales as Record<string, AnyObj>)) {
        const cLabel = colorLabel(colorName);
        for (const [step, entry] of Object.entries(scale as Record<string, AnyObj>)) {
          const contrastNote = include
            ? `L:${entry.contrast.light?.ratio ?? '?'}(${entry.contrast.light?.rating ?? '?'}) D:${entry.contrast.dark?.ratio ?? '?'}(${entry.contrast.dark?.rating ?? '?'})`
            : '';
          const groupDesc = include ? entry.description : '';
          const fullDesc =
            groupDesc && contrastNote
              ? `${groupDesc} | ${contrastNote}`
              : groupDesc || contrastNote;
          allScaleVars.push([`${cLabel}/${stepLabel(step)}`, 'COLOR', entry.value, fullDesc]);
        }
      }
      await this.upsertVariables(scaleCol, modeId, allScaleVars);
    }

    // STAGE 2: Semantic Role Tokens → token collection
    if (scope === 'all' || scope === 'roles') {
      const tokenCol = await this.getOrCreateCollection(tokenColName);

      if (renameMap.tokens && Object.keys(renameMap.tokens).length > 0) {
        await this.applyRenames(tokenCol, renameMap.tokens);
      }

      const skippedModes: string[] = [];
      for (const theme of Object.keys((result.tokens as AnyObj) || {})) {
        const modeId = this.ensureMode(tokenCol, theme);
        if (modeId === null) {
          skippedModes.push(theme);
          continue;
        }
        for (const [colorName, roles] of Object.entries(
          (result.tokens as AnyObj)[theme] as Record<string, AnyObj>,
        )) {
          for (const [roleId, variations] of Object.entries(roles as Record<string, AnyObj>)) {
            const roleObj = (config.roles && config.roles[roleId]) || {};
            const rName = roleObj.name || roleId;
            const cLabel = colorLabel(colorName);
            const rLabel = roleLabel(rName, parseInt(roleId, 10));
            const variationDefs =
              roleObj.customVariationList &&
              roleObj.customVariations &&
              roleObj.customVariations.length > 0
                ? roleObj.customVariations
                : config.variations;
            const vars = (variationDefs as AnyObj[])
              .map((varDef: AnyObj, i: number) => {
                const token = (variations as AnyObj)[String(i)];
                if (!token) return null;
                const dispName = varDef.shorthand || varDef.name;
                const segParts: Record<string, string> = {
                  color: cLabel,
                  role: rLabel,
                  variation: dispName,
                };
                const figmaName = tokenNameOrder.map((s) => segParts[s] || s).join('/');

                let value: string | { type: string; id: string };
                if (skipScales) {
                  value = token.value;
                } else {
                  const scaleFigmaName = this.scaleVarNameMap[token.tokenRef];
                  const targetVar =
                    scaleFigmaName && scaleCol
                      ? this.cache.variables.find(
                          (cv) =>
                            cv.name === scaleFigmaName &&
                            cv.variableCollectionId === scaleCol.id,
                        )
                      : null;
                  value = targetVar ? { type: 'VARIABLE_ALIAS', id: targetVar.id } : token.value;
                }
                const include = config.includeDescriptions !== false;
                const note = include && token.isAdjusted ? ' | ⚠ Adjusted' : '';
                const themeNote = include ? theme.toUpperCase() : '';
                const roleDesc = include ? token.roleDescription : '';
                let fullDesc = '';
                if (roleDesc && themeNote) fullDesc = `${roleDesc} | ${themeNote}${note}`;
                else if (roleDesc) fullDesc = roleDesc;
                else if (themeNote) fullDesc = `${themeNote}${note}`;

                return [figmaName, 'COLOR', value, fullDesc] as [string, string, AnyObj, string];
              })
              .filter(Boolean) as [string, string, AnyObj, string][];
            await this.upsertVariables(tokenCol, modeId, vars);
          }
        }
      }
      if (skippedModes.length > 0) {
        figma.ui.postMessage({
          type: 'warning',
          message: `The "${tokenColName}" token collection is missing the ${skippedModes.join(' and ')} mode(s). Multiple modes per collection require a paid Figma plan.`,
        });
      }
    }

    // STAGE 3: Source Colors collection
    if (config.includeSourceColors) {
      await this.syncGlobalColors(config);
    }

    if (appState) savePluginConfig(appState);

    figma.ui.postMessage({
      type: 'finish',
      tally: this.tally,
      errors: result ? result.errors : null,
      result,
    });
  },

  async refreshCache(): Promise<void> {
    this.cache.variables = await figma.variables.getLocalVariablesAsync();
    this.cache.collections = await figma.variables.getLocalVariableCollectionsAsync();
  },

  async getOrCreateCollection(name: string): Promise<VariableCollection> {
    const existing = this.cache.collections.find((c) => c.name === name);
    if (existing) return existing;
    const newCol = figma.variables.createVariableCollection(name);
    this.cache.collections.push(newCol);
    return newCol;
  },

  ensureMode(collection: VariableCollection, modeName: string): string | null {
    const existing = collection.modes.find(
      (m) => m.name.toLowerCase() === modeName.toLowerCase(),
    );
    if (existing) return existing.modeId;
    if (
      collection.modes.length === 1 &&
      collection.modes[0].name.toLowerCase().startsWith('mode')
    ) {
      collection.renameMode(collection.modes[0].modeId, modeName);
      return collection.modes[0].modeId;
    }
    try {
      return collection.addMode(modeName);
    } catch (_e) {
      return null;
    }
  },

  async syncGlobalColors(config: AnyObj): Promise<void> {
    const colName = config.sourceCollectionName || '_constants';
    const col = await this.getOrCreateCollection(colName);
    const modeId = col.modes[0].modeId;

    const vars: [string, string, string, string][] = [];
    for (const color of config.colors as AnyObj[]) {
      const hex = '#' + color.value.replace(/^#/, '').toUpperCase().padEnd(6, '0');
      const label =
        config.useShorthandColors && color.shorthand ? color.shorthand : color.name;
      const include = config.includeDescriptions !== false;
      const groupDesc = include
        ? color.description || 'Brand constant — raw hex, no theme processing'
        : '';
      vars.push([`${label}/${label}`, 'COLOR', hex, groupDesc]);

      if (config.includeAlphaTints && config.alphaValues.length > 0) {
        const rgb = hexToFigmaRgb(hex);
        for (const opacityInt of config.alphaValues as number[]) {
          const alpha = opacityInt / 100;
          const varName = `${label}/Opacities/${opacityInt}`;
          try {
            let variable = this.cache.variables.find(
              (v) => v.name === varName && v.variableCollectionId === col.id,
            );
            if (!variable) {
              variable = figma.variables.createVariable(varName, col, 'COLOR');
              this.cache.variables.push(variable);
              this.tally.created++;
            } else {
              this.tally.updated++;
            }
            variable.description = `${opacityInt}% opacity variant`;
            variable.setValueForMode(modeId, { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha });
          } catch (_err) {
            this.tally.failed++;
          }
        }
      }
    }
    await this.upsertVariables(col, modeId, vars);
  },

  async upsertVariables(
    collection: VariableCollection,
    modeId: string,
    vars: [string, string, AnyObj, string][],
  ): Promise<void> {
    for (const [varName, varType, varValue, varDescription] of vars) {
      try {
        let variable = this.cache.variables.find(
          (v) => v.name === varName && v.variableCollectionId === collection.id,
        );
        if (!variable) {
          variable = figma.variables.createVariable(varName, collection, varType as VariableResolvedDataType);
          this.cache.variables.push(variable);
          this.tally.created++;
        } else {
          this.tally.updated++;
        }
        if (varDescription) variable.description = varDescription;
        if (varValue !== undefined && varValue !== null) {
          if (varType === 'COLOR' && typeof varValue === 'string') {
            variable.setValueForMode(modeId, hexToFigmaRgb(varValue));
          } else {
            variable.setValueForMode(modeId, varValue);
          }
        }
      } catch (_err) {
        console.error('Failed to upsert variable:', varName, _err);
        this.tally.failed++;
      }
    }
  },
};
