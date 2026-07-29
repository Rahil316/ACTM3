// The "naming" definition kind (B.3) — turns a record's identity segments
// into a final name string. appliesTo is the shape-tag enforcement point
// (checked by semantic validation, Part E) — not enforced here, since this
// module only renders; it assumes validation already confirmed the shape
// match.
import type { ShapeTag, IdentityLabel } from "../../data/shapes";
import { applyCase, ensureNotLeadingDigit, type CaseStyle } from "../stdlib/casing";
import { evaluateString } from "../expr";

export type SegmentKind = "color" | "role" | "variation" | "step";

export interface NamingDef {
  appliesTo: ShapeTag | ShapeTag[];
  // Either an explicit ordered list, or the literal string "$segments"
  // (resolved against the real Dataset's own tokenNameSegments at RENDER
  // time — see xref/render.ts's resolveDatasetSegments — since parse time,
  // where documents/defs are otherwise resolved, has no Dataset yet).
  // renderName() itself only ever receives the already-resolved array form;
  // "$segments" only appears in a def as originally authored/parsed.
  segments: SegmentKind[] | "$segments";
  case: CaseStyle | "custom";
  separator?: string; // only meaningful for case: "custom" with no `join`
  // "custom" only. An expression, evaluated once per GAP between two
  // adjacent segments (not once for the whole array — the embedded
  // expression language deliberately has no array methods/lambdas, B.1's
  // trust/validation rationale), with an implicit `index` variable (the
  // 0-based position of that gap). Its stringified result becomes the
  // separator at that one position. Overrides `separator` when set —
  // e.g. "index == 0 ? '' : '__'" joins the first two segments directly,
  // every later pair with "__".
  join?: string;
  // B.3's expandSlashSegments — splice each segment's own "/"-split identity
  // into the final list, in place, rather than treating the whole segment
  // as one atomic (possibly slash-containing) string.
  expandSlashSegments?: boolean;
  rewrite?: Record<string, string>; // "type:rawName" -> literal replacement
  // B.3a guardrail #1 — on by default; a user targeting only CSS (where a
  // leading digit is fine) can opt out.
  guardLeadingDigit?: boolean;
  // Use each segment's shorthand (falling back to its raw name when the
  // project declared none) instead of the raw name. Mirrors _colorLabel's/
  // _roleLabel's/_varLabel's own useShorthandColors/Roles/Variations-driven
  // choice — a naming def is where fmt-lang expresses that same choice,
  // rather than it being implicit/automatic. expandSlashSegments still
  // takes priority when both are set (a slash-named shorthand still expands).
  preferShorthand?: boolean;
}

export const DEFAULT_NAMING: NamingDef = {
  appliesTo: ["token", "scaleStep", "sourceColor", "sourceAlpha"],
  segments: ["color", "role", "variation"],
  case: "kebab",
  guardLeadingDigit: true,
};

// Applies rewrite/preferShorthand/expandSlashSegments to one segment's
// IdentityLabel, producing the flat string-list that actually gets cased
// and joined.
function resolveSegmentStrings(kind: SegmentKind, identity: IdentityLabel, def: NamingDef): string[] {
  const rewriteKey = `${kind}:${identity.name}`;
  if (def.rewrite && def.rewrite[rewriteKey] !== undefined) {
    return [def.rewrite[rewriteKey]];
  }
  const display = def.preferShorthand && identity.shorthand ? identity.shorthand : identity.name;
  if (def.expandSlashSegments) return display.split("/");
  return [display];
}

export function renderName(
  segmentIdentities: { kind: SegmentKind; identity: IdentityLabel }[],
  def: NamingDef
): string {
  const allStrings = segmentIdentities.flatMap((s) => resolveSegmentStrings(s.kind, s.identity, def));
  let out: string;
  if (def.case === "custom") {
    if (def.join) {
      const joinExpr = def.join;
      out = allStrings.reduce((acc, seg, i) => (i === 0 ? seg : `${acc}${evaluateString(joinExpr, { vars: { index: i - 1 } })}${seg}`), "");
    } else {
      out = allStrings.join(def.separator ?? "-");
    }
  } else {
    out = applyCase(def.case, allStrings);
  }
  if (def.guardLeadingDigit !== false) out = ensureNotLeadingDigit(out);
  return out;
}
