// Public API surface of fmt-lang — this is the one file the CLI bridge
// (cli/src/build.ts, per the plan's Part G) imports from. Kept intentionally
// small and stable; internal modules under data/, lang/, pipeline/, xref/,
// validate/, exec/ are implementation detail, not part of the public surface.
//
// Filled in incrementally as each build phase lands real functionality:
//   Phase 1 — buildDataset, Dataset
//   Phase 2/3 — parse/generate over a single document
//   Phase 4 — Diagnostic, diagnostic categories
//   Phase 6 — write (file-safety policy)
export {};
