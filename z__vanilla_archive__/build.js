const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

// Failsafe: Ensure dependencies are installed
const rootDir = path.join(__dirname, "..");
const nodeModulesPath = path.join(rootDir, "node_modules");
if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(path.join(nodeModulesPath, "tailwindcss"))) {
  console.log("Missing dependencies. Running 'npm install'...");
  try {
    execSync("npm install", { stdio: "inherit", cwd: rootDir });
  } catch (err) {
    console.error("Failed to run 'npm install'. Please run it manually.", err);
    process.exit(1);
  }
}

const outDir = path.join(__dirname, "../dist");
const srcDir = path.join(__dirname, "src");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log("Building Tailwind CSS...");
try {
  execSync(
    `npx tailwindcss -i ${path.join(srcDir, "input.css")} -o ${path.join(srcDir, "output.css")} --minify --config ${path.join(__dirname, "tailwind.config.js")}`,
    { cwd: rootDir }
  );
} catch (err) {
  console.error("Tailwind build failed:", err);
}

console.log("Building scripts.js...");
// exportEng files are included in scripts.js (Figma sandbox) — all are ES2019-safe.
// zipBuilder.js is UI-only and excluded from the sandbox bundle.
const jsFiles = [
  "color/clrUtils.js",
  "color/clrEngine.js",
  "shared/docGen.js",
  "shared/config.js",
  "shared/exportEng/helpers.js",
  "shared/exportEng/fmtCSS.js",
  "shared/exportEng/fmtSCSS.js",
  "shared/exportEng/fmtTailwind.js",
  "shared/exportEng/fmtDTCG.js",
  "shared/exportEng/fmtStyleDictionary.js",
  "shared/exportEng/fmtSwift.js",
  "shared/exportEng/fmtAndroid.js",
  "shared/exportEng/fmtReactNative.js",
  "shared/exportEng/bundler.js",
  "figma/figmaVars.js",
  "figma/main.js",
];
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
  let content = fs
    .readFileSync(path.join(srcDir, f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "") // strip block comments
    .replace(/^\s*\/\/.*$/gm, "") // strip line comments
    .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
    .trim();
  if (f === "ui/lang/lang.js") {
    const en = fs.readFileSync(path.join(srcDir, "ui/lang/en.json"), "utf8").trim();
    const es = fs.readFileSync(path.join(srcDir, "ui/lang/es.json"), "utf8").trim();
    const hi = fs.readFileSync(path.join(srcDir, "ui/lang/hi.json"), "utf8").trim();
    content = content
      .replace("__EN_JSON__", en)
      .replace("__ES_JSON__", es)
      .replace("__HI_JSON__", hi);
  }
  return `<script>/* ${f} */\n${content}\n</script>`;
});
// 2. Inline JSZip verbatim (no comment stripping — minified code must stay intact)
const jszipContent = fs.readFileSync(path.join(srcDir, "shared/exportEng/jszip.min.js"), "utf8");
html = html.replace(/<script data-vendor="jszip"><\/script>/, () => {
  return "<script>" + jszipContent + "</script>";
});

// 3. Replace Tailwind CSS link with inlined output.css
const cssContent = fs.readFileSync(path.join(srcDir, "output.css"), "utf8");
html = html.replace(/<link href="output.css" rel="stylesheet" \/>/g, () => {
  return "<style>\n" + cssContent + "\n</style>";
});
fs.writeFileSync(path.join(outDir, "ui.html"), htmlHdr + html);
console.log("Build complete!");
