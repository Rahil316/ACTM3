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
  // group by, or "$segments" (resolved by the caller against the Dataset's
  // live tokenNameSegments before this module ever sees it — see B.7/B.3).
  groupBy?: string[];
  indent?: number; // spaces per nesting level, default 2
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
