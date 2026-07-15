// Reads preset-data/results/run-records.jsonl and flags QA-relevant
// anomalies per preset: runtime errors, critical engine errors, contrast
// target misses, invalid/out-of-gamut hex output, and Fail-rated tokens.
// Writes preset-data/results/anomaly-report.md (human-readable) and
// preset-data/results/anomalies.jsonl (one flagged issue per line).
//
// Rules mirror test-data/scripts/analyze-results.ts's ANOMALY_RULES pattern
// (and, one level further back, src/shared/presets/validatePreset.ts's
// Rule[] pattern) — adding a new check is adding a rule object.
//
// Run: npx tsx preset-data/scripts/analyze-presets.ts
// (expects run-presets.ts to have already run)

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { PresetRunRecord } from "./run-presets";

const RESULTS_DIR = join(__dirname, "..", "results");
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

interface Anomaly {
  presetId: string;
  relativePath: string;
  type: string;
  severity: "critical" | "high" | "medium";
  detail: string;
}

interface AnomalyRule {
  id: string;
  severity: Anomaly["severity"];
  check: (r: PresetRunRecord) => string[];
}

const ANOMALY_RULES: AnomalyRule[] = [
  {
    id: "runtime_error",
    severity: "critical",
    check: (r) => (r.runtimeError ? [r.runtimeError] : []),
  },
  {
    id: "engine_critical_error",
    severity: "critical",
    check: (r) => (r.criticalCount > 0 ? [JSON.stringify(r.errors.critical)] : []),
  },
  {
    id: "invalid_hex_output",
    severity: "critical",
    check: (r) => r.tokens.filter((t) => !HEX_RE.test(t.value)).map((t) => `${t.tokenName} = "${t.value}"`),
  },
  {
    id: "zero_tokens_produced",
    severity: "high",
    check: (r) => (r.tokenCount === 0 && !r.runtimeError ? ["variableMaker returned no tokens for this preset"] : []),
  },
  {
    // See test-data/scripts/analyze-results.ts's identical rule for the full
    // rationale on the >=3 target floor and 0.05 tolerance — same reasoning
    // applies verbatim to a preset's own tokens.
    id: "fail_contrast_rating",
    severity: "high",
    check: (r) => {
      const failed = r.tokens.filter((t) => t.contrastRating === "Fail" && (t.contrastTarget ?? 0) >= 3 && t.contrastRatio !== null && t.contrastTarget! - t.contrastRatio > 0.05);
      if (failed.length === 0) return [];
      return [`${failed.length} token(s) rated "Fail" despite target >=3: ${failed.map((t) => `${t.tokenName}(target ${t.contrastTarget}, got ${t.contrastRatio})`).join(", ")}`];
    },
  },
  {
    id: "contrast_target_missed",
    severity: "high",
    check: (r) => (r.minContrastDelta !== null && r.minContrastDelta < -0.05 ? [`worst shortfall ${r.minContrastDelta} (achieved below target)`] : []),
  },
  {
    // The bug class this dashboard exists to catch (color-master skill §8.1):
    // a localBg-chained role whose variation ladder demands a target above
    // what its fixed chained background can achieve. The engine's own
    // warning strings are the ground truth for this — surface them verbatim
    // rather than re-deriving detection logic, since the phrasing itself
    // ("... not achievable ...", "Black/white used") is what a human scans for.
    id: "engine_warning",
    severity: "medium",
    check: (r) => r.errors.warnings.map((w) => JSON.stringify(w)),
  },
  {
    id: "contrast_overshoot",
    severity: "medium",
    check: (r) => (r.maxContrastDelta !== null && r.maxContrastDelta > 0.5 ? [`worst overshoot +${r.maxContrastDelta}`] : []),
  },
  {
    // Not a defect by itself (Scale mode's normal best-effort fallback), but
    // worth surfacing in bulk — see preset-authoring-guidlines.md: "more than
    // a handful of isAdjusted tokens" means a contrast target is unreachable
    // for that seed/theme and belongs back with preset-author, not silently
    // accepted.
    id: "adjusted_tokens",
    severity: "medium",
    check: (r) => (r.adjustedTokenCount > 0 ? [`${r.adjustedTokenCount}/${r.tokenCount} tokens adjusted (target unreachable, fell back to closest step)`] : []),
  },
];

function loadRecords(): PresetRunRecord[] {
  const raw = readFileSync(join(RESULTS_DIR, "run-records.jsonl"), "utf-8");
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function analyze(records: PresetRunRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (const r of records) {
    for (const rule of ANOMALY_RULES) {
      for (const detail of rule.check(r)) {
        anomalies.push({ presetId: r.presetId, relativePath: r.relativePath, type: rule.id, severity: rule.severity, detail });
      }
    }
  }
  return anomalies;
}

function groupBy<T, K extends string | number>(items: T[], keyFn: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

function main() {
  const records = loadRecords();
  const anomalies = analyze(records);

  writeFileSync(join(RESULTS_DIR, "anomalies.jsonl"), anomalies.map((a) => JSON.stringify(a)).join("\n") + (anomalies.length ? "\n" : ""), "utf-8");

  const byType = groupBy(anomalies, (a) => a.type);
  const bySeverity = groupBy(anomalies, (a) => a.severity);
  const byPreset = groupBy(anomalies, (a) => a.presetId);

  const lines: string[] = [];
  lines.push("# Preset Verification — Anomaly Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total presets run: ${records.length}`);
  lines.push(`Total anomalies flagged: ${anomalies.length}`);
  lines.push("");

  lines.push("## By severity");
  for (const sev of ["critical", "high", "medium"] as const) {
    lines.push(`- **${sev}**: ${bySeverity.get(sev)?.length ?? 0}`);
  }
  lines.push("");

  lines.push("## By anomaly type");
  for (const [type, items] of [...byType.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`- \`${type}\`: ${items.length}`);
  }
  lines.push("");

  lines.push("## Per preset");
  for (const r of records) {
    const presetAnomalies = byPreset.get(r.presetId) ?? [];
    const critical = presetAnomalies.filter((a) => a.severity === "critical").length;
    const high = presetAnomalies.filter((a) => a.severity === "high").length;
    const medium = presetAnomalies.filter((a) => a.severity === "medium").length;
    const flag = critical > 0 ? "🔴" : high > 0 ? "🟠" : medium > 0 ? "🟡" : "✅";
    lines.push(`- ${flag} **${r.presetId}** (${r.relativePath}) — ${r.tokenCount} tokens, ${critical} critical, ${high} high, ${medium} medium`);
  }
  lines.push("");

  lines.push("## All flagged issues (critical/high first)");
  const sorted = [...anomalies].sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 };
    return rank[a.severity] - rank[b.severity];
  });
  for (const a of sorted) {
    lines.push(`- [${a.severity}] **${a.presetId}** — ${a.type}: ${a.detail}`);
  }
  lines.push("");

  writeFileSync(join(RESULTS_DIR, "anomaly-report.md"), lines.join("\n"), "utf-8");
  console.log(`Analyzed ${records.length} preset(s), found ${anomalies.length} anomalies.`);
  console.log(`Report: ${join(RESULTS_DIR, "anomaly-report.md")}`);
}

if (require.main === module) {
  main();
}

export { main };
