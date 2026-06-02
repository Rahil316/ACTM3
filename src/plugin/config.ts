// CONFIG TRANSLATOR: Converts projectStore (UI format) into the format expected by variableMaker.
// Ported from vanilla_archive/src/shared/config.js

import { translateLocalBg } from "../shared/localBgTranslate";
import type { ProjectStore, TokenNameSegment } from "../ui/types/state";
import type { EngineInput } from "../shared/clrEngine";
interface StepNames {
  name: string;
  shorthand: string;
}

export interface PluginConfig extends EngineInput {
  name: string;
  roleStepNames: string[];
  scaleStepShorthands: Record<string, string>;
  alphaValues: number[];
  includeSourceColors: boolean;
  sourceCollectionName: string;
  scaleCollectionName: string;
  tokenCollectionName: string;
  tokenNameSegments: TokenNameSegment[];
  useShorthandColors: boolean;
  useShorthandRoles: boolean;
  useShorthandVariations: boolean;
  useShorthandSteps: boolean;
  includeDescriptions: boolean;
  includeColorScalesCollection: boolean;
}

export function translateConfig(projectStore: ProjectStore): PluginConfig {
  projectStore.scaleLength = projectStore.scaleLength || 23;
  const stepNames = _parseStepNames(projectStore, projectStore.scaleLength);
  const stepShorthands = _parseStepShorthands(projectStore, stepNames);
  const variations = _parseVariations(projectStore);
  const roleStepNames = variations.map((v: any) => (projectStore.useShorthandVariations && v.shorthand ? v.shorthand : v.name));
  const themes = projectStore.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];

  return {
    name: projectStore.name || "token-wand",
    colors: (projectStore.colors || []).map((g: any) => ({
      name: g.name,
      shorthand: g.shorthand,
      value: g.value,
      _id: g._id || undefined,
      solverMode: g.solverMode || "natural",
      scaleAlgorithm: g.scaleAlgorithm || null,
      description: g.description || "",
    })),
    roles: _mapRoles(projectStore, variations),
    scaleLength: projectStore.scaleLength,
    scaleAlgorithm: projectStore.scaleAlgorithm || "Natural",
    pluginMode: projectStore.pluginMode || "scale",
    scaleSteps: stepNames,
    roleStepNames,
    variations: variations.map((v: any) => Object.assign({}, v)),
    themes: _deduplicateThemeNames(themes),
    tokenNameSegments: projectStore.tokenNameSegments || ["color", "role", "variation"],
    useShorthandColors: projectStore.useShorthandColors || false,
    useShorthandRoles: projectStore.useShorthandRoles || false,
    useShorthandVariations: projectStore.useShorthandVariations || false,
    useShorthandSteps: projectStore.useShorthandSteps || false,
    scaleStepShorthands: stepShorthands,
    includeSourceColors: projectStore.includeSourceColors || false,
    sourceCollectionName: projectStore.sourceCollectionName || "_constants",
    scaleCollectionName: projectStore.scaleCollectionName || "_scale",
    tokenCollectionName: projectStore.tokenCollectionName || "color tokens",
    alphaValues: projectStore.alphaValues ?? [],
    includeDescriptions: projectStore.includeDescriptions !== false,
    includeColorScalesCollection: projectStore.includeColorScalesCollection !== false,
    useUniformAlgorithm: projectStore.useUniformAlgorithm !== false,
    algorithmScopeLevel: projectStore.algorithmScopeLevel || "color",
    solverMode: projectStore.solverMode || "natural",
  };
}

function _parseStepNames(projectStore: any, count: number): string[] | null {
  const items = Array.isArray(projectStore.scaleSteps) ? projectStore.scaleSteps : [];
  const userNames = items.length > 0 ? items.map((s: any) => (typeof s === "string" ? s : s.name || "")) : null;
  if (!userNames || userNames.length === 0) return null;

  const names = userNames.slice();
  while (names.length < count) names.push(String(names.length + 1));
  return names.slice(0, count);
}

function _parseStepShorthands(projectStore: any, resolvedNames: string[] | null): Record<string, string> {
  if (!resolvedNames) return {};
  const items = Array.isArray(projectStore.scaleSteps) ? projectStore.scaleSteps : [];
  const map: Record<string, string> = {};
  items.forEach((item: any, i: number) => {
    if (typeof item === "object" && item.shorthand && item.shorthand !== item.name) {
      const key = resolvedNames[i];
      if (key) map[key] = item.shorthand;
    }
  });
  return map;
}

function _deduplicateThemeNames(themes: any[]): any[] {
  const seen: Record<string, number> = {};
  return (
    themes || [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "000000" },
    ]
  ).map((t: any) => {
    const base = (t.name || "Theme").trim();
    if (!seen[base]) {
      seen[base] = 1;
      return { name: base, bg: t.bg || "FFFFFF" };
    }
    seen[base]++;
    return { name: `${base} ${seen[base]}`, bg: t.bg || "FFFFFF" };
  });
}

function _parseVariations(projectStore: any): any[] {
  return projectStore.variations && projectStore.variations.length > 0
    ? projectStore.variations
    : [1, 2, 3, 4, 5].map((n) => ({
        _id: String(n),
        name: String(n),
        shorthand: String(n),
        description: "",
      }));
}

