// Generates every export format against a curated set of ProjectStore
// permutations, writing real files to export-test/results/<fixture-id>/<format>/...
//
// This mirrors exactly what src/figma/index.ts's "request-export-bundle"
// handler does (translateConfig -> variableMaker -> applyExportOverrides ->
// toExportConfig -> buildExportBundle), reimplemented standalone here since
// index.ts is Figma-sandbox code (references the `figma` global) and can't be
// imported directly into a plain Node/tsx script.
//
// Run: npx tsx export-test/scripts/run-export-test.ts             # all fixtures
//      npx tsx export-test/scripts/run-export-test.ts scale-basic # one fixture

import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { translateConfig, normalizeAlphaValues, type PluginConfig } from "../../src/figma/config";
import { variableMaker, type EngineResult } from "../../src/shared/engine/clrEngine";
import { resolveTokenRefBgs } from "../../src/shared/engine/clrUtils";
import { buildExportBundle } from "../../src/shared/exportEng/bundler";
import { ExportFormatter } from "../../src/figma/docGen";
import type { ExportConfig } from "../../src/shared/exportEng/types";
import type { Role } from "../../src/shared/types";
import { buildFixtures, type Fixture } from "./fixtures";

const ALL_FORMATS = ["css", "scss", "tailwind", "dtcg", "style-dictionary", "ios-swift", "android", "rn-ts", "csv", "json", "wand", "wand-backup"];
const RESULTS_DIR = join(__dirname, "..", "results");

// ── Reimplements src/figma/index.ts's toExportConfig + applyExportOverrides ──
// (private functions there — kept in sync by hand since this harness's whole
// point is to catch drift between "what Figma sync would do" and "what
// exports actually produce", not to import sandbox-only code).

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

interface ExportSettingsLike {
  matchFigma: boolean;
  custom: {
    tokenNameSegments: string[];
    useShorthandColors: boolean;
    useShorthandRoles: boolean;
    useShorthandVariations: boolean;
    useShorthandSteps: boolean;
    includeSourceColors: boolean;
    alphaValues: number[];
    includeColorScalesCollection: boolean;
    includeDescriptions: boolean;
  };
}

function applyExportOverrides(config: PluginConfig, projectStore: Record<string, unknown>): PluginConfig {
  const exportSettings = projectStore.exportSettings as ExportSettingsLike | undefined;
  if (!exportSettings || exportSettings.matchFigma) return config;
  const c = exportSettings.custom;
  return {
    ...config,
    tokenNameSegments: c.tokenNameSegments as PluginConfig["tokenNameSegments"],
    useShorthandColors: c.useShorthandColors,
    useShorthandRoles: c.useShorthandRoles,
    useShorthandVariations: c.useShorthandVariations,
    useShorthandSteps: c.useShorthandSteps,
    includeSourceColors: c.includeSourceColors,
    // Guards the exact bug this harness exists to catch drift on: a .wand
    // file with alphaValues as a comma-separated string instead of number[]
    // (see normalizeAlphaValues in src/figma/config.ts).
    alphaValues: normalizeAlphaValues(c.alphaValues),
    includeColorScalesCollection: config.pluginMode === "direct" ? config.includeColorScalesCollection : c.includeColorScalesCollection,
    includeDescriptions: c.includeDescriptions,
  };
}

function runEngine(config: PluginConfig): EngineResult {
  const pass1 = variableMaker(config);
  if (resolveTokenRefBgs(config, pass1)) return variableMaker(config);
  return pass1;
}

interface FixtureRunSummary {
  id: string;
  description: string;
  pluginMode: string;
  includeColorScalesCollection: boolean;
  includeSourceColors: boolean;
  alphaValueCount: number;
  fileCount: number;
  filesByFormat: Record<string, number>;
  errors: string[];
}

function runFixture(fixture: Fixture): FixtureRunSummary {
  const errors: string[] = [];
  const outDir = join(RESULTS_DIR, fixture.id);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = translateConfig(fixture.projectStore as any);
  const result = runEngine(config);
  const exportConfig = applyExportOverrides(config, fixture.projectStore);
  const finalExportConfig = toExportConfig(exportConfig);

  const timestamp = Date.now();
  const files = buildExportBundle(result, finalExportConfig, ALL_FORMATS, fixture.projectStore, timestamp);

  // bundler.ts leaves csv/json content empty for docGen-owned formats — same
  // fill-in index.ts's handlers do.
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
    // Multi-file formats live under a "{fmt}/" top-level folder; single-file
    // exports (csv/json/wand/wand-backup) use the flat
    // "{project}_{namingToken}_{timestamp}.ext" naming — wand-backup's naming
    // token is "backup", not "wand-backup" (see bundler.ts), so it can't
    // reuse the same `_${f}_` check as the other flat formats. Matched
    // against the leading path segment / naming token exactly (not a
    // substring anywhere in the path) — "css" is a substring of "scss", so a
    // loose .includes(`${f}/`) check misclassifies every scss file as css.
    const firstSegment = file.path.split("/")[0];
    const fmt = ALL_FORMATS.find((f) => firstSegment === f || firstSegment.includes(`_${f}_`) || (f === "wand-backup" && firstSegment.includes("_backup_")));
    if (fmt) filesByFormat[fmt]++;
    else console.warn(`    (unmatched format for path: ${file.path})`);
  }

  if (result.errors.critical.length > 0) {
    errors.push(...result.errors.critical.map((e) => JSON.stringify(e)));
  }

  return {
    id: fixture.id,
    description: fixture.description,
    pluginMode: String(fixture.projectStore.pluginMode),
    includeColorScalesCollection: fixture.projectStore.includeColorScalesCollection !== false,
    includeSourceColors: fixture.projectStore.includeSourceColors === true,
    alphaValueCount: ((fixture.projectStore.alphaValues as number[]) ?? []).length,
    fileCount: files.length,
    filesByFormat,
    errors,
  };
}

export function main() {
  const selectors = process.argv.slice(2);
  const all = buildFixtures();
  const selected = selectors.length > 0 ? all.filter((f) => selectors.includes(f.id)) : all;

  if (selected.length === 0) {
    console.error(selectors.length ? `No fixture matched: ${selectors.join(", ")}` : "No fixtures defined.");
    process.exit(1);
  }

  mkdirSync(RESULTS_DIR, { recursive: true });

  console.log(`Running ${selected.length} fixture(s) through all ${ALL_FORMATS.length} export formats...\n`);

  const summaries = selected.map((fixture) => {
    console.log(`  ${fixture.id} — ${fixture.description}`);
    const summary = runFixture(fixture);
    if (summary.errors.length > 0) {
      console.log(`    ⚠ ${summary.errors.length} critical engine error(s)`);
    }
    return summary;
  });

  writeFileSync(join(RESULTS_DIR, "summary.json"), JSON.stringify({ generatedAt: new Date().toISOString(), fixtures: summaries }, null, 2), "utf-8");

  console.log(`\nWrote output for ${summaries.length} fixture(s) to ${RESULTS_DIR}`);
  console.log(`Summary: ${join(RESULTS_DIR, "summary.json")}`);
}

if (require.main === module) {
  main();
}
