// The "select" definition kind (B.9/B.2b) — an inclusive query over one
// shape's records. `where` is an expression (see lang/expr.ts) evaluated
// per-record; a record passes when it evaluates truthy. Chainable at point
// of use (B.9): a named select's own `where` is ANDed with any additional
// `where` supplied where it's referenced, never replaced.
import type { ShapeTag, AnyRecord } from "../../data/shapes";
import { evaluate, type ExprContext } from "../expr";

export interface SelectDef {
  shape: ShapeTag;
  where?: string; // an expression string; absent = "all records of this shape"
}

export function matchesWhere(record: AnyRecord, where: string | undefined, ctx: ExprContext): boolean {
  if (!where) return true;
  const result = evaluate(where, { ...ctx, record });
  return isTruthy(result);
}

// B.1a's rule, applied here too: null/undefined -> false, never a crash.
function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
  if (typeof value === "string") return value.length > 0;
  return true;
}

export function selectRecords<T extends AnyRecord>(records: readonly T[], def: SelectDef, ctx: ExprContext): T[] {
  return records.filter((r) => matchesWhere(r, def.where, ctx));
}

// B.9's chaining: run the named select first, then AND an additional where
// onto its result — never a replacement of the named select's own filter.
export function narrowSelection<T extends AnyRecord>(records: readonly T[], additionalWhere: string | undefined, ctx: ExprContext): T[] {
  if (!additionalWhere) return records.slice();
  return records.filter((r) => matchesWhere(r, additionalWhere, ctx));
}
