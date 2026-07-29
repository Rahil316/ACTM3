// Runs after `npm install token-wand` in a consuming project and scaffolds a
// starter wand.config.json at that project's root, so a first-time user has
// something to edit instead of having to know the config's shape/name up
// front. Never overwrites an existing config (checked by name only — a
// package.json "token-wand".config override isn't consulted here, since this
// runs before a user would have had a chance to set one).
//
// INIT_CWD (set by npm) is the directory `npm install` was invoked FROM —
// the consuming project's root. process.cwd() during a lifecycle script is
// this package's own directory instead, which would scaffold into node_modules.
// INIT_CWD is absent when this script runs via this package's own `npm
// install` (i.e. `cli/` being developed directly) — skip in that case, since
// there's no "consuming project" to scaffold into.

const { existsSync, writeFileSync } = require("fs");
const { join } = require("path");

const DEFAULT_CONFIG_NAME = "wand.config.json";

const STARTER_CONFIG = {
  wandFile: "./design/project.wand",
  targets: [{ format: "css", outDir: "./src/styles/tokens" }],
};

function main() {
  const projectRoot = process.env.INIT_CWD;
  if (!projectRoot) return;

  // A node_modules-nested projectRoot means npm hoisted/installed this
  // package as a dependency-of-a-dependency rather than a direct install —
  // scaffolding into an ancestor package's own tree isn't useful there.
  if (projectRoot.includes(`${join("node_modules", "")}`)) return;

  const configPath = join(projectRoot, DEFAULT_CONFIG_NAME);
  if (existsSync(configPath)) return;

  writeFileSync(configPath, JSON.stringify(STARTER_CONFIG, null, 2) + "\n", "utf-8");
  console.log(`token-wand: created ${DEFAULT_CONFIG_NAME} — edit "wandFile" and "targets", then run \`npx token-wand build\`.`);
}

main();
