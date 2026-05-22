const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const version = process.argv[2];
if (!version) {
  console.error("Usage: npm run release:watch -- <version>   e.g. npm run release:watch -- v1.2");
  process.exit(1);
}
if (version.includes("/") || version.includes("\\")) {
  console.error("Version must not contain path separators.");
  process.exit(1);
}

const SRC_DIR    = path.join(__dirname, "src");
const DIST_DIR   = path.join(__dirname, "dist");
const RELEASE_DIR = path.join(__dirname, "release", version);

function updateRelease() {
  try {
    execSync("npm run build", { stdio: "inherit" });

    fs.mkdirSync(RELEASE_DIR, { recursive: true });
    fs.copyFileSync(path.join(DIST_DIR, "scripts.js"), path.join(RELEASE_DIR, "scripts.js"));
    fs.copyFileSync(path.join(DIST_DIR, "ui.html"),    path.join(RELEASE_DIR, "ui.html"));

    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8"));
    manifest.main = "scripts.js";
    manifest.ui   = "ui.html";
    fs.writeFileSync(path.join(RELEASE_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

    console.log(`[${new Date().toLocaleTimeString()}] release/${version} updated. Reload the plugin in Figma.\n`);
  } catch (_) {
    console.error(`[${new Date().toLocaleTimeString()}] Build failed — check errors above.\n`);
  }
}

console.log(`Watching src/ for changes → release/${version}/  (Ctrl+C to stop)\n`);
updateRelease();

let debounceTimer = null;

fs.watch(SRC_DIR, { recursive: true }, (_, filename) => {
  if (!filename || (!filename.endsWith(".js") && !filename.endsWith(".html") && !filename.endsWith(".css"))) return;
  if (filename === "output.css") return;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`[${new Date().toLocaleTimeString()}] Change detected in src/${filename} — rebuilding...`);
    updateRelease();
  }, 400);
});
