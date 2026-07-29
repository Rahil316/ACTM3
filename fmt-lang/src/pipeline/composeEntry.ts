// Pipeline stage 5 — COMPOSE-ENTRY: apply entryFormat per already-formatted
// record (Part C). One text unit per record; stage 6 (composeBlock)
// assembles these per the arrange structure.
import type { AnyRecord } from "../data/shapes";
import type { NamingDef } from "../lang/defs/naming";
import type { ValueFormatDef } from "../lang/defs/valueFormat";
import type { ReferenceStyle } from "../lang/defs/valueFormat";
import { formatValue, type ResolveNamingSegments } from "./formatValue";
import type { FormattedEntry } from "../lang/stdlib/entryPresets";
import { escapeForOutputKind, type OutputKind } from "../lang/stdlib/escaping";

export type EntryFormatFn = (entry: FormattedEntry) => string;

export function composeEntry(
  record: AnyRecord,
  namingDef: NamingDef,
  valueFormatDef: ValueFormatDef,
  resolveSegments: ResolveNamingSegments,
  entryFormat: EntryFormatFn,
  outputKind: OutputKind = "none",
  referenceStyle?: ReferenceStyle
): string {
  const entry = formatValue(record, namingDef, valueFormatDef, resolveSegments, referenceStyle);
  const escaped: FormattedEntry = {
    name: escapeForOutputKind(entry.name, outputKind),
    value: escapeForOutputKind(entry.value, outputKind),
    description: entry.description !== undefined ? escapeForOutputKind(entry.description, outputKind) : undefined,
    isAdjusted: entry.isAdjusted,
  };
  return entryFormat(escaped);
}
