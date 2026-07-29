// Pipeline stage 6 — COMPOSE-BLOCK: assemble entries per the ARRANGE
// structure, attach before/after static content, apply conditional
// composition hooks (B.11's onGroupStart/onGroupEnd), apply indentation ->
// final block text (Part C). This is the stage every out-of-the-box block
// (B.8) and every expert-path files[] entry's rendering ultimately goes
// through.
import type { AnyRecord } from "../data/shapes";
import type { ArrangedTree } from "../lang/defs/arrange";
import { indentLines } from "./indent";
import type { EntryFormatFn } from "./composeEntry";
import { composeEntry } from "./composeEntry";
import type { NamingDef } from "../lang/defs/naming";
import type { ValueFormatDef, ReferenceStyle } from "../lang/defs/valueFormat";
import type { ResolveNamingSegments } from "./formatValue";
import type { OutputKind } from "../lang/stdlib/escaping";

export interface ComposeOptions {
  namingDef: NamingDef;
  valueFormatDef: ValueFormatDef;
  resolveSegments: ResolveNamingSegments;
  entryFormat: EntryFormatFn;
  outputKind?: OutputKind;
  referenceStyle?: ReferenceStyle;
  // B.11's group-header hooks — called once per new group at each nesting
  // level, with the raw group key; return text to insert before/after that
  // group's own entries (e.g. "/* {colorName} */"). Absent = no header/footer.
  onGroupStart?: (groupKey: string, depth: number) => string;
  onGroupEnd?: (groupKey: string, depth: number) => string;
}

function composeRecords(records: AnyRecord[], opts: ComposeOptions): string[] {
  return records.map((r) =>
    composeEntry(r, opts.namingDef, opts.valueFormatDef, opts.resolveSegments, opts.entryFormat, opts.outputKind, opts.referenceStyle)
  );
}

function composeTree(tree: ArrangedTree, opts: ComposeOptions, depth: number): string {
  if (tree.kind === "leaf") {
    return composeRecords(tree.records, opts).join("\n");
  }
  if (tree.kind === "flat") {
    return composeRecords(tree.records, opts).join(tree.join);
  }
  // nested
  const parts: string[] = [];
  for (const group of tree.groups) {
    const header = opts.onGroupStart ? opts.onGroupStart(group.key, depth) : "";
    const footer = opts.onGroupEnd ? opts.onGroupEnd(group.key, depth) : "";
    const childText = composeTree(group.children, opts, depth + 1);
    const indented = indentLines(childText, 0); // children already at their own level; indent applied per nesting level below
    const pieces = [header, indented, footer].filter((p) => p.length > 0);
    parts.push(pieces.join("\n"));
  }
  const joined = parts.join("\n");
  return depth === 0 ? joined : indentLines(joined, 1, " ".repeat(tree.indent));
}

export function composeBlock(tree: ArrangedTree, opts: ComposeOptions, before?: string, after?: string): string {
  const body = composeTree(tree, opts, 0);
  const parts = [before, body, after].filter((p): p is string => p !== undefined && p.length > 0);
  return parts.join("\n");
}
