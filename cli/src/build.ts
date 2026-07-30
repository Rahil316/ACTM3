// The actual pipeline: .wand -> engine -> export files -> disk.
//
// Mirrors exactly what src/figma/index.ts's "request-export-bundle" handler
// does (translateConfig -> variableMaker -> applyExportOverrides ->
// toExportConfig -> buildExportBundle) and what export-test/scripts/
// run-export-test.ts reimplements standalone for the same reason: index.ts is
// Figma-sandbox code (references the `figma` global) and can't be imported
// into a plain Node CLI. toExportConfig/applyExportOverrides themselves now
// live in src/figma/config.ts (which has no Figma-sandbox dependency) and are
// imported here rather than hand-copied.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { translateConfig, toExportConfig, applyExportOverrides, type PluginConfig } from "../../src/figma/config";
import { variableMaker, type EngineResult } from "../../src/shared/engine/clrEngine";
import { resolveTokenRefBgs } from "../../src/shared/engine/clrUtils";
import { buildExportBundle } from "../../src/shared/exportEng/bundler";
import { resolveExport, type ResolveWarning } from "../../src/shared/exportEng/resolve";
import type { ExportFile } from "../../src/shared/exportEng/types";
import type { ProjectStore } from "../../src/ui/types/state";
import { ConfigFileError, type ResolvedTokenWandConfig, type ExportTarget } from "./loadConfig";
import type { ExportConfig } from "../../src/shared/exportEng/types";
import { buildScriptExportContext, runScriptExport, ScriptExportError } from "../../src/shared/exportEng/scriptExport";

function runEngine(config: PluginConfig): EngineResult {
  const pass1 = variableMaker(config);
  if (resolveTokenRefBgs(config, pass1)) return variableMaker(config);
  return pass1;
}

// The bridge into a user-authored export — a plain .ts/.js file whose
// default export is a function receiving the same pre-resolved data every
// built-in fmt*.ts formatter gets (scriptExport.ts's ScriptExportContext).
// This genuinely runs the target file as TypeScript/JavaScript — see
// `npx token-wand script-help` (cli.ts's SCRIPT_HELP) for the full API
// reference a real end user sees; src/shared/exportEng/how-to.md (this
// repo's own dev-facing doc) lives outside cli/'s package root and isn't
// shipped in the published package.
//
// .ts support is NOT guaranteed — it depends entirely on the Node version
// actually running this CLI, not on anything this package ships. Node 22.6+
// (unflagged by default on newer versions) can require() a .ts file
// natively via its own built-in type-stripping; older Node can't, unless
// the user has registered their own loader (ts-node/tsx via `node --require
// .../register`) before invoking the CLI. This function doesn't pre-check
// any of that by file extension — it just attempts require() and reports
// whatever actually happens, since Node's own resolution behavior can't be
// predicted from here (a registered loader transparently changes how
// require() behaves before this code ever runs).
function renderScriptTarget(target: ExportTarget, configDir: string, result: EngineResult, exportConfig: ExportConfig): ExportFile[] {
  const scriptPath = join(configDir, target.scriptFile!);
  if (!existsSync(scriptPath)) {
    throw new ConfigFileError(`targets[].scriptFile "${target.scriptFile}" was not found at ${scriptPath}.`);
  }

  let scriptModule: unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    scriptModule = require(scriptPath);
  } catch (err) {
    // A .ts file with real TypeScript-only syntax (type annotations,
    // `interface`, etc.), on a Node version with no built-in stripping and
    // no loader registered, fails as a plain SyntaxError — confirmed
    // directly (Node treats an unrecognized extension as a require()
    // candidate at all, then just tries to parse it as JS; there's no
    // distinct "unknown extension" error code for this case, despite that
    // being the intuitive guess). Detected by extension + error type,
    // rather than message text (wording isn't stable across Node versions),
    // and only used to add a more actionable hint — the original error is
    // still included, since a SyntaxError can also mean a real bug in a
    // plain .js file that has nothing to do with TypeScript at all.
    const isTs = /\.tsx?$/.test(scriptPath);
    if (isTs && err instanceof SyntaxError) {
      throw new ConfigFileError(`targets[].scriptFile "${target.scriptFile}" is a .ts file, and this Node runtime (${process.version}) couldn't parse it — likely TypeScript-only syntax with no built-in stripping available and no loader registered. Either upgrade to a Node version with built-in TypeScript support (22.6+), compile it to .js first, or register a loader (e.g. "node --require ts-node/register") before running this CLI. Run "npx token-wand script-help" for the full guide.\n\nOriginal error: ${err.message}`);
    }
    throw new ConfigFileError(`Script target "${target.scriptFile}" threw while loading:\n${(err as Error).stack ?? (err as Error).message}`);
  }

  const ctx = buildScriptExportContext(result, exportConfig);
  let output: string | { path: string; content: string }[];
  try {
    output = runScriptExport(scriptModule, ctx);
  } catch (err) {
    if (err instanceof ScriptExportError) throw new ConfigFileError(`Script target "${target.scriptFile}" failed: ${err.message}`);
    throw err; // a bug in the user's OWN script logic — propagate with its real stack trace, don't disguise it
  }

  if (typeof output === "string") {
    return [{ path: "output", content: output, role: "output" }];
  }
  // Each returned file's own basename doubles as its `role` — gives
  // fileNames[] overrides something to target, and gets the same
  // repeated-role collision protection as any other multi-file format
  // (see the repeatedRoles logic in runBuild) if two files ever share a name.
  return output.map((f) => ({ path: f.path, content: f.content, role: basenameOf(f.path) }));
}

