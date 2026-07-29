// Pure string-casing transforms — the "case" values a naming definition
// (B.3) can select. Each takes an ALREADY-SPLIT segment list (never a raw,
// unsplit name) and joins it under that casing convention; splitting is the
// caller's job (segment selection/expansion, B.3's expandSlashSegments).

export type CaseStyle = "camel" | "snake" | "kebab" | "pascal" | "screaming";

// A single word's own internal capitalization is normalized before
// recombining — "iOS" and "IOS" both become "i-os"/"ios" consistently,
// rather than preserving whatever casing the source data happened to use.
function words(segment: string): string[] {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.toLowerCase());
}

function allWords(segments: string[]): string[] {
  return segments.flatMap(words);
}

export function toKebab(segments: string[]): string {
  return allWords(segments).join("-");
}

export function toSnake(segments: string[]): string {
  return allWords(segments).join("_");
}

export function toCamel(segments: string[]): string {
  const w = allWords(segments);
  return w.map((word, i) => (i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))).join("");
}

export function toPascal(segments: string[]): string {
  const w = allWords(segments);
  return w.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
}

export function toScreaming(segments: string[]): string {
  return allWords(segments).join("_").toUpperCase();
}

export function applyCase(style: CaseStyle, segments: string[]): string {
  switch (style) {
    case "kebab": return toKebab(segments);
    case "snake": return toSnake(segments);
    case "camel": return toCamel(segments);
    case "pascal": return toPascal(segments);
    case "screaming": return toScreaming(segments);
  }
}

// B.3a guardrail #1: a name that would start with a digit is prefixed with
// "_" — safe as a bare JS/TS identifier/object key in every context, not
// just as a CSS custom property (where a leading digit is fine).
export function ensureNotLeadingDigit(name: string): string {
  return /^[0-9]/.test(name) ? "_" + name : name;
}
