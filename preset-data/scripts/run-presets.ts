// Runs every discovered preset through the real engine (variableMaker, with
// the same two-pass localBg resolution buildEngineConfig()/the live plugin
// use — see src/ui/store/engineStore.ts and color-master skill §8), and
// writes one flat JSONL record per preset to preset-data/results/.
//
// Unlike the stress-test harness (test-data/), this does NOT generate
// synthetic seeds — it runs each preset's own real colors/roles/variations/
// scopedColorIds/localBg exactly as authored, which is the only way to catch
// preset-specific defects (e.g. a localBg chain demanding an unreachable
// contrast target — see color-master skill §8.1).
//
// Run: npx tsx preset-data/scripts/run-presets.ts [selector ...]
//   npx tsx preset-data/scripts/run-presets.ts            # all presets
//   npx tsx preset-data/scripts/run-presets.ts nmobile     # just nmobile

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { variableMaker } from "../../src/shared/engine/clrEngine";
import type { EngineInput, EngineResult, TokenEntry } from "../../src/shared/engine/clrEngine";
import { resolveTokenRefBgs, translateLocalBg } from "../../src/shared/engine/clrUtils";
import { discoverPresetFiles, filterPresets } from "./load-presets";

const RESULTS_DIR = join(__dirname, "..", "results");
mkdirSync(RESULTS_DIR, { recursive: true });

export interface PresetTokenRow {
  theme: string;
  color: string;
  role: string;
  variation: string;
  tokenName: string;
  value: string;
  contrastRatio: number | null;
  contrastRating: string | null;
  contrastTarget: number | null;
  contrastDelta: number | null; // achieved - target (negative = missed target)
  isAdjusted: boolean;
}

