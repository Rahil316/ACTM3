// CONFIG TRANSLATOR: Converts projectStore (UI format) into the format expected by variableMaker.
// Ported from vanilla_archive/src/shared/config.js

import { translateLocalBg } from "../shared/engine/clrUtils";
import type { ProjectStore, TokenNameSegment } from "../ui/types/state";
import type { EngineInput } from "../shared/engine/clrEngine";
import type { Color, Role, Theme, Variation } from "../shared/types";
export interface StepNames {
  name: string;
  shorthand: string;
}

export interface PluginConfig extends EngineInput {
  name: string;
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
  const scaleLength = projectStore.scaleLength || 23;
  const stepNames = _parseStepNames(projectStore, scaleLength);
  const stepShorthands = _parseStepShorthands(projectStore, stepNames);
  const variations = _parseVariations(projectStore);
  const themes = projectStore.themes || [
    { name: "Light", bg: "FFFFFF" },
    { name: "Dark", bg: "000000" },
  ];

  return {
    name: projectStore.name || "token-wand",
    colors: (projectStore.colors || []).map((g) => ({
      name: g.name,
      shorthand: g.shorthand,
      value: g.value,
      _id: g._id || undefined,
      solverMode: g.solverMode || "natural",
      scaleAlgorithm: g.scaleAlgorithm || undefined,
      description: g.description || "",
    })),
    roles: _mapRoles(projectStore, variations),
    scaleLength,
    scaleAlgorithm: projectStore.scaleAlgorithm || "Natural",
    pluginMode: projectStore.pluginMode || "scale",
    scaleSteps: stepNames,
    variations: variations.map((v) => Object.assign({}, v)),
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
    alphaValues: projectStore.alphaValues || [],
    includeDescriptions: projectStore.includeDescriptions !== false,
    includeColorScalesCollection: projectStore.includeColorScalesCollection !== false,
    useUniformAlgorithm: projectStore.useUniformAlgorithm !== false,
    algorithmScopeLevel: projectStore.algorithmScopeLevel || "color",
    solverMode: projectStore.solverMode || "natural",
  };
}

function _parseStepNames(projectStore: ProjectStore, count: number): string[] | null {
  const items = Array.isArray(projectStore.scaleSteps) ? projectStore.scaleSteps : [];
  const userNames = items.length > 0 ? items.map((s) => (typeof s === "string" ? s : s.name || "")) : null;
  if (!userNames || userNames.length === 0) return null;

  const names = userNames.slice();
  while (names.length < count) names.push(String(names.length + 1));
  return names.slice(0, count);
}

function _parseStepShorthands(projectStore: ProjectStore, resolvedNames: string[] | null): Record<string, string> {
  if (!resolvedNames) return {};
  const items = Array.isArray(projectStore.scaleSteps) ? projectStore.scaleSteps : [];
  const map: Record<string, string> = {};
  items.forEach((item, i: number) => {
    if (typeof item === "object" && item.shorthand && item.shorthand !== item.name) {
      const key = resolvedNames[i];
      if (key) map[key] = item.shorthand;
    }
  });
  return map;
}

function _deduplicateThemeNames(themes: Theme[]): Theme[] {
  const seen: Record<string, number> = {};
  return (
    themes || [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "000000" },
    ]
  ).map((t) => {
    const base = (t.name || "Theme").trim();
    if (!seen[base]) {
      seen[base] = 1;
      return { name: base, bg: t.bg || "FFFFFF" };
    }
    seen[base]++;
    return { name: `${base} ${seen[base]}`, bg: t.bg || "FFFFFF" };
  });
}

function _parseVariations(projectStore: ProjectStore): Variation[] {
  return projectStore.variations && projectStore.variations.length > 0
    ? projectStore.variations
    : [1, 2, 3, 4, 5].map((n) => ({
        _id: String(n),
        name: String(n),
        shorthand: String(n),
        target: n,
      }));
}

