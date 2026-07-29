// Generates every export format against a curated set of ProjectStore
// permutations, writing real files to export-test/results/<fixture-id>/<format>/...
//
// This mirrors exactly what src/figma/index.ts's "request-export-bundle"
// handler does (translateConfig -> variableMaker -> applyExportOverrides ->
// toExportConfig -> buildExportBundle) — those middle two now live in
// src/figma/config.ts (no Figma-sandbox dependency) and are imported
// directly rather than reimplemented; only variableMaker's caller
// (index.ts's message-router entry point) is sandbox-only and can't be
// imported here.
//
// Run: npx tsx export-test/scripts/run-export-test.ts                    # all fixtures
//      npx tsx export-test/scripts/run-export-test.ts scale-basic        # one fixture by exact id
//      npx tsx export-test/scripts/run-export-test.ts --batch segments   # every fixture whose id starts with "segments/"

import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { translateConfig, toExportConfig, applyExportOverrides, type PluginConfig } from "../../src/figma/config";
import { variableMaker, type EngineResult } from "../../src/shared/engine/clrEngine";
import { resolveTokenRefBgs } from "../../src/shared/engine/clrUtils";
import { buildExportBundle } from "../../src/shared/exportEng/bundler";
import { resolveExport, type ResolveWarning } from "../../src/shared/exportEng/resolve";
import { ExportFormatter } from "../../src/figma/docGen";
import type { ProjectStore } from "../../src/ui/types/state";
import { buildFixtures, type Fixture } from "./fixtures";

const ALL_FORMATS = ["css", "scss", "tailwind", "dtcg", "style-dictionary", "ios-swift", "android", "rn-ts", "csv", "json", "wand", "wand-backup"];
const RESULTS_DIR = join(__dirname, "..", "results");

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
  // resolveExport()'s own naming-anomaly detector (empty-theme, an explicit
  // empty variations list, or two tokens colliding on the same output name)
  // — buildExportBundle() computes these internally per format but discards
  // them (see cli/src/build.ts for its one real consumer), so this harness
  // calls resolveExport() a second, separate time purely to surface them for
  // fixtures specifically designed to trigger one (see naming-collisions/,
  // scoping/role-empty-variations). Also written to warnings.json alongside
  // each fixture's format folders for easy scanning without re-deriving it.
  resolveWarnings: ResolveWarning[];
}

function runFixture(fixture: Fixture): FixtureRunSummary {
  const errors: string[] = [];
  const outDir = join(RESULTS_DIR, fixture.id);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Fixtures are hand-built partial objects, not full ProjectStore instances —
  // this cast (also used by translateConfig below) is the harness's one
  // deliberate type escape, not a workaround for a mismatch with the real
  // applyExportOverrides/toExportConfig (which now come from src/figma/config.ts
  // unmodified, same as every other caller).
  const projectStore = fixture.projectStore as unknown as ProjectStore;
  const config = translateConfig(projectStore);
  const result = runEngine(config);
  const exportConfig = applyExportOverrides(config, projectStore);
  const finalExportConfig = toExportConfig(exportConfig);

  const { warnings: resolveWarnings } = resolveExport(result, finalExportConfig);
  if (resolveWarnings.length > 0) {
    writeFileSync(join(outDir, "warnings.json"), JSON.stringify(resolveWarnings, null, 2), "utf-8");
  }

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
    resolveWarnings,
  };
}

export function main() {
  const args = process.argv.slice(2);
  const all = buildFixtures();

  // Batch fixtures use "{batch}/{name}" ids (e.g. "segments/2seg-drop-role")
  // purely so their results land in export-test/results/{batch}/{name}/ —
  // join()'s recursive mkdirSync already handles the nested path, no extra
  // wiring needed there. --batch <name> selects every fixture whose id
  // starts with "{name}/", so a single dimension (e.g. all segment-shape
  // fixtures) can be regenerated/reviewed without re-running everything else.
  const batchIndex = args.indexOf("--batch");
  let selected: Fixture[];
  if (batchIndex !== -1) {
    const batchName = args[batchIndex + 1];
    if (!batchName) {
      console.error("--batch requires a name, e.g. --batch segments");
      process.exit(1);
    }
    selected = all.filter((f) => f.id.startsWith(`${batchName}/`));
  } else {
    const selectors = args;
    selected = selectors.length > 0 ? all.filter((f) => selectors.includes(f.id)) : all;
  }

  if (selected.length === 0) {
    console.error(args.length ? `No fixture matched: ${args.join(" ")}` : "No fixtures defined.");
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
    if (summary.resolveWarnings.length > 0) {
      console.log(`    ⚠ ${summary.resolveWarnings.length} resolveExport warning(s) — see warnings.json`);
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
