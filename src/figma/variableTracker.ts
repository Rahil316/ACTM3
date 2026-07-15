import type { EngineResult, TokenEntry } from "../shared/engine/clrEngine";
import type { PluginConfig } from "./config";
import type { Role } from "../shared/types";
import type { ProjectStore } from "../ui/types/state";
import type { RenameMap } from "./config";
import { rgbToHex } from "../shared/engine/clrUtils";

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

// Display-only hex for a COLOR value coming out of Figma (0-1 floats). Returns
// null for non-color values (aliases, scalars) — callers should skip the diff in that case.
function colorValueToHex(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const { r, g, b } = value as { r?: number; g?: number; b?: number };
  if (r === undefined || g === undefined || b === undefined) return null;
  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
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

export interface ClassifyEntry {
  tokenRef: string;
  name: string;
  // hex string for scale/source, RGBA object or alias for tokens
  value: unknown;
  description?: string;
  // Token variables only (roleObj.scopes) — undefined/empty means figmaVars.ts
  // will apply the ["ALL_SCOPES"] fallback, so that's also the default this
  // gets compared against (see scopesEqual).
  scopes?: VariableScope[];
}

function scopesEqual(current: VariableScope[] | undefined, intended: VariableScope[] | undefined): boolean {
  const desired = intended && intended.length > 0 ? intended : (["ALL_SCOPES"] as VariableScope[]);
  const curr = current ?? [];
  return curr.length === desired.length && desired.every((s) => curr.includes(s));
}

// Display-only value diff for a single field. "color" when both sides resolve
// to a hex (scale/source, or a direct-mode token); "reference" when the
// intended (and/or current) value is a VARIABLE_ALIAS — carries both the
// resolved target name AND its hex so the row never shows a bare, uncolored id.
export type ValueFieldDiff =
  | { kind: "color"; old: string; new: string }
  | { kind: "reference"; oldRef: string; oldHex: string; newRef: string; newHex: string };

export type ChangedField = "name" | "value" | "description" | "scopes";

export type ChangeItemKind = "create" | "modify" | "delete";

// changedFields is derived directly from field-by-field comparison — never
// inferred — so a field can only appear here if it genuinely differs, keeping
// "modify" rows honest about exactly what will be written.
export interface ClassifyResult {
  kind: ChangeItemKind;
  changedFields: ChangedField[];
  nameDiff?: { old: string; new: string };
  valueDiff?: ValueFieldDiff;
  descriptionDiff?: { old: string; new: string };
  scopesDiff?: { old: VariableScope[]; new: VariableScope[] };
}

// Resolves a Figma variable id to a display name, for reference-value diffs.
function resolveVariableName(id: string, localVars: Variable[]): string {
  return localVars.find((v) => v.id === id)?.name ?? id;
}

// Pure diff classifier for a single intended variable vs its current Figma state.
// Used by computeSyncPreview to build the field-level change list shown in the
// Changes tab. `localVars` is only needed to resolve alias target names for display.
export function classifyEntry(
  entry: ClassifyEntry,
  existing: Variable | undefined,
  modeId: string,
  localVars: Variable[],
): ClassifyResult {
  if (!existing) return { kind: "create", changedFields: [] };

  const changedFields: ChangedField[] = [];
  const result: ClassifyResult = { kind: "modify", changedFields };

  if (existing.name !== entry.name) {
    changedFields.push("name");
    result.nameDiff = { old: existing.name, new: entry.name };
  }

  const currentVal = existing.valuesByMode[modeId];
  let intendedVal = entry.value;
  if (typeof intendedVal === "string" && intendedVal.length >= 3) {
    intendedVal = hexToRgb(intendedVal);
  }
  const valueChanged = currentVal === undefined || currentVal === null || !valuesEqual(currentVal, intendedVal, "COLOR");
  if (valueChanged) {
    changedFields.push("value");

    const intendedIsAlias = typeof intendedVal === "object" && intendedVal !== null && (intendedVal as { type?: string }).type === "VARIABLE_ALIAS";
    const currentIsAlias = typeof currentVal === "object" && currentVal !== null && (currentVal as { type?: string }).type === "VARIABLE_ALIAS";

    if (intendedIsAlias || currentIsAlias) {
      const newRefId = intendedIsAlias ? (intendedVal as { id: string }).id : null;
      const oldRefId = currentIsAlias ? (currentVal as { id: string }).id : null;
      const newRef = newRefId ? resolveVariableName(newRefId, localVars) : "(direct value)";
      const oldRef = oldRefId ? resolveVariableName(oldRefId, localVars) : "(direct value)";
      const newHex = newRefId ? (colorValueToHex(localVars.find((v) => v.id === newRefId)?.valuesByMode[modeId]) ?? "") : (colorValueToHex(intendedVal) ?? "");
      const oldHex = oldRefId ? (colorValueToHex(localVars.find((v) => v.id === oldRefId)?.valuesByMode[modeId]) ?? "") : (colorValueToHex(currentVal) ?? "");
      result.valueDiff = { kind: "reference", oldRef, oldHex, newRef, newHex };
    } else {
      const oldValue = colorValueToHex(currentVal);
      const newValue = colorValueToHex(intendedVal);
      if (oldValue !== null && newValue !== null) {
        result.valueDiff = { kind: "color", old: oldValue, new: newValue };
      }
    }
  }

  if (entry.description !== undefined && existing.description !== entry.description) {
    changedFields.push("description");
    result.descriptionDiff = { old: existing.description, new: entry.description };
  }

  if (!scopesEqual(existing.scopes, entry.scopes)) {
    changedFields.push("scopes");
    result.scopesDiff = { old: existing.scopes ?? [], new: entry.scopes && entry.scopes.length > 0 ? entry.scopes : (["ALL_SCOPES"] as VariableScope[]) };
  }

  if (changedFields.length === 0) return { kind: "modify", changedFields: [] }; // noop — caller filters these out
  return result;
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

export type SyncPreviewItem =
  | { tokenRef: string; name: string; collection: "token" | "scale" | "source"; kind: "create" }
  | { tokenRef: string; name: string; collection: "token" | "scale" | "source"; kind: "delete" }
  | {
      tokenRef: string;
      name: string;
      collection: "token" | "scale" | "source";
      kind: "modify";
      changedFields: ChangedField[];
      nameDiff?: { old: string; new: string };
      valueDiff?: ValueFieldDiff;
      descriptionDiff?: { old: string; new: string };
      scopesDiff?: { old: VariableScope[]; new: VariableScope[] };
    };

export interface SyncPreview {
  toCreate: number;
  toModify: number;
  toDelete: number;
  total: number;
  items: SyncPreviewItem[];
}

// Optional Figma lookup context so buildIntendedEntries can resolve token→scale
// VARIABLE_ALIAS the same way the real writer does (figmaVars.ts STAGE 2: token
// values in scale mode are aliases to the scale variable, not raw hex). Omitted
// entirely (e.g. no Figma data available yet) falls back to raw hex, matching
// skipScales behavior — callers that DO have Figma access (computeSyncPreview,
// computeValueDrift) must pass this or token entries will always show as "update".
export interface ScaleAliasContext {
  scaleCol: VariableCollection | null;
  localVars: Variable[];
}

// Walks an EngineResult + PluginConfig the same way regardless of whether it's
// the current config or a saved baseline, producing the tokenRef→{name,value}
// entries that would be written to each collection. Shared by computeSyncPreview
// (current vs Figma) and computeValueDrift (current vs baseline vs Figma).
export function buildIntendedEntries(result: EngineResult, config: PluginConfig, scaleAliasCtx?: ScaleAliasContext): { token: ClassifyEntry[]; scale: ClassifyEntry[]; source: ClassifyEntry[] } {
  const { colorLabel, roleLabel, stepLabel } = makeLabelHelpers(config);
  const tokenNameOrder: string[] = config.tokenNameSegments || ["color", "role", "variation"];
  const skipScales = config.pluginMode === "direct" || config.includeColorScalesCollection === false;

  // Figma variable descriptions are NOT per-mode — figmaVars.ts's sync loop writes
  // a description on every theme pass, so the actually-stored value ends up being
  // whichever theme was processed LAST (Object.keys(result.tokens) order), suffixed
  // with "| THEME" and an adjusted-note. Must replicate that exact construction here
  // or classifyEntry's description comparison falsely reports every token as changed.
  const include = config.includeDescriptions !== false;
  const themeKeys = result?.tokens ? Object.keys(result.tokens) : [];
  const lastTheme = themeKeys[themeKeys.length - 1];

  // Built up during the scale loop below (Figma variable name per stepName),
  // so the token loop after it can resolve VARIABLE_ALIAS targets exactly like
  // figmaVars.ts's scaleVarNameMap does — same lookup order (scale before token).
  const scaleVarNameMap: Record<string, string> = {};

  const scale: ClassifyEntry[] = [];
  if (!skipScales && result?.scales) {
    const scaleMetadataMap = scaleAliasCtx?.scaleCol ? buildMetadataMap(scaleAliasCtx.scaleCol, scaleAliasCtx.localVars, "scale:") : null;
    for (const [colorName, scaleEntries] of Object.entries(result.scales)) {
      const colorObj = config.colors?.find((c) => c.name === colorName);
      const colorId = colorObj?._id || colorName;
      const cLabel = colorLabel(colorName);
      for (const [step, entry] of Object.entries(scaleEntries)) {
        const scaleEntry = entry as { value?: string; description?: string; stepName?: string; contrast?: { light?: { ratio?: number; rating?: string }; dark?: { ratio?: number; rating?: string } } };
        const contrastNote = include ? `L:${scaleEntry.contrast?.light?.ratio ?? "?"}(${scaleEntry.contrast?.light?.rating ?? "?"}) D:${scaleEntry.contrast?.dark?.ratio ?? "?"}(${scaleEntry.contrast?.dark?.rating ?? "?"})` : "";
        const groupDesc = include ? scaleEntry.description : "";
        const description = groupDesc && contrastNote ? `${groupDesc} | ${contrastNote}` : groupDesc || contrastNote || "";
        const tokenRef = `scale:${colorId}/${step}`;
        const suggestedName = `${cLabel}/${stepLabel(step)}`;
        scale.push({ tokenRef, name: suggestedName, value: scaleEntry.value || null, description });

        // Mirrors figmaVars.ts STAGE 1: prefer the scale variable's EXISTING Figma
        // name (what a token alias would actually resolve to post-sync) over the
        // suggested name, when the variable already exists and isn't being renamed.
        if (scaleAliasCtx?.scaleCol && scaleEntry.stepName) {
          const existingVar = scaleMetadataMap?.get(tokenRef) ?? scaleAliasCtx.localVars.find((v) => v.variableCollectionId === scaleAliasCtx.scaleCol!.id && v.name === suggestedName);
          scaleVarNameMap[scaleEntry.stepName] = existingVar ? existingVar.name : suggestedName;
        }
      }
    }
  }

  const token: ClassifyEntry[] = [];
  const firstTheme = themeKeys[0];
  if (firstTheme) {
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
          const token_ = variations[vi];
          if (!token_) continue;
          const varDef = variationDefs[vi];
          const varIdStr = varDef._id || String(vi);
          const dispName = config.useShorthandVariations && varDef.shorthand ? varDef.shorthand : varDef.name || String(vi);
          const segParts: Record<string, string> = { color: cLabel, role: rLabel, variation: dispName };
          const name = tokenNameOrder.map((s) => segParts[s] || s).join("/");

          // Re-derive the last-theme token to build the description exactly as
          // figmaVars.ts's sync loop would leave it (value/name are theme-invariant,
          // so we still use firstTheme's token for those — only description differs).
          const lastThemeToken = lastTheme ? (result.tokens[lastTheme]?.[colorName]?.[parseInt(roleId, 10)]?.[vi] as TokenEntry | undefined) : undefined;
          const note = include && lastThemeToken?.isAdjusted ? " | ⚠ Adjusted" : "";
          const themeNote = include && lastTheme ? lastTheme.toUpperCase() : "";
          const roleDesc = include ? (lastThemeToken?.roleDescription ?? token_.roleDescription) : "";
          let description = "";
          if (roleDesc && themeNote) description = `${roleDesc} | ${themeNote}${note}`;
          else if (roleDesc) description = roleDesc;
          else if (themeNote) description = `${themeNote}${note}`;

          // Mirrors figmaVars.ts STAGE 2: in scale mode the token's actual written
          // value is a VARIABLE_ALIAS to its scale step, not the raw hex — classifyEntry
          // must compare against that same alias shape or every token in scale mode
          // would be permanently misclassified as "update".
          let value: unknown = token_.value;
          if (!skipScales && scaleAliasCtx?.scaleCol) {
            const scaleFigmaName = token_.tokenRef ? scaleVarNameMap[token_.tokenRef] : undefined;
            const targetVar = scaleFigmaName ? scaleAliasCtx.localVars.find((v) => v.variableCollectionId === scaleAliasCtx.scaleCol!.id && v.name === scaleFigmaName) : null;
            if (targetVar) value = { type: "VARIABLE_ALIAS", id: targetVar.id };
          }

          token.push({ tokenRef: `token:${colorId}/${roleIdStr}/${varIdStr}`, name, value, description, scopes: roleObj.scopes });
        }
      }
    }
  }

  const source: ClassifyEntry[] = [];
  if (config.includeSourceColors && config.colors) {
    for (const color of config.colors) {
      const colorId = color._id || color.name;
      const cLabel = colorLabel(color.name);
      const groupDesc = include ? color.description || "Brand constant — raw hex, no theme processing" : "";
      source.push({ tokenRef: `source:${colorId}`, name: `${cLabel}/${cLabel}`, value: color.value, description: groupDesc });
      if (config.alphaValues?.length) {
        // Mirrors figmaVars.ts's syncGlobalColors: alpha variants are written as an
        // {r,g,b,a} object (opacity baked into `a`), not the raw hex — classifyEntry
        // must compare against that same shape or every alpha variant would be
        // permanently misclassified as "update" (hex has no alpha channel to match).
        const rgb = hexToRgb(color.value);
        for (const opacity of config.alphaValues) {
          source.push({ tokenRef: `source:${colorId}/${opacity}`, name: `${cLabel}/Alpha/${opacity}`, value: { ...rgb, a: opacity / 100 }, description: include ? `${opacity}% opacity variant` : "" });
        }
      }
    }
  }

  return { token, scale, source };
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
  let toModify = 0;
  let toDelete = 0;
  const items: SyncPreviewItem[] = [];

  const intended = buildIntendedEntries(result, config, { scaleCol, localVars });

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
        items.push({ tokenRef: entry.tokenRef, name: entry.name, collection, kind: "create" });
      }
      return intendedRefs;
    }
    const map = buildMetadataMap(col, localVars, prefix);
    for (const entry of entries) {
      const existing = map.get(entry.tokenRef);
      const classified = classifyEntry(entry, existing, modeId, localVars);
      if (classified.kind === "create") {
        toCreate++;
        items.push({ tokenRef: entry.tokenRef, name: entry.name, collection, kind: "create" });
      } else if (classified.kind === "modify" && classified.changedFields.length > 0) {
        toModify++;
        items.push({
          tokenRef: entry.tokenRef,
          name: entry.name,
          collection,
          kind: "modify",
          changedFields: classified.changedFields,
          nameDiff: classified.nameDiff,
          valueDiff: classified.valueDiff,
          descriptionDiff: classified.descriptionDiff,
          scopesDiff: classified.scopesDiff,
        });
      }
      // changedFields.length === 0 is a noop — not pushed, matches prior behavior.
    }
    // Variables in Figma with a valid tokenRef not in the intended set → will be purged.
    for (const [ref, variable] of map) {
      if (!intendedRefs.has(ref)) {
        toDelete++;
        items.push({ tokenRef: ref, name: variable.name, collection, kind: "delete" });
      }
    }
    return intendedRefs;
  }

  // Token variables (first theme only — variable set is the same across themes, only values differ per mode)
  if ((scope === "all" || scope === "roles") && intended.token.length > 0) {
    const modeId = tokenCol ? (tokenCol.modes[0]?.modeId ?? "") : "";
    checkEntries(tokenCol, "token:", intended.token, modeId);
  }

  // Scale variables
  if (!skipScales && (scope === "all" || scope === "scale") && intended.scale.length > 0) {
    const modeId = scaleCol ? (scaleCol.modes[0]?.modeId ?? "") : "";
    checkEntries(scaleCol, "scale:", intended.scale, modeId);
  }

  // Source constants
  if (config.includeSourceColors && intended.source.length > 0) {
    const modeId = sourceCol ? (sourceCol.modes[0]?.modeId ?? "") : "";
    checkEntries(sourceCol, "source:", intended.source, modeId);
  }

  return { toCreate, toModify, toDelete, total: toCreate + toModify + toDelete, items };
}