function _mapRoles(projectStore: ProjectStore, _variations: Variation[]): Role[] {
  return (projectStore.roles || []).map((role) => ({
    _id: role._id,
    name: role.name,
    shorthand: role.shorthand || role.name.substring(0, 2).toLowerCase(),
    variations: role.variations ?? null,
    scaleAlgorithm: role.scaleAlgorithm || undefined,
    solverMode: role.solverMode || undefined,
    description: role.description || "",
    scopedColorIds: role.scopedColorIds ?? null,
    ...translateLocalBg(role.localBg, projectStore.colors || [], projectStore.themes || []),
    scopes: role.scopes || undefined,
  }));
}

// ── TOKEN-REF LOCAL BG RESOLUTION ────────────────────────────────────────────
// Re-exported here so existing plugin imports are unchanged.
export { resolveTokenRefBgs } from "../shared/engine/clrUtils";

// ── RENAME MAP ────────────────────────────────────────────────────────────────

export interface RenameMap {
  scale: Record<string, string>;
  tokens: Record<string, string>;
  summary: { scaleCount: number; tokenCount: number; changes: Array<Record<string, string>> };
}

export function buildVariableRenameMap(savedProjectStore: ProjectStore | null | undefined, newProjectStore: ProjectStore | null | undefined): RenameMap {
  if (!savedProjectStore || !newProjectStore) {
    return { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };
  }

  const oldStepNames = savedProjectStore.scaleSteps?.map((s) => s.name) || _seriesMaker(savedProjectStore.scaleLength || 23);
  const newStepNames = newProjectStore.scaleSteps?.map((s) => s.name) || _seriesMaker(newProjectStore.scaleLength || 23);

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function _seriesMaker(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String(i + 1));
}

function _mapIdToLabel<T extends { _id?: string; name: string; shorthand?: string }>(oldItems: T[], newItems: T[], oldShort: boolean, newShort: boolean): { pairs: Array<{ oldLabel: string; newLabel: string; oldItem: T; newItem: T }> } {
  const getMap = (items: T[], useShort: boolean) => {
    const m: Record<string, { label: string; item: T }> = {};
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

function _getScaleRenames(colorPairs: Array<{ oldLabel: string; newLabel: string }>, oldSteps: string[], newSteps: string[], count: number): Record<string, string> {
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
  colorPairs: Array<{ oldLabel: string; newLabel: string; oldItem: Color; newItem: Color }>,
  rolePairs: Array<{ oldLabel: string; newLabel: string; oldItem: Role; newItem: Role }>,
  oldCfg: ProjectStore,
  newCfg: ProjectStore,
): Record<string, string> {
  const renames: Record<string, string> = {};
  const oldOrder: string[] = oldCfg.tokenNameSegments || ["color", "role", "variation"];
  const newOrder: string[] = newCfg.tokenNameSegments || ["color", "role", "variation"];
  const buildName = (order: string[], color: string, role: string, variation: string) => order.map((s) => ({ color, role, variation })[s as "color" | "role" | "variation"] || s).join("/");

  const getVarMap = (cfg: ProjectStore, roleItem: Role): Map<string, string> => {
    const vars = (roleItem?.variations ?? cfg.variations) || [];
    const map = new Map<string, string>();
    vars.forEach((v, i) => {
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

function _getSummaryChanges(
  colorPairs: Array<{ oldLabel: string; newLabel: string }>,
  rolePairs: Array<{ oldLabel: string; newLabel: string }>,
  oldCfg: ProjectStore,
  newCfg: ProjectStore,
  oldSteps: string[],
  newSteps: string[],
): Array<Record<string, string>> {
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

// Structural change types and detection have moved to variableTracker.ts.
// Re-exported here so existing imports from config.ts are unchanged.
export type { StructuralChangeKind, StructuralChange } from "./variableTracker";
export { detectStructuralChanges } from "./variableTracker";
