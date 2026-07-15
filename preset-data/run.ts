// Runs the full preset-verification pipeline in one command:
//   discover presets -> run through engine -> flag anomalies -> build dashboard
//
// Unlike test-data/ (which stress-tests the color engine itself against a
// synthetic seed/algorithm grid), this verifies real, hand-authored presets
// (src/shared/presets/raw/**/*.ts) exactly as configured — the only way to
// catch preset-specific defects like scopedColorIds mistakes or an
// over-demanding localBg chain (see color-master skill §8.1).
//
// Run: npx tsx preset-data/run.ts             # every discovered preset
//      npx tsx preset-data/run.ts nmobile      # just nmobile
//      npx tsx preset-data/run.ts nmobile carbon
//
// Open preset-data/results/dashboard.html when done.

import { main as runPresets } from "./scripts/run-presets";
import { main as analyzePresets } from "./scripts/analyze-presets";
import { main as buildDashboard } from "./scripts/build-dashboard";

async function main() {
  console.log("── 1/3: running presets through the engine ──");
  await runPresets();

  console.log("\n── 2/3: analyzing results ──");
  analyzePresets();

  console.log("\n── 3/3: building dashboard ──");
  buildDashboard();

  console.log("\nDone. Open preset-data/results/dashboard.html to view it.");
}

main();
