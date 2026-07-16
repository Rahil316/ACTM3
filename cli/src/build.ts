// The actual pipeline: .wand -> engine -> export files -> disk.
//
// Mirrors exactly what src/figma/index.ts's "request-export-bundle" handler
// does (translateConfig -> variableMaker -> applyExportOverrides ->
// toExportConfig -> buildExportBundle) and what export-test/scripts/
// run-export-test.ts reimplements standalone for the same reason: index.ts is
// Figma-sandbox code (references the `figma` global) and can't be imported
// into a plain Node CLI. toExportConfig/applyExportOverrides are private
// there, so they're duplicated here too — keep in sync by hand if that
// pipeline's shape ever changes.

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { translateConfig, type PluginConfig } from "../../src/figma/config";
import { variableMaker, type EngineResult } from "../../src/shared/engine/clrEngine";
import { resolveTokenRefBgs } from "../../src/shared/engine/clrUtils";
import { buildExportBundle } from "../../src/shared/exportEng/bundler";
import type { ExportConfig, ExportFile } from "../../src/shared/exportEng/types";
import type { Role } from "../../src/shared/types";
import type { ProjectStore } from "../../src/ui/types/state";
import type { TokenWandConfig } from "./loadConfig";

function toExportConfig(config: PluginConfig): ExportConfig {
  const rolesRecord: Record<string, Role> = {};
  (config.roles || []).forEach((r, idx) => {
    rolesRecord[String(idx)] = r;
  });
  return {
    ...config,
    roles: rolesRecord,
    variations: config.variations ?? undefined,
  };
}

function applyExportOverrides(config: PluginConfig, projectStore: ProjectStore): PluginConfig {
  const exportSettings = projectStore.exportSettings;
  if (!exportSettings || exportSettings.matchFigma) return config;
  const c = exportSettings.custom;
  return {
    ...config,
    tokenNameSegments: c.tokenNameSegments,
    useShorthandColors: c.useShorthandColors,
    useShorthandRoles: c.useShorthandRoles,
    useShorthandVariations: c.useShorthandVariations,
    useShorthandSteps: c.useShorthandSteps,
    includeSourceColors: c.includeSourceColors,
    alphaValues: c.alphaValues,
    includeColorScalesCollection: config.pluginMode === "direct" ? config.includeColorScalesCollection : c.includeColorScalesCollection,
    includeDescriptions: c.includeDescriptions,
  };
}

function runEngine(config: PluginConfig): EngineResult {
  const pass1 = variableMaker(config);
  if (resolveTokenRefBgs(config, pass1)) return variableMaker(config);
  return pass1;
}

export interface BuildResult {
  // One entry per config target — the file it would write/wrote, and which
  // outDir it belongs to. Used for both the real write and --dry-run's preview.
  written: Array<{ format: string; outDir: string; path: string }>;
}

export function runBuild(projectStore: ProjectStore, config: TokenWandConfig, options: { dryRun: boolean }): BuildResult {
  const pluginConfig = translateConfig(projectStore);
  const result = runEngine(pluginConfig);
  const exportConfig = toExportConfig(applyExportOverrides(pluginConfig, projectStore));

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

  for (const target of config.targets) {
    const formatFiles = filesByFormat[target.format] ?? [];
    for (const file of formatFiles) {
      const fullPath = join(target.outDir, file.path);
      if (!options.dryRun) {
        mkdirSync(join(fullPath, ".."), { recursive: true });
        writeFileSync(fullPath, file.content, "utf-8");
      }
      written.push({ format: target.format, outDir: target.outDir, path: file.path });
    }
  }

  return { written };
}

function stripLeadingSegment(path: string): string {
  const slashIndex = path.indexOf("/");
  return slashIndex === -1 ? path : path.slice(slashIndex + 1);
}
