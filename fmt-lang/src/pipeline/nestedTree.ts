// Nested JSON-tree rendering — a capability distinct from entryFormat's flat
// text lines. DTCG/Style-Dictionary-shaped output nests tokens by their
// segment path (color -> role -> variation, in tokenNameSegments order)
// into a real object tree, with a per-leaf render function producing that
// token's own object ({"$value": ..., "$type": "color"}, etc.) — mirrors
// src/shared/exportEng/helpers.ts's _setNested()/_setNestedSlug(), the same
// mechanism DTCG/Style-Dictionary/React-Native's real formatters already use.
import type { TokenRecord, ScaleStepRecord } from "../data/shapes";
import type { NamingDef, SegmentKind } from "../lang/defs/naming";
import { renderName } from "../lang/defs/naming";

export type LeafRenderFn<T> = (record: T) => unknown;

// Per-segment-TYPE naming override — a real gap found reproducing
// fmtReactNative.theme()'s _setNested() call, whose keyFn applies a
// genuinely different rule per segment kind within ONE tree (variation
// stays _slug/kebab, color and role become _camel), not just one uniform
// NamingDef for the whole call. Optional and additive: a kind absent from
// this map falls through to the call's single `namingDef`, so every
// existing single-NamingDef caller (DTCG/Style Dictionary) is unaffected.
export type PerKindNaming = Partial<Record<SegmentKind, NamingDef>>;

function segmentKey(token: TokenRecord, kind: SegmentKind, namingDef: NamingDef, perKind?: PerKindNaming): string {
  const identity = kind === "color" ? token.data.color : kind === "role" ? token.data.role : kind === "variation" ? token.data.variation : undefined;
  if (!identity) return "";
  const effectiveDef = perKind?.[kind] ?? namingDef;
  // Each segment's OWN key uses the naming def's casing, but only ever as a
  // single segment (never joined with others) — same "per-type key
  // convention" _setNested()'s keyFn parameter already generalizes.
  return renderName([{ kind, identity }], { ...effectiveDef, guardLeadingDigit: false });
}

// Exported directly — the same generic "walk a key path, creating branch
// objects as needed, set the leaf at the end" primitive _setNested() itself
// is, usable against ANY key list (not just token segments), which is what
// Style Dictionary's 2-level color[cLabel][stepKey] scale nesting needs.
export function setNested(root: Record<string, unknown>, keys: string[], leaf: unknown): void {
  let node = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = leaf;
}

export function renderNestedTree(
  tokens: readonly TokenRecord[],
  segments: SegmentKind[],
  namingDef: NamingDef,
  leaf: LeafRenderFn<TokenRecord>,
  perKind?: PerKindNaming
): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const token of tokens) {
    const keys = segments.map((kind) => segmentKey(token, kind, namingDef, perKind)).filter((k) => k.length > 0);
    if (keys.length === 0) continue;
    setNested(root, keys, leaf(token));
  }
  return root;
}

// Scale steps have their own, simpler 2-key shape (color, step) — distinct
// from tokens' 3-segment (color/role/variation) shape, per data/shapes.ts's
// "four shapes, don't conflate them" rule.
export function renderScaleStepTree(
  steps: readonly ScaleStepRecord[],
  namingDef: NamingDef,
  leaf: LeafRenderFn<ScaleStepRecord>
): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const step of steps) {
    const colorKey = renderName([{ kind: "color", identity: step.data.color }], { ...namingDef, guardLeadingDigit: false });
    const stepKey = renderName([{ kind: "step", identity: { name: step.data.stepKey, shorthand: null, segments: [step.data.stepKey] } }], { ...namingDef, guardLeadingDigit: false });
    setNested(root, [colorKey, stepKey], leaf(step));
  }
  return root;
}