export type FileWriteStatus = "created" | "updated" | "unchanged";

export interface BuildResult {
  // One entry per config target — the file it would write/wrote, and which
  // outDir it belongs to. Used for both the real write and --dry-run's preview.
  // status is computed by comparing against what's already on disk (even in
  // --dry-run, so the preview is accurate) — "created" = path didn't exist,
  // "updated" = existed with different content, "unchanged" = existed with
  // identical content (still counted so a re-run isn't silently invisible,
  // but never written to disk).
  written: Array<{ format: string; outDir: string; path: string; status: FileWriteStatus }>;
  // Every {role, defaultFileName} this run actually produced, per target
  // index in config.targets — lets the caller (cli.ts) backfill a target's
  // missing fileNames map with today's default names, without build.ts
  // itself touching token-wand.config.json (that's cli.ts's job; build.ts
  // stays scoped to "generate files").
  rolesByTargetIndex: Array<{ role: string; defaultFileName: string }[]>;
  // Naming anomalies resolveExport() detects (empty theme, a role with an
  // explicit empty variations list, two tokens colliding on the same output
  // name) — independent of which formats/targets are configured, since
  // they're properties of the resolved token set itself, not of any one
  // format's output. cli.ts prints these; every other buildExportBundle()
  // caller (Figma sandbox, standalone UI, export-test) doesn't yet, so this
  // is the first real consumer of ResolveResult.warnings.
  warnings: ResolveWarning[];
}

