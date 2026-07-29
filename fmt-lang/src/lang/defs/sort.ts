// The "sort" definition kind (B.6) — always operates on RAW record fields
// (Part C's canonical rule: structural decisions see raw data, never
// already-formatted strings). A mandatory pipeline stage (Part C stage 2) —
// when no sort def is referenced, the Dataset's own canonical order is used
// instead of leaving output to incidental array order (the Determinism
// requirement, §3).
import type { AnyRecord } from "../../data/shapes";
import { getRawField } from "../../pipeline/rawField";

export type SortOrder = "declared" | "alpha" | "numeric" | "manual";

export interface SortKey {
  by: string; // a dot-path field name, e.g. "theme", "contrast.ratio"
  order: SortOrder;
  direction?: "asc" | "desc"; // default "asc"
  values?: string[]; // required when order is "manual" — explicit priority list
  // Only meaningful for order: "declared" — the reference ordering to sort
  // against (e.g. Dataset.themeNames) when the field's own declared project
  // order isn't simply "first-seen in the input array".
  declaredOrder?: string[];
}

export interface SortDef {
  keys: SortKey[];
}

function compareValues(a: unknown, b: unknown, key: SortKey): number {
  const dir = key.direction === "desc" ? -1 : 1;
  if (key.order === "manual") {
    const values = key.values ?? [];
    const ia = values.indexOf(String(a));
    const ib = values.indexOf(String(b));
    // Unlisted values sort after every listed one, in encounter order —
    // never silently dropped or thrown on.
    return dir * ((ia === -1 ? values.length : ia) - (ib === -1 ? values.length : ib));
  }
  if (key.order === "numeric") {
    const na = typeof a === "number" ? a : Number.NaN;
    const nb = typeof b === "number" ? b : Number.NaN;
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1; // nulls/non-numbers sort last, never throw
    if (Number.isNaN(nb)) return -1;
    return dir * (na - nb);
  }
  if (key.order === "declared" && key.declaredOrder) {
    const ia = key.declaredOrder.indexOf(String(a));
    const ib = key.declaredOrder.indexOf(String(b));
    return dir * ((ia === -1 ? key.declaredOrder.length : ia) - (ib === -1 ? key.declaredOrder.length : ib));
  }
  // "alpha" (and "declared" with no declaredOrder given — falls back to
  // alpha rather than throwing, since presenting SOME deterministic order
  // is always better than an unresolved sort key).
  return dir * String(a ?? "").localeCompare(String(b ?? ""));
}

export function sortRecords<T extends AnyRecord>(records: T[], def: SortDef): T[] {
  const withIndex = records.map((r, i) => ({ r, i })); // stable-sort guarantee
  withIndex.sort((x, y) => {
    for (const key of def.keys) {
      const va = getRawField(x.r, key.by);
      const vb = getRawField(y.r, key.by);
      const c = compareValues(va, vb, key);
      if (c !== 0) return c;
    }
    return x.i - y.i; // tie -> preserve original (already-canonical) order
  });
  return withIndex.map((x) => x.r);
}
