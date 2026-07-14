// Reads test-data/results/run-records.jsonl and flags QA-relevant anomalies:
// runtime errors, critical engine errors, contrast target misses, invalid/
// out-of-gamut hex output, and Fail-rated tokens. Writes a human-readable
// summary to test-data/results/anomaly-report.md plus a machine-readable
// test-data/results/anomalies.jsonl (one flagged issue per line).
//
// Anomaly checks are declared as data (ANOMALY_RULES below), mirroring
// src/shared/presets/validatePreset.ts's Rule[] pattern already established
// in this codebase — adding a new check is adding a rule object, not editing
// a branching function.
//
// Run: npx tsx test-data/scripts/analyze-results.ts

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { RunRecord } from "./run-stress-test";

const RESULTS_DIR = join(__dirname, "..", "results");
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

interface Anomaly {
  caseId: string;
  type: string;
  severity: "critical" | "high" | "medium";
  detail: string;
}

interface AnomalyRule {
  id: string;
  severity: Anomaly["severity"];
  // Returns zero or more detail strings — a rule can fire more than once per
  // record (e.g. one anomaly per bad token) by returning multiple entries.
  check: (r: RunRecord) => string[];
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
    check: (r) => (r.tokenCount === 0 && !r.runtimeError ? ["variableMaker returned no tokens for this case"] : []),
  },
  {
    // "Fail" contrast rating is WCAG's fixed bucket (<3:1) — it does not mean
    // the engine missed its own target. Only flag it when the engine's target
    // for that token was itself >=3, i.e. a genuine WCAG-relevant miss. Also
    // requires the shortfall itself to exceed 0.05 (same tolerance as
    // contrast_target_missed below) — apca-natural in particular reports a
    // *derived* WCAG-equivalent ratio for display (it actually solves for
    // APCA Lc, not WCAG), so a target-3.0 token landing at 2.99 is
    // interpolation noise landing exactly on WCAG's rating-bucket boundary,
    // not a real accuracy defect; confirmed empirically across every
    // instance of this in a full stress run (2116/2116 misses were <=0.02).
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
    id: "contrast_overshoot",
    severity: "medium",
    check: (r) => (r.maxContrastDelta !== null && r.maxContrastDelta > 0.5 ? [`worst overshoot +${r.maxContrastDelta}`] : []),
  },
  {
    id: "engine_warning",
    severity: "medium",
    check: (r) => (r.warningCount > 0 ? [`${r.warningCount} warning(s)`] : []),
  },
];

function loadRecords(): RunRecord[] {
  const raw = readFileSync(join(RESULTS_DIR, "run-records.jsonl"), "utf-8");
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function analyze(records: RunRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (const r of records) {
    for (const rule of ANOMALY_RULES) {
      for (const detail of rule.check(r)) {
        anomalies.push({ caseId: r.caseId, type: rule.id, severity: rule.severity, detail });
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
  const byAlgo = groupBy(
    records.filter((r) => r.scaleAlgorithm),
    (r) => r.scaleAlgorithm!,
  );
  const bySolver = groupBy(
    records.filter((r) => r.solverMode),
    (r) => r.solverMode!,
  );
  const bySeedGroup = groupBy(records, (r) => r.seedGroup);

  const lines: string[] = [];
  lines.push("# Color Engine Stress Test — Anomaly Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total cases run: ${records.length}`);
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

  lines.push("## Scale algorithm reliability (cases with >=1 warning or Fail rating)");
  for (const [algo, items] of byAlgo) {
    const flagged = items.filter((r) => r.warningCount > 0 || r.failRatingCount > 0 || r.criticalCount > 0).length;
    lines.push(`- ${algo}: ${flagged}/${items.length} flagged`);
  }
  lines.push("");

  lines.push("## Solver mode reliability (cases with >=1 warning or Fail rating)");
  for (const [mode, items] of bySolver) {
    const flagged = items.filter((r) => r.warningCount > 0 || r.failRatingCount > 0 || r.criticalCount > 0).length;
    lines.push(`- ${mode}: ${flagged}/${items.length} flagged`);
  }
  lines.push("");

  lines.push("## Seed group reliability (cases with >=1 warning or Fail rating)");
  lines.push("Breaks anomaly rate down by *why* the seed exists — a targeted cluster (e.g. warm-hue-cluster) showing a much higher flagged rate than the general grid is a real, actionable signal, not noise.");
  for (const [group, items] of bySeedGroup) {
    const flagged = items.filter((r) => r.warningCount > 0 || r.failRatingCount > 0 || r.criticalCount > 0).length;
    lines.push(`- ${group}: ${flagged}/${items.length} flagged (${((flagged / items.length) * 100).toFixed(1)}%)`);
  }
  lines.push("");

  lines.push("## Top 30 flagged cases (critical/high first)");
  const sorted = [...anomalies].sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 };
    return rank[a.severity] - rank[b.severity];
  });
  for (const a of sorted.slice(0, 30)) {
    lines.push(`- [${a.severity}] \`${a.caseId}\` — ${a.type}: ${a.detail}`);
  }
  lines.push("");

  writeFileSync(join(RESULTS_DIR, "anomaly-report.md"), lines.join("\n"), "utf-8");
  console.log(`Analyzed ${records.length} records, found ${anomalies.length} anomalies.`);
  console.log(`Report: ${join(RESULTS_DIR, "anomaly-report.md")}`);
}

if (require.main === module) {
  main();
}

export { main };