// ── Value drift (incoming: Figma edited directly, plugin closed) ─────────────
//
// Distinct from computeSyncPreview's "modify" kind: that compares the CURRENT
// config against Figma to decide what the plugin is about to WRITE. This instead
// compares Figma's actual current value against the last-SYNCED baseline
// (tw_state, re-run through the engine) to detect edits made directly in Figma's
// own variables panel while the plugin was closed — something the plugin would
// otherwise silently clobber on the next sync with no warning.
//
// "drift"    — Figma changed since baseline, current config did not (safe to
//              adopt Figma's edit or overwrite with the unchanged plugin value).
// "conflict" — Figma changed since baseline AND the config also changed the same
//              token to a different value — both sides edited it independently.

export type ValueDriftKind = "drift" | "conflict";

export interface ValueDriftItem {
  tokenRef: string;
  name: string;
  collection: "token" | "scale" | "source";
  kind: ValueDriftKind;
  baselineValue: string;
  figmaValue: string;
  configValue: string;
}

function collectHexByRef(entries: ClassifyEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    if (typeof entry.value === "string") map.set(entry.tokenRef, entry.value);
  }
  return map;
}

export function computeValueDrift(
  baselineResult: EngineResult | null,
  baselineConfig: PluginConfig | null,
  result: EngineResult,
  config: PluginConfig,
  localVars: Variable[],
  collections: VariableCollection[],
): ValueDriftItem[] {
  if (!baselineResult || !baselineConfig) return [];

  const tokenColName = config.tokenCollectionName || "color tokens";
  const scaleColName = config.scaleCollectionName || "_scale";
  const sourceColName = config.sourceCollectionName || "_constants";
  const tokenCol = collections.find((c) => c.name === tokenColName) || null;
  const scaleCol = collections.find((c) => c.name === scaleColName) || null;
  const sourceCol = collections.find((c) => c.name === sourceColName) || null;

  const intended = buildIntendedEntries(result, config, { scaleCol, localVars });
  const baseline = buildIntendedEntries(baselineResult, baselineConfig, { scaleCol, localVars });

  const items: ValueDriftItem[] = [];

  function checkCollection(
    col: VariableCollection | null,
    prefix: "token:" | "scale:" | "source:",
    entries: ClassifyEntry[],
    baselineEntries: ClassifyEntry[],
  ) {
    if (!col) return;
    const collection = prefix === "token:" ? "token" : prefix === "scale:" ? "scale" : "source";
    const modeId = col.modes[0]?.modeId ?? "";
    const map = buildMetadataMap(col, localVars, prefix);
    const baselineByRef = collectHexByRef(baselineEntries);

    for (const entry of entries) {
      const baselineValue = baselineByRef.get(entry.tokenRef);
      if (baselineValue === undefined) continue; // new token since baseline — nothing to drift-check

      const existing = map.get(entry.tokenRef);
      if (!existing) continue; // not yet created in Figma — nothing to drift-check

      const figmaHex = colorValueToHex(existing.valuesByMode[modeId]);
      if (figmaHex === null) continue;

      const figmaMatchesBaseline = valuesEqual(hexToRgb(figmaHex), hexToRgb(baselineValue), "COLOR");
      if (figmaMatchesBaseline) continue; // Figma untouched since last sync — no drift

      const configValue = typeof entry.value === "string" ? entry.value : null;
      if (configValue === null) continue;

      const figmaMatchesConfig = valuesEqual(hexToRgb(figmaHex), hexToRgb(configValue), "COLOR");
      if (figmaMatchesConfig) continue; // Figma already matches what the plugin would write — nothing to flag

      const configMatchesBaseline = valuesEqual(hexToRgb(configValue), hexToRgb(baselineValue), "COLOR");

      items.push({
        tokenRef: entry.tokenRef,
        name: entry.name,
        collection,
        kind: configMatchesBaseline ? "drift" : "conflict",
        baselineValue,
        figmaValue: figmaHex,
        configValue,
      });
    }
  }

  checkCollection(tokenCol, "token:", intended.token, baseline.token);
  checkCollection(scaleCol, "scale:", intended.scale, baseline.scale);
  checkCollection(sourceCol, "source:", intended.source, baseline.source);

  return items;
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
          const alphaSuggested = `${label}/Alpha/${opacityInt}`;
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
  valueDrift: ValueDriftItem[];
}

// Single entry point for all pre-publish analysis. Called from index.ts check-collections handler.
// `renames` is pre-computed by the caller (index.ts) using buildVariableRenameMap from config.ts
// to avoid a circular import (variableTracker ← config ← variableTracker).
// `baselineResult`/`baselineConfig` are the engine re-run against tw_state (the last-synced
// baseline) — null when there's no prior sync yet, in which case value drift can't be computed.
export async function runPrePublishAnalysis(
  state: ProjectStore,
  savedState: ProjectStore | null,
  config: PluginConfig,
  result: EngineResult,
  renames: RenameMap,
  baselineConfig: PluginConfig | null,
  baselineResult: EngineResult | null,
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

  const valueDrift = computeValueDrift(baselineResult, baselineConfig, result, config, localVars, collections);

  return { existing, renames, syncPreview, conflicts, structuralChanges, items: syncPreview.items, valueDrift };
}
