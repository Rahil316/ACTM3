// The "script" export format — the lightest-weight custom-export option:
// a user writes a plain .ts/.js file shaped like any fmt*.ts formatter in
// this folder (see fmtReactNative.ts for the pattern this mirrors), points
// wand.config.json at it, and the CLI calls it directly. No template
// language, no DSL, no fmt-lang engine — this is the "just give me the
// same pre-resolved data every built-in formatter gets, and let me write
// real TypeScript" option. For a config-driven templating language instead
// of code, see fmt-lang/ (the "custom" format).
//
// Deliberately the ONE place in this repo that runs a user-authored file as
// code, rather than data — cli/src/loadConfig.ts's own header comment notes
// the CLI config is "Plain JSON on purpose: no runtime TS/JS execution."
// The "script" format is an explicit, opt-in exception to that principle,
// not an oversight: a user who reaches for it is choosing to trust their
// own template file the same way they'd trust any other code dependency in
// their project. See how-to.md for the full explanation and exposed shapes.
import type { EngineResult, ExportConfig } from './types';
import { resolveExport, resolveScaleSteps, type ResolvedToken, type ResolvedScaleStep } from './resolve';
import { _eachSourceColor, type SourceColorEntry } from './helpers';

// Everything a script template needs, pre-resolved exactly the way every
// built-in fmt*.ts formatter already receives it — see resolve.ts/
// helpers.ts for what each field actually contains.
export interface ScriptExportContext {
  result: EngineResult;
  config: ExportConfig;
  tokens: ResolvedToken[];
  scaleSteps: ResolvedScaleStep[];
  sourceColors: SourceColorEntry[];
}

// A script's default export is either ONE file's content (the target's own
// `outDir` + a filename the CLI derives — see build.ts), or several files
// at once (each with its own path, relative to outDir) for a React-Native-
// style theme-file-plus-index case.
export interface ScriptExportFile {
  path: string;
  content: string;
}

export type ScriptExportFn = (ctx: ScriptExportContext) => string | ScriptExportFile[];

export function buildScriptExportContext(result: EngineResult, config: ExportConfig): ScriptExportContext {
  const { tokens } = resolveExport(result, config);
  const scaleSteps = resolveScaleSteps(result, config);
  const sourceColors = _eachSourceColor(config);
  return { result, config, tokens, scaleSteps, sourceColors };
}

export class ScriptExportError extends Error {}

// Runs a loaded script's default export against the real project data,
// converting the two things a user's template can get wrong INTO a clear
// ScriptExportError rather than letting them surface as an opaque crash or
// (for the return-shape check) silently produce a broken/wrong file:
//   1. the module has no usable default export at all (wrong file, or a
//      named export instead of `export default`)
//   2. the function's return value isn't a string or a well-formed
//      ScriptExportFile[] (a template bug, not a project-data problem — a
//      script that runs successfully but returns e.g. `undefined` should
//      still be caught here, not written to disk as "undefined")
// Anything the SCRIPT's own logic throws (a real bug in the user's code) is
// intentionally NOT caught here — it propagates as-is, with the user's own
// stack trace, since fabricating a different error would hide exactly the
// information they need to fix it.
export function runScriptExport(scriptModule: unknown, ctx: ScriptExportContext): string | ScriptExportFile[] {
  const fn = resolveDefaultExport(scriptModule);
  if (typeof fn !== "function") {
    throw new ScriptExportError(`This script file has no usable default export — expected "export default function(ctx) { ... }" (or module.exports = function(ctx) {...} for a .js file), got ${typeof fn}.`);
  }
  const output = (fn as ScriptExportFn)(ctx);
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.every(isScriptExportFile)) return output;
  throw new ScriptExportError(`This script's default export must return either a string (one file's content) or an array of { path, content } objects (multiple files) — got ${describeForError(output)}.`);
}

// Supports both `export default fn` (compiled by tsc/esbuild to
// module.exports.default) and plain `module.exports = fn` (a hand-written
// .js file with no build step at all) — a script author shouldn't need to
// know which module system convention applies; both "just work."
function resolveDefaultExport(scriptModule: unknown): unknown {
  if (typeof scriptModule === "function") return scriptModule;
  if (scriptModule && typeof scriptModule === "object" && "default" in scriptModule) {
    return (scriptModule as { default: unknown }).default;
  }
  return undefined;
}

function isScriptExportFile(value: unknown): value is ScriptExportFile {
  return (
    typeof value === "object" && value !== null &&
    typeof (value as ScriptExportFile).path === "string" && (value as ScriptExportFile).path.length > 0 &&
    typeof (value as ScriptExportFile).content === "string"
  );
}

function describeForError(value: unknown): string {
  if (value === undefined) return "undefined (did the function forget a return statement?)";
  if (value === null) return "null";
  if (Array.isArray(value)) return `an array, but not every entry was a well-formed { path, content } object`;
  return typeof value;
}
