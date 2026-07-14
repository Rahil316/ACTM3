import type { EngineResult, TokenEntry } from "../shared/engine/clrEngine";
import type { PluginConfig } from "./config";
import type { Role } from "../shared/types";
import type { ProjectStore } from "../ui/types/state";
import type { RenameMap } from "./config";

// ── Shared primitives ─────────────────────────────────────────────────────────

export function makeLabelHelpers(config: PluginConfig) {
  const colorLabel = (name: string): string => {
    if (!config.useShorthandColors) return name;
    const col = config.colors?.find((c) => c.name === name);
    return (col && col.shorthand) || name;
  };
  const roleLabel = (name: string, roleIdx: number): string => {
    if (!config.useShorthandRoles) return name;
    const role = config.roles?.[roleIdx];
    return (role && role.shorthand) || name;
  };
  const stepLabel = (name: string): string =>
    config.useShorthandSteps && config.scaleStepShorthands?.[name] ? config.scaleStepShorthands[name] : name;
  return { colorLabel, roleLabel, stepLabel };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#/, "").padEnd(6, "0").slice(0, 6);
  const n = parseInt(clean, 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

// Shared value equality — covers COLOR (hex string or RGBA object), VARIABLE_ALIAS, scalar.
// Returns true if values are considered equal (no write needed).
export function valuesEqual(a: unknown, b: unknown, varType: string): boolean {
  if (a === undefined || a === null || b === undefined || b === null) return false;

  const aIsAlias = typeof a === "object" && (a as { type?: string }).type === "VARIABLE_ALIAS";
  const bIsAlias = typeof b === "object" && (b as { type?: string }).type === "VARIABLE_ALIAS";
  if (aIsAlias || bIsAlias) {
    if (aIsAlias && bIsAlias) return (a as { id: string }).id === (b as { id: string }).id;
    return false;
  }

  if (varType === "COLOR") {
    const aRgb = a as { r?: number; g?: number; b?: number; a?: number };
    const bRgb = b as { r?: number; g?: number; b?: number; a?: number };
    return (
      Math.abs((aRgb.r ?? 0) - (bRgb.r ?? 0)) <= 0.001 &&
      Math.abs((aRgb.g ?? 0) - (bRgb.g ?? 0)) <= 0.001 &&
      Math.abs((aRgb.b ?? 0) - (bRgb.b ?? 0)) <= 0.001 &&
      Math.abs((aRgb.a ?? 1) - (bRgb.a ?? 1)) <= 0.001
    );
  }
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

// ── Entry classifier ──────────────────────────────────────────────────────────

export type EntryClass = "create" | "update" | "rename" | "rename+update" | "noop";

export interface ClassifyEntry {
  tokenRef: string;
  name: string;
  // hex string for scale/source, RGBA object or alias for tokens
  value: unknown;
  description?: string;
}

// Pure diff classifier for a single intended variable vs its current Figma state.
// Used by both computeSyncPreview (dry count) and VariableManager.upsertVariables (live tally).
export function classifyEntry(
  entry: ClassifyEntry,
  existing: Variable | undefined,
  modeId: string,
): EntryClass {
  if (!existing) return "create";

  const nameChanged = existing.name !== entry.name;

  const currentVal = existing.valuesByMode[modeId];
  // Normalise hex string to RGB for comparison (same as upsertVariables does before writing)
  let intendedVal = entry.value;
  if (typeof intendedVal === "string" && intendedVal.length >= 3) {
    intendedVal = hexToRgb(intendedVal);
  }
  const valueChanged =
    currentVal === undefined ||
    currentVal === null ||
    !valuesEqual(currentVal, intendedVal, "COLOR");

  const descChanged = !!(entry.description && existing.description !== entry.description);
  const contentChanged = valueChanged || descChanged;

  if (nameChanged && contentChanged) return "rename+update";
  if (nameChanged) return "rename";
  if (contentChanged) return "update";
  return "noop";
}

// ── Figma variable lookup ─────────────────────────────────────────────────────

export function buildMetadataMap(
  collection: VariableCollection,
  allVariables: Variable[],
  expectedPrefix?: "token:" | "scale:" | "source:",
): Map<string, Variable> {
  const map = new Map<string, Variable>();
  const colVars = allVariables.filter((v) => v.variableCollectionId === collection.id);

  for (const variable of colVars) {
    const ref = variable.getPluginData("tokenRef");
    if (ref) {
      if (expectedPrefix && !ref.startsWith(expectedPrefix)) {
        console.warn(`[TokenWand] Variable "${variable.name}" has ref "${ref}" in wrong collection (expected ${expectedPrefix}) — skipping`);
        continue;
      }
      if (map.has(ref)) {
        variable.setPluginData("tokenRef", "");
      } else {
        map.set(ref, variable);
      }
    }
  }
  return map;
}

export function findVariable(
  collection: VariableCollection,
  tokenRef: string,
  expectedName: string,
  metadataMap: Map<string, Variable>,
  allVariables: Variable[],
): Variable | null {
  let variable: Variable | null = metadataMap.get(tokenRef) ?? null;
  if (variable) return variable;

  const colVars = allVariables.filter((v) => v.variableCollectionId === collection.id);
  variable = colVars.find((v) => v.name === expectedName) ?? null;

  if (variable) {
    variable.setPluginData("tokenRef", tokenRef);
    metadataMap.set(tokenRef, variable);
  }
  return variable;
}

// ── Structural change detection ───────────────────────────────────────────────

export type StructuralChangeKind =
  | "mode-direct-to-scale"
  | "mode-scale-to-direct"
  | "scale-shrunk"
  | "scale-collection-renamed"
  | "token-collection-renamed"
  | "source-collection-renamed"
  | "source-removed"
  | "alpha-removed"
  | "alpha-changed"
  | "scale-collection-removed";

export interface StructuralChange {
  kind: StructuralChangeKind;
  detail: string;
  oldValue?: string;
  newValue?: string;
  orphanedCollection?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectStructuralChanges(savedState: any, newState: any): StructuralChange[] {
  if (!savedState || !newState) return [];
  const changes: StructuralChange[] = [];

  const oldMode = savedState.pluginMode || "scale";
  const newMode = newState.pluginMode || "scale";
  if (oldMode !== newMode) {
    if (oldMode === "direct" && newMode === "scale") {
      changes.push({ kind: "mode-direct-to-scale", detail: "Mode changed Direct → Scale. A scale collection will be created and token variables will be updated to reference scale aliases." });
    } else {
      changes.push({ kind: "mode-scale-to-direct", detail: "Mode changed Scale → Direct. The scale collection will become orphaned in Figma.", orphanedCollection: savedState.scaleCollectionName || "_scale" });
    }
  }

  const oldLen = parseInt(savedState.scaleLength) || 23;
  const newLen = parseInt(newState.scaleLength) || 23;
  if (newLen < oldLen && newMode === "scale") {
    changes.push({ kind: "scale-shrunk", detail: `Scale reduced ${oldLen} → ${newLen}. ${oldLen - newLen} scale step variable(s) will become orphaned.`, oldValue: String(oldLen), newValue: String(newLen) });
  }

  const oldScaleCol = savedState.scaleCollectionName || "_scale";
  const newScaleCol = newState.scaleCollectionName || "_scale";
  if (oldScaleCol !== newScaleCol) {
    changes.push({ kind: "scale-collection-renamed", detail: `Scale collection renamed "${oldScaleCol}" → "${newScaleCol}". The old collection will be left in Figma.`, oldValue: oldScaleCol, newValue: newScaleCol, orphanedCollection: oldScaleCol });
  }

  const oldTokenCol = savedState.tokenCollectionName || "color tokens";
  const newTokenCol = newState.tokenCollectionName || "color tokens";
  if (oldTokenCol !== newTokenCol) {
    changes.push({ kind: "token-collection-renamed", detail: `Token collection renamed "${oldTokenCol}" → "${newTokenCol}". The old collection will be left in Figma.`, oldValue: oldTokenCol, newValue: newTokenCol, orphanedCollection: oldTokenCol });
  }

  const oldSourceCol = savedState.sourceCollectionName || "_constants";
  const newSourceCol = newState.sourceCollectionName || "_constants";
  if (oldSourceCol !== newSourceCol && savedState.includeSourceColors) {
    changes.push({ kind: "source-collection-renamed", detail: `Source collection renamed "${oldSourceCol}" → "${newSourceCol}". The old collection will be left in Figma.`, oldValue: oldSourceCol, newValue: newSourceCol, orphanedCollection: oldSourceCol });
  }

  const hadScale = savedState.includeColorScalesCollection !== false;
  const hasScale = newState.includeColorScalesCollection !== false;
  if (hadScale && !hasScale) {
    changes.push({ kind: "scale-collection-removed", detail: "Scale collection disabled. The existing scale collection will become orphaned.", orphanedCollection: oldScaleCol });
  }

  const hadSource = savedState.includeSourceColors;
  const hasSource = newState.includeSourceColors;
  if (hadSource && !hasSource) {
    changes.push({ kind: "source-removed", detail: "Source colors disabled. The source constants collection will become orphaned.", orphanedCollection: oldSourceCol });
  }

  const oldAlpha: number[] = savedState.alphaValues || [];
  const newAlpha: number[] = newState.alphaValues || [];
  if (oldAlpha.length > 0 && newAlpha.length === 0) {
    changes.push({ kind: "alpha-removed", detail: "Alpha tints disabled. Existing opacity variables will become orphaned." });
  } else if (oldAlpha.length > 0 && newAlpha.length > 0 && oldAlpha.join(",") !== newAlpha.join(",")) {
    changes.push({ kind: "alpha-changed", detail: "Alpha values changed. Removed opacity steps will become orphaned variables.", oldValue: oldAlpha.join(", "), newValue: newAlpha.join(", ") });
  }

  return changes;
}

// ── Analysis functions ────────────────────────────────────────────────────────

export interface SyncPreviewItem {
  tokenRef: string;
  name: string;
  collection: "token" | "scale" | "source";
  action: "create" | "update" | "rename" | "rename+update" | "delete";
  fromName?: string;
}

export interface SyncPreview {
  toCreate: number;
  toUpdate: number;
  toRename: number;
  toDelete: number;
  total: number;
  items: SyncPreviewItem[];
}

export function computeSyncPreview(
  result: EngineResult,
  config: PluginConfig,
  localVars: Variable[],
  collections: VariableCollection[],
  scope: "all" | "scale" | "roles" = "all",
): SyncPreview {
  const tokenColName = config.tokenCollectionName || "color tokens";
  const scaleColName = config.scaleCollectionName || "_scale";
  const sourceColName = config.sourceCollectionName || "_constants";

  const skipScales = config.pluginMode === "direct" || config.includeColorScalesCollection === false;

  const tokenCol = collections.find((c) => c.name === tokenColName) || null;
  const scaleCol = collections.find((c) => c.name === scaleColName) || null;
  const sourceCol = collections.find((c) => c.name === sourceColName) || null;

  let toCreate = 0;
  let toUpdate = 0;
  let toRename = 0;
  let toDelete = 0;
  const items: SyncPreviewItem[] = [];

  const { colorLabel, roleLabel, stepLabel } = makeLabelHelpers(config);
  const tokenNameOrder: string[] = config.tokenNameSegments || ["color", "role", "variation"];

  // Returns the set of tokenRefs that the engine intends to write into this collection.
  // Side-effects: increments counters and pushes SyncPreviewItems.
  // Any variable in Figma with a valid tokenRef not in the intended set is an orphan → toDelete.
  function checkEntries(
    col: VariableCollection | null,
    prefix: "token:" | "scale:" | "source:",
    entries: ClassifyEntry[],
    modeId: string,
  ): Set<string> {
    const collection = prefix === "token:" ? "token" : prefix === "scale:" ? "scale" : "source";
    const intendedRefs = new Set(entries.map((e) => e.tokenRef));
    if (!col) {
      toCreate += entries.length;
      for (const entry of entries) {
        items.push({ tokenRef: entry.tokenRef, name: entry.name, collection, action: "create" });
      }
      return intendedRefs;
    }
    const map = buildMetadataMap(col, localVars, prefix);
    for (const entry of entries) {
      const existing = map.get(entry.tokenRef);
      const cls = classifyEntry(entry, existing, modeId);
      if (cls === "create")        toCreate++;
      if (cls === "update")        toUpdate++;
      if (cls === "rename")        toRename++;
      if (cls === "rename+update") { toRename++; toUpdate++; }
      if (cls !== "noop") {
        items.push({
          tokenRef: entry.tokenRef,
          name: entry.name,
          collection,
          action: cls,
          fromName: (cls === "rename" || cls === "rename+update") ? existing?.name : undefined,
        });
      }
    }
    // Variables in Figma with a valid tokenRef not in the intended set → will be purged.
    for (const [ref, variable] of map) {
      if (!intendedRefs.has(ref)) {
        toDelete++;
        items.push({ tokenRef: ref, name: variable.name, collection, action: "delete", fromName: variable.name });
      }
    }
    return intendedRefs;
  }

  // Token variables (first theme only — variable set is the same across themes, only values differ per mode)
  if ((scope === "all" || scope === "roles") && result?.tokens) {
    const firstTheme = Object.keys(result.tokens)[0];
    const modeId = tokenCol ? (tokenCol.modes[0]?.modeId ?? "") : "";
    if (firstTheme) {
      const entries: ClassifyEntry[] = [];
      for (const [colorName, roles] of Object.entries(result.tokens[firstTheme] as Record<string, Record<number, Record<number, TokenEntry>>>)) {
        const colorObj = config.colors?.find((c) => c.name === colorName);
        const colorId = colorObj?._id || colorName;
        const cLabel = colorLabel(colorName);
        for (const [roleId, variations] of Object.entries(roles)) {
          const roleObj: Partial<Role> = config.roles?.[parseInt(roleId, 10)] || {};
          const roleIdStr = roleObj._id || roleId;
          const rName = roleObj.name || roleId;
          const rLabel = roleLabel(rName, parseInt(roleId, 10));
          const variationDefs = roleObj.variations ?? config.variations ?? [];
          for (let vi = 0; vi < variationDefs.length; vi++) {
            const token = variations[vi];
            if (!token) continue;
            const varDef = variationDefs[vi];
            const varIdStr = varDef._id || String(vi);
            const dispName = config.useShorthandVariations && varDef.shorthand ? varDef.shorthand : varDef.name || String(vi);
            const segParts: Record<string, string> = { color: cLabel, role: rLabel, variation: dispName };
            const name = tokenNameOrder.map((s) => segParts[s] || s).join("/");
            entries.push({ tokenRef: `token:${colorId}/${roleIdStr}/${varIdStr}`, name, value: token.value, description: token.roleDescription });
          }
        }
      }
      checkEntries(tokenCol, "token:", entries, modeId);
    }
  }

  // Scale variables
  if (!skipScales && (scope === "all" || scope === "scale") && result?.scales) {
    const modeId = scaleCol ? (scaleCol.modes[0]?.modeId ?? "") : "";
    const entries: ClassifyEntry[] = [];
    for (const [colorName, scale] of Object.entries(result.scales)) {
      const colorObj = config.colors?.find((c) => c.name === colorName);
      const colorId = colorObj?._id || colorName;
      const cLabel = colorLabel(colorName);
      for (const [step, entry] of Object.entries(scale)) {
        entries.push({ tokenRef: `scale:${colorId}/${step}`, name: `${cLabel}/${stepLabel(step)}`, value: (entry as { value?: string })?.value || null });
      }
    }
    checkEntries(scaleCol, "scale:", entries, modeId);
  }

  // Source constants — use colorLabel so shorthand setting is respected (bug fix: was using color.name raw)
  if (config.includeSourceColors && config.colors) {
    const modeId = sourceCol ? (sourceCol.modes[0]?.modeId ?? "") : "";
    const entries: ClassifyEntry[] = [];
    for (const color of config.colors) {
      const colorId = color._id || color.name;
      const cLabel = colorLabel(color.name);
      entries.push({ tokenRef: `source:${colorId}`, name: `${cLabel}/${cLabel}`, value: color.value });
      if (config.alphaValues?.length) {
        for (const opacity of config.alphaValues) {
          entries.push({ tokenRef: `source:${colorId}/${opacity}`, name: `${cLabel}/Opacities/${opacity}`, value: color.value });
        }
      }
    }
    checkEntries(sourceCol, "source:", entries, modeId);
  }

  return { toCreate, toUpdate, toRename, toDelete, total: toCreate + toUpdate + toRename + toDelete, items };
}

export interface NameConflict {
  tokenRef: string;
  figmaName: string;
  suggestedName: string;
  type: "token" | "scale" | "source";
}

export function analyzeNameConflicts(
  result: EngineResult,
  config: PluginConfig,
  localVars: Variable[],
  tokenCol: VariableCollection | null,
  scaleCol: VariableCollection | null,
  sourceCol: VariableCollection | null,
): NameConflict[] {
  const conflicts: NameConflict[] = [];
  const { colorLabel, roleLabel, stepLabel } = makeLabelHelpers(config);

  if (scaleCol && result?.scales) {
    const scaleMetadataMap = buildMetadataMap(scaleCol, localVars, "scale:");
    for (const [colorName, scale] of Object.entries(result.scales)) {
      const colorObj = config.colors?.find((c) => c.name === colorName);
      const colorId = colorObj?._id || colorName;
      const cLabel = colorLabel(colorName);
      for (const step of Object.keys(scale as Record<string, unknown>)) {
        const tokenRef = `scale:${colorId}/${step}`;
        const suggestedName = `${cLabel}/${stepLabel(step)}`;
        const variableInFigma = scaleMetadataMap.get(tokenRef);
        if (variableInFigma && variableInFigma.name !== suggestedName) {
          conflicts.push({ tokenRef, figmaName: variableInFigma.name, suggestedName, type: "scale" });
        }
      }
    }
  }

  if (tokenCol && result?.tokens) {
    const tokenMetadataMap = buildMetadataMap(tokenCol, localVars, "token:");
    const tokenNameOrder: string[] = config.tokenNameSegments || ["color", "role", "variation"];
    const firstTheme = Object.keys(result.tokens)[0];
    if (firstTheme) {
      const colors = result.tokens[firstTheme];
      for (const [colorName, roles] of Object.entries(colors)) {
        const colorObj = config.colors?.find((c) => c.name === colorName);
        const colorId = colorObj?._id || colorName;
        const cLabel = colorLabel(colorName);
        for (const [roleId, variations] of Object.entries(roles)) {
          const roleObj: Partial<Role> = config.roles?.[parseInt(roleId, 10)] || {};
          const roleIdStr = roleObj._id || roleId;
          const rName = roleObj.name || roleId;
          const rLabel = roleLabel(rName, parseInt(roleId, 10));
          const variationDefs = roleObj.variations ?? config.variations ?? [];
          for (let vi = 0; vi < variationDefs.length; vi++) {
            const token = variations[vi];
            if (!token) continue;
            const varDef = variationDefs[vi];
            const varIdStr = varDef._id || String(vi);
            const dispName = config.useShorthandVariations && varDef.shorthand ? varDef.shorthand : varDef.name || String(vi);
            const tokenRef = `token:${colorId}/${roleIdStr}/${varIdStr}`;
            const segParts: Record<string, string> = { color: cLabel, role: rLabel, variation: dispName };
            const suggestedName = tokenNameOrder.map((s) => segParts[s] || s).join("/");
            const variableInFigma = tokenMetadataMap.get(tokenRef);
            if (variableInFigma && variableInFigma.name !== suggestedName) {
              conflicts.push({ tokenRef, figmaName: variableInFigma.name, suggestedName, type: "token" });
            }
          }
        }
      }
    }
  }

  if (sourceCol && config.includeSourceColors && config.colors) {
    const sourceMetadataMap = buildMetadataMap(sourceCol, localVars, "source:");
    for (const color of config.colors) {
      const colorId = color._id || color.name;
      const label = config.useShorthandColors && color.shorthand ? color.shorthand : color.name;
      const baseRef = `source:${colorId}`;
      const baseSuggested = `${label}/${label}`;
      const baseVar = sourceMetadataMap.get(baseRef);
      if (baseVar && baseVar.name !== baseSuggested) {
        conflicts.push({ tokenRef: baseRef, figmaName: baseVar.name, suggestedName: baseSuggested, type: "source" });
      }
      if (config.alphaValues?.length) {
        for (const opacityInt of config.alphaValues) {
          const alphaRef = `source:${colorId}/${opacityInt}`;
          const alphaSuggested = `${label}/Opacities/${opacityInt}`;
          const alphaVar = sourceMetadataMap.get(alphaRef);
          if (alphaVar && alphaVar.name !== alphaSuggested) {
            conflicts.push({ tokenRef: alphaRef, figmaName: alphaVar.name, suggestedName: alphaSuggested, type: "source" });
          }
        }
      }
    }
  }

  return conflicts;
}

// ── Centralised pre-publish analysis ─────────────────────────────────────────

export interface PrePublishReport {
  existing: { name: string; id: string }[];
  renames: RenameMap;
  syncPreview: SyncPreview;
  conflicts: NameConflict[];
  structuralChanges: StructuralChange[];
  items: SyncPreviewItem[];
}

// Single entry point for all pre-publish analysis. Called from index.ts check-collections handler.
// `renames` is pre-computed by the caller (index.ts) using buildVariableRenameMap from config.ts
// to avoid a circular import (variableTracker ← config ← variableTracker).
export async function runPrePublishAnalysis(
  state: ProjectStore,
  savedState: ProjectStore | null,
  config: PluginConfig,
  result: EngineResult,
  renames: RenameMap,
): Promise<PrePublishReport> {
  const [localVars, collections] = await Promise.all([
    figma.variables.getLocalVariablesAsync(),
    figma.variables.getLocalVariableCollectionsAsync(),
  ]);

  const scaleColName = config.scaleCollectionName || "_scale";
  const tokenColName = config.tokenCollectionName || "color tokens";
  const sourceColName = config.sourceCollectionName || "_constants";

  const tokenCol = collections.find((c) => c.name === tokenColName) || null;
  const scaleCol = collections.find((c) => c.name === scaleColName) || null;
  const sourceCol = collections.find((c) => c.name === sourceColName) || null;

  const names = [scaleColName, tokenColName, sourceColName].filter(Boolean);
  const existing = collections.filter((c) => names.includes(c.name)).map((c) => ({ name: c.name, id: c.id }));

  const conflicts = analyzeNameConflicts(result, config, localVars, tokenCol, scaleCol, sourceCol);

  // scope is unknown at analysis time (user picks it in the UI after check-collections returns),
  // so we always compute the full "all" preview — scope filtering is cosmetic in the UI only.
  const syncPreview = computeSyncPreview(result, config, localVars, collections, "all");
  // NOTE: we do NOT add renames.summary counts here. classifyEntry already counts renames
  // caused by label changes (shorthand, name edits) because it compares existing.name against
  // the intended name built with makeLabelHelpers. Adding the rename-map summary would
  // double-count the same renames. The rename map is passed through for the applyRenames
  // live pass in figmaVars.ts, and its summary is surfaced separately in the UI as "Pending Renames".

  const structuralChanges = detectStructuralChanges(savedState, state);

  return { existing, renames, syncPreview, conflicts, structuralChanges, items: syncPreview.items };
}
