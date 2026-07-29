// Public API surface of fmt-lang — this is the one module the CLI bridge
// (cli/src/build.ts, per the plan's Part G) imports from. Kept intentionally
// small and stable; internal modules under data/, lang/, pipeline/, xref/,
// validate/, exec/ are implementation detail, not part of the public
// surface. Named exports only (never a default export) so future internal
// relocations never force import-site rewrites.
export { buildDataset, buildDatasetWithWarnings } from "./data/adapter";
export type { Dataset } from "./data/dataset";
export { parseFmtLangDocument } from "./lang/document";
export { generate } from "./exec/generate";
export type { GeneratedFile, GenerateResult, ParsedDocument } from "./exec/generate";
export { write } from "./exec/write";
export type { WriteOptions, WriteResultEntry, FileWriteStatus } from "./exec/write";
export type { Diagnostic, DiagnosticCategory, DiagnosticSeverity } from "./validate/diagnostics";
