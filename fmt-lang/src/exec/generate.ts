// The public generate() entry point (Part F) — pure: (Dataset, ParsedConfig)
// -> {files, diagnostics}. GeneratedFile deliberately mirrors the existing
// ExportFile shape in src/shared/exportEng/types.ts (structurally, not by
// import) to keep the CLI bridge trivial (Part G).
import type { Dataset } from "../data/dataset";
import type { FileEntry } from "../xref/fileEntry";
import { renderAllFiles } from "../xref/render";
import { checkCycles } from "../validate/runtime";
import type { Diagnostic } from "../validate/diagnostics";
import { hasErrors } from "../validate/diagnostics";

export interface GeneratedFile {
  path: string;
  content: string;
  role?: string;
}

export interface ParsedDocument {
  files: FileEntry[];
}

export interface GenerateResult {
  files: GeneratedFile[];
  diagnostics: Diagnostic[];
}

// Orchestration order (Part E): by the time `generate()` is called, syntax/
// semantic diagnostics (Part E categories 1-2) are assumed already checked
// by the caller against the parsed document (see validate/syntax.ts,
// validate/semantic.ts) — generate() itself performs the remaining
// late-semantic check that needs the real Dataset (cycle detection over
// repeatFor-expanded nodes) before rendering anything, exactly as Part E's
// orchestration order specifies.
export function generate(doc: ParsedDocument, dataset: Dataset): GenerateResult {
  const cycleDiagnostics = checkCycles(doc.files, dataset);
  if (hasErrors(cycleDiagnostics)) {
    return { files: [], diagnostics: cycleDiagnostics };
  }

  const rendered = renderAllFiles(doc.files, dataset);
  const files: GeneratedFile[] = rendered.map((r) => ({ path: r.path, content: r.content, role: r.role }));
  return { files, diagnostics: cycleDiagnostics };
}