export function runBuild(projectStore: ProjectStore, config: ResolvedTokenWandConfig, options: { dryRun: boolean; configDir: string; targetIndices?: Set<number> }): BuildResult {
  const pluginConfig = translateConfig(projectStore);
  const result = runEngine(pluginConfig);
  const exportConfig = toExportConfig(applyExportOverrides(pluginConfig, projectStore));
  const { warnings } = resolveExport(result, exportConfig);

  // options.targetIndices, when set, restricts the build to just those
  // targets[] positions (the same 0-based indices `list` and the interactive
  // build picker both show) — cli.ts's selective-build flow. Undefined means
  // "every target," today's default/only behavior before this option existed.
  const selectedIndices = options.targetIndices;
  const isSelected = (i: number) => selectedIndices === undefined || selectedIndices.has(i);

  // buildExportBundle is called once per BUILT-IN format (not once for
  // every format together) specifically so its internal "multi" flag is
  // always false and it never adds a "{tech}/" namespacing folder — see
  // bundler.ts's `pre()`. That folder exists to keep formats apart inside a
  // single zip download; it's not wanted here because each format already
  // has its own chosen outDir. The single-format path still gets a
  // "{project}_{tech}_{ts}/" prefix instead (bundler.ts's `pre()` again) —
  // stripped below with the same leading-segment logic, since we always
  // know which format a given call's files belong to.
  //
  // "script" is deliberately excluded from this shared, once-per-format
  // pass — buildExportBundle doesn't know how to produce it (scriptExport.ts's
  // own bridge), and unlike the 8 built-ins, two different "script" targets
  // can be two entirely different script files, so it's resolved per-target
  // below instead of shared across every target with that format.
  //
  // Only formats actually needed by a SELECTED target are computed at all —
  // not just filtered out afterward — so a selective build genuinely skips
  // the work for deselected targets, not just their file-writing step.
  const written: BuildResult["written"] = [];
  const neededFormats = new Set(config.targets.filter((_, i) => isSelected(i)).map((t) => t.format));
  const formats = Array.from(neededFormats).filter((f) => f !== "script");
  const filesByFormat: Record<string, ExportFile[]> = {};
  for (const format of formats) {
    const files = buildExportBundle(result, exportConfig, [format], projectStore as unknown as Record<string, unknown>, Date.now());
    filesByFormat[format] = files.map((f) => ({ ...f, path: stripLeadingSegment(f.path) }));
  }

  const rolesByTargetIndex: BuildResult["rolesByTargetIndex"] = config.targets.map(() => []);

  config.targets.forEach((target, targetIndex) => {
    if (!isSelected(targetIndex)) return;
    const formatFiles = target.format === "script" ? renderScriptTarget(target, options.configDir, result, exportConfig) : (filesByFormat[target.format] ?? []);

    // fileNames[role] (both applying an existing override and the
    // auto-backfill below) assumes one role produces exactly one file per
    // target run — true for all 8 built-in formats, but false for a
    // "script" target whose function returns several files sharing a
    // conceptual role. A role that appears more than once in this target's
    // own output gets no fileNames handling at all — a single fileNames[role]
    // string can't meaningfully rename N different files; the script's own
    // returned `path` values are the real, expressive way to control each
    // file's name.
    const roleCounts = new Map<string, number>();
    for (const file of formatFiles) {
      if (file.role) roleCounts.set(file.role, (roleCounts.get(file.role) ?? 0) + 1);
    }
    const repeatedRoles = new Set([...roleCounts].filter(([, count]) => count > 1).map(([role]) => role));

    for (const file of formatFiles) {
      if (file.role && !repeatedRoles.has(file.role)) {
        rolesByTargetIndex[targetIndex].push({ role: file.role, defaultFileName: basenameOf(file.path) });
      }

      const renamedPath = file.role && repeatedRoles.has(file.role) ? file.path : applyFileNameOverride(file.path, file.role, target.fileNames);
      const fullPath = join(target.outDir, renamedPath);

      let status: FileWriteStatus;
      if (!existsSync(fullPath)) {
        status = "created";
      } else {
        const existing = readFileSync(fullPath, "utf-8");
        status = existing === file.content ? "unchanged" : "updated";
      }

      if (!options.dryRun && status !== "unchanged") {
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, file.content, "utf-8");
      }
      written.push({ format: target.format, outDir: target.outDir, path: renamedPath, status });
    }
  });

  return { written, rolesByTargetIndex, warnings };
}

function basenameOf(path: string): string {
  const slashIndex = path.lastIndexOf("/");
  return slashIndex === -1 ? path : path.slice(slashIndex + 1);
}

// Renames a generated file's basename to target.fileNames[role], if that role
// has an override configured — keeps the file's directory (e.g. Android's
// "res/{qualifier}/" prefix) untouched, since fileNames controls names only,
// not paths (outDir is the one place that controls directories).
function applyFileNameOverride(path: string, role: string | undefined, fileNames: Record<string, string> | undefined): string {
  if (!role || !fileNames || !fileNames[role]) return path;
  const dir = dirname(path);
  const newName = fileNames[role];
  return dir === "." ? newName : join(dir, newName);
}

function stripLeadingSegment(path: string): string {
  const slashIndex = path.indexOf("/");
  return slashIndex === -1 ? path : path.slice(slashIndex + 1);
}
