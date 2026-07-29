// Whitespace/indentation engine (§3) — the one shared implementation every
// composer (composeBlock.ts, arrange's nested groups) calls through, rather
// than each hand-rolling its own space concatenation.
export function indentLines(text: string, level: number, unit = "  "): string {
  if (level <= 0) return text;
  const prefix = unit.repeat(level);
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? prefix + line : line))
    .join("\n");
}