export interface PresetRunRecord {
  presetId: string;
  presetName: string;
  relativePath: string; // e.g. "dev/nmobile.ts" — stable identity for this run
  pluginMode: "scale" | "direct";
  scaleAlgorithm: string | null;
  solverMode: string | null;
  colorCount: number;
  roleCount: number;
  themeCount: number;
  // Raw counts for quick filtering
  criticalCount: number;
  warningCount: number;
  noticeCount: number;
  tokenCount: number;
  // Aggregate metrics
  minContrastRatio: number | null;
  maxContrastDelta: number | null;
  minContrastDelta: number | null;
  adjustedTokenCount: number;
  failRatingCount: number;
  // Full detail
  tokens: PresetTokenRow[];
  errors: EngineResult["errors"];
  runtimeError: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEngineConfigFromPresetConfig(cfg: Record<string, any>): EngineInput {
  return {
    colors: cfg.colors,
    themes: cfg.themes,
    scaleLength: cfg.scaleLength,
    scaleSteps: cfg.scaleSteps ?? undefined,
    scaleAlgorithm: cfg.scaleAlgorithm,
    pluginMode: cfg.pluginMode,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: cfg.roles.map((r: any) => {
      const { localBgResolved, localBgTokenRef, localBgDynamicRef } = translateLocalBg(r.localBg, cfg.colors, cfg.themes);
      return { ...r, localBgResolved, localBgTokenRef, localBgDynamicRef };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variations: (cfg.variations ?? []).map((v: any) => ({ name: v.name, shorthand: v.shorthand })),
    useUniformAlgorithm: cfg.useUniformAlgorithm,
    algorithmScopeLevel: cfg.algorithmScopeLevel,
    solverMode: cfg.solverMode,
  };
}

function flattenTokens(result: EngineResult): PresetTokenRow[] {
  const out: PresetTokenRow[] = [];
  for (const [theme, colorMap] of Object.entries(result.tokens)) {
    for (const [color, roleMap] of Object.entries(colorMap)) {
      for (const roleEntries of Object.values(roleMap)) {
        for (const entry of Object.values(roleEntries) as TokenEntry[]) {
          const target = entry.contrastTarget ?? null;
          const ratio = entry.contrast.ratio;
          out.push({
            theme,
            color,
            role: entry.role,
            variation: entry.variation,
            tokenName: entry.tokenName,
            value: entry.value,
            contrastRatio: ratio,
            contrastRating: entry.contrast.rating,
            contrastTarget: target,
            contrastDelta: ratio !== null && target !== null ? parseFloat((ratio - target).toFixed(3)) : null,
            isAdjusted: !!entry.isAdjusted,
          });
        }
      }
    }
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRecord(presetId: string, presetName: string, relativePath: string, cfg: Record<string, any>): PresetRunRecord {
  const base = {
    presetId,
    presetName,
    relativePath,
    pluginMode: cfg.pluginMode as "scale" | "direct",
    scaleAlgorithm: cfg.scaleAlgorithm ?? null,
    solverMode: cfg.solverMode ?? null,
    colorCount: cfg.colors?.length ?? 0,
    roleCount: cfg.roles?.length ?? 0,
    themeCount: cfg.themes?.length ?? 0,
  };

  try {
    const engineConfig = buildEngineConfigFromPresetConfig(cfg);
    const pass1 = variableMaker(engineConfig);
    const result = resolveTokenRefBgs(engineConfig, pass1) ? variableMaker(engineConfig) : pass1;

    const tokens = flattenTokens(result);
    const ratios = tokens.map((t) => t.contrastRatio).filter((r): r is number => r !== null);
    const deltas = tokens.map((t) => t.contrastDelta).filter((d): d is number => d !== null);

    return {
      ...base,
      criticalCount: result.errors.critical.length,
      warningCount: result.errors.warnings.length,
      noticeCount: result.errors.notices.length,
      tokenCount: tokens.length,
      minContrastRatio: ratios.length ? Math.min(...ratios) : null,
      maxContrastDelta: deltas.length ? Math.max(...deltas) : null,
      minContrastDelta: deltas.length ? Math.min(...deltas) : null,
      adjustedTokenCount: tokens.filter((t) => t.isAdjusted).length,
      // Same WCAG-bucket-boundary caveat as the stress harness: only count a
      // "Fail" rating as a real signal when the token's own target was itself
      // in WCAG-checkable range (>=3:1) and the shortfall exceeds float noise.
      failRatingCount: tokens.filter((t) => t.contrastRating === "Fail" && (t.contrastTarget ?? 0) >= 3 && t.contrastRatio !== null && t.contrastTarget! - t.contrastRatio > 0.05).length,
      tokens,
      errors: result.errors,
      runtimeError: null,
    };
  } catch (err) {
    return {
      ...base,
      criticalCount: 0,
      warningCount: 0,
      noticeCount: 0,
      tokenCount: 0,
      minContrastRatio: null,
      maxContrastDelta: null,
      minContrastDelta: null,
      adjustedTokenCount: 0,
      failRatingCount: 0,
      tokens: [],
      errors: { critical: [], warnings: [], notices: [] },
      runtimeError: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

async function main() {
  const selectors = process.argv.slice(2);
  const all = await discoverPresetFiles();
  const selected = filterPresets(all, selectors);

  if (selected.length === 0) {
    console.error(selectors.length ? `No preset matched: ${selectors.join(", ")}` : "No presets discovered.");
    process.exit(1);
  }

  console.log(`Running ${selected.length} preset${selected.length === 1 ? "" : "s"} through variableMaker()...`);

  const records: PresetRunRecord[] = selected.map(({ preset, relativePath }) => {
    console.log(`  ${relativePath} (${preset.id})`);
    return buildRecord(preset.id, preset.name, relativePath, preset.config as Record<string, unknown>);
  });

  const jsonlPath = join(RESULTS_DIR, "run-records.jsonl");
  writeFileSync(jsonlPath, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
  console.log(`Wrote ${records.length} record(s) to ${jsonlPath}`);

  const metaPath = join(RESULTS_DIR, "run-meta.json");
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalPresets: records.length,
        presetIds: records.map((r) => r.presetId),
      },
      null,
      2,
    ),
    "utf-8",
  );

  return records;
}

if (require.main === module) {
  main();
}

export { main, buildRecord };
