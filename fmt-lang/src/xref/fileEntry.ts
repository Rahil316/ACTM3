// The document's `files[]` entry shape (B.12) — one file-producing
// definition. `role` is this entry's stable identity within the document,
// referenced by other entries via `{{files.<role>.*}}`-style expressions
// (see graph.ts). `repeatFor` is the "once per theme, without hand-authoring
// each repetition" mechanism (§2's multi-file requirement).
import type { RenderFileInput } from "../pipeline/stages";

export interface RepeatFor {
  // The dimension to repeat over — for now, always themes (the only
  // project-declared repetition dimension the Dataset exposes; Part A).
  over: "themes";
  as: string; // the loop-variable name exposed inside this entry's template/path (e.g. "theme")
}

export interface FileEntry {
  role: string;
  repeatFor?: RepeatFor;
  // The output path, itself a template string (may reference the repeatFor
  // loop variable, e.g. "src/tokens/${theme}.css") — resolved the same way
  // content is (Part C is agnostic to which string it's rendering).
  path: string;
  // Exactly one of `render` (the expert path: select/sort/arrange/
  // entryFormat) or `contentTemplate` (B.8's easy path: a whole-file
  // literal template with `${tokens.*}`/`${tokensJs.*}`/etc. block
  // interpolation, see lang/blocks.ts) is set — never both, never neither.
  render?: Omit<RenderFileInput, "records">; // records supplied by the orchestrator per-shape/per-repetition
  contentTemplate?: string;
  shape: "token" | "scaleStep" | "sourceColor" | "sourceAlpha";
  // A files['role'] cross-reference this entry's path/content templates
  // contain, if any — populated by a static scan (graph.ts) before
  // rendering, not authored directly here.
}

export interface RenderedFileInstance {
  role: string;
  loopValue?: string; // the repeatFor value this instance was rendered for (e.g. theme name), if any
  path: string;
  content: string;
}
