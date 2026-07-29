// Runs every REAL, hand-authored preset (src/shared/presets/raw/**) through
// the full export pipeline (translateConfig -> variableMaker ->
// applyExportOverrides -> toExportConfig -> buildExportBundle), writing
// results to export-test/results/presets/{preset-id}/{format}/...
//
// This closes a gap the rest of export-test's fixtures.ts-based fixtures
// don't cover: fixtures.ts uses small SYNTHETIC configs (2 colors x 2 roles x
// 2 variations) built to isolate one dimension at a time. Real presets have
// real role/variation topologies (shared vs. per-role variations,
// scopedColorIds, localBg chains, uneven role/variation counts as actually
// authored) that a synthetic grid may not stress the same way. preset-data/
// already runs these same presets through variableMaker() directly (bypassing
// translateConfig/ProjectStore, see load-presets.ts) to catch engine-level
// color/contrast defects — this script instead runs them through the FULL
// export path fixtures.ts's harness exercises, to catch naming/resolver
// defects specific to real preset shapes.
//
// Run: npx tsx export-test/scripts/run-presets-export-test.ts            # every preset
//      npx tsx export-test/scripts/run-presets-export-test.ts nmobile     # one preset, by id/basename/relative path

import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { translateConfig, toExportConfig, applyExportOverrides, type PluginConfig } from "../../src/figma/config";
import { variableMaker, type EngineResult } from "../../src/shared/engine/clrEngine";
import { resolveTokenRefBgs } from "../../src/shared/engine/clrUtils";
import { buildExportBundle } from "../../src/shared/exportEng/bundler";
import { resolveExport, type ResolveWarning } from "../../src/shared/exportEng/resolve";
import { ExportFormatter } from "../../src/figma/docGen";
import type { ProjectStore } from "../../src/ui/types/state";
import { discoverPresetFiles, filterPresets, type DiscoveredPreset } from "../../preset-data/scripts/load-presets";

const ALL_FORMATS = ["css", "scss", "tailwind", "dtcg", "style-dictionary", "ios-swift", "android", "rn-ts", "csv", "json", "wand", "wand-backup"];
const RESULTS_DIR = join(__dirname, "..", "results", "presets");

function runEngine(config: PluginConfig): EngineResult {
  const pass1 = variableMaker(config);
  if (resolveTokenRefBgs(config, pass1)) return variableMaker(config);
  return pass1;
}

interface PresetRunSummary {
  id: string;
  relativePath: string;
  pluginMode: string;
  colorCount: number;
  roleCount: number;
  themeCount: number;
  fileCount: number;
  filesByFormat: Record<string, number>;
  errors: string[];
  resolveWarnings: ResolveWarning[];
}

function runPreset(discovered: DiscoveredPreset): PresetRunSummary {
  const errors: string[] = [];
  const outDir = join(RESULTS_DIR, discovered.preset.id);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // preset.config is Partial<ProjectStoreSnapshot> — real presets are
  // authored to be fully self-contained (loaded directly by the real UI with
  // no synthetic-fixture defaulting needed), so this cast carries the same
  // "not import-checked against the real type, by design" caveat
  // run-export-test.ts's own fixture cast has, not a sign anything is missing.
  const projectStore = discovered.preset.config as unknown as ProjectStore;
  const config = translateConfig(projectStore);
  const result = runEngine(config);
  const exportConfig = applyExportOverrides(config, projectStore);
  const finalExportConfig = toExportConfig(exportConfig);

  const { warnings: resolveWarnings } = resolveExport(result, finalExportConfig);
  if (resolveWarnings.length > 0) {
    writeFileSync(join(outDir, "warnings.json"), JSON.stringify(resolveWarnings, null, 2), "utf-8");
  }

  const timestamp = Date.now();
  const files = buildExportBundle(result, finalExportConfig, ALL_FORMATS, discovered.preset.config as Record<string, unknown>, timestamp);

  for (const f of files) {
    if (f.content === "" && f.path.endsWith(".csv")) {
      f.content = ExportFormatter.toCSV(result, finalExportConfig);
    } else if (f.content === "" && f.path.endsWith(".json") && !f.path.includes("/")) {
      const scales = finalExportConfig.includeColorScalesCollection !== false ? result.scales : undefined;
      f.content = JSON.stringify({ ...(scales ? { scales } : {}), tokens: result.tokens, errors: result.errors }, null, 2);
    }
  }

  const filesByFormat: Record<string, number> = {};
  for (const fmt of ALL_FORMATS) filesByFormat[fmt] = 0;

  for (const file of files) {
    const fullPath = join(outDir, file.path);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, file.content, "utf-8");
    const firstSegment = file.path.split("/")[0];
    const fmt = ALL_FORMATS.find((f) => firstSegment === f || firstSegment.includes(`_${f}_`) || (f === "wand-backup" && firstSegment.includes("_backup_")));
    if (fmt) filesByFormat[fmt]++;
    else console.warn(`    (unmatched format for path: ${file.path})`);
  }

  if (result.errors.critical.length > 0) {
    errors.push(...result.errors.critical.map((e) => JSON.stringify(e)));
  }

  const cfg = discovered.preset.config as Record<string, unknown>;
  return {
    id: discovered.preset.id,
    relativePath: discovered.relativePath,
    pluginMode: String(cfg.pluginMode ?? "scale"),
    colorCount: Array.isArray(cfg.colors) ? cfg.colors.length : 0,
    roleCount: Array.isArray(cfg.roles) ? cfg.roles.length : 0,
    themeCount: Array.isArray(cfg.themes) ? cfg.themes.length : 0,
    fileCount: files.length,
    filesByFormat,
    errors,
    resolveWarnings,
  };
}

async function main() {
  const selectors = process.argv.slice(2);
  const all = await discoverPresetFiles();
  const selected = filterPresets(all, selectors);

  if (selected.length === 0) {
    console.error(selectors.length ? `No preset matched: ${selectors.join(", ")}` : "No presets discovered.");
    process.exit(1);
  }

  mkdirSync(RESULTS_DIR, { recursive: true });

  console.log(`Running ${selected.length} preset(s) through the full export pipeline (all ${ALL_FORMATS.length} formats)...\n`);

  const summaries = selected.map((discovered) => {
    console.log(`  ${discovered.relativePath} (${discovered.preset.id})`);
    const summary = runPreset(discovered);
    if (summary.errors.length > 0) {
      console.log(`    ⚠ ${summary.errors.length} critical engine error(s)`);
    }
    if (summary.resolveWarnings.length > 0) {
      console.log(`    ⚠ ${summary.resolveWarnings.length} resolveExport warning(s) — see warnings.json`);
    }
    return summary;
  });

  writeFileSync(join(RESULTS_DIR, "summary.json"), JSON.stringify({ generatedAt: new Date().toISOString(), presets: summaries }, null, 2), "utf-8");

  console.log(`\nWrote output for ${summaries.length} preset(s) to ${RESULTS_DIR}`);
  console.log(`Summary: ${join(RESULTS_DIR, "summary.json")}`);
}

if (require.main === module) {
  main();
}

export { main };
