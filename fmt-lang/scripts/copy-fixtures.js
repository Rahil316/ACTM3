// tsc only compiles .ts files — JSON fixtures under test/fixtures/ need to be
// copied into dist/ alongside the compiled .test.js files that read them at
// runtime (via readFileSync, not `import`, so tsc's resolveJsonModule
// handling doesn't apply here). Runs as part of `npm run build`.
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "test", "fixtures");
const outDir = path.join(__dirname, "..", "dist", "fmt-lang", "test", "fixtures");

fs.mkdirSync(outDir, { recursive: true });
for (const name of fs.readdirSync(srcDir)) {
  if (!name.endsWith(".json") && !name.endsWith(".txt")) continue;
  fs.copyFileSync(path.join(srcDir, name), path.join(outDir, name));
}
