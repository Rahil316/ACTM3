// Shared dot-path field access on a raw (tagged) record — the same
// "reach through .data transparently, propagate null on a missing
// intermediate rather than throw" logic lang/expr.ts's getField()
// implements, factored out so sort.ts (which needs raw field access
// WITHOUT going through the expression parser) doesn't duplicate it.
import type { AnyRecord } from "../data/shapes";

export function getRawField(record: AnyRecord, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = (record as unknown as { data: Record<string, unknown> }).data;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}
