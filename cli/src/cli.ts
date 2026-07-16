#!/usr/bin/env node
import { parseArgs } from "util";
import { resolve } from "path";
import { loadWandFile, WandFileError } from "./loadWand";
import { loadConfigFile, ConfigFileError } from "./loadConfig";
import { runBuild } from "./build";

function main() {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      config: { type: "string", default: "token-wand.config.json" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  const command = positionals[0];
  if (command !== "build") {
    console.error(`Usage: token-wand build [--config <path>] [--dry-run]\n\nGot: ${process.argv.slice(2).join(" ") || "(nothing)"}`);
    process.exit(1);
  }

  const configPath = resolve(process.cwd(), values.config as string);
  const dryRun = values["dry-run"] as boolean;

  try {
    const config = loadConfigFile(configPath);
    const wandPath = resolve(process.cwd(), config.wandFile);
    const projectStore = loadWandFile(wandPath);

    const result = runBuild(projectStore, config, { dryRun });

    const byDestination = new Map<string, number>();
    for (const w of result.written) {
      const key = `${w.format} -> ${w.outDir}/`;
      byDestination.set(key, (byDestination.get(key) ?? 0) + 1);
    }

    const verb = dryRun ? "Would generate" : "Generated";
    console.log(`${verb} ${result.written.length} file(s) across ${byDestination.size} destination(s)${dryRun ? " (dry run — nothing written)" : ""}`);
    for (const [dest, count] of byDestination) {
      console.log(`  - ${dest} (${count} file${count === 1 ? "" : "s"})`);
    }
  } catch (err) {
    if (err instanceof WandFileError || err instanceof ConfigFileError) {
      console.error(`✖ ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

main();
