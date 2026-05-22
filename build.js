const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

// Failsafe: Ensure dependencies are installed
const nodeModulesPath = path.join(__dirname, "node_modules");
if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(path.join(nodeModulesPath, "tailwindcss"))) {
  console.log("Missing dependencies. Running 'npm install'...");
  try {
    execSync("npm install", { stdio: "inherit" });
  } catch (err) {
    console.error("Failed to run 'npm install'. Please run it manually.", err);
    process.exit(1);
  }
}

const outDir = "dist/";
const srcDir = "src/";

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

console.log("Building Tailwind CSS...");
try {
  execSync("npx tailwindcss -i src/input.css -o src/output.css --minify");
} catch (err) {
  console.error("Tailwind build failed:", err);
}

console.log("Building scripts.js...");
const jsFiles = ["color/clrUtils.js", "color/clrEngine.js", "shared/docGen.js", "shared/config.js", "figma/figmaVars.js", "figma/main.js"];
const jsContent = jsFiles
  .map((f) => {
    const content = fs
      .readFileSync(path.join(srcDir, f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return `/* ${f} */\n${content}`;
  })
  .join("\n\n");
fs.writeFileSync(path.join(outDir, "scripts.js"), jsContent);

console.log("Building ui.html...");
let html = fs.readFileSync(path.join(srcDir, "ui.html"), "utf8");
const htmlHdr = "<!-- AUTO-GENERATED — do not edit. Source: src/ui.html + src/**/*.js  Run: npm run build -->\n";

// 1. Inline scripts (matches src/path/to/file.js)
html = html.replace(/<script src="src\/([^"]+)"><\/script>/g, (_, f) => {
  const content = fs
    .readFileSync(path.join(srcDir, f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "") // strip block comments
    .replace(/^\s*\/\/.*$/gm, "") // strip line comments
    .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
    .trim();
  return `<script>/* ${f} */\n${content}\n</script>`;
});
// 2. Replace Tailwind CSS link with inlined output.css
const cssContent = fs.readFileSync(path.join(srcDir, "output.css"), "utf8");
html = html.replace(/<link href="output.css" rel="stylesheet" \/>/g, () => {
  return "<style>\n" + cssContent + "\n</style>";
});
fs.writeFileSync(path.join(outDir, "ui.html"), htmlHdr + html);
console.log("Build complete!");
