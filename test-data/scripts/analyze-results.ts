// Reads test-data/results/run-records.jsonl and flags QA-relevant anomalies:
// runtime errors, critical engine errors, contrast target misses, invalid/
// out-of-gamut hex output, and Fail-rated tokens. Writes a human-readable
// summary to test-data/results/anomaly-report.md plus a machine-readable
// test-data/results/anomalies.jsonl (one flagged issue per line).
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
    if (r.runtimeError) {
      anomalies.push({ caseId: r.caseId, type: "runtime_error", severity: "critical", detail: r.runtimeError });
      continue;
    }
    if (r.criticalCount > 0) {
      anomalies.push({ caseId: r.caseId, type: "engine_critical_error", severity: "critical", detail: JSON.stringify(r.errors.critical) });
    }
    for (const t of r.tokens) {
      if (!HEX_RE.test(t.value)) {
        anomalies.push({ caseId: r.caseId, type: "invalid_hex_output", severity: "critical", detail: `${t.tokenName} = "${t.value}"` });
      }
    }
    // "Fail" contrast rating is WCAG's fixed bucket (<3:1) — it does not mean
    // the engine missed its own target. Only flag it when the engine's target
    // for that token was itself >=3, i.e. a genuine WCAG-relevant miss.
    const failedAboveWcagFloor = r.tokens.filter((t) => t.contrastRating === "Fail" && (t.contrastTarget ?? 0) >= 3);
    if (failedAboveWcagFloor.length > 0) {
      anomalies.push({ caseId: r.caseId, type: "fail_contrast_rating", severity: "high", detail: `${failedAboveWcagFloor.length} token(s) rated "Fail" despite target >=3: ${failedAboveWcagFloor.map((t) => `${t.tokenName}(target ${t.contrastTarget}, got ${t.contrastRatio})`).join(", ")}` });
    }
    if (r.minContrastDelta !== null && r.minContrastDelta < -0.05) {
      anomalies.push({ caseId: r.caseId, type: "contrast_target_missed", severity: "high", detail: `worst shortfall ${r.minContrastDelta} (achieved below target)` });
    }
    if (r.maxContrastDelta !== null && r.maxContrastDelta > 0.5) {
      anomalies.push({ caseId: r.caseId, type: "contrast_overshoot", severity: "medium", detail: `worst overshoot +${r.maxContrastDelta}` });
    }
    if (r.warningCount > 0) {
      anomalies.push({ caseId: r.caseId, type: "engine_warning", severity: "medium", detail: `${r.warningCount} warning(s)` });
    }
    if (r.tokenCount === 0 && !r.runtimeError) {
      anomalies.push({ caseId: r.caseId, type: "zero_tokens_produced", severity: "high", detail: "variableMaker returned no tokens for this case" });
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
