// Aggregates test-data/results/run-records.jsonl into per-config, per-set
// (algorithm/solver group), and per-color rollups, then emits a single
// self-contained HTML dashboard (test-data/results/dashboard.html) with
// client-side filter/sort/drilldown. The dataset is inlined directly into
// the HTML (not fetched) so the file opens with a plain double-click —
// file:// pages cannot fetch() sibling files in most browsers.
//
// Run: npx tsx test-data/scripts/build-report.ts
// (expects run-stress-test.ts + analyze-results.ts to have already run)

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { oklch } from "culori";
import type { RunRecord } from "./run-stress-test";

const RESULTS_DIR = join(__dirname, "..", "results");

// ── Load ──────────────────────────────────────────────────────────────────────

function loadRecords(): RunRecord[] {
  const raw = readFileSync(join(RESULTS_DIR, "run-records.jsonl"), "utf-8");
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

interface Anomaly {
  caseId: string;
  type: string;
  severity: "critical" | "high" | "medium";
  detail: string;
}

function loadAnomalies(): Anomaly[] {
  const raw = readFileSync(join(RESULTS_DIR, "anomalies.jsonl"), "utf-8");
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

// ── Color derivation ──────────────────────────────────────────────────────────
// Hue/sat/lum filters need real HSL derived from the seed hex itself — seed
// labels are only descriptive for the systematic hue/sat/light grid and don't
// exist at all for the hand-picked edge cases (e.g. "primary_red"), so
// parsing labels would silently exclude those from HSL-range filtering.

function hexToHslLocal(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ── Error category taxonomy ──────────────────────────────────────────────────
// Anomaly "type" (e.g. contrast_overshoot) is fine-grained; category groups
// those into the handful of buckets a QA pass actually filters by.

const ERROR_CATEGORIES: Record<string, string> = {
  runtime_error: "crash",
  engine_critical_error: "critical",
  invalid_hex_output: "critical",
  zero_tokens_produced: "critical",
  fail_contrast_rating: "contrast-miss",
  contrast_target_missed: "contrast-miss",
  contrast_overshoot: "overshoot",
  engine_warning: "warning",
};

function categoryOf(type: string): string {
  return ERROR_CATEGORIES[type] ?? "other";
}

// ── Metrics used everywhere (config row, set rollup, color rollup) ──────────

interface Metrics {
  n: number;
  avgMinContrastRatio: number | null;
  avgAdjustedRate: number | null; // fraction of tokens adjusted, averaged per case
  avgFailRateWcag: number | null; // fraction of cases with >=1 genuine WCAG fail
  avgOvershoot: number | null; // mean of maxContrastDelta across cases
  worstShortfall: number | null; // min of minContrastDelta across cases
  warningRate: number | null; // fraction of cases with >=1 warning
  criticalCount: number;
  flaggedCaseCount: number; // cases with any anomaly type at all
  categoryCounts: Record<string, number>; // error category slug -> case count
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function computeMetrics(records: RunRecord[], flaggedCaseIds: Set<string>, anomaliesByCase: Map<string, Anomaly[]>): Metrics {
  const minRatios = records.map((r) => r.minContrastRatio).filter((x): x is number => x !== null);
  const overshoots = records.map((r) => r.maxContrastDelta).filter((x): x is number => x !== null);
  const shortfalls = records.map((r) => r.minContrastDelta).filter((x): x is number => x !== null);
  const adjustedRates = records.map((r) => (r.tokenCount > 0 ? r.adjustedTokenCount / r.tokenCount : 0));
  const wcagFailFlags = records.map((r) => (r.failRatingCount > 0 ? 1 : 0));
  const warningFlags = records.map((r) => (r.warningCount > 0 ? 1 : 0));

  const categoryCounts: Record<string, number> = {};
  for (const r of records) {
    const cats = new Set((anomaliesByCase.get(r.caseId) ?? []).map((a) => categoryOf(a.type)));
    for (const c of cats) categoryCounts[c] = (categoryCounts[c] ?? 0) + 1;
  }

  return {
    n: records.length,
    avgMinContrastRatio: mean(minRatios),
    avgAdjustedRate: mean(adjustedRates),
    avgFailRateWcag: mean(wcagFailFlags),
    avgOvershoot: mean(overshoots),
    worstShortfall: shortfalls.length ? Math.min(...shortfalls) : null,
    warningRate: mean(warningFlags),
    criticalCount: records.reduce((a, r) => a + r.criticalCount, 0),
    flaggedCaseCount: records.filter((r) => flaggedCaseIds.has(r.caseId)).length,
    categoryCounts,
  };
}

// ── "For Users" quality metrics ──────────────────────────────────────────────
// Reframes engine-internal numbers (contrast deltas, adjusted counts) into
// what someone picking an algorithm in the Settings dropdown actually
// experiences: does my brand color stay recognizable, does it ever collapse
// to gray, does the plugin deliver what I asked for. Chroma is read via
// culori's real OKLCH conversion (a color-math *library*, not the engine
// under test) rather than hand-rolled — same rigor as the engine itself,
// but this script still never imports clrEngine/solverEngine directly,
// matching generate-configs.ts's existing "never depend on the engine under
// test" convention.

const NEAR_NEUTRAL_CHROMA = 0.02; // below this, OKLCH chroma reads as visually gray
const CLEARLY_COLORFUL_CHROMA = 0.05; // seed chroma above this = "this was a real color, not a gray"

function chromaOf(hex: string): number {
  const c = oklch(hex);
  return c?.c ?? 0;
}

interface QualityMetrics {
  n: number; // tokens considered (seed was clearly colorful, not gray/near-gray)
  avgVividnessPreserved: number | null; // mean of min(1, outputChroma/seedChroma)
  wentGrayRate: number | null; // fraction of colorful-seed tokens whose output collapsed to near-gray
  deliversTargetRate: number | null; // 1 - adjusted rate, i.e. "gave you what you asked for"
  bestExample: { seedHex: string; outputHex: string; caseId: string; vividness: number } | null;
  worstExample: { seedHex: string; outputHex: string; caseId: string; vividness: number } | null;
}

function computeQualityMetrics(records: RunRecord[]): QualityMetrics {
  const vividnessRatios: number[] = [];
  const wentGrayFlags: number[] = [];
  let bestExample: QualityMetrics["bestExample"] = null;
  let worstExample: QualityMetrics["worstExample"] = null;

  for (const r of records) {
    const seedC = chromaOf(r.seedHex);
    if (seedC < CLEARLY_COLORFUL_CHROMA) continue; // skip near-neutral seeds — "stay vivid" is meaningless for gray input
    for (const t of r.tokens) {
      const outC = chromaOf(t.value);
      const vividness = Math.min(1, seedC > 0 ? outC / seedC : 0);
      vividnessRatios.push(vividness);
      wentGrayFlags.push(outC < NEAR_NEUTRAL_CHROMA ? 1 : 0);

      if (!bestExample || vividness > bestExample.vividness) {
        bestExample = { seedHex: r.seedHex, outputHex: t.value, caseId: r.caseId, vividness };
      }
      if (!worstExample || vividness < worstExample.vividness) {
        worstExample = { seedHex: r.seedHex, outputHex: t.value, caseId: r.caseId, vividness };
      }
    }
  }

  const adjustedRates = records.map((r) => (r.tokenCount > 0 ? r.adjustedTokenCount / r.tokenCount : 0));
  const deliversTargetRate = adjustedRates.length ? 1 - mean(adjustedRates)! : null;

  return {
    n: vividnessRatios.length,
    avgVividnessPreserved: mean(vividnessRatios),
    wentGrayRate: mean(wentGrayFlags),
    deliversTargetRate,
    bestExample,
    worstExample,
  };
}

// ── Row shapes for each drilldown level ──────────────────────────────────────

interface ConfigRow {
  caseId: string;
  pluginMode: string;
  seedLabel: string;
  seedHex: string;
  seedGroup: string;
  hue: number;
  sat: number;
  lum: number;
  scaleAlgorithm: string | null;
  solverMode: string | null;
  scaleLength: number | null;
  contrastTargets: string;
  tokenCount: number;
  minContrastRatio: number | null;
  maxContrastDelta: number | null;
  minContrastDelta: number | null;
  adjustedTokenCount: number;
  failRatingCount: number;
  warningCount: number;
  criticalCount: number;
  runtimeError: string | null;
  anomalyTypes: string;
  highSeverityAnomalyTypes: string;
  errorCategories: string; // comma-joined category slugs present on this case
  tokens: RunRecord["tokens"];
}

interface SetRow {
  setKey: string;
  pluginMode: string;
  dimension: string; // "scaleAlgorithm" | "solverMode"
  value: string;
  metrics: Metrics;
}

interface ColorRow {
  seedLabel: string;
  seedHex: string;
  seedGroup: string;
  hue: number;
  sat: number;
  lum: number;
  metrics: Metrics;
}

interface QualityRow {
  dimension: "scaleAlgorithm" | "solverMode";
  value: string;
  quality: QualityMetrics;
}

function main() {
  const records = loadRecords();
  const anomalies = loadAnomalies();
  const anomaliesByCase = new Map<string, Anomaly[]>();
  for (const a of anomalies) {
    if (!anomaliesByCase.has(a.caseId)) anomaliesByCase.set(a.caseId, []);
    anomaliesByCase.get(a.caseId)!.push(a);
  }
  // "Flagged" in charts/rollups means critical or high severity only — medium
  // (contrast_overshoot/engine_warning) is expected/benign noise for scale
  // mode (tokens snap to discrete steps, so overshoot vs. a numeric target is
  // normal) and would otherwise peg every set's flagged-rate near 100%,
  // hiding the real signal.
  const flaggedCaseIds = new Set(anomalies.filter((a) => a.severity === "critical" || a.severity === "high").map((a) => a.caseId));

  // ── Per-config rows (one per case, i.e. per generated config) ──────────────
  const configRows: ConfigRow[] = records.map((r) => {
    const hsl = hexToHslLocal(r.seedHex);
    const caseAnomalies = anomaliesByCase.get(r.caseId) ?? [];
    return {
    caseId: r.caseId,
    pluginMode: r.pluginMode,
    seedLabel: r.seedLabel,
    seedHex: r.seedHex,
    seedGroup: r.seedGroup,
    hue: hsl.h,
    sat: hsl.s,
    lum: hsl.l,
    scaleAlgorithm: r.scaleAlgorithm,
    solverMode: r.solverMode,
    scaleLength: r.scaleLength,
    contrastTargets: r.contrastTargets.join(","),
    tokenCount: r.tokenCount,
    minContrastRatio: r.minContrastRatio,
    maxContrastDelta: r.maxContrastDelta,
    minContrastDelta: r.minContrastDelta,
    adjustedTokenCount: r.adjustedTokenCount,
    failRatingCount: r.failRatingCount,
    warningCount: r.warningCount,
    criticalCount: r.criticalCount,
    runtimeError: r.runtimeError,
    anomalyTypes: caseAnomalies.map((a) => a.type).join(", "),
    highSeverityAnomalyTypes: caseAnomalies
      .filter((a) => a.severity === "critical" || a.severity === "high")
      .map((a) => a.type)
      .join(", "),
    errorCategories: [...new Set(caseAnomalies.map((a) => categoryOf(a.type)))].join(","),
    tokens: r.tokens,
    };
  });

  // ── Per-set rows: group by scaleAlgorithm (scale mode) and solverMode (direct mode) ──
  const setRows: SetRow[] = [];
  const byAlgo = new Map<string, RunRecord[]>();
  for (const r of records.filter((r) => r.scaleAlgorithm)) {
    const k = r.scaleAlgorithm!;
    if (!byAlgo.has(k)) byAlgo.set(k, []);
    byAlgo.get(k)!.push(r);
  }
  for (const [algo, recs] of byAlgo) {
    setRows.push({ setKey: `algo:${algo}`, pluginMode: "scale", dimension: "scaleAlgorithm", value: algo, metrics: computeMetrics(recs, flaggedCaseIds, anomaliesByCase) });
  }
  const bySolver = new Map<string, RunRecord[]>();
  for (const r of records.filter((r) => r.solverMode)) {
    const k = r.solverMode!;
    if (!bySolver.has(k)) bySolver.set(k, []);
    bySolver.get(k)!.push(r);
  }
  for (const [mode, recs] of bySolver) {
    setRows.push({ setKey: `solver:${mode}`, pluginMode: "direct", dimension: "solverMode", value: mode, metrics: computeMetrics(recs, flaggedCaseIds, anomaliesByCase) });
  }

  // ── "For Users" quality rollups — same byAlgo/bySolver grouping, reframed ──
  const qualityRows: QualityRow[] = [];
  for (const [algo, recs] of byAlgo) {
    qualityRows.push({ dimension: "scaleAlgorithm", value: algo, quality: computeQualityMetrics(recs) });
  }
  for (const [mode, recs] of bySolver) {
    qualityRows.push({ dimension: "solverMode", value: mode, quality: computeQualityMetrics(recs) });
  }

  // Break down by seed group (grid / warm-hue-cluster / low-chroma-cluster /
  // edge-case) so a targeted cluster's flagged rate can be compared directly
  // against the general grid's — the whole reason those clusters exist.
  const bySeedGroup = new Map<string, RunRecord[]>();
  for (const r of records) {
    if (!bySeedGroup.has(r.seedGroup)) bySeedGroup.set(r.seedGroup, []);
    bySeedGroup.get(r.seedGroup)!.push(r);
  }
  for (const [group, recs] of bySeedGroup) {
    setRows.push({ setKey: `seedGroup:${group}`, pluginMode: "both", dimension: "seedGroup", value: group, metrics: computeMetrics(recs, flaggedCaseIds, anomaliesByCase) });
  }

  // Also break down by scaleLength and by contrastTargets set, since those are
  // independent axes worth comparing.
  const byLen = new Map<string, RunRecord[]>();
  for (const r of records.filter((r) => r.scaleLength !== null)) {
    const k = String(r.scaleLength);
    if (!byLen.has(k)) byLen.set(k, []);
    byLen.get(k)!.push(r);
  }
  for (const [len, recs] of byLen) {
    setRows.push({ setKey: `scaleLength:${len}`, pluginMode: "scale", dimension: "scaleLength", value: len, metrics: computeMetrics(recs, flaggedCaseIds, anomaliesByCase) });
  }
  const byTargets = new Map<string, RunRecord[]>();
  for (const r of records) {
    const k = r.contrastTargets.join(",");
    if (!byTargets.has(k)) byTargets.set(k, []);
    byTargets.get(k)!.push(r);
  }
  for (const [targets, recs] of byTargets) {
    setRows.push({ setKey: `targets:${targets}`, pluginMode: "both", dimension: "contrastTargets", value: targets, metrics: computeMetrics(recs, flaggedCaseIds, anomaliesByCase) });
  }

  // Combined algorithm x scaleLength — the two scale-mode axes interact (a
  // weak algorithm may only misbehave at short lengths), so a joint
  // breakdown is needed to actually localize a problem instead of just
  // knowing it exists somewhere in one axis or the other.
  const byAlgoLen = new Map<string, RunRecord[]>();
  for (const r of records.filter((r) => r.scaleAlgorithm && r.scaleLength !== null)) {
    const k = `${r.scaleAlgorithm}__${r.scaleLength}`;
    if (!byAlgoLen.has(k)) byAlgoLen.set(k, []);
    byAlgoLen.get(k)!.push(r);
  }
  for (const [key, recs] of byAlgoLen) {
    const [algo, len] = key.split("__");
    setRows.push({ setKey: `algo+len:${algo}@${len}`, pluginMode: "scale", dimension: "algoLength", value: key, metrics: computeMetrics(recs, flaggedCaseIds, anomaliesByCase) });
  }

  // ── Per-color rows: group by seedLabel across all configs that used it ──────
  const byColor = new Map<string, RunRecord[]>();
  for (const r of records) {
    if (!byColor.has(r.seedLabel)) byColor.set(r.seedLabel, []);
    byColor.get(r.seedLabel)!.push(r);
  }
  const colorRows: ColorRow[] = [...byColor.entries()].map(([seedLabel, recs]) => {
    const hsl = hexToHslLocal(recs[0].seedHex);
    return {
      seedLabel,
      seedHex: recs[0].seedHex,
      seedGroup: recs[0].seedGroup,
      hue: hsl.h,
      sat: hsl.s,
      lum: hsl.l,
      metrics: computeMetrics(recs, flaggedCaseIds, anomaliesByCase),
    };
  });

  const dataset = {
    generatedAt: new Date().toISOString(),
    totalCases: records.length,
    totalAnomalies: anomalies.length,
    configRows,
    setRows,
    colorRows,
    qualityRows,
  };

  // dashboard-data.json is still written standalone for anyone who wants to
  // jq/pandas over it directly, but the dashboard itself gets its own inlined
  // copy so the HTML is fully self-contained and opens via plain double-click.
  writeFileSync(join(RESULTS_DIR, "dashboard-data.json"), JSON.stringify(dataset), "utf-8");
  console.log(`Wrote dashboard-data.json (${configRows.length} config rows, ${setRows.length} set rows, ${colorRows.length} color rows, ${qualityRows.length} quality rows)`);

  writeFileSync(join(RESULTS_DIR, "dashboard.html"), buildHtml(dataset), "utf-8");
  console.log(`Wrote dashboard.html (data inlined — open the file directly, no server needed)`);
}

function buildHtml(dataset: unknown): string {
  // </script>-safe embedding: JSON can't legally contain "</script>" inside a
  // string in a way that would close the tag early, except literally, so
  // escape "<" defensively.
  const dataJson = JSON.stringify(dataset).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Color Engine Stress Test Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${CSS}
</style>
</head>
<body>
<div id="app"></div>
<script id="dashboard-data" type="application/json">${dataJson}</script>
<script>
${JS}
</script>
</body>
</html>`;
}

const CSS = `
:root {
  --bg: #ffffff; --fg: #1a1a1a; --muted: #666; --border: #e0e0e0; --panel: #f7f7f8;
  --accent: #3b6fd1; --critical: #c62828; --high: #e0862c; --medium: #b8971f; --ok: #2e7d32;
  --row-hover: #f0f4fb; --oob: #ffe0e0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #16171a; --fg: #e8e8ea; --muted: #9a9aa2; --border: #303136; --panel: #1e1f23; --row-hover: #23262f; --oob: #4a1f1f; }
}
:root[data-theme="dark"] { --bg: #16171a; --fg: #e8e8ea; --muted: #9a9aa2; --border: #303136; --panel: #1e1f23; --row-hover: #23262f; --oob: #4a1f1f; }
:root[data-theme="light"] { --bg: #ffffff; --fg: #1a1a1a; --muted: #666; --border: #e0e0e0; --panel: #f7f7f8; --row-hover: #f0f4fb; --oob: #ffe0e0; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--bg); color: var(--fg); font-size: 14px; display: flex; flex-direction: column; }
#app { max-width: 1500px; width: 100%; margin: 0 auto; padding: 16px 24px 16px; display: flex; flex-direction: column; flex: 1; min-height: 0; }
h1 { font-size: 20px; margin: 0 0 4px; flex-shrink: 0; }
h2 { font-size: 15px; margin: 0 0 10px; color: var(--fg); }
.subtitle { color: var(--muted); font-size: 13px; margin-bottom: 14px; flex-shrink: 0; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 12px; flex-shrink: 0; }
.tab { padding: 8px 16px; cursor: pointer; border: none; background: none; color: var(--muted); font-size: 13px; border-bottom: 2px solid transparent; }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.tab:hover:not(.active) { color: var(--fg); }
.panels-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.panel { display: none; flex-direction: column; flex: 1; min-height: 0; }
.panel.active { display: flex; }
.toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; flex-shrink: 0; }
.toolbar input[type="text"], .toolbar select {
  background: var(--panel); color: var(--fg); border: 1px solid var(--border); border-radius: 6px;
  padding: 6px 10px; font-size: 13px;
}
.toolbar input[type="text"] { min-width: 200px; }
.toolbar select:disabled { opacity: 0.4; cursor: not-allowed; }
.range-filter { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; }
.range-filter .rf-label { font-weight: 600; color: var(--fg); min-width: 26px; }
.range-filter input[type="number"] { width: 52px; background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 2px 4px; font-size: 12px; }
.stat-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; flex-shrink: 0; }
.stat-tile {
  background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
  padding: 10px 14px; min-width: 100px;
}
.stat-tile .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
.stat-tile .value { font-size: 20px; font-weight: 600; margin-top: 2px; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
thead th {
  position: sticky; top: 0; background: var(--bg); text-align: left; padding: 6px 10px;
  border-bottom: 1px solid var(--border); cursor: pointer; white-space: nowrap; color: var(--muted);
  font-weight: 600; user-select: none; z-index: 1;
}
thead th:hover { color: var(--fg); }
thead th.sorted::after { content: attr(data-arrow); margin-left: 4px; }
tbody td { padding: 5px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
tbody tr:hover { background: var(--row-hover); cursor: pointer; }
td.oob, span.oob { background: var(--oob); color: var(--critical); font-weight: 600; border-radius: 3px; }
.table-wrap { overflow: auto; border: 1px solid var(--border); border-radius: 8px; flex: 1; min-height: 120px; }
.pagination { display: flex; align-items: center; gap: 10px; padding: 8px 4px 0; font-size: 12.5px; color: var(--muted); flex-shrink: 0; }
.pagination button { background: var(--panel); border: 1px solid var(--border); color: var(--fg); border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 12.5px; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination select { background: var(--panel); color: var(--fg); border: 1px solid var(--border); border-radius: 6px; padding: 3px 6px; font-size: 12.5px; }
.badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.badge.critical { background: rgba(198,40,40,0.15); color: var(--critical); }
.badge.high { background: rgba(224,134,44,0.15); color: var(--high); }
.badge.medium { background: rgba(184,151,31,0.15); color: var(--medium); }
.badge.ok { background: rgba(46,125,50,0.15); color: var(--ok); }
.swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--border); vertical-align: -2px; margin-right: 6px; }
.bar-cell { display: flex; align-items: center; gap: 6px; }
.bar-track { flex: 1; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; min-width: 60px; }
.bar-fill { height: 100%; background: var(--accent); }
.bar-fill.warn { background: var(--high); }
.chart-wrap { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-bottom: 16px; flex-shrink: 0; }
.chart-row { display: flex; align-items: center; gap: 10px; padding: 3px 0; font-size: 12.5px; }
.chart-row .lbl { width: 150px; flex-shrink: 0; color: var(--muted); text-align: right; }
.chart-row .track { flex: 1; height: 16px; background: var(--border); border-radius: 3px; overflow: hidden; position: relative; }
.chart-row .fill { height: 100%; background: var(--accent); }
.chart-row .fill.danger { background: var(--critical); }
.chart-row .num { width: 56px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.radar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; flex-shrink: 0; }
.radar-card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 10px; text-align: center; }
.radar-card .radar-title { font-size: 12.5px; font-weight: 600; margin-bottom: 4px; }
.radar-card .radar-sub { font-size: 11px; color: var(--muted); margin-top: 4px; }
.quality-intro { font-size: 13px; color: var(--muted); max-width: 780px; margin-bottom: 18px; line-height: 1.5; }
.quality-grid { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; max-width: 720px; }
.quality-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 20px 24px; min-width: 0; width: 100%; }
.quality-card-title { font-size: 18px; font-weight: 700; overflow-wrap: break-word; }
.quality-card-sub { font-size: 12px; color: var(--muted); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.03em; }
.quality-score-block { margin-top: 16px; }
.quality-score-toprow { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.quality-score-label { font-size: 13.5px; min-width: 0; overflow-wrap: break-word; font-weight: 500; }
.quality-score-tag { flex-shrink: 0; font-size: 12px; font-weight: 600; }
.quality-score-hint { font-size: 12px; color: var(--muted); line-height: 1.5; margin-top: 5px; }
.big-swatch { display: inline-block; width: 52px; height: 52px; border-radius: 8px; border: 1px solid var(--border); vertical-align: middle; flex-shrink: 0; }
.quality-examples { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
.quality-example { flex: 1; min-width: 120px; }
.quality-example-label { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
.quality-example-swatches { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); flex-wrap: wrap; }
.scroll-panel { overflow-y: auto; flex: 1; min-height: 0; }
.drilldown {
  position: fixed; top: 0; right: 0; width: 460px; height: 100%; background: var(--bg);
  border-left: 1px solid var(--border); box-shadow: -8px 0 24px rgba(0,0,0,0.15);
  transform: translateX(100%); transition: transform 0.2s ease; overflow-y: auto; z-index: 50;
  padding: 20px;
}
.drilldown.open { transform: translateX(0); }
.drilldown-close { position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 20px; cursor: pointer; color: var(--muted); }
.drilldown h3 { margin: 0 0 12px; font-size: 16px; padding-right: 30px; }
.kv { display: grid; grid-template-columns: 130px 1fr; gap: 4px 10px; font-size: 12.5px; margin-bottom: 16px; }
.kv .k { color: var(--muted); }
.token-list { font-size: 12px; border-top: 1px solid var(--border); padding-top: 10px; }
.token-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--border); }
.token-row .name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.2); z-index: 40; display: none; }
.overlay.open { display: block; }
.empty-state { padding: 30px; text-align: center; color: var(--muted); }
.token-detail-table td, .token-detail-table th { padding: 4px 8px; font-size: 11.5px; }
.token-detail-table tbody tr.bad-token { background: rgba(198,40,40,0.08); }
.token-detail-table tbody tr:hover { background: var(--row-hover); cursor: default; }
`;

const JS = `
(function() {
  const app0 = document.getElementById("app");
  let DATA;
  try {
    DATA = JSON.parse(document.getElementById("dashboard-data").textContent);
  } catch (err) {
    app0.innerHTML = "";
    const msg = document.createElement("div");
    msg.style.cssText = "padding:30px;font-family:monospace;white-space:pre-wrap;color:#c62828;";
    msg.textContent = "Failed to parse embedded dashboard data: " + err.message;
    app0.appendChild(msg);
    return;
  }
  init(DATA);

  function init(DATA) {

  // ── Utilities ──────────────────────────────────────────────────────────────
  function fmt(x, digits) {
    if (x === null || x === undefined) return "—";
    if (typeof x !== "number") return String(x);
    return x.toFixed(digits === undefined ? 2 : digits);
  }
  function pct(x) { return x === null || x === undefined ? "—" : (x * 100).toFixed(0) + "%"; }
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
      else if (k in e && typeof e[k] !== "function") { try { e[k] = attrs[k]; } catch(_) { e.setAttribute(k, attrs[k]); } }
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(c => {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return e;
  }
  function severityBadge(row) {
    if (row.criticalCount > 0 || row.runtimeError) return el("span", {class:"badge critical"}, ["critical"]);
    if (row.highSeverityAnomalyTypes && row.highSeverityAnomalyTypes.length) return el("span", {class:"badge high"}, ["high"]);
    if (row.anomalyTypes && row.anomalyTypes.length) return el("span", {class:"badge medium"}, ["medium"]);
    return el("span", {class:"badge ok"}, ["ok"]);
  }

  // Out-of-range checks used for cell highlighting — a WCAG contrast ratio is
  // mathematically bounded to [1, 21]; anything outside that (or a delta that
  // implies it) is an engine defect, not a QA judgment call, so it gets a
  // visually distinct highlight rather than just a badge.
  function isOobRatio(x) { return typeof x === "number" && (x < 1 || x > 21); }
  function ratioTd(x) {
    const bad = isOobRatio(x);
    return el("td", {class: bad ? "oob" : ""}, [fmt(x)]);
  }

  const ERROR_CATEGORY_LABELS = {
    "crash": "Crash",
    "critical": "Critical",
    "contrast-miss": "Contrast miss",
    "overshoot": "Overshoot",
    "warning": "Warning",
    "other": "Other",
  };

  // ── State ────────────────────────────────────────────────────────────────
  const state = {
    tab: "quality",
    configFilter: "",
    configSort: { key: "minContrastRatio", dir: 1 },
    configPluginMode: "",
    configAlgo: "",
    configSolver: "",
    configSeedGroup: "",
    configCategory: "",
    configFlaggedOnly: false,
    configHue: [0, 360],
    configSat: [0, 100],
    configLum: [0, 100],
    configPage: 1,
    configPageSize: 50,
    setSort: { key: "flaggedRate", dir: -1 },
    colorSort: { key: "flaggedRate", dir: -1 },
    colorHue: [0, 360],
    colorSat: [0, 100],
    colorLum: [0, 100],
    colorPage: 1,
    colorPageSize: 50,
  };

  // ── Root layout ────────────────────────────────────────────────────────────
  const app = document.getElementById("app");
  app.appendChild(el("h1", {}, ["Color Engine Stress Test Dashboard"]));
  app.appendChild(el("div", {class:"subtitle"}, [
    \`Generated \${new Date(DATA.generatedAt).toLocaleString()} · \${DATA.totalCases} cases · \${DATA.totalAnomalies} anomalies flagged\`
  ]));

  const tabsEl = el("div", {class:"tabs"});
  const tabDefs = [
    {id:"quality", label:"Which Algorithm Should I Use?"},
    {id:"configs", label:"Per-Config (engineering)"},
    {id:"sets", label:"Per-Set (engineering)"},
    {id:"colors", label:"Per-Color (engineering)"},
  ];
  tabDefs.forEach(t => {
    const b = el("button", {class:"tab" + (t.id===state.tab?" active":""), onclick: () => { state.tab = t.id; render(); }}, [t.label]);
    b.dataset.tabId = t.id;
    tabsEl.appendChild(b);
  });
  app.appendChild(tabsEl);

  const panelsWrap = el("div", {class:"panels-wrap"});
  app.appendChild(panelsWrap);

  const overlay = el("div", {class:"overlay", onclick: closeDrill});
  const drill = el("div", {class:"drilldown"});
  document.body.appendChild(overlay);
  document.body.appendChild(drill);

  function closeDrill() {
    drill.classList.remove("open");
    overlay.classList.remove("open");
  }

  // ── Config-level drilldown ──────────────────────────────────────────────
  function openConfigDrill(row) {
    drill.innerHTML = "";
    drill.appendChild(el("button", {class:"drilldown-close", onclick: closeDrill}, ["✕"]));
    drill.appendChild(el("h3", {}, [row.caseId]));
    const kv = el("div", {class:"kv"});
    const pairs = [
      ["Seed color", row.seedLabel + " (" + row.seedHex + ")"],
      ["HSL", "h" + row.hue + " s" + row.sat + "% l" + row.lum + "%"],
      ["Plugin mode", row.pluginMode],
      ["Scale algorithm", row.scaleAlgorithm || "—"],
      ["Solver mode", row.solverMode || "—"],
      ["Scale length", row.scaleLength ?? "—"],
      ["Contrast targets", row.contrastTargets],
      ["Token count", row.tokenCount],
      ["Min contrast ratio", fmt(row.minContrastRatio)],
      ["Max overshoot", fmt(row.maxContrastDelta)],
      ["Worst shortfall", fmt(row.minContrastDelta)],
      ["Adjusted tokens", row.adjustedTokenCount],
      ["WCAG fails (target>=3)", row.failRatingCount],
      ["Warnings", row.warningCount],
      ["Critical errors", row.criticalCount],
      ["Runtime error", row.runtimeError || "none"],
      ["Error categories", (row.errorCategories||"").split(",").filter(Boolean).map(c=>ERROR_CATEGORY_LABELS[c]||c).join(", ") || "none"],
      ["High-severity anomalies", row.highSeverityAnomalyTypes || "none"],
      ["All anomaly types", row.anomalyTypes || "none"],
    ];
    pairs.forEach(([k,v]) => {
      kv.appendChild(el("div", {class:"k"}, [k]));
      kv.appendChild(el("div", {}, [String(v)]));
    });
    drill.appendChild(kv);

    drill.appendChild(el("div", {}, [
      el("span", {class:"swatch", style:"background:" + row.seedHex}, []),
      row.seedHex
    ]));

    drill.appendChild(el("h3", {style:"font-size:13px;margin-top:16px;"}, [\`Tokens (\${(row.tokens||[]).length})\`]));
    const tokenTable = el("table", {class:"token-detail-table"});
    const tHead = el("thead", {}, [el("tr", {}, [
      el("th", {}, ["Theme"]), el("th", {}, ["Role"]), el("th", {}, ["Var"]),
      el("th", {}, ["Value"]), el("th", {}, ["Target"]), el("th", {}, ["Ratio"]),
      el("th", {}, ["Delta"]), el("th", {}, ["Rating"]), el("th", {}, ["Adj?"]),
    ])]);
    tokenTable.appendChild(tHead);
    const tBody = el("tbody");
    (row.tokens || []).forEach(t => {
      const isBad = (t.contrastDelta !== null && t.contrastDelta < -0.05) || (t.contrastRating === "Fail" && (t.contrastTarget||0) >= 3);
      const tr = el("tr", {class: isBad ? "bad-token" : ""});
      tr.appendChild(el("td", {}, [t.theme]));
      tr.appendChild(el("td", {}, [t.role]));
      tr.appendChild(el("td", {}, [t.variation]));
      tr.appendChild(el("td", {}, [el("span",{class:"swatch", style:"background:"+t.value},[]), t.value]));
      tr.appendChild(el("td", {}, [fmt(t.contrastTarget)]));
      tr.appendChild(ratioTd(t.contrastRatio));
      tr.appendChild(el("td", {}, [fmt(t.contrastDelta)]));
      tr.appendChild(el("td", {}, [t.contrastRating || "—"]));
      tr.appendChild(el("td", {}, [t.isAdjusted ? "yes" : ""]));
      tBody.appendChild(tr);
    });
    tokenTable.appendChild(tBody);
    drill.appendChild(el("div", {class:"table-wrap", style:"max-height:320px;margin-top:8px;"}, [tokenTable]));

    drill.classList.add("open");
    overlay.classList.add("open");
  }

  function openSetDrill(row, memberRows) {
    drill.innerHTML = "";
    drill.appendChild(el("button", {class:"drilldown-close", onclick: closeDrill}, ["✕"]));
    drill.appendChild(el("h3", {}, [row.setKey]));
    const kv = el("div", {class:"kv"});
    const m = row.metrics;
    const pairs = [
      ["Cases", m.n],
      ["Flagged cases", m.flaggedCaseCount + " (" + pct(m.flaggedCaseCount / m.n) + ")"],
      ["Avg min contrast", fmt(m.avgMinContrastRatio)],
      ["Avg adjusted rate", pct(m.avgAdjustedRate)],
      ["WCAG-fail rate", pct(m.avgFailRateWcag)],
      ["Avg overshoot", fmt(m.avgOvershoot)],
      ["Worst shortfall", fmt(m.worstShortfall)],
      ["Warning rate", pct(m.warningRate)],
      ["Critical errors", m.criticalCount],
    ];
    pairs.forEach(([k,v]) => {
      kv.appendChild(el("div", {class:"k"}, [k]));
      kv.appendChild(el("div", {}, [String(v)]));
    });
    drill.appendChild(kv);

    if (m.categoryCounts && Object.keys(m.categoryCounts).length) {
      drill.appendChild(el("h3", {style:"font-size:13px;margin-top:10px;"}, ["Error categories in this set"]));
      const catWrap = el("div", {class:"chart-wrap", style:"margin-bottom:10px;padding:8px 10px;"});
      Object.entries(m.categoryCounts).sort((a,b)=>b[1]-a[1]).forEach(([cat, count]) => {
        const row = el("div", {class:"chart-row"});
        row.appendChild(el("div", {class:"lbl", style:"width:90px;"}, [ERROR_CATEGORY_LABELS[cat]||cat]));
        const track = el("div", {class:"track"});
        track.appendChild(el("div", {class:"fill danger", style:"width:" + Math.min(100, count/m.n*100) + "%"}));
        row.appendChild(track);
        row.appendChild(el("div", {class:"num"}, [count + "/" + m.n]));
        catWrap.appendChild(row);
      });
      drill.appendChild(catWrap);
    }

    // Theme/role breakdown across every token in every member case — pinpoints
    // whether a set's problems are theme-specific (e.g. only dark bg) or
    // role-specific (e.g. only the "border" role), rather than uniform.
    const allTokens = memberRows.flatMap(r => (r.tokens || []).map(t => Object.assign({}, t, {caseId: r.caseId})));
    if (allTokens.length) {
      drill.appendChild(el("h3", {style:"font-size:13px;margin-top:10px;"}, ["Worst-shortfall rate by theme"]));
      drill.appendChild(groupedRateChart(allTokens, t => t.theme));
      drill.appendChild(el("h3", {style:"font-size:13px;margin-top:10px;"}, ["Worst-shortfall rate by role"]));
      drill.appendChild(groupedRateChart(allTokens, t => t.role));
    }

    drill.appendChild(el("h3", {style:"font-size:13px;margin-top:10px;"}, ["Worst cases in this set (click to open)"]));
    const list = el("div", {class:"token-list"});
    memberRows
      .slice()
      .sort((a,b) => (a.minContrastDelta ?? 0) - (b.minContrastDelta ?? 0))
      .slice(0, 15)
      .forEach(r => {
        list.appendChild(el("div", {class:"token-row", style:"cursor:pointer;", onclick: () => openConfigDrill(r)}, [
          el("span", {class:"name"}, [r.caseId]),
          el("span", {}, [fmt(r.minContrastDelta)]),
        ]));
      });
    drill.appendChild(list);
    drill.classList.add("open");
    overlay.classList.add("open");
  }

  // Buckets tokens by keyFn and shows what fraction of each bucket is a
  // "bad" token (shortfall beyond tolerance, or a genuine WCAG-range fail) —
  // used to localize whether a set's problems concentrate in one theme/role.
  function groupedRateChart(tokens, keyFn) {
    const groups = new Map();
    tokens.forEach(t => {
      const k = keyFn(t);
      if (!groups.has(k)) groups.set(k, {total:0, bad:0});
      const g = groups.get(k);
      g.total++;
      const isBad = (t.contrastDelta !== null && t.contrastDelta < -0.05) || (t.contrastRating === "Fail" && (t.contrastTarget||0) >= 3);
      if (isBad) g.bad++;
    });
    const wrap = el("div", {class:"chart-wrap", style:"margin-bottom:10px;padding:8px 10px;"});
    [...groups.entries()].sort((a,b) => (b[1].bad/b[1].total) - (a[1].bad/a[1].total)).forEach(([k, g]) => {
      const frac = g.bad / g.total;
      const row = el("div", {class:"chart-row"});
      row.appendChild(el("div", {class:"lbl", style:"width:90px;"}, [String(k)]));
      const track = el("div", {class:"track"});
      track.appendChild(el("div", {class:"fill" + (frac > 0.2 ? " danger" : "")  , style:"width:" + (frac*100) + "%"}));
      row.appendChild(track);
      row.appendChild(el("div", {class:"num"}, [g.bad + "/" + g.total]));
      wrap.appendChild(row);
    });
    return wrap;
  }

  function openColorDrill(row, memberRows) {
    drill.innerHTML = "";
    drill.appendChild(el("button", {class:"drilldown-close", onclick: closeDrill}, ["✕"]));
    drill.appendChild(el("h3", {}, [
      el("span", {class:"swatch", style:"background:" + row.seedHex}, []),
      row.seedLabel
    ]));
    const kv = el("div", {class:"kv"});
    const m = row.metrics;
    const pairs = [
      ["Hex", row.seedHex],
      ["HSL", "h" + row.hue + " s" + row.sat + "% l" + row.lum + "%"],
      ["Configs run", m.n],
      ["Flagged configs", m.flaggedCaseCount + " (" + pct(m.flaggedCaseCount / m.n) + ")"],
      ["Avg min contrast", fmt(m.avgMinContrastRatio)],
      ["Avg adjusted rate", pct(m.avgAdjustedRate)],
      ["WCAG-fail rate", pct(m.avgFailRateWcag)],
      ["Worst shortfall", fmt(m.worstShortfall)],
    ];
    pairs.forEach(([k,v]) => {
      kv.appendChild(el("div", {class:"k"}, [k]));
      kv.appendChild(el("div", {}, [String(v)]));
    });
    drill.appendChild(kv);
    drill.appendChild(el("h3", {style:"font-size:13px;margin-top:10px;"}, ["Configs for this color, worst first (click to open)"]));
    const list = el("div", {class:"token-list"});
    memberRows
      .slice()
      .sort((a,b) => (a.minContrastDelta ?? 0) - (b.minContrastDelta ?? 0))
      .slice(0, 20)
      .forEach(r => {
        list.appendChild(el("div", {class:"token-row", style:"cursor:pointer;", onclick: () => openConfigDrill(r)}, [
          el("span", {class:"name"}, [r.caseId]),
          el("span", {}, [fmt(r.minContrastDelta)]),
        ]));
      });
    drill.appendChild(list);
    drill.classList.add("open");
    overlay.classList.add("open");
  }

  // ── Sortable table helper ──────────────────────────────────────────────────
  function sortRows(rows, key, dir, accessor) {
    return rows.slice().sort((a,b) => {
      const av = accessor(a,key), bv = accessor(b,key);
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string") return dir * av.localeCompare(bv);
      return dir * (av - bv);
    });
  }

  // ── Pagination helper ────────────────────────────────────────────────────
  // Returns {pageRows, totalPages} and renders a control bar into hostEl.
  function paginate(rows, pageKey, pageSizeKey, hostEl, onChange) {
    const pageSize = state[pageSizeKey];
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (state[pageKey] > totalPages) state[pageKey] = totalPages;
    if (state[pageKey] < 1) state[pageKey] = 1;
    const page = state[pageKey];
    const start = (page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    hostEl.innerHTML = "";
    const info = el("span", {}, [
      rows.length === 0 ? "No rows" : \`Showing \${start+1}-\${Math.min(start+pageSize, rows.length)} of \${rows.length}\`
    ]);
    hostEl.appendChild(info);

    const prevBtn = el("button", {disabled: page <= 1, onclick: () => { state[pageKey] = page - 1; onChange(); }}, ["‹ Prev"]);
    const nextBtn = el("button", {disabled: page >= totalPages, onclick: () => { state[pageKey] = page + 1; onChange(); }}, ["Next ›"]);
    hostEl.appendChild(prevBtn);
    hostEl.appendChild(el("span", {}, [\`Page \${page} / \${totalPages}\`]));
    hostEl.appendChild(nextBtn);

    const sizeSel = el("select", {onchange: (e) => { state[pageSizeKey] = parseInt(e.target.value, 10); state[pageKey] = 1; onChange(); }});
    [25, 50, 100, 250, 500].forEach(n => {
      const opt = el("option", {value:String(n)}, [n + " / page"]);
      if (n === pageSize) opt.selected = true;
      sizeSel.appendChild(opt);
    });
    hostEl.appendChild(sizeSel);

    return pageRows;
  }

  // ── Range filter widget (hue/sat/lum) ───────────────────────────────────
  function rangeFilter(label, maxVal, stateKeyPrefix, key, onChange) {
    const wrap = el("div", {class:"range-filter"});
    wrap.appendChild(el("span", {class:"rf-label"}, [label]));
    const range = state[key];
    const lo = el("input", {type:"number", min:"0", max:String(maxVal), value:String(range[0]),
      oninput: (e) => { range[0] = Math.max(0, Math.min(maxVal, parseFloat(e.target.value) || 0)); onChange(); }});
    const hi = el("input", {type:"number", min:"0", max:String(maxVal), value:String(range[1]),
      oninput: (e) => { range[1] = Math.max(0, Math.min(maxVal, parseFloat(e.target.value) || 0)); onChange(); }});
    wrap.appendChild(lo);
    wrap.appendChild(el("span", {}, ["–"]));
    wrap.appendChild(hi);
    return wrap;
  }
  function inRange(val, range) { return val >= range[0] && val <= range[1]; }

  // ── Panel: Which Algorithm Should I Use? ────────────────────────────────
  // Written for someone picking an algorithm/solver in the Settings dropdown,
  // not for reading engine internals — plain language, real color swatches,
  // no HSL coordinates or raw deltas.

  function bigSwatch(hex) {
    return el("span", {class:"big-swatch", style:"background:" + hex, title: hex});
  }

  function qualityScoreLabel(frac) {
    if (frac === null || frac === undefined) return "—";
    if (frac >= 0.9) return "Excellent";
    if (frac >= 0.75) return "Good";
    if (frac >= 0.5) return "Fair";
    return "Weak";
  }

  function qualityCard(row) {
    const q = row.quality;
    const card = el("div", {class:"quality-card"});
    card.appendChild(el("div", {class:"quality-card-title"}, [row.value]));
    card.appendChild(el("div", {class:"quality-card-sub"}, [row.dimension === "scaleAlgorithm" ? "Scale algorithm" : "Direct-mode solver"]));

    const scoreRow = (label, frac, hint) => {
      const wrap = el("div", {class:"quality-score-block"});
      const top = el("div", {class:"quality-score-toprow"});
      top.appendChild(el("div", {class:"quality-score-label"}, [label]));
      top.appendChild(el("div", {class:"quality-score-tag"}, [qualityScoreLabel(frac)]));
      wrap.appendChild(top);
      wrap.appendChild(barCell(frac ?? 0));
      wrap.appendChild(el("div", {class:"quality-score-hint"}, [hint]));
      return wrap;
    };

    card.appendChild(scoreRow("Keeps your color's vividness", q.avgVividnessPreserved, "How close the output stays to your seed color's saturation, on average — 100% means it never gets muddier than the color you picked."));
    card.appendChild(scoreRow("Never turns your color gray", q.wentGrayRate !== null ? 1 - q.wentGrayRate : null, q.wentGrayRate ? \`Collapsed to a near-gray output in \${pct(q.wentGrayRate)} of test cases where the seed was clearly a color, not a neutral.\` : "Never collapsed a real color to gray in testing."));
    card.appendChild(scoreRow("Delivers the contrast you asked for", q.deliversTargetRate, "How often the result hits your exact target instead of the closest achievable compromise."));

    if (row.dimension === "solverMode" && q.bestExample && q.worstExample) {
      const examples = el("div", {class:"quality-examples"});
      const bestWrap = el("div", {class:"quality-example"});
      bestWrap.appendChild(el("div", {class:"quality-example-label"}, ["Best-case result"]));
      const bestRow = el("div", {class:"quality-example-swatches"}, [bigSwatch(q.bestExample.seedHex), el("span", {}, ["→"]), bigSwatch(q.bestExample.outputHex)]);
      bestWrap.appendChild(bestRow);
      const worstWrap = el("div", {class:"quality-example"});
      worstWrap.appendChild(el("div", {class:"quality-example-label"}, ["Worst-case result"]));
      const worstRow = el("div", {class:"quality-example-swatches"}, [bigSwatch(q.worstExample.seedHex), el("span", {}, ["→"]), bigSwatch(q.worstExample.outputHex)]);
      worstWrap.appendChild(worstRow);
      examples.appendChild(bestWrap);
      examples.appendChild(worstWrap);
      card.appendChild(examples);
    }

    return card;
  }

  function renderQualityPanel() {
    const panel = el("div", {class:"panel active", id:"panel-quality"});
    panel.appendChild(el("h2", {}, ["Which algorithm should I use?"]));
    panel.appendChild(el("div", {class:"quality-intro"}, [
      "Every algorithm and solver mode was run against thousands of test colors covering the full hue wheel, muted brand colors, and known tricky cases (yellows, near-neutrals). These scores reflect what actually happens to a color you pick — not engine internals. The left swatch is the color you'd pick; the right swatch is what the plugin produces.",
    ]));

    const scaleRows = DATA.qualityRows.filter(r => r.dimension === "scaleAlgorithm").sort((a,b) => (b.quality.avgVividnessPreserved ?? 0) - (a.quality.avgVividnessPreserved ?? 0));
    const solverRows = DATA.qualityRows.filter(r => r.dimension === "solverMode").sort((a,b) => (b.quality.avgVividnessPreserved ?? 0) - (a.quality.avgVividnessPreserved ?? 0));

    panel.appendChild(el("h3", {}, ["Scale algorithms (Scale mode)"]));
    const scaleGrid = el("div", {class:"quality-grid"});
    scaleRows.forEach(r => scaleGrid.appendChild(qualityCard(r)));
    panel.appendChild(scaleGrid);

    panel.appendChild(el("h3", {}, ["Solver modes (Direct mode)"]));
    const solverGrid = el("div", {class:"quality-grid"});
    solverRows.forEach(r => solverGrid.appendChild(qualityCard(r)));
    panel.appendChild(solverGrid);

    panelsWrap.appendChild(panel);
  }

  // ── Panel: Per-Config ────────────────────────────────────────────────────
  function renderConfigsPanel() {
    const panel = el("div", {class:"panel active", id:"panel-configs"});
    const toolbar = el("div", {class:"toolbar"});
    const search = el("input", {type:"text", placeholder:"Search caseId / color...", value: state.configFilter,
      oninput: (e) => { state.configFilter = e.target.value; state.configPage = 1; renderConfigTable(); }});
    toolbar.appendChild(search);

    const modeSel = el("select", {onchange: (e) => {
      state.configPluginMode = e.target.value;
      state.configPage = 1;
      // Switching mode makes the other axis meaningless — Algorithm only
      // applies to scale mode, Solver only to direct mode — so reset+disable
      // whichever selector no longer applies instead of leaving a stale,
      // impossible-to-match filter selected.
      if (state.configPluginMode === "direct") state.configAlgo = "";
      if (state.configPluginMode === "scale") state.configSolver = "";
      renderConfigsPanel();
    }});
    ["", "scale", "direct"].forEach(v => {
      const opt = el("option", {value:v}, [v || "All modes"]);
      if (v === state.configPluginMode) opt.selected = true;
      modeSel.appendChild(opt);
    });
    toolbar.appendChild(modeSel);

    const algos = [...new Set(DATA.configRows.map(r=>r.scaleAlgorithm).filter(Boolean))];
    const algoDisabled = state.configPluginMode === "direct";
    const algoSel = el("select", {disabled: algoDisabled, onchange: (e) => { state.configAlgo = e.target.value; state.configPage = 1; renderConfigTable(); }});
    const algoAllOpt = el("option", {value:""}, ["All algorithms"]);
    if (!state.configAlgo) algoAllOpt.selected = true;
    algoSel.appendChild(algoAllOpt);
    algos.forEach(a => { const opt = el("option", {value:a}, [a]); if (a === state.configAlgo) opt.selected = true; algoSel.appendChild(opt); });
    toolbar.appendChild(algoSel);

    const solvers = [...new Set(DATA.configRows.map(r=>r.solverMode).filter(Boolean))];
    const solverDisabled = state.configPluginMode === "scale";
    const solverSel = el("select", {disabled: solverDisabled, onchange: (e) => { state.configSolver = e.target.value; state.configPage = 1; renderConfigTable(); }});
    const solverAllOpt = el("option", {value:""}, ["All solver modes"]);
    if (!state.configSolver) solverAllOpt.selected = true;
    solverSel.appendChild(solverAllOpt);
    solvers.forEach(s => { const opt = el("option", {value:s}, [s]); if (s === state.configSolver) opt.selected = true; solverSel.appendChild(opt); });
    toolbar.appendChild(solverSel);

    const seedGroups = [...new Set(DATA.configRows.map(r=>r.seedGroup).filter(Boolean))];
    const seedGroupSel = el("select", {onchange: (e) => { state.configSeedGroup = e.target.value; state.configPage = 1; renderConfigTable(); }});
    const seedGroupAllOpt = el("option", {value:""}, ["All seed groups"]);
    if (!state.configSeedGroup) seedGroupAllOpt.selected = true;
    seedGroupSel.appendChild(seedGroupAllOpt);
    seedGroups.forEach(g => { const opt = el("option", {value:g}, [g]); if (g === state.configSeedGroup) opt.selected = true; seedGroupSel.appendChild(opt); });
    toolbar.appendChild(seedGroupSel);

    const categories = [...new Set(DATA.configRows.flatMap(r => (r.errorCategories||"").split(",").filter(Boolean)))];
    const catSel = el("select", {onchange: (e) => { state.configCategory = e.target.value; state.configPage = 1; renderConfigTable(); }});
    const catAllOpt = el("option", {value:""}, ["All error categories"]);
    if (!state.configCategory) catAllOpt.selected = true;
    catSel.appendChild(catAllOpt);
    categories.forEach(c => { const opt = el("option", {value:c}, [ERROR_CATEGORY_LABELS[c]||c]); if (c === state.configCategory) opt.selected = true; catSel.appendChild(opt); });
    toolbar.appendChild(catSel);

    const flaggedOnly = el("label", {style:"display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--muted);"});
    const flaggedCb = el("input", {type:"checkbox", checked: state.configFlaggedOnly, onchange: (e) => { state.configFlaggedOnly = e.target.checked; state.configPage = 1; renderConfigTable(); }});
    flaggedOnly.appendChild(flaggedCb);
    flaggedOnly.appendChild(document.createTextNode("High/Critical only"));
    toolbar.appendChild(flaggedOnly);

    panel.appendChild(toolbar);

    const hslToolbar = el("div", {class:"toolbar"});
    hslToolbar.appendChild(rangeFilter("Hue", 360, "config", "configHue", () => { state.configPage = 1; renderConfigTable(); }));
    hslToolbar.appendChild(rangeFilter("Sat%", 100, "config", "configSat", () => { state.configPage = 1; renderConfigTable(); }));
    hslToolbar.appendChild(rangeFilter("Lum%", 100, "config", "configLum", () => { state.configPage = 1; renderConfigTable(); }));
    panel.appendChild(hslToolbar);

    const statRow = el("div", {class:"stat-row", id:"config-stat-row"});
    panel.appendChild(statRow);

    const tableWrap = el("div", {class:"table-wrap", id:"config-table-wrap"});
    panel.appendChild(tableWrap);
    const pager = el("div", {class:"pagination", id:"config-pager"});
    panel.appendChild(pager);
    panelsWrap.appendChild(panel);
    renderConfigTable();
  }

  function filteredConfigRows() {
    let rows = DATA.configRows;
    if (state.configPluginMode) rows = rows.filter(r => r.pluginMode === state.configPluginMode);
    if (state.configAlgo) rows = rows.filter(r => r.scaleAlgorithm === state.configAlgo);
    if (state.configSolver) rows = rows.filter(r => r.solverMode === state.configSolver);
    if (state.configSeedGroup) rows = rows.filter(r => r.seedGroup === state.configSeedGroup);
    if (state.configCategory) rows = rows.filter(r => (r.errorCategories||"").split(",").includes(state.configCategory));
    if (state.configFlaggedOnly) rows = rows.filter(r => r.highSeverityAnomalyTypes && r.highSeverityAnomalyTypes.length);
    rows = rows.filter(r => inRange(r.hue, state.configHue) && inRange(r.sat, state.configSat) && inRange(r.lum, state.configLum));
    if (state.configFilter) {
      const q = state.configFilter.toLowerCase();
      rows = rows.filter(r => r.caseId.toLowerCase().includes(q) || r.seedLabel.toLowerCase().includes(q));
    }
    return rows;
  }

  const CONFIG_COLS = [
    {key:"caseId", label:"Case ID"},
    {key:"pluginMode", label:"Mode"},
    {key:"seedLabel", label:"Color"},
    {key:"seedGroup", label:"Seed Group"},
    {key:"scaleAlgorithm", label:"Algo"},
    {key:"solverMode", label:"Solver"},
    {key:"scaleLength", label:"Len"},
    {key:"minContrastRatio", label:"Min Contrast"},
    {key:"maxContrastDelta", label:"Max Overshoot"},
    {key:"minContrastDelta", label:"Worst Shortfall"},
    {key:"adjustedTokenCount", label:"Adjusted"},
    {key:"warningCount", label:"Warnings"},
    {key:"status", label:"Status"},
  ];

  function renderConfigTable() {
    const wrap = document.getElementById("config-table-wrap");
    if (!wrap) return;

    // Stats always reflect the currently filtered set, not the whole dataset.
    const filtered = filteredConfigRows();
    const statRow = document.getElementById("config-stat-row");
    if (statRow) {
      statRow.innerHTML = "";
      const total = filtered.length;
      const flagged = filtered.filter(r => r.highSeverityAnomalyTypes && r.highSeverityAnomalyTypes.length).length;
      const critical = filtered.filter(r => r.criticalCount > 0 || r.runtimeError).length;
      const noisy = filtered.filter(r => r.anomalyTypes && r.anomalyTypes.length && !(r.highSeverityAnomalyTypes && r.highSeverityAnomalyTypes.length)).length;
      [["Filtered", total], ["High/Critical", flagged], ["Critical", critical], ["Medium-only", noisy], ["Clean", total - flagged - noisy]].forEach(([l,v]) => {
        statRow.appendChild(el("div", {class:"stat-tile"}, [el("div",{class:"label"},[l]), el("div",{class:"value"},[String(v)])]));
      });
    }

    let rows = sortRows(filtered, state.configSort.key, state.configSort.dir, (r,k) => k === "status" ? (r.anomalyTypes||"") : r[k]);

    const table = el("table");
    const thead = el("thead");
    const headRow = el("tr");
    CONFIG_COLS.forEach(c => {
      const th = el("th", {onclick: () => {
        if (state.configSort.key === c.key) state.configSort.dir *= -1;
        else { state.configSort.key = c.key; state.configSort.dir = 1; }
        renderConfigTable();
      }}, [c.label]);
      if (state.configSort.key === c.key) { th.classList.add("sorted"); th.dataset.arrow = state.configSort.dir === 1 ? "▲" : "▼"; }
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const pagerEl = document.getElementById("config-pager");
    const pageRows = pagerEl ? paginate(rows, "configPage", "configPageSize", pagerEl, renderConfigTable) : rows;

    const tbody = el("tbody");
    pageRows.forEach(r => {
      const tr = el("tr", {onclick: () => openConfigDrill(r)});
      tr.appendChild(el("td", {}, [r.caseId]));
      tr.appendChild(el("td", {}, [r.pluginMode]));
      tr.appendChild(el("td", {}, [el("span",{class:"swatch", style:"background:"+r.seedHex},[]), r.seedLabel]));
      tr.appendChild(el("td", {}, [r.seedGroup || "—"]));
      tr.appendChild(el("td", {}, [r.scaleAlgorithm || "—"]));
      tr.appendChild(el("td", {}, [r.solverMode || "—"]));
      tr.appendChild(el("td", {}, [r.scaleLength ?? "—"]));
      tr.appendChild(ratioTd(r.minContrastRatio));
      tr.appendChild(el("td", {}, [fmt(r.maxContrastDelta)]));
      tr.appendChild(el("td", {}, [fmt(r.minContrastDelta)]));
      tr.appendChild(el("td", {}, [String(r.adjustedTokenCount)]));
      tr.appendChild(el("td", {}, [String(r.warningCount)]));
      tr.appendChild(el("td", {}, [severityBadge(r)]));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.innerHTML = "";
    wrap.appendChild(table);
    if (rows.length === 0) {
      wrap.appendChild(el("div", {class:"empty-state"}, ["No matching configs."]));
    }
  }

  // ── Panel: Per-Set (algorithm / solver / scaleLength / targets) ─────────────
  function renderSetsPanel() {
    const panel = el("div", {class:"panel active", id:"panel-sets"});
    const scroll = el("div", {class:"scroll-panel"});

    // Radar charts — one small-multiple per algorithm and per solver mode,
    // across normalized [0,1] metrics so shapes are visually comparable.
    const algoRows = DATA.setRows.filter(r => r.dimension === "scaleAlgorithm");
    const solverRows = DATA.setRows.filter(r => r.dimension === "solverMode");
    if (algoRows.length) {
      scroll.appendChild(el("h2", {}, ["Scale algorithm radar (reliability profile)"]));
      scroll.appendChild(radarGrid(algoRows));
    }
    if (solverRows.length) {
      scroll.appendChild(el("h2", {}, ["Solver mode radar (reliability profile)"]));
      scroll.appendChild(radarGrid(solverRows));
    }

    scroll.appendChild(el("h2", {}, ["Scale algorithm — flagged case rate"]));
    scroll.appendChild(buildChart(algoRows, r => r.value, r => r.metrics.flaggedCaseCount / r.metrics.n));

    scroll.appendChild(el("h2", {}, ["Solver mode — flagged case rate"]));
    scroll.appendChild(buildChart(solverRows, r => r.value, r => r.metrics.flaggedCaseCount / r.metrics.n));

    // Seed group — compares each targeted cluster's flagged rate against the
    // general grid's, the whole reason the clusters (warm-hue, low-chroma)
    // exist as a separate coverage axis instead of just denser grid points.
    const seedGroupRows = DATA.setRows.filter(r => r.dimension === "seedGroup");
    scroll.appendChild(el("h2", {}, ["Seed group — flagged case rate"]));
    scroll.appendChild(buildChart(seedGroupRows, r => r.value, r => r.metrics.flaggedCaseCount / r.metrics.n));

    const lenRows = DATA.setRows.filter(r => r.dimension === "scaleLength").sort((a,b)=>+a.value - +b.value);
    scroll.appendChild(el("h2", {}, ["Scale length — flagged case rate"]));
    scroll.appendChild(buildChart(lenRows, r => "len " + r.value, r => r.metrics.flaggedCaseCount / r.metrics.n));

    const targetRows = DATA.setRows.filter(r => r.dimension === "contrastTargets");
    scroll.appendChild(el("h2", {}, ["Contrast target set — flagged case rate"]));
    scroll.appendChild(buildChart(targetRows, r => r.value, r => r.metrics.flaggedCaseCount / r.metrics.n));

    // Combined algo x length — localizes interactions a single-axis chart
    // hides, e.g. "Linear" only misbehaves at scale length 5, not at 9/12.
    const algoLenRows = DATA.setRows.filter(r => r.dimension === "algoLength").filter(r => r.metrics.flaggedCaseCount > 0);
    if (algoLenRows.length) {
      scroll.appendChild(el("h2", {}, ["Algorithm x scale length — flagged case rate (zero-flag combos hidden)"]));
      scroll.appendChild(buildChart(algoLenRows, r => r.value.replace("__", " @ len "), r => r.metrics.flaggedCaseCount / r.metrics.n));
    }

    scroll.appendChild(el("h2", {}, ["All sets (click a row to drill down)"]));
    const tableWrap = el("div", {class:"table-wrap", id:"set-table-wrap", style:"max-height:400px;"});
    scroll.appendChild(tableWrap);
    panel.appendChild(scroll);
    panelsWrap.appendChild(panel);
    renderSetTable();
  }

  // Draws a radar/spider chart on a <canvas> for one set row's normalized
  // metric vector — pure canvas 2D, no charting library, so it survives in a
  // dependency-free static file.
  function drawRadar(canvas, labels, values, color) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const cx = w/2, cy = h/2 - 6;
    const r = Math.min(w,h)/2 - 28;
    const n = labels.length;
    ctx.clearRect(0,0,w,h);

    const isDark = matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
    const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
    const textColor = isDark ? "#9a9aa2" : "#666";

    // Grid rings
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = (Math.PI * 2 * i / n) - Math.PI/2;
        const rr = r * ring / 4;
        const x = cx + Math.cos(angle) * rr, y = cy + Math.sin(angle) * rr;
        if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    // Axis lines + labels
    ctx.fillStyle = textColor;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI/2;
      const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke();
      const lx = cx + Math.cos(angle) * (r + 14), ly = cy + Math.sin(angle) * (r + 14);
      ctx.fillText(labels[i], lx, ly + 3);
    }
    // Data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = (Math.PI * 2 * idx / n) - Math.PI/2;
      const rr = r * Math.max(0, Math.min(1, values[idx]));
      const x = cx + Math.cos(angle) * rr, y = cy + Math.sin(angle) * rr;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.fillStyle = color + "33";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  }

  // Builds one radar card per set row. Metrics are normalized per-metric
  // across the given rows (min-max), except rates which are already [0,1] —
  // "higher is worse" metrics (adjusted rate, wcag-fail rate, warning rate)
  // are used as-is so a bigger radar shape always reads as "more problems."
  function radarGrid(rows) {
    const grid = el("div", {class:"radar-grid"});
    const metricDefs = [
      {label:"Flagged", get: r => r.metrics.flaggedCaseCount / r.metrics.n},
      {label:"Adjusted", get: r => r.metrics.avgAdjustedRate ?? 0},
      {label:"WCAG-fail", get: r => r.metrics.avgFailRateWcag ?? 0},
      {label:"Warning", get: r => r.metrics.warningRate ?? 0},
      {label:"Overshoot", get: r => r.metrics.avgOvershoot ?? 0},
    ];
    // Normalize "overshoot" (unbounded) across the row set; the rest are
    // already rates in [0,1].
    const overshoots = rows.map(r => r.metrics.avgOvershoot ?? 0);
    const maxOvershoot = Math.max(0.01, ...overshoots);

    rows.forEach(r => {
      const card = el("div", {class:"radar-card"});
      card.appendChild(el("div", {class:"radar-title"}, [r.value]));
      const canvas = el("canvas", {width:"200", height:"170"});
      card.appendChild(canvas);
      const values = metricDefs.map((m,i) => i === 4 ? (r.metrics.avgOvershoot ?? 0) / maxOvershoot : m.get(r));
      const flaggedRate = r.metrics.flaggedCaseCount / r.metrics.n;
      const color = flaggedRate > 0.3 ? "#c62828" : (flaggedRate > 0.05 ? "#e0862c" : "#3b6fd1");
      requestAnimationFrame(() => drawRadar(canvas, metricDefs.map(m=>m.label), values, color));
      card.appendChild(el("div", {class:"radar-sub"}, [\`n=\${r.metrics.n}, \${pct(flaggedRate)} flagged\`]));
      grid.appendChild(card);
    });
    return grid;
  }

  function buildChart(rows, labelFn, valueFn) {
    const wrap = el("div", {class:"chart-wrap"});
    const max = Math.max(0.01, ...rows.map(valueFn));
    rows.slice().sort((a,b) => valueFn(b) - valueFn(a)).forEach(r => {
      const v = valueFn(r);
      const row = el("div", {class:"chart-row"});
      row.appendChild(el("div", {class:"lbl"}, [labelFn(r)]));
      const track = el("div", {class:"track"});
      const fill = el("div", {class:"fill" + (v > 0.3 ? " danger" : ""), style:"width:" + (max ? (v/max*100) : 0) + "%"});
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el("div", {class:"num"}, [pct(v)]));
      wrap.appendChild(row);
    });
    return wrap;
  }

  const SET_COLS = [
    {key:"setKey", label:"Set"},
    {key:"dimension", label:"Dimension"},
    {key:"n", label:"Cases"},
    {key:"flaggedRate", label:"Flagged %"},
    {key:"avgMinContrastRatio", label:"Avg Min Contrast"},
    {key:"avgAdjustedRate", label:"Adjusted %"},
    {key:"avgOvershoot", label:"Avg Overshoot"},
    {key:"worstShortfall", label:"Worst Shortfall"},
    {key:"warningRate", label:"Warning %"},
  ];

  function setAccessor(r, k) {
    if (k === "setKey" || k === "dimension") return r[k];
    if (k === "n") return r.metrics.n;
    if (k === "flaggedRate") return r.metrics.flaggedCaseCount / r.metrics.n;
    return r.metrics[k];
  }

  function renderSetTable() {
    const wrap = document.getElementById("set-table-wrap");
    if (!wrap) return;
    let rows = sortRows(DATA.setRows, state.setSort.key, state.setSort.dir, setAccessor);
    const table = el("table");
    const thead = el("thead");
    const headRow = el("tr");
    SET_COLS.forEach(c => {
      const th = el("th", {onclick: () => {
        if (state.setSort.key === c.key) state.setSort.dir *= -1;
        else { state.setSort.key = c.key; state.setSort.dir = -1; }
        renderSetTable();
      }}, [c.label]);
      if (state.setSort.key === c.key) { th.classList.add("sorted"); th.dataset.arrow = state.setSort.dir === 1 ? "▲" : "▼"; }
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = el("tbody");
    rows.forEach(r => {
      const memberRows = DATA.configRows.filter(cr => {
        if (r.dimension === "scaleAlgorithm") return cr.scaleAlgorithm === r.value;
        if (r.dimension === "solverMode") return cr.solverMode === r.value;
        if (r.dimension === "seedGroup") return cr.seedGroup === r.value;
        if (r.dimension === "scaleLength") return String(cr.scaleLength) === r.value;
        if (r.dimension === "contrastTargets") return cr.contrastTargets === r.value;
        if (r.dimension === "algoLength") { const [algo, len] = r.value.split("__"); return cr.scaleAlgorithm === algo && String(cr.scaleLength) === len; }
        return false;
      });
      const tr = el("tr", {onclick: () => openSetDrill(r, memberRows)});
      const flaggedRate = r.metrics.flaggedCaseCount / r.metrics.n;
      tr.appendChild(el("td", {}, [r.setKey]));
      tr.appendChild(el("td", {}, [r.dimension]));
      tr.appendChild(el("td", {}, [String(r.metrics.n)]));
      tr.appendChild(el("td", {}, [barCell(flaggedRate)]));
      tr.appendChild(ratioTd(r.metrics.avgMinContrastRatio));
      tr.appendChild(el("td", {}, [pct(r.metrics.avgAdjustedRate)]));
      tr.appendChild(el("td", {}, [fmt(r.metrics.avgOvershoot)]));
      tr.appendChild(el("td", {}, [fmt(r.metrics.worstShortfall)]));
      tr.appendChild(el("td", {}, [pct(r.metrics.warningRate)]));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.innerHTML = "";
    wrap.appendChild(table);
  }

  function barCell(frac) {
    const wrap = el("div", {class:"bar-cell"});
    const track = el("div", {class:"bar-track"});
    const fill = el("div", {class:"bar-fill" + (frac > 0.3 ? " warn" : ""), style:"width:" + Math.min(100, frac*100) + "%"});
    track.appendChild(fill);
    wrap.appendChild(track);
    wrap.appendChild(el("span", {}, [pct(frac)]));
    return wrap;
  }

  // ── Panel: Per-Color ─────────────────────────────────────────────────────
  function renderColorsPanel() {
    const panel = el("div", {class:"panel active", id:"panel-colors"});
    panel.appendChild(el("h2", {}, ["Per-color reliability (across all configs using that seed)"]));

    const hslToolbar = el("div", {class:"toolbar"});
    hslToolbar.appendChild(rangeFilter("Hue", 360, "color", "colorHue", () => { state.colorPage = 1; renderColorTable(); }));
    hslToolbar.appendChild(rangeFilter("Sat%", 100, "color", "colorSat", () => { state.colorPage = 1; renderColorTable(); }));
    hslToolbar.appendChild(rangeFilter("Lum%", 100, "color", "colorLum", () => { state.colorPage = 1; renderColorTable(); }));
    panel.appendChild(hslToolbar);

    const tableWrap = el("div", {class:"table-wrap", id:"color-table-wrap"});
    panel.appendChild(tableWrap);
    const pager = el("div", {class:"pagination", id:"color-pager"});
    panel.appendChild(pager);
    panelsWrap.appendChild(panel);
    renderColorTable();
  }

  const COLOR_COLS = [
    {key:"seedLabel", label:"Color"},
    {key:"seedGroup", label:"Seed Group"},
    {key:"n", label:"Configs"},
    {key:"flaggedRate", label:"Flagged %"},
    {key:"avgMinContrastRatio", label:"Avg Min Contrast"},
    {key:"avgAdjustedRate", label:"Adjusted %"},
    {key:"worstShortfall", label:"Worst Shortfall"},
  ];

  function colorAccessor(r, k) {
    if (k === "seedLabel") return r.seedLabel;
    if (k === "seedGroup") return r.seedGroup;
    if (k === "n") return r.metrics.n;
    if (k === "flaggedRate") return r.metrics.flaggedCaseCount / r.metrics.n;
    return r.metrics[k];
  }

  function renderColorTable() {
    const wrap = document.getElementById("color-table-wrap");
    if (!wrap) return;
    let rows = DATA.colorRows.filter(r => inRange(r.hue, state.colorHue) && inRange(r.sat, state.colorSat) && inRange(r.lum, state.colorLum));
    rows = sortRows(rows, state.colorSort.key, state.colorSort.dir, colorAccessor);
    const table = el("table");
    const thead = el("thead");
    const headRow = el("tr");
    COLOR_COLS.forEach(c => {
      const th = el("th", {onclick: () => {
        if (state.colorSort.key === c.key) state.colorSort.dir *= -1;
        else { state.colorSort.key = c.key; state.colorSort.dir = -1; }
        renderColorTable();
      }}, [c.label]);
      if (state.colorSort.key === c.key) { th.classList.add("sorted"); th.dataset.arrow = state.colorSort.dir === 1 ? "▲" : "▼"; }
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const pagerEl = document.getElementById("color-pager");
    const pageRows = pagerEl ? paginate(rows, "colorPage", "colorPageSize", pagerEl, renderColorTable) : rows;

    const tbody = el("tbody");
    pageRows.forEach(r => {
      const memberRows = DATA.configRows.filter(cr => cr.seedLabel === r.seedLabel);
      const tr = el("tr", {onclick: () => openColorDrill(r, memberRows)});
      const flaggedRate = r.metrics.flaggedCaseCount / r.metrics.n;
      tr.appendChild(el("td", {}, [el("span",{class:"swatch", style:"background:"+r.seedHex},[]), r.seedLabel]));
      tr.appendChild(el("td", {}, [r.seedGroup || "—"]));
      tr.appendChild(el("td", {}, [String(r.metrics.n)]));
      tr.appendChild(el("td", {}, [barCell(flaggedRate)]));
      tr.appendChild(ratioTd(r.metrics.avgMinContrastRatio));
      tr.appendChild(el("td", {}, [pct(r.metrics.avgAdjustedRate)]));
      tr.appendChild(el("td", {}, [fmt(r.metrics.worstShortfall)]));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.innerHTML = "";
    wrap.appendChild(table);
    if (rows.length === 0) {
      wrap.appendChild(el("div", {class:"empty-state"}, ["No matching colors."]));
    }
  }

  // ── Render orchestration ─────────────────────────────────────────────────
  function render() {
    [...tabsEl.children].forEach(b => b.classList.toggle("active", b.dataset.tabId === state.tab));
    panelsWrap.innerHTML = "";
    if (state.tab === "quality") renderQualityPanel();
    else if (state.tab === "configs") renderConfigsPanel();
    else if (state.tab === "sets") renderSetsPanel();
    else if (state.tab === "colors") renderColorsPanel();
  }

  render();
  } // end init()
})();
`;

if (require.main === module) {
  main();
}

export { main };
