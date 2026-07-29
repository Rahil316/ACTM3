// Shape-mismatch enforcement (Part E, category 2 — the primary place §1's
// requirement is enforced): every definition's appliesTo shape is checked
// against the shape of whatever select it's combined with. This is the
// direct type-level continuation of data/shapes.ts's tagging — validated
// here, statically, before any Dataset exists.
import type { ShapeTag } from "../data/shapes";
import { fieldSchemaFor } from "../data/dataset";
import { diagnostic, type Diagnostic } from "./diagnostics";

function appliesToIncludes(appliesTo: ShapeTag | ShapeTag[], shape: ShapeTag): boolean {
  return Array.isArray(appliesTo) ? appliesTo.includes(shape) : appliesTo === shape;
}

// Checks one (definitionKind, definitionName, appliesTo) pair against the
// shape a files[] entry actually selects — the concrete "token-shaped
// entryFormat used against a scale-step-shaped select" case (Part E).
export function checkShapeMatch(
  definitionKind: string,
  definitionName: string,
  appliesTo: ShapeTag | ShapeTag[],
  actualShape: ShapeTag,
  fieldPath: string
): Diagnostic[] {
  if (appliesToIncludes(appliesTo, actualShape)) return [];
  const appliesToStr = Array.isArray(appliesTo) ? appliesTo.join(" | ") : appliesTo;
  return [
    diagnostic(
      "semantic",
      "error",
      "shape-mismatch",
      `${definitionKind} "${definitionName}" expects shape "${appliesToStr}" but is applied to a selection producing shape "${actualShape}" (at ${fieldPath}).`,
      fieldPath
    ),
  ];
}

// Checks a `where` expression's referenced fields against the shape's
// declared field schema — a field that doesn't exist for that shape is
// caught here, never a silent empty-set result at runtime (§1's explicit
// requirement). Only checks the OUTERMOST field name referenced (e.g.
// "contrast" in "contrast.ratio > 4.5") since that's what the schema
// tracks; a genuinely unknown NESTED field (e.g. "color.bogus") isn't
// distinguishable from "resolves to null, legitimately" without a much
// richer per-shape type, so it's intentionally out of scope here — the
// outermost-field check already catches the concrete case §1 names
// (applying a token-only field like contrast.ratio to a scaleStep select).
const FIELD_REF_RE = /\b([a-zA-Z_][a-zA-Z0-9_]*)(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*\b/g;
const RESERVED_WORDS = new Set(["true", "false", "null"]);
const STRING_LITERAL_RE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g;

// String literal CONTENTS must never be scanned for field references — a
// real bug found via §7.3's acceptance test: "theme == 'light'" was
// incorrectly flagging "light" itself as an unknown field, because the
// original regex had no awareness of quote boundaries. Blanking out
// literal contents (preserving the quotes and overall string length, so
// error positions/messages built from the original `where` text stay
// accurate) before scanning fixes this at the source rather than trying to
// special-case every possible field-reference regex match site.
function blankStringLiterals(text: string): string {
  return text.replace(STRING_LITERAL_RE, (m) => m[0] + " ".repeat(m.length - 2) + m[0]);
}

export function checkWhereFields(where: string, shape: ShapeTag, fieldPath: string): Diagnostic[] {
  const schema = fieldSchemaFor(shape);
  const scanTarget = blankStringLiterals(where);
  const out: Diagnostic[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  FIELD_REF_RE.lastIndex = 0;
  while ((m = FIELD_REF_RE.exec(scanTarget)) !== null) {
    const outer = m[1];
    if (RESERVED_WORDS.has(outer) || /^[0-9]/.test(outer) || seen.has(outer)) continue;
    seen.add(outer);
    // Skip anything immediately followed by "(" — a function call, not a field.
    const afterIdx = m.index + outer.length;
    if (where[afterIdx] === "(") continue;
    if (!schema[outer]) {
      out.push(
        diagnostic(
          "semantic",
          "error",
          "unknown-field",
          `"${outer}" is not a field on shape "${shape}" (at ${fieldPath}: "${where}").`,
          fieldPath
        )
      );
    }
  }
  return out;
}
