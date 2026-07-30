// Syntax validation (Part E, category 1) — malformed JSON5, invalid
// expression syntax inside a `where`/naming/entryFormat template. Runs
// immediately after the document is parsed as JSON5, with zero dependency
// on Dataset or even resolved defs. Reported with position when the
// underlying error provides one (ExprSyntaxError does; JSON.parse's own
// SyntaxError generally doesn't — no position is invented when unavailable).
import { diagnostic, type Diagnostic } from "./diagnostics";
import { ExprSyntaxError, evaluate } from "../lang/expr";

// A light JSON5 preprocessor: strips // and /* */ comments and trailing
// commas before handing off to JSON.parse — covers JSON5's practical
// syntax (B.1's decision) without a hand-rolled tokenizer, since JSON.parse
// already correctly implements the (much larger) core JSON grammar.
export function stripJson5Extras(src: string): string {
  let out = "";
  let inString: '"' | "'" | null = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (inString) {
      out += c;
      if (c === "\\") { out += next; i++; continue; }
      if (c === inString) inString = null;
      continue;
    }
    if (c === '"' || c === "'") { inString = c as '"' | "'"; out += '"'; continue; }
    if (c === "/" && next === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && next === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++; i++; continue; }
    out += c;
  }
  // Trailing commas before } or ] — the other practical JSON5 extra worth
  // supporting explicitly.
  return out.replace(/,(\s*[}\]])/g, "$1");
}

export function parseDocument(src: string): { value: unknown; diagnostics: Diagnostic[] } {
  try {
    const cleaned = stripJson5Extras(src);
    return { value: JSON.parse(cleaned), diagnostics: [] };
  } catch (err) {
    return {
      value: undefined,
      diagnostics: [diagnostic("syntax", "error", "invalid-json5", `Document is not valid JSON5: ${(err as Error).message}`)],
    };
  }
}

// Recursively finds every string value in a parsed document that LOOKS like
// an expression-bearing field (where/join) and attempts to parse it with the
// expression grammar — surfacing an ExprSyntaxError as a syntax diagnostic
// rather than letting it throw later at render time. Deliberately
// conservative: only checks `where`, and `join` when its containing object
// also has a `case` sibling field (NamingDef's own required discriminant —
// see lang/defs/naming.ts). Both are ALWAYS a pure expression, never a
// template string with embedded expressions. Template/entryFormat strings
// can embed literal text around expressions and need the interpolation-aware
// scan used elsewhere (checkTemplateExpressionSyntax, kept out of scope here
// to avoid false positives on plain text that merely contains
// "${...}"-looking substrings).
//
// A real bug found running actual templates through the CLI: `join` isn't
// unique to naming defs — ArrangeDef.join (arrange.ts) is a plain separator
// STRING (e.g. "\n"), never an expression, but shares the field name with
// NamingDef's real join expression (B.3). The original version of this
// function checked the key name alone, so a perfectly valid
// `"arrange": { "join": "\n" }` failed to parse with a bogus
// "Unexpected token '<eof>'" syntax error. ArrangeDef has no `case` field at
// all, so gating on the sibling `case` field's presence disambiguates the
// two without needing to track "which def kind is this nested under"
// through the recursion.
export function checkExpressionSyntax(doc: unknown, path = ""): Diagnostic[] {
  const out: Diagnostic[] = [];
  if (doc === null || typeof doc !== "object") return out;
  const record = doc as Record<string, unknown>;
  const isNamingDef = typeof record.case === "string";
  for (const [key, value] of Object.entries(record)) {
    const fieldPath = path ? `${path}.${key}` : key;
    const isExpressionField = key === "where" || (key === "join" && isNamingDef);
    if (isExpressionField && typeof value === "string") {
      try {
        evaluate(value, {});
      } catch (err) {
        if (err instanceof ExprSyntaxError) {
          out.push(diagnostic("syntax", "error", "invalid-expression", `Invalid expression at ${fieldPath}: ${err.message}`, fieldPath));
        }
      }
      continue;
    }
    if (value !== null && typeof value === "object") {
      out.push(...checkExpressionSyntax(value, fieldPath));
    }
  }
  return out;
}
