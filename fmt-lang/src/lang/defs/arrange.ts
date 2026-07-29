// The "arrange" definition kind (B.7) — groups/nests an already-sorted
// record array. Structural — operates on RAW records (Part C's canonical
// rule), same as sort. Produces an ArrangedTree that pipeline/composeBlock.ts
// walks to build the final text, attaching group headers via
// onGroupStart/onGroupEnd (B.11) where requested.
import type { AnyRecord } from "../../data/shapes";
import { getRawField } from "../../pipeline/rawField";

export type ArrangeKind = "flat" | "nested";

export interface ArrangeDef {
  kind: ArrangeKind;
  join?: string; // "flat" only — default "\n"
  // "nested" only. Either an explicit ordered list of raw-field dot-paths to
  // group by, or the literal string "$segments" (resolved against the real
  // Dataset's own tokenNameSegments at RENDER time — see xref/render.ts's
  // resolveDatasetSegments — parse time has no Dataset yet). arrangeRecords()
  // itself only ever receives the already-resolved array form.
  groupBy?: string[] | "$segments";
  indent?: number; // spaces per nesting level, default 2
  // B.11's group-header/footer hooks, document-facing: a template string
  // (entryFormat.template's same `${...}`-interpolation mechanism) with an
  // implicit `group` variable exposing the group's own raw key — e.g.
  // "/* ${group} */" for a "// Primary"-style comment before each color's
  // block. Only meaningful for kind: "nested"; ignored for "flat".
  groupHeaderTemplate?: string;
  groupFooterTemplate?: string;
}

export const DEFAULT_ARRANGE: ArrangeDef = { kind: "flat", join: "\n" };

// A flat list of records in their already-sorted order — the "flat" kind's
// entire job, since composeEntry (Part C stage 5) does the per-record text
// rendering; arrange only decides grouping/nesting STRUCTURE.
export interface FlatArrangement {
  kind: "flat";
  records: AnyRecord[];
  join: string;
}

export interface NestedGroup {
  key: string; // the raw grouping value at this level
  children: ArrangedTree;
}

export interface NestedArrangement {
  kind: "nested";
  groups: NestedGroup[];
  indent: number;
}

export type ArrangedTree =
  | FlatArrangement
  | NestedArrangement
  | { kind: "leaf"; records: AnyRecord[] };

function groupByField(records: AnyRecord[], field: string): NestedGroup[] {
  // First-seen order (not sorted alphabetically) — matches every real
  // built-in formatter's own grouping convention (confirmed against
  // fmtCSS.ts's _groupByColor: "preserving first-seen order").
  const order: string[] = [];
  const buckets = new Map<string, AnyRecord[]>();
  for (const r of records) {
    const key = String(getRawField(r, field) ?? "");
    let bucket = buckets.get(key);
    if (!bucket) { bucket = []; buckets.set(key, bucket); order.push(key); }
    bucket.push(r);
  }
  return order.map((key) => ({ key, children: { kind: "leaf", records: buckets.get(key)! } }));
}

export function arrangeRecords(records: AnyRecord[], def: ArrangeDef): ArrangedTree {
  if (def.kind === "flat") {
    return { kind: "flat", records, join: def.join ?? "\n" };
  }
  // "$segments" must already be resolved to a real array by the time this
  // runs (see xref/render.ts's resolveDatasetSegments) — this module has no
  // Dataset to resolve it against itself. Caught here rather than silently
  // misbehaving (a bare string would otherwise be iterated character-by-
  // character below, since strings have a numeric .length too).
  if (def.groupBy === "$segments") {
    throw new Error(`arrangeRecords: groupBy "$segments" was never resolved against a real Dataset before reaching arrangeRecords — this is an engine-internal ordering bug, not a user config error.`);
  }
  const fields = def.groupBy ?? [];
  const indent = def.indent ?? 2;
  if (fields.length === 0) return { kind: "leaf", records };

  function buildLevel(recs: AnyRecord[], levelIndex: number): ArrangedTree {
    if (levelIndex >= fields.length) return { kind: "leaf", records: recs };
    const groups = groupByField(recs, fields[levelIndex]);
    return {
      kind: "nested",
      indent,
      groups: groups.map((g) => ({ key: g.key, children: buildLevel((g.children as { records: AnyRecord[] }).records, levelIndex + 1) })),
    };
  }
  return buildLevel(records, 0);
}
