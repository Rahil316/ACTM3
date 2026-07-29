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
// conservative: only checks fields named "where" or "join" (naming's
// case:"custom" join expression, B.3) — both are ALWAYS a pure expression,
// never a template string with embedded expressions. Template/entryFormat
// strings can embed literal text around expressions and need the
// interpolation-aware scan used elsewhere (checkTemplateExpressionSyntax,
// kept out of scope here to avoid false positives on plain text that merely
// contains "${...}"-looking substrings).
export function checkExpressionSyntax(doc: unknown, path = ""): Diagnostic[] {
  const out: Diagnostic[] = [];
  if (doc === null || typeof doc !== "object") return out;
  for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
    const fieldPath = path ? `${path}.${key}` : key;
    if ((key === "where" || key === "join") && typeof value === "string") {
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
