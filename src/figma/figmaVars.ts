// FIGMA VARIABLE API — CRUD
// Ported from vanilla_archive/src/figma/figmaVars.js

import { buildVariableRenameMap, detectStructuralChanges, type StructuralChange } from "./config";
import { buildMetadataMap, findVariable } from "./variableTracker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

function hexToFigmaRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#/, "").padEnd(6, "0").slice(0, 6);
  const n = parseInt(clean, 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

// Saves the last-successfully-synced state — used as the rename baseline on next open.
// Only called after a successful sync, NOT from the auto-save subscriber.
export function savePluginConfig(projectStore: AnyObj): void {
  const serialized = JSON.stringify(projectStore);
  try {
    figma.root.setPluginData("tw_state", serialized);
  } catch (e) {
    console.warn("savePluginConfig setPluginData failed:", e);
  }
}

// Saves the current UI state for restore-on-reopen. Separate key so it never
// overwrites the sync baseline that rename detection depends on.
export function saveUiState(projectStore: AnyObj): void {
  const serialized = JSON.stringify(projectStore);
  try {
    figma.root.setPluginData("tw_ui_state", serialized);
  } catch (e) {
    console.warn("saveUiState setPluginData failed:", e);
  }
}

function isDifferentValue(a: AnyObj, b: AnyObj, type: string): boolean {
  if (a === undefined || a === null) return true;
  if (b === undefined || b === null) return true;

  const aIsAlias = typeof a === "object" && a.type === "VARIABLE_ALIAS";
  const bIsAlias = typeof b === "object" && b.type === "VARIABLE_ALIAS";

  if (aIsAlias || bIsAlias) {
    if (aIsAlias && bIsAlias) {
      return a.id !== b.id;
    }
    return true;
  }

  if (type === "COLOR") {
    const rDiff = Math.abs((a.r ?? 0) - (b.r ?? 0));
    const gDiff = Math.abs((a.g ?? 0) - (b.g ?? 0));
    const bDiff = Math.abs((a.b ?? 0) - (b.b ?? 0));
    const aDiff = Math.abs((a.a ?? 1) - (b.a ?? 1));
    return rDiff > 0.001 || gDiff > 0.001 || bDiff > 0.001 || aDiff > 0.001;
  }
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) !== JSON.stringify(b);
  }
  return a !== b;
}

