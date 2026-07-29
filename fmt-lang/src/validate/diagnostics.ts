// The shared Diagnostic type (Part E) — every validation module produces
// these, tagged by category, so a consumer can filter/group rather than
// getting one undifferentiated list (§5's explicit requirement).
export type DiagnosticCategory = "syntax" | "semantic" | "runtime" | "warning";
export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  message: string;
  // Whichever is available for this category — a source span (syntax), a
  // def/field path like "defs.entryFormat.cssVar" (semantic), or a record
  // identity (runtime). Never required to be present; never guessed at.
  loc?: string;
  code: string;
}

export function diagnostic(
  category: DiagnosticCategory,
  severity: DiagnosticSeverity,
  code: string,
  message: string,
  loc?: string
): Diagnostic {
  return { category, severity, code, message, loc };
}

export class ValidationAbortError extends Error {
  constructor(public diagnostics: Diagnostic[]) {
    super(`Validation failed with ${diagnostics.length} error(s): ${diagnostics.map((d) => d.message).join("; ")}`);
  }
}

export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === "error");
}
