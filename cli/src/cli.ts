#!/usr/bin/env node
import { parseArgs } from "util";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { loadWandFile, WandFileError } from "./loadWand";
import { loadConfigFile, backfillFileNames, resolveConfigPath, DEFAULT_CONFIG_NAME, ConfigFileError } from "./loadConfig";
import { runBuild } from "./build";

const USAGE = `Usage: token-wand <command> [options]

Commands:
  build              Read the config and .wand file, write export files
  init               Create a starter ${DEFAULT_CONFIG_NAME} in the current directory

Options for "build":
  --config <path>    Path to the config file (default: ./${DEFAULT_CONFIG_NAME}, or the
                     "token-wand.config" field in package.json — see README)
  --dry-run          Preview what would be generated without writing files

Options for "init":
  --config <path>    Where to write the starter config (default: ./${DEFAULT_CONFIG_NAME})

  -h, --help         Show this help`;

const STARTER_CONFIG = {
  wandFile: "./design/project.wand",
  targets: [{ format: "css", outDir: "./src/styles/tokens" }],
};

function runInit(configPath: string): void {
  if (existsSync(configPath)) {
    console.error(`✖ ${configPath} already exists — not overwriting it.`);
    process.exit(1);
  }
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(STARTER_CONFIG, null, 2) + "\n", "utf-8");
  console.log(`Created ${configPath}`);
  console.log(`\nEdit "wandFile" and "targets", then run:\n  npx token-wand build`);
}

function main() {
  // util.parseArgs defaults to strict mode, which throws a raw, unhandled
  // ERR_PARSE_ARGS_UNKNOWN_OPTION for any flag it doesn't recognize —
  // including --help/-h, since neither was registered as an option. A user
  // running `token-wand --help` to see what the CLI does got a Node internal
  // stack trace instead of usage text. strict: false lets unknown flags
  // through as positionals/errors we handle ourselves below, and help is now
  // a real registered option so it's caught before parseArgs can throw on it.
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: false,
    options: {
      config: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const command = positionals[0];
  const configPath = resolveConfigPath(process.cwd(), values.config as string | undefined);

  if (command === "init") {
    runInit(configPath);
    return;
  }

  if (command !== "build") {
    console.error(`${USAGE}\n\nGot: ${process.argv.slice(2).join(" ") || "(nothing)"}`);
    process.exit(1);
  }

  const dryRun = values["dry-run"] as boolean;

  try {
    const config = loadConfigFile(configPath);
    const wandPath = resolve(process.cwd(), config.wandFile);
    const projectStore = loadWandFile(wandPath);

    const result = runBuild(projectStore, config, { dryRun });

    for (const w of result.warnings) {
      console.warn(`  ⚠ ${w.message}`);
    }

    // Status verbs flip to their would-be form under --dry-run, since nothing
    // is actually written in that mode — "created"/"updated" would otherwise
    // read as claims about what already happened on disk.
    const verbFor = (status: (typeof result.written)[number]["status"]): string => {
      if (status === "created") return dryRun ? "would create" : "created";
      if (status === "updated") return dryRun ? "would update" : "updated";
      return "unchanged";
    };

    const counts = { created: 0, updated: 0, unchanged: 0 };
    for (const w of result.written) counts[w.status]++;

    for (const w of result.written) {
      console.log(`  ${verbFor(w.status)}  ${join(w.outDir, w.path)}`);
    }

    const summary = [
      counts.created > 0 ? `${counts.created} ${dryRun ? "to create" : "created"}` : null,
      counts.updated > 0 ? `${counts.updated} ${dryRun ? "to update" : "updated"}` : null,
      counts.unchanged > 0 ? `${counts.unchanged} unchanged` : null,
    ].filter(Boolean);
    console.log(`\n${result.written.length} file(s): ${summary.join(", ")}${dryRun ? " (dry run — nothing written)" : ""}`);

    // Backfill each target's fileNames map with default names for any role
    // that had none, so a user never has to guess the role-key vocabulary
    // (see loadConfig.ts's backfillFileNames doc comment) — never touched
    // under --dry-run, matching that flag's "preview only, nothing on disk
    // changes" contract; the notice below still tells the user what WOULD
    // be added so they know to re-run without --dry-run to get it.
    const added = backfillFileNames(config, result.rolesByTargetIndex);
    if (added.length > 0) {
      const verb = dryRun ? "would add" : "added";
      for (const entry of added) {
        console.log(`  + ${verb} fileNames["${entry.role}"] = ${JSON.stringify(entry.defaultFileName)} to targets[${entry.targetIndex}] in ${values.config}`);
      }
      if (!dryRun) {
        writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
      }
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
