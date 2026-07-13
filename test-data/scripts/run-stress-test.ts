// Stress-test runner: executes variableMaker() for every generated case,
// records input/config/output plus derived per-token metrics into a single
// JSONL dataset (one record per case) that's flat enough for bulk analysis
// (pandas/jq/etc), then writes an anomaly-flagged summary.
//
// Run: npx tsx test-data/scripts/run-stress-test.ts

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { variableMaker } from "../../src/shared/clrEngine";
import type { EngineResult, TokenEntry } from "../../src/shared/clrEngine";
import { generateAllCases, type GeneratedCase } from "./generate-configs";

const RESULTS_DIR = join(__dirname, "..", "results");
mkdirSync(RESULTS_DIR, { recursive: true });

interface TokenMetric {
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

interface RunRecord {
  caseId: string;
  pluginMode: "scale" | "direct";
  seedHex: string;
  seedLabel: string;
  scaleAlgorithm: string | null;
  solverMode: string | null;
  scaleLength: number | null;
  contrastTargets: number[];
  // Raw counts for quick filtering
  criticalCount: number;
  warningCount: number;
  noticeCount: number;
  tokenCount: number;
  // Aggregate metrics for bulk analysis
  minContrastRatio: number | null;
  maxContrastDelta: number | null; // largest overshoot
  minContrastDelta: number | null; // largest shortfall (most negative = worst miss)
  adjustedTokenCount: number;
  failRatingCount: number;
  // Full detail
  tokens: TokenMetric[];
  errors: EngineResult["errors"];
  // Set only if variableMaker threw
  runtimeError: string | null;
}

function flattenTokens(result: EngineResult): TokenMetric[] {
  const out: TokenMetric[] = [];
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

function buildRecord(c: GeneratedCase): RunRecord {
  const base: Omit<RunRecord, "tokenCount" | "minContrastRatio" | "maxContrastDelta" | "minContrastDelta" | "adjustedTokenCount" | "failRatingCount" | "tokens" | "errors" | "criticalCount" | "warningCount" | "noticeCount" | "runtimeError"> = {
    caseId: c.caseId,
    pluginMode: c.pluginMode,
    seedHex: c.seedHex,
    seedLabel: c.seedLabel,
    scaleAlgorithm: c.scaleAlgorithm ?? null,
    solverMode: c.solverMode ?? null,
    scaleLength: c.scaleLength ?? null,
    contrastTargets: c.contrastTargets,
  };

  try {
    const result = variableMaker(c.config);
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
      // WCAG "Fail" is only meaningful QA signal when the engine's own target
      // for that token was itself in WCAG-checkable range (>=3:1) — a token
      // targeting 1.5:1 rating "Fail" (WCAG's <3:1 bucket) is expected, not a bug.
      failRatingCount: tokens.filter((t) => t.contrastRating === "Fail" && (t.contrastTarget ?? 0) >= 3).length,
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

function main() {
  const cases = generateAllCases();
  console.log(`Running ${cases.length} cases through variableMaker()...`);

  const records: RunRecord[] = [];
  let done = 0;
  for (const c of cases) {
    records.push(buildRecord(c));
    done++;
    if (done % 200 === 0) console.log(`  ${done}/${cases.length}`);
  }

  const jsonlPath = join(RESULTS_DIR, "run-records.jsonl");
  writeFileSync(jsonlPath, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
  console.log(`Wrote ${records.length} records to ${jsonlPath}`);

  const metaPath = join(RESULTS_DIR, "run-meta.json");
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalCases: records.length,
        scaleModeCases: records.filter((r) => r.pluginMode === "scale").length,
        directModeCases: records.filter((r) => r.pluginMode === "direct").length,
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
export type { RunRecord, TokenMetric };
