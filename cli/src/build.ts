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
import type { TokenWandConfig } from "./loadConfig";

function runEngine(config: PluginConfig): EngineResult {
  const pass1 = variableMaker(config);
  if (resolveTokenRefBgs(config, pass1)) return variableMaker(config);
  return pass1;
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

export function runBuild(projectStore: ProjectStore, config: TokenWandConfig, options: { dryRun: boolean }): BuildResult {
  const pluginConfig = translateConfig(projectStore);
  const result = runEngine(pluginConfig);
  const exportConfig = toExportConfig(applyExportOverrides(pluginConfig, projectStore));
  const { warnings } = resolveExport(result, exportConfig);

  // buildExportBundle is called once per format (not once for every format
  // together) specifically so its internal "multi" flag is always false and
  // it never adds a "{tech}/" namespacing folder — see bundler.ts's `pre()`.
  // That folder exists to keep formats apart inside a single zip download;
  // it's not wanted here because each format already has its own chosen
  // outDir. The single-format path still gets a "{project}_{tech}_{ts}/"
  // prefix instead (bundler.ts's `pre()` again) — stripped below with the
  // same leading-segment logic, since we always know which format a given
  // call's files belong to.
  const written: BuildResult["written"] = [];
  const formats = Array.from(new Set(config.targets.map((t) => t.format)));
  const filesByFormat: Record<string, ExportFile[]> = {};
  for (const format of formats) {
    const files = buildExportBundle(result, exportConfig, [format], projectStore as unknown as Record<string, unknown>, Date.now());
    filesByFormat[format] = files.map((f) => ({ ...f, path: stripLeadingSegment(f.path) }));
  }

  const rolesByTargetIndex: BuildResult["rolesByTargetIndex"] = config.targets.map(() => []);

  config.targets.forEach((target, targetIndex) => {
    const formatFiles = filesByFormat[target.format] ?? [];
    for (const file of formatFiles) {
      if (file.role) {
        rolesByTargetIndex[targetIndex].push({ role: file.role, defaultFileName: basenameOf(file.path) });
      }

      const renamedPath = applyFileNameOverride(file.path, file.role, target.fileNames);
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