export const VariableManager = {
  tally: { created: 0, updated: 0, renamed: 0, removed: 0, failed: 0 },
  mutations: new Map<string, "created" | "renamed" | "updated">(),
  cache: { variables: [] as Variable[], collections: [] as VariableCollection[] },
  scaleVarNameMap: {} as Record<string, string>,

  async applyRenames(collection: VariableCollection, renameMap: Record<string, string>): Promise<number> {
    if (!collection || !renameMap || Object.keys(renameMap).length === 0) return 0;
    let renamed = 0;
    const colVars = this.cache.variables.filter((v) => v.variableCollectionId === collection.id);
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
          if (confirmed === newName) {
            renamed++;
            const ref = variable.getPluginData("tokenRef");
            if (ref) {
              this.mutations.set(ref, "renamed");
            }
          }
        } catch (e) {
          console.warn("Rename failed for variable:", variable.name, e);
        }
      }
    }

    return renamed;
  },

  async sync(result: AnyObj, config: AnyObj, scope: "all" | "groups" | "roles" = "all", projectStore: AnyObj | null = null, savedProjectStore: AnyObj | null = null, decisions: Record<string, "keep" | "revert"> = {}): Promise<void> {
    this.tally = { created: 0, updated: 0, renamed: 0, removed: 0, failed: 0 };
    this.mutations = new Map<string, "created" | "renamed" | "updated">();
    this.scaleVarNameMap = {};
    await this.refreshCache();

    const renameMap = savedProjectStore && projectStore ? buildVariableRenameMap(savedProjectStore, projectStore) : { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };

    const scaleCollectionName = (projectStore && projectStore.scaleCollectionName) || "_scale";
    const tokenColName = (projectStore && projectStore.tokenCollectionName) || "color tokens";

    const scaleColExists = this.cache.collections.some((c: VariableCollection) => c.name === scaleCollectionName);
    const skipScales = config.pluginMode === "direct" || config.includeColorScalesCollection === false || (!scaleColExists && scope !== "all" && scope !== "groups");
    const tokenNameOrder: string[] = config.tokenNameSegments || ["color", "role", "variation"];
    const useShortColor: boolean = config.useShorthandColors || false;
    const useShortRole: boolean = config.useShorthandRoles || false;
    const useShortVar: boolean = config.useShorthandVariations || false;
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
    const stepLabel = (name: string) => (useShortStep && stepShorthands[name] ? stepShorthands[name] : name);

    const needsScaleCol = !skipScales && (scope === "all" || scope === "groups" || scope === "roles");
    const scaleCol = needsScaleCol ? await this.getOrCreateCollection(scaleCollectionName) : null;

    if (scaleCol && renameMap.scale && Object.keys(renameMap.scale).length > 0) {
      await this.applyRenames(scaleCol, renameMap.scale);
    }

    // STAGE 1: Color Scale → scale collection
    if (scaleCol && (scope === "all" || scope === "groups")) {
      const modeId = scaleCol.modes[0].modeId;
      const include = config.includeDescriptions !== false;
      const scaleMetadataMap = buildMetadataMap(scaleCol, this.cache.variables, "scale:");
      const allScaleVars: [string, string, AnyObj, string, string][] = [];

      for (const [colorName, scale] of Object.entries(result.scales as Record<string, AnyObj>)) {
        const colorObj = config.colors.find((c: AnyObj) => c.name === colorName);
        const colorId = colorObj?._id || colorName;
        const cLabel = colorLabel(colorName);

        for (const [step, entry] of Object.entries(scale as Record<string, AnyObj>)) {
          const contrastNote = include ? `L:${entry.contrast.light?.ratio ?? "?"}(${entry.contrast.light?.rating ?? "?"}) D:${entry.contrast.dark?.ratio ?? "?"}(${entry.contrast.dark?.rating ?? "?"})` : "";
          const groupDesc = include ? entry.description : "";
          const fullDesc = groupDesc && contrastNote ? `${groupDesc} | ${contrastNote}` : groupDesc || contrastNote;

          const tokenRef = `scale:${colorId}/${step}`;
          const suggestedName = `${cLabel}/${stepLabel(step)}`;

          allScaleVars.push([suggestedName, "COLOR", entry.value, fullDesc, tokenRef]);

          // Pre-populate actual names for reference mapping
          const decision = decisions[tokenRef] || "keep";
          const variable = findVariable(scaleCol, tokenRef, suggestedName, scaleMetadataMap, this.cache.variables);
          const actualName = variable && decision === "keep" ? variable.name : suggestedName;
          this.scaleVarNameMap[entry.stepName] = actualName;
        }
      }
      await this.upsertVariables(scaleCol, modeId, allScaleVars, scaleMetadataMap, decisions);
    } else {
      // If scale collection is not active, build mapping directly
      for (const [colorName, scale] of Object.entries(result.scales as Record<string, AnyObj>)) {
        const cLabel = colorLabel(colorName);
        for (const [step, entry] of Object.entries(scale as Record<string, AnyObj>)) {
          this.scaleVarNameMap[entry.stepName] = `${cLabel}/${stepLabel(step)}`;
        }
      }
    }

    // STAGE 2: Semantic Role Tokens → token collection
    if (scope === "all" || scope === "roles") {
      const tokenCol = await this.getOrCreateCollection(tokenColName);

      if (renameMap.tokens && Object.keys(renameMap.tokens).length > 0) {
        await this.applyRenames(tokenCol, renameMap.tokens);
      }

      const tokenMetadataMap = buildMetadataMap(tokenCol, this.cache.variables, "token:");
      const skippedModes: string[] = [];

      for (const theme of Object.keys((result.tokens as AnyObj) || {})) {
        const modeId = this.ensureMode(tokenCol, theme);
        if (modeId === null) {
          skippedModes.push(theme);
          continue;
        }
        for (const [colorName, roles] of Object.entries((result.tokens as AnyObj)[theme] as Record<string, AnyObj>)) {
          const colorObj = config.colors.find((c: AnyObj) => c.name === colorName);
          const colorId = colorObj?._id || colorName;
          const cLabel = colorLabel(colorName);

          for (const [roleId, variations] of Object.entries(roles as Record<string, AnyObj>)) {
            const roleObj = (config.roles && config.roles[roleId]) || {};
            const roleIdStr = roleObj._id || roleId;
            const rName = roleObj.name || roleId;
            const rLabel = roleLabel(rName, parseInt(roleId, 10));
            const variationDefs = roleObj.variations ?? config.variations ?? [];

            const vars = (variationDefs as AnyObj[])
              .map((varDef: AnyObj, vi: number) => {
                const token = (variations as AnyObj)[String(vi)];
                if (!token) return null;

                const varIdStr = varDef._id || String(vi);
                const dispName = useShortVar && varDef.shorthand ? varDef.shorthand : varDef.name || String(vi);
                const segParts: Record<string, string> = {
                  color: cLabel,
                  role: rLabel,
                  variation: dispName,
                };
                const figmaName = tokenNameOrder.map((s) => segParts[s] || s).join("/");

                let value: string | { type: string; id: string };
                if (skipScales) {
                  value = token.value;
                } else {
                  const scaleFigmaName = this.scaleVarNameMap[token.tokenRef];
                  const targetVar = scaleFigmaName && scaleCol ? this.cache.variables.find((cv) => cv.name === scaleFigmaName && cv.variableCollectionId === scaleCol.id) : null;
                  value = targetVar ? { type: "VARIABLE_ALIAS", id: targetVar.id } : token.value;
                }
                const include = config.includeDescriptions !== false;
                const note = include && token.isAdjusted ? " | ⚠ Adjusted" : "";
                const themeNote = include ? theme.toUpperCase() : "";
                const roleDesc = include ? token.roleDescription : "";
                let fullDesc = "";
                if (roleDesc && themeNote) fullDesc = `${roleDesc} | ${themeNote}${note}`;
                else if (roleDesc) fullDesc = roleDesc;
                else if (themeNote) fullDesc = `${themeNote}${note}`;

                const tokenRef = `token:${colorId}/${roleIdStr}/${varIdStr}`;

                return [figmaName, "COLOR", value, fullDesc, tokenRef, roleObj.scopes] as [string, string, AnyObj, string, string, VariableScope[]?];
              })
              .filter(Boolean) as [string, string, AnyObj, string, string, VariableScope[]?][];

            await this.upsertVariables(tokenCol, modeId, vars, tokenMetadataMap, decisions);
          }
        }
      }
      if (skippedModes.length > 0) {
        figma.ui.postMessage({
          type: "warning",
          message: `The "${tokenColName}" token collection is missing the ${skippedModes.join(" and ")} mode(s). Multiple modes per collection require a paid Figma plan.`,
        });
      }
    }

    // STAGE 3: Source Colors collection
    if (config.includeSourceColors) {
      await this.syncGlobalColors(config, decisions);
    }

    if (projectStore) savePluginConfig(projectStore);

    for (const type of this.mutations.values()) {
      if (type === "created") this.tally.created++;
      else if (type === "renamed") this.tally.renamed++;
      else if (type === "updated") this.tally.updated++;
    }

    // STAGE 4: Purge orphans from structural setting changes
    if (projectStore && savedProjectStore) {
      const structuralChanges = detectStructuralChanges(savedProjectStore, projectStore);
      if (structuralChanges.length > 0) {
        this.tally.removed += await this.purgeOrphanedVars(projectStore, savedProjectStore, structuralChanges);
      }
    }

    figma.ui.postMessage({
      type: "finish",
      tally: this.tally,
      errors: result ? result.errors : null,
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
    const existing = collection.modes.find((m) => m.name.toLowerCase() === modeName.toLowerCase());
    if (existing) return existing.modeId;
    if (collection.modes.length === 1 && collection.modes[0].name.toLowerCase().startsWith("mode")) {
      collection.renameMode(collection.modes[0].modeId, modeName);
      return collection.modes[0].modeId;
    }
    try {
      return collection.addMode(modeName);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      return null;
    }
  },

  async syncGlobalColors(config: AnyObj, decisions: Record<string, "keep" | "revert"> = {}): Promise<void> {
    const colName = config.sourceCollectionName || "_constants";
    const col = await this.getOrCreateCollection(colName);
    const modeId = col.modes[0].modeId;
    const sourceMetadataMap = buildMetadataMap(col, this.cache.variables, "source:");

    const vars: [string, string, AnyObj, string, string][] = [];
    for (const color of config.colors as AnyObj[]) {
      const colorId = color._id || color.name;
      const hex = "#" + color.value.replace(/^#/, "").toUpperCase().padEnd(6, "0");
      const label = config.useShorthandColors && color.shorthand ? color.shorthand : color.name;
      const include = config.includeDescriptions !== false;
      const groupDesc = include ? color.description || "Brand constant — raw hex, no theme processing" : "";

      const baseRef = `source:${colorId}`;
      vars.push([`${label}/${label}`, "COLOR", hex, groupDesc, baseRef]);

      if (config.alphaValues.length > 0) {
        const rgb = hexToFigmaRgb(hex);
        for (const opacityInt of config.alphaValues as number[]) {
          const alpha = opacityInt / 100;
          const varName = `${label}/Opacities/${opacityInt}`;
          const alphaRef = `source:${colorId}/${opacityInt}`;
          vars.push([varName, "COLOR", { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha }, `${opacityInt}% opacity variant`, alphaRef]);
        }
      }
    }
    await this.upsertVariables(col, modeId, vars, sourceMetadataMap, decisions);
  },

  // Removes variables and collections that became orphaned due to structural setting changes.
  // Returns the count of removed variables.
  async purgeOrphanedVars(newProjectStore: AnyObj, savedProjectStore: AnyObj, changes: StructuralChange[]): Promise<number> {
    let removed = 0;

    const removeCollection = async (name: string) => {
      const col = this.cache.collections.find((c: VariableCollection) => c.name === name);
      if (!col) return;
      const colVars = this.cache.variables.filter((v: Variable) => v.variableCollectionId === col.id);
      for (const v of colVars) {
        try {
          v.remove();
          removed++;
        } catch (e) {
          console.warn("purge: failed to remove variable", v.name, e);
        }
      }
      try {
        col.remove();
      } catch (e) {
        console.warn("purge: failed to remove collection", name, e);
      }
      this.cache.collections = this.cache.collections.filter((c: VariableCollection) => c.id !== col.id);
      this.cache.variables = this.cache.variables.filter((v: Variable) => v.variableCollectionId !== col.id);
    };

    for (const change of changes) {
      switch (change.kind) {
        // Scale collection no longer needed — remove it entirely
        case "mode-scale-to-direct":
        case "scale-collection-removed": {
          const colName = savedProjectStore.scaleCollectionName || "_scale";
          await removeCollection(colName);
          break;
        }

        // Source collection no longer needed
        case "source-removed": {
          const colName = savedProjectStore.sourceCollectionName || "_constants";
          await removeCollection(colName);
          break;
        }

        // Collection renamed — remove old collection (new one will be created on sync)
        case "scale-collection-renamed":
        case "token-collection-renamed":
        case "source-collection-renamed": {
          if (change.orphanedCollection) {
            await removeCollection(change.orphanedCollection);
          }
          break;
        }

        // Scale shrunk — remove orphaned step variables (steps beyond newLen)
        case "scale-shrunk": {
          const oldLen = parseInt(savedProjectStore.scaleLength) || 23;
          const newLen = parseInt(newProjectStore.scaleLength) || 23;
          const scaleColName = newProjectStore.scaleCollectionName || "_scale";
          const scaleCol = this.cache.collections.find((c: VariableCollection) => c.name === scaleColName);
          if (scaleCol) {
            // Build the step names for the OLD scale
            const oldSteps = new Set(Array.from({ length: oldLen }, (_, i) => String(i + 1)));
            const newSteps = new Set(Array.from({ length: newLen }, (_, i) => String(i + 1)));
            const orphanedSteps = [...oldSteps].filter((s) => !newSteps.has(s));
            const scaleVars = this.cache.variables.filter((v: Variable) => v.variableCollectionId === scaleCol.id);
            for (const v of scaleVars) {
              const ref = v.getPluginData("tokenRef");
              if (!ref) continue;
              // ref format: scale:{colorId}/{step}
              const step = ref.split("/").pop();
              if (step && orphanedSteps.includes(step)) {
                try {
                  v.remove();
                  removed++;
                } catch (e) {
                  console.warn("purge: failed to remove scale step", v.name, e);
                }
              }
            }
          }
          break;
        }

        // Alpha tints removed — remove all alpha variables from source collection
        case "alpha-removed": {
          const sourceColName = newProjectStore.sourceCollectionName || "_constants";
          const sourceCol = this.cache.collections.find((c: VariableCollection) => c.name === sourceColName);
          if (sourceCol) {
            const sourceVars = this.cache.variables.filter((v: Variable) => v.variableCollectionId === sourceCol.id);
            for (const v of sourceVars) {
              const ref = v.getPluginData("tokenRef");
              // Alpha vars have refs like source:{colorId}/{opacity}
              if (ref && ref.startsWith("source:") && ref.split("/").length === 3) {
                try {
                  v.remove();
                  removed++;
                } catch (e) {
                  console.warn("purge: failed to remove alpha var", v.name, e);
                }
              }
            }
          }
          break;
        }

        // Alpha values changed — remove steps that no longer exist
        case "alpha-changed": {
          const sourceColName = newProjectStore.sourceCollectionName || "_constants";
          const sourceCol = this.cache.collections.find((c: VariableCollection) => c.name === sourceColName);
          if (sourceCol) {
            const newAlphas = new Set((newProjectStore.alphaValues ?? []).map(String));
            const sourceVars = this.cache.variables.filter((v: Variable) => v.variableCollectionId === sourceCol.id);
            for (const v of sourceVars) {
              const ref = v.getPluginData("tokenRef");
              if (!ref || !ref.startsWith("source:")) continue;
              const parts = ref.split("/");
              if (parts.length !== 3) continue; // not an alpha var
              const opacity = parts[2];
              if (!newAlphas.has(opacity)) {
                try {
                  v.remove();
                  removed++;
                } catch (e) {
                  console.warn("purge: failed to remove alpha var", v.name, e);
                }
              }
            }
          }
          break;
        }

        // mode-direct-to-scale and resolve-tokens-changed: no orphans to remove,
        // existing variables get updated in-place during normal sync
        default:
          break;
      }
    }

    // Refresh cache after removals
    if (removed > 0) await this.refreshCache();

    return removed;
  },

  async upsertVariables(collection: VariableCollection, modeId: string, vars: [string, string, AnyObj, string, string, VariableScope[]?][], metadataMap: Map<string, Variable>, decisions: Record<string, "keep" | "revert"> = {}): Promise<void> {
    for (const [varName, varType, varValue, varDescription, tokenRef, targetScopes] of vars) {
      try {
        let variable = findVariable(collection, tokenRef, varName, metadataMap, this.cache.variables);

        if (variable && variable.resolvedType !== varType) {
          try {
            variable.remove();
            this.cache.variables = this.cache.variables.filter((v) => v.id !== variable!.id);
            metadataMap.delete(tokenRef);
          } catch (e) {
            console.warn("Failed to remove mismatched type variable:", e);
          }
          variable = null;
        }

        const decision = decisions[tokenRef] || "keep";
        const targetName = variable && decision === "keep" ? variable.name : varName;

        let isUpdated = false;

        if (!variable) {
          variable = figma.variables.createVariable(targetName, collection, varType as VariableResolvedDataType);
          variable.setPluginData("tokenRef", tokenRef);
          // Always explicitly set scopes — default to ALL_SCOPES so every property panel shows the variable
          variable.scopes = targetScopes && targetScopes.length > 0 ? targetScopes : ["ALL_SCOPES"];
          this.cache.variables.push(variable);
          metadataMap.set(tokenRef, variable);
          this.mutations.set(tokenRef, "created");
        } else {
          if (variable.name !== targetName) {
            const occupied = this.cache.variables.some((v) => v.name === targetName && v.variableCollectionId === collection.id);
            if (!occupied) {
              variable.name = targetName;
              const curr = this.mutations.get(tokenRef);
              if (curr !== "created") {
                this.mutations.set(tokenRef, "renamed");
              }
            }
          }
          if (variable.getPluginData("tokenRef") !== tokenRef) {
            variable.setPluginData("tokenRef", tokenRef);
          }
        }

        {
          const desiredScopes: VariableScope[] = targetScopes && targetScopes.length > 0 ? targetScopes : ["ALL_SCOPES"];
          const currScopes = variable.scopes || [];
          const same = currScopes.length === desiredScopes.length && desiredScopes.every((s) => currScopes.includes(s));
          if (!same) {
            variable.scopes = desiredScopes;
            isUpdated = true;
          }
        }

        if (varDescription && variable.description !== varDescription) {
          variable.description = varDescription;
          isUpdated = true;
        }

        if (varValue !== undefined && varValue !== null) {
          let targetVal = varValue;
          if (varType === "COLOR" && typeof varValue === "string") {
            targetVal = hexToFigmaRgb(varValue);
          }

          const currentVal = variable.valuesByMode[modeId];
          if (isDifferentValue(currentVal, targetVal, varType)) {
            variable.setValueForMode(modeId, targetVal);
            isUpdated = true;
          }
        }

        if (isUpdated) {
          const curr = this.mutations.get(tokenRef);
          if (!curr) {
            this.mutations.set(tokenRef, "updated");
          }
        }
      } catch (_err) {
        console.error("Failed to upsert variable:", varName, _err);
        this.tally.failed++;
      }
    }
  },
};
