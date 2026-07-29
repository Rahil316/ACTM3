// The stdlib entry-format presets (B.5) — each takes an already-resolved
// {name, value, description?, isAdjusted?} view (produced by pipeline
// stage 4, FORMAT — see pipeline/formatValue.ts) and renders one entry's
// text. Open-ended set, not a fixed four (B.5) — more presets can be added
// here without touching anything else.
//
// B.5's rule, applied uniformly: an empty/absent optional field (chiefly
// `description`) is auto-omitted, never emitted as a blank string — matches
// real fmtDTCG.ts-style behavior (confirmed against the actual formatter
// source, see the plan's Part B.5).

export interface FormattedEntry {
  name: string;
  value: string;
  description?: string;
  isAdjusted?: boolean;
}

function hasDescription(e: FormattedEntry): e is FormattedEntry & { description: string } {
  return typeof e.description === "string" && e.description.length > 0;
}

export function cssKeyValue(e: FormattedEntry): string {
  return `  --${e.name}: ${e.value};`;
}

export function scssMapEntry(e: FormattedEntry): string {
  return `  "${e.name}": ${e.value},`;
}

// Renders the {"value": ..., "description": ...} object body (no outer
// braces — composeBlock, Part C stage 6, wraps entries into their
// surrounding collection structure) with description auto-omitted when absent.
export function jsonKeyValue(e: FormattedEntry): string {
  const parts = [`"value": "${e.value}"`];
  if (hasDescription(e)) parts.push(`"description": "${e.description}"`);
  return `"${e.name}": { ${parts.join(", ")} }`;
}

export function xmlElement(e: FormattedEntry): string {
  return `<color name="${e.name}">${e.value}</color>`;
}

export function xmlAttribute(e: FormattedEntry): string {
  const desc = hasDescription(e) ? ` description="${e.description}"` : "";
  return `<color name="${e.name}" value="${e.value}"${desc}/>`;
}

export function swiftStaticLet(e: FormattedEntry): string {
  return `  static let ${e.name} = ${e.value}`;
}

// Android resource-entry shape — distinct from generic xmlElement, matches
// real res/values/colors.xml conventions (see the plan's B.5).
export function kotlinAndroidResource(e: FormattedEntry): string {
  return `    <color name="${e.name}">${e.value}</color>`;
}

export function markdownTableRow(e: FormattedEntry): string {
  const desc = hasDescription(e) ? e.description : "";
  return `| ${e.name} | ${e.value} | ${desc} |`;
}

export const ENTRY_PRESETS = {
  cssKeyValue,
  scssMapEntry,
  jsonKeyValue,
  xmlElement,
  xmlAttribute,
  swiftStaticLet,
  kotlinAndroidResource,
  markdownTableRow,
} as const;

export type EntryPresetName = keyof typeof ENTRY_PRESETS;