function _mapRoles(projectStore: any, _variations: any[]): any[] {
  return (projectStore.roles || []).map((role: any) => ({
    _id: role._id || undefined,
    name: role.name,
    shorthand: role.shorthand || role.name.substring(0, 2).toLowerCase(),
    mappingMethod: role.mappingMethod === "index" ? "index" : "contrast",
    variations: role.variations ?? null,
    scaleAlgorithm: role.scaleAlgorithm || null,
    solverMode: role.solverMode || null,
    description: role.description || "",
    scopedColorIds: role.scopedColorIds ?? null,
    ...translateLocalBg(role.localBg, projectStore.colors || [], projectStore.themes || []),
    scopes: role.scopes || null,
  }));
}

// ── TOKEN-REF LOCAL BG RESOLUTION ────────────────────────────────────────────
// Moved to src/shared/resolveLocalBg.ts so the UI can also use it.
// Re-exported here so existing plugin imports are unchanged.
export { resolveTokenRefBgs } from "../shared/resolveLocalBg";

// ── RENAME MAP ────────────────────────────────────────────────────────────────

export interface RenameMap {
  scale: Record<string, string>;
  tokens: Record<string, string>;
  summary: { scaleCount: number; tokenCount: number; changes: Array<Record<string, string>> };
}

export function buildVariableRenameMap(savedProjectStore: any, newProjectStore: any): RenameMap {
  if (!savedProjectStore || !newProjectStore) {
    return { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };
  }

  const oldStepNames = savedProjectStore.scaleSteps?.map((s: any) => s.name) || _seriesMaker(savedProjectStore.scaleLength || 23);
  const newStepNames = newProjectStore.scaleSteps?.map((s: any) => s.name) || _seriesMaker(newProjectStore.scaleLength || 23);

  const colorLabels = _mapIdToLabel(savedProjectStore.colors, newProjectStore.colors, savedProjectStore.useShorthandColors, newProjectStore.useShorthandColors);
  const roleLabels = _mapIdToLabel(savedProjectStore.roles, newProjectStore.roles, savedProjectStore.useShorthandRoles, newProjectStore.useShorthandRoles);

  const scaleRenames = _getScaleRenames(colorLabels.pairs, oldStepNames, newStepNames, Math.min(savedProjectStore.scaleLength || 23, newProjectStore.scaleLength || 23));
  const tokenRenames = _getTokenRenames(colorLabels.pairs, roleLabels.pairs, savedProjectStore, newProjectStore);

  return {
    scale: scaleRenames,
    tokens: tokenRenames,
    summary: {
      scaleCount: Object.keys(scaleRenames).length,
      tokenCount: Object.keys(tokenRenames).length,
      changes: _getSummaryChanges(colorLabels.pairs, roleLabels.pairs, savedProjectStore, newProjectStore, oldStepNames, newStepNames),
    },
  };
}

function _seriesMaker(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String(i + 1));
}

function _mapIdToLabel(oldItems: any[], newItems: any[], oldShort: boolean, newShort: boolean): { pairs: any[] } {
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

function _getScaleRenames(colorPairs: any[], oldSteps: string[], newSteps: string[], count: number): Record<string, string> {
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

function _getTokenRenames(colorPairs: any[], rolePairs: any[], oldCfg: any, newCfg: any): Record<string, string> {
  const renames: Record<string, string> = {};
  const oldOrder: string[] = oldCfg.tokenNameSegments || ["color", "role", "variation"];
  const newOrder: string[] = newCfg.tokenNameSegments || ["color", "role", "variation"];
  const buildName = (order: string[], color: string, role: string, variation: string) => order.map((s) => ({ color, role, variation })[s as "color" | "role" | "variation"] || s).join("/");

  const getVarMap = (cfg: any, roleItem: any): Map<string, string> => {
    const vars = (roleItem?.variations ?? cfg.variations) || [];
    const map = new Map<string, string>();
    vars.forEach((v: any, i: number) => {
      const id = v?._id ? v._id : String(i);
      const name = cfg.useShorthandVariations && v?.shorthand ? v.shorthand : v?.name || String(i);
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

function _getSummaryChanges(colorPairs: any[], rolePairs: any[], oldCfg: any, newCfg: any, oldSteps: string[], newSteps: string[]): Array<Record<string, string>> {
  const changes: Array<Record<string, string>> = [];
  colorPairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: "color", from: p.oldLabel, to: p.newLabel });
  });
  rolePairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: "role", from: p.oldLabel, to: p.newLabel });
  });

  const sample = (s: string[]) => s.slice(0, 3).join(",") + (s.length > 3 ? "…" : "");
  if (sample(oldSteps) !== sample(newSteps)) changes.push({ type: "stepNames", from: sample(oldSteps), to: sample(newSteps) });
  const oldOrder = (oldCfg.tokenNameSegments || []).join(",");
  const newOrder = (newCfg.tokenNameSegments || []).join(",");
  if (oldOrder !== newOrder) changes.push({ type: "grouping", from: oldOrder, to: newOrder });

  return changes;
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

  const oldAlpha: number[] = savedState.alphaValues ?? [];
  const newAlpha: number[] = newState.alphaValues ?? [];
  if (oldAlpha.length > 0 && newAlpha.length === 0) {
    changes.push({ kind: "alpha-removed", detail: "Alpha tints disabled. Existing opacity variables will become orphaned." });
  } else if (oldAlpha.length > 0 && newAlpha.length > 0 && oldAlpha.join(",") !== newAlpha.join(",")) {
    changes.push({ kind: "alpha-changed", detail: "Alpha values changed. Removed opacity steps will become orphaned variables.", oldValue: oldAlpha.join(", "), newValue: newAlpha.join(", ") });
  }

  return changes;
}
