const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

// ── stdin line queue (handles piped input correctly) ─────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lineQueue = [];
const lineWaiters = [];

rl.on("line", (line) => {
  if (lineWaiters.length > 0) {
    lineWaiters.shift()(line);
  } else {
    lineQueue.push(line);
  }
});

function getLine() {
  return new Promise((resolve) => {
    if (lineQueue.length > 0) {
      resolve(lineQueue.shift());
    } else {
      lineWaiters.push(resolve);
    }
  });
}

async function prompt(question) {
  process.stdout.write(question);
  return await getLine();
}

async function promptMultiline(label) {
  console.log(label);
  const lines = [];
  while (true) {
    const line = await getLine();
    if (line === "") break;
    lines.push(line);
  }
  return lines.join("\n").trim();
}

// ── core ─────────────────────────────────────────────────────────────────────

function build() {
  const before = Date.now();
  console.log("\nBuilding from source...");
  execSync("npm run build", { stdio: "inherit" });

  const scriptsAge = fs.statSync(path.join(__dirname, "dist", "scripts.js")).mtimeMs;
  const htmlAge    = fs.statSync(path.join(__dirname, "dist", "ui.html")).mtimeMs;
  if (scriptsAge < before || htmlAge < before) {
    console.error("Build did not update dist/ — aborting.");
    process.exit(1);
  }
}

function packageRelease(releaseDir, version) {
  console.log(`\nPackaging release/${version}...`);
  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir, { recursive: true });

  fs.copyFileSync(path.join(__dirname, "dist", "scripts.js"), path.join(releaseDir, "scripts.js"));
  fs.copyFileSync(path.join(__dirname, "dist", "ui.html"),    path.join(releaseDir, "ui.html"));

  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8"));
  manifest.main = "scripts.js";
  manifest.ui   = "ui.html";
  fs.writeFileSync(path.join(releaseDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

function appendChangelog(version, comment) {
  const changelogPath = path.join(__dirname, "release", "changelog.md");
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const versionHeader = `## ${version}`;
  const entryHead = `### ${timestamp}\n${comment}`;

  let content = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, "utf8")
    : "# Changelog\n";

  if (content.includes(versionHeader)) {
    const start = content.indexOf(versionHeader);
    const nextSection = content.indexOf("\n## ", start + 1);
    const insertion = `\n\n${entryHead}\n`;
    if (nextSection === -1) {
      content = content.trimEnd() + insertion;
    } else {
      content = content.slice(0, nextSection) + insertion + content.slice(nextSection);
    }
  } else {
    content = content.trimEnd() + `\n\n${versionHeader}\n\n${entryHead}\n`;
  }

  fs.writeFileSync(changelogPath, content);
  console.log(`\nChangelog updated → release/changelog.md`);
}

function validateVersion(version, usage) {
  if (!version || !version.trim()) {
    console.error(usage);
    rl.close(); process.exit(1);
  }
  if (version.includes("/") || version.includes("\\")) {
    console.error("Version must not contain path separators.");
    rl.close(); process.exit(1);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2];

  // ── patch: re-release an existing version silently, prompt for patch note
  if (mode === "patch") {
    const version = process.argv[3];
    validateVersion(version, "Usage: npm run release patch -- <version>   e.g. npm run release patch -- v1.0");

    const releaseDir = path.join(__dirname, "release", version);
    if (!fs.existsSync(releaseDir)) {
      console.error(`release/${version} does not exist. Use npm run release -- ${version} to create it first.`);
      rl.close(); process.exit(1);
    }

    build();
    packageRelease(releaseDir, version);
    console.log(`\nPatch ${version} ready → release/${version}/`);

    const comment = await promptMultiline("\nPatch note (empty line to finish):");
    rl.close();

    if (comment) {
      appendChangelog(version, comment);
    } else {
      console.log("No note added.");
    }
    return;
  }

  // ── flag: full release + git annotated tag
  if (mode === "flag") {
    const version = process.argv[3];
    validateVersion(version, "Usage: npm run release flag -- <version>   e.g. npm run release flag -- v1.0");

    const releaseDir = path.join(__dirname, "release", version);

    if (fs.existsSync(releaseDir)) {
      const answer = await prompt(`release/${version} already exists. Overwrite? [y/N] `);
      if (answer.trim().toLowerCase() !== "y") {
        console.log("Cancelled."); rl.close(); process.exit(0);
      }
    }

    build();
    packageRelease(releaseDir, version);
    console.log(`\nRelease ${version} ready → release/${version}/`);

    const comment = await promptMultiline("\nRelease note (empty line to finish):");

    if (comment) {
      appendChangelog(version, comment);
    } else {
      console.log("No note added.");
    }

    try {
      execSync(`git tag -a "${version}" -m "CTM316 release ${version}"`, { stdio: "inherit" });
      console.log(`\nGit tag ${version} created.`);
      console.log(`Run: git push origin ${version}   ← to publish the tag`);
    } catch (e) {
      console.error(`\nFailed to create git tag: ${e.message}`);
    }

    rl.close();
    return;
  }

  // ── default: standard release
  const version = mode;
  validateVersion(version, "Usage: npm run release -- <version>   e.g. npm run release -- v1.0");

  const releaseDir = path.join(__dirname, "release", version);

  if (fs.existsSync(releaseDir)) {
    const answer = await prompt(`release/${version} already exists. Overwrite? [y/N] `);
    if (answer.trim().toLowerCase() !== "y") {
      console.log("Cancelled."); rl.close(); process.exit(0);
    }
  }

  build();
  packageRelease(releaseDir, version);
  console.log(`\nRelease ${version} ready → release/${version}/`);

  const comment = await promptMultiline("\nRelease note (empty line to finish):");
  rl.close();

  if (comment) {
    appendChangelog(version, comment);
  } else {
    console.log("No note added.");
  }
}

main().catch((err) => { console.error(err); rl.close(); process.exit(1); });
