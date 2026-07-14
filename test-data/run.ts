// Runs the full stress-test pipeline in one command:
//   generate configs -> run engine -> flag anomalies -> build dashboard
//
// Run: npx tsx test-data/run.ts

import { main as runStressTest } from "./scripts/run-stress-test";
import { main as analyzeResults } from "./scripts/analyze-results";
import { main as buildReport } from "./scripts/build-report";

function main() {
  console.log("── 1/3: running stress test ──");
  runStressTest();

  console.log("\n── 2/3: analyzing results ──");
  analyzeResults();

  console.log("\n── 3/3: building dashboard ──");
  buildReport();

  console.log("\nDone. Open test-data/results/dashboard.html to view it.");
}

main();
