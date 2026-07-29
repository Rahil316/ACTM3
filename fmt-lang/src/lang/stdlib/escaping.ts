// String escaping for the two structured outputKinds Part C's pipeline
// supports (§3's "Escaping" requirement) — applied automatically to every
// interpolated value when a file/document declares outputKind: "json" or
// "xml", so a value containing a quote/backslash/control character never
// silently produces invalid output.

export function escapeJsonString(value: string): string {
  // JSON.stringify already implements the full JSON string-escaping rules
  // correctly (quotes, backslashes, control chars, unicode) — reusing it
  // and stripping the wrapping quotes is simpler and more correct than
  // hand-rolling the same escape table again.
  return JSON.stringify(value).slice(1, -1);
}

export function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value).replace(/"/g, "&quot;");
}

export type OutputKind = "json" | "xml" | "none";

export function escapeForOutputKind(value: string, kind: OutputKind): string {
  switch (kind) {
    case "json": return escapeJsonString(value);
    case "xml": return escapeXmlAttribute(value);
    case "none": return value;
  }
}
