#!/usr/bin/env node
import { parseArgs } from "util";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join, dirname, resolve } from "path";
import * as readline from "readline";
import { loadWandFile, WandFileError } from "./loadWand";
import { loadConfigFile, backfillFileNames, resolveConfigPath, resolveFormat, DEFAULT_CONFIG_NAME, DEFAULT_OUT_DIR, ConfigFileError, FORMATS, type TokenWandConfig, type ResolvedTokenWandConfig } from "./loadConfig";
import { runBuild } from "./build";

// Right-pads a string with spaces to width `w` (assumes s.length <= w).
function padEnd(s: string, w: number): string {
  return s + " ".repeat(w - s.length);
}

// Renders FORMATS as a box-drawn table so the help text can never drift out
// of sync with the actual accepted format list — column widths are computed
// from the real data, not hand-measured.
function renderFormatTable(): string {
  const header = ["format", "short", "description"];
  const rows = FORMATS.map((f) => [f.full, f.short, f.description]);
  const widths = header.map((h, col) => Math.max(h.length, ...rows.map((r) => r[col].length)));

  const line = (l: string, m: string, r: string) => l + widths.map((w) => "─".repeat(w + 2)).join(m) + r;
  const row = (cells: string[]) => "  │ " + cells.map((c, i) => padEnd(c, widths[i])).join(" │ ") + " │";

  return ["  " + line("┌", "┬", "┐"), row(header), "  " + line("├", "┼", "┤"), ...rows.map(row), "  " + line("└", "┴", "┘")].join("\n");
}

const USAGE = `Usage: token-wand <command> [options]

Commands:
  build              Read the config and .wand file, write export files
  init               Create a starter ${DEFAULT_CONFIG_NAME} in the current directory
  add <format>       Append a target to "targets" — creates the config if
                     it doesn't exist yet. [--out <dir>] [--script <file>]
  outDir <path>      Set the project-wide default output directory
                     (used by any target that doesn't set its own outDir;
                     default: "${DEFAULT_OUT_DIR}")
  wandFile <path>    Set the "wandFile" field
  list               Print the currently configured targets
  script-help        Print the "script" format's API reference (the data
                     your export function receives)

Options for "build":
  --config <path>    Path to the config file (default: ./${DEFAULT_CONFIG_NAME}, or the
                     "token-wand.config" field in package.json — see README)
  --dry-run          Preview what would be generated without writing files
  --all              Build every configured target, skipping the picker
                     below (for CI/scripting)
  --targets <list>   Build only these targets by index, e.g. "0,2" — same
                     0-based numbers "list" prints. Skips the picker.

  With 2+ targets configured and neither --all nor --targets given, "build"
  shows an interactive checkbox picker instead of building everything
  automatically (↑/↓ move, Space toggle, a = toggle all, Enter confirm,
  Esc cancel) — a single-target config always just builds it directly, no
  prompt. A non-interactive terminal (piped input, most CI) can't show the
  picker at all and falls back to building everything, same as --all.

Options for "init"/"add"/"outDir"/"wandFile"/"list":
  --config <path>    Config file to read/write (default: ./${DEFAULT_CONFIG_NAME})

Options for "add":
  --out <dir>        This target's own outDir (default: falls back to the
                     project-wide outDir, see the "outDir" command)
  --script <file>    Required when <format> is "script" — path to your
                     export function file, see "npx token-wand script-help"

  -h, --help         Show this help

Export formats (targets[].format accepts either spelling below):
${renderFormatTable()}

The "script" format runs a plain .ts/.js file you write yourself — run
"npx token-wand script-help" for what it receives and how to write one.`;

// A native, hand-authored API reference for the "script" format, printed by
// `token-wand script-help` — kept as its own content INSIDE cli/, rather
// than a copy of (or generated from) src/shared/exportEng/how-to.md, since
// that file lives outside this package's own directory and npm's "files"
// field can't reach outside the package root to ship it (confirmed by
// packing and installing the real tarball — how-to.md was silently absent).
// This is deliberately a second, independent description of the same
// ScriptExportContext shape, not derived from how-to.md at build time.
const SCRIPT_HELP = `The "script" format — write a plain .js file, get the same
pre-resolved token data every built-in formatter (css, react-native, etc.)
already works from.

  1. Write a file whose default export is a function:

       module.exports = function (ctx) {
         return "some file content built from ctx.tokens";
       };

     (or "export default function (ctx) {...}" if you compile from TS/ESM —
     both forms work.)

  2. Point a target at it:

       npx token-wand add script --script ./tokens.script.js

  3. Run "npx token-wand build" like any other target.

Your function's return value:
  - a string           -> one file's content (named "output" by default;
                          rename it with fileNames: {"output": "..."})
  - [{path, content}]   -> several files at once, each path relative to
                          this target's outDir (e.g. a per-theme file plus
                          an index file, React-Native-style)

Type-checked authoring — real autocomplete/type errors for ctx, in either
a .ts file or a plain .js file, via this package's published types:

  TypeScript (.ts):
    import type { ScriptExportContext } from "@rahil316/token-wand/script";
    export default function (ctx: ScriptExportContext): string { ... }

  Plain JavaScript (.js), via a JSDoc annotation — no build step needed,
  your editor's TS language server still checks it:
    /** @param {import("@rahil316/token-wand/script").ScriptExportContext} ctx */
    module.exports = function (ctx) { ... };

  Either way, your own tsconfig.json (or your editor's default) needs
  "moduleResolution": "node16" | "nodenext" | "bundler" for the
  "@rahil316/token-wand/script" subpath to resolve at all — the older
  "node" resolver predates package.json "exports" support and can't see
  it, and will say so directly if you try ("types...could not be resolved
  under your current 'moduleResolution' setting").

ctx (ScriptExportContext) — everything your function receives:

  ctx.tokens        ResolvedToken[] — one entry per (color, role, variation,
                    theme). YOUR MAIN INPUT. Key fields:
                      theme        "light" | "dark" | ... (always lowercase)
                      segs         [{type, label}] — the token's name, already
                                   split into labeled parts, already in the
                                   project's declared segment order
                      value        resolved color, hex string, e.g. "#0F998A"
                      tokenRef     set when this token ALIASES a scale step
                                   (Scale mode only) — "{colorName}-{stepName}"
                      contrast     { ratio: number|null, rating: string|null }
                      colorName    RAW (unlabeled) color name — group/key by
                                   this, not segs[].label (already formatted)
                      roleId       the role's raw id/key

                    Typical name-building: ctx.tokens.map(t =>
                      t.segs.map(s => s.label).join("-"))  // "primary-text-default"

  ctx.scaleSteps    ResolvedScaleStep[] — one per (color, step). Empty
                    ([].length === 0) in a Direct-mode project — normal,
                    not an error. Fields: colorName, cLabel, stepKey, value,
                    description.

  ctx.sourceColors  SourceColorEntry[] — one per declared brand/source
                    color (+ alpha variants). Empty unless the project has
                    includeSourceColors turned on. Fields: colorName, cLabel,
                    hex, description, alphaVariants[].

  ctx.config        ExportConfig — the resolved project settings (name,
                    colors, roles, tokenNameSegments, useShorthand*, etc.).
                    Rarely needed directly — tokens/scaleSteps/sourceColors
                    are already built from it.

  ctx.result        EngineResult — the raw, unlabeled engine output. Rarely
                    needed unless you have a specific reason to bypass the
                    already-resolved fields above.

.ts files: supported on Node 22.6+ (built-in TypeScript stripping, zero
setup). Older Node needs either a compiled .js file, or your own loader
registered first (e.g. "node --require ts-node/register ...").

Errors this command catches for you: a missing scriptFile, a script with
no usable default export, and a return value that isn't a string or a
well-formed {path, content}[] array. A bug in your OWN script's logic
propagates with its real stack trace — never disguised.`;

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

// Shared by outDir/wandFile/add: read the raw config object for in-place
// editing if it already exists, or start a fresh, minimal one (targets: [])
// if it doesn't — the caller fills in whatever field it's responsible for.
// Deliberately NOT loadConfigFile() here: that function validates/normalizes
// for a real BUILD (resolves every target's effective outDir, requires a
// non-empty targets[], etc.) — these commands edit the file directly and
// need to see/write exactly what's on disk, including a config that's
// still incomplete (e.g. `add`'s very first call, before any target exists).
function readRawConfigOrStarter(configPath: string): Partial<TokenWandConfig> {
  if (!existsSync(configPath)) {
    return { wandFile: "./design/project.wand", targets: [] };
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as Partial<TokenWandConfig>;
  } catch (err) {
    console.error(`✖ Could not read ${configPath}: ${(err as Error).message}`);
    process.exit(1);
  }
}

function writeConfig(configPath: string, config: Partial<TokenWandConfig>): void {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function runSetOutDir(configPath: string, newOutDir: string): void {
  const config = readRawConfigOrStarter(configPath);
  const existed = existsSync(configPath);
  config.outDir = newOutDir;
  writeConfig(configPath, config);
  console.log(`${existed ? "Updated" : "Created"} ${configPath} — outDir = ${JSON.stringify(newOutDir)}`);
}

function runSetWandFile(configPath: string, newWandFile: string): void {
  const config = readRawConfigOrStarter(configPath);
  const existed = existsSync(configPath);
  config.wandFile = newWandFile;
  writeConfig(configPath, config);
  console.log(`${existed ? "Updated" : "Created"} ${configPath} — wandFile = ${JSON.stringify(newWandFile)}`);
}

// Appends one target to targets[] without the user ever hand-editing JSON.
// Creates the config (with the same placeholder wandFile `init` uses) if it
// doesn't exist yet, same as outDir/wandFile above.
function runAdd(configPath: string, formatArg: string, outArg: string | undefined, scriptArg: string | undefined): void {
  const resolvedFormat = resolveFormat(formatArg);
  if (!resolvedFormat) {
    const spellings = FORMATS.map((f) => (f.full === f.short ? f.full : `${f.full} (or ${f.short})`)).join(", ");
    console.error(`✖ Unknown format ${JSON.stringify(formatArg)} — must be one of: ${spellings}`);
    process.exit(1);
  }
  if (resolvedFormat === "script" && !scriptArg) {
    console.error(`✖ format "script" requires --script <file>.`);
    process.exit(1);
  }

  const config = readRawConfigOrStarter(configPath);
  const existed = existsSync(configPath);
  if (!Array.isArray(config.targets)) config.targets = [];

  const target: Record<string, unknown> = { format: resolvedFormat };
  if (outArg) target.outDir = outArg;
  if (resolvedFormat === "script") target.scriptFile = scriptArg;
  config.targets.push(target as never);

  writeConfig(configPath, config);
  const outDirNote = outArg ? outArg : (config.outDir ?? DEFAULT_OUT_DIR);
  console.log(`${existed ? "Updated" : "Created"} ${configPath} — added target: format=${resolvedFormat}, outDir=${JSON.stringify(outDirNote)}${scriptArg ? `, scriptFile=${JSON.stringify(scriptArg)}` : ""}`);
}

// Shared by `list` and the interactive build picker — one target's
// one-line description, with its EFFECTIVE outDir (its own, or the
// config-level default, or DEFAULT_OUT_DIR) resolved the same way a real
// build would, so what's shown always matches what `build` would actually do.
function describeTarget(t: Partial<import("./loadConfig").ExportTarget>, configOutDir: string | undefined): string {
  const effectiveOutDir = t.outDir ?? configOutDir ?? DEFAULT_OUT_DIR;
  const parts = [`format=${t.format}`, `outDir=${JSON.stringify(effectiveOutDir)}`];
  if (t.scriptFile) parts.push(`scriptFile=${JSON.stringify(t.scriptFile)}`);
  if (t.fileNames && Object.keys(t.fileNames).length > 0) parts.push(`fileNames=${JSON.stringify(t.fileNames)}`);
  return parts.join(", ");
}

// Prints every configured target without the user opening the file.
function runList(configPath: string): void {
  const config = readRawConfigOrStarter(configPath);
  const targets = Array.isArray(config.targets) ? config.targets : [];
  if (targets.length === 0) {
    console.log(`No targets configured in ${configPath}. Add one with:\n  npx token-wand add <format> [--out <dir>]`);
    return;
  }
  console.log(`${configPath}\n  wandFile: ${config.wandFile ?? "(not set)"}\n`);
  targets.forEach((t, i) => {
    console.log(`  [${i}] ${describeTarget(t, config.outDir)}`);
  });
}

// Parses a comma-separated list of target indices (as shown by `list`/the
// picker below) into a validated Set<number> — used by both --targets and
// the interactive picker's typed response, so the two share one parsing/
// error-reporting rule rather than drifting apart.
function parseTargetIndices(input: string, targetCount: number): Set<number> {
  const indices = new Set<number>();
  for (const part of input.split(",").map((p) => p.trim()).filter((p) => p.length > 0)) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n >= targetCount) {
      throw new Error(`"${part}" is not a valid target index (expected a number from 0 to ${targetCount - 1}).`);
    }
    indices.add(n);
  }
  if (indices.size === 0) throw new Error("No target indices given.");
  return indices;
}

// The interactive picker: only shown when `build` is run with no --all/--targets
// AND there's more than one target to choose from (a single-target config has
// nothing to pick between, so it just builds directly — see main()).
//
// A real arrow-key, multi-select checkbox UI — hand-rolled on Node's own
// `readline` (emitKeypressEvents + raw mode), no dependency. Rows use the
// SAME 0-based indices `list`/--targets already use (a real gap found in an
// earlier version of this picker: it showed "[0] All, [1] css, [2] rn, ..."
// — one slot further than list's own "[0] css, [1] rn, ...", so the same
// number meant a different target depending on which command showed it).
// "All" is its own row here, toggled independently, not competing for index 0.
//
// Controls: ↑/↓ move, Space toggles the highlighted row, "a" toggles ALL
// rows (mirroring the "All" row, for a fast top-of-list shortcut), Enter
// confirms whatever's checked, Esc/Ctrl+C cancels the whole build.
function promptForTargetIndices(config: ResolvedTokenWandConfig): Promise<Set<number> | undefined> {
  const targets = config.targets;
  const rowLabels = targets.map((t, i) => `[${i}] ${describeTarget(t, config.outDir)}`);
  const checked = new Array<boolean>(targets.length).fill(false);
  let cursor = 0;

  const allChecked = () => checked.length > 0 && checked.every(Boolean);

  function render(firstDraw: boolean): void {
    const lines = ["Which targets do you want to build? (↑/↓ move, Space toggle, a = toggle all, Enter confirm, Esc cancel)", ""];
    lines.push(`  ${cursor === -1 ? ">" : " "} [${allChecked() ? "x" : " "}] All`);
    rowLabels.forEach((label, i) => {
      lines.push(`  ${cursor === i ? ">" : " "} [${checked[i] ? "x" : " "}] ${label}`);
    });
    const text = lines.join("\n");
    if (!firstDraw) {
      // Move the cursor back up to the start of the previous render and
      // clear downward before redrawing — avoids leaving stale duplicate
      // frames scrolling the terminal on every keypress.
      process.stdout.write(`[${lines.length}A[0J`);
    }
    process.stdout.write(text + "\n");
  }

  return new Promise((resolvePromise) => {
    // A non-interactive stdin (piped input, CI without a TTY) can't support
    // raw-mode key reading at all — rather than hang forever waiting for
    // keypresses that can never come, fall back to "All" immediately. Real
    // CI/scripting usage should reach for --all or --targets anyway; this
    // is a safety net, not the intended path.
    if (!process.stdin.isTTY) {
      console.log("(non-interactive terminal — building All; use --all or --targets to be explicit)");
      resolvePromise(undefined);
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    render(true);

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("keypress", onKeypress);
    };

    function onKeypress(_chunk: string, key: { name?: string; ctrl?: boolean } | undefined): void {
      if (!key) return;
      if (key.ctrl && key.name === "c") {
        cleanup();
        console.log("\nCancelled — nothing built.");
        process.exit(130); // conventional exit code for Ctrl+C
      }
      if (key.name === "escape") {
        cleanup();
        console.log("\nCancelled — nothing built.");
        process.exit(0);
      }
      if (key.name === "up") {
        cursor = cursor <= -1 ? targets.length - 1 : cursor - 1;
      } else if (key.name === "down") {
        cursor = cursor >= targets.length - 1 ? -1 : cursor + 1;
      } else if (key.name === "space") {
        if (cursor === -1) {
          const next = !allChecked();
          checked.fill(next);
        } else {
          checked[cursor] = !checked[cursor];
        }
      } else if (key.name === "a") {
        const next = !allChecked();
        checked.fill(next);
      } else if (key.name === "return") {
        cleanup();
        console.log(); // leave the final rendered picker state visible, move past it
        if (allChecked() || checked.every((c) => !c)) {
          // Nothing checked = same as "All" checked — an Enter with no
          // selection made shouldn't silently build nothing.
          resolvePromise(undefined);
          return;
        }
        const indices = new Set<number>();
        checked.forEach((c, i) => { if (c) indices.add(i); });
        resolvePromise(indices);
        return;
      } else {
        return; // any other key: ignore, don't re-render for nothing
      }
      render(false);
    }

    process.stdin.on("keypress", onKeypress);
  });
}

async function main() {
  // util.parseArgs's default strict mode validates unknown flags AND that
  // each flag's value matches its declared type — both real, previously
  // uncaught gaps: `--config` with no following value used to set
  // values.config to `true` (a boolean), which then crashed
  // resolveConfigPath's path.resolve() with an unrelated, unhandled
  // TypeError instead of a clear CLI error; an unrecognized flag like
  // `--dryrun` (typo for --dry-run) used to be silently swallowed and the
  // build would just run with defaults, silently ignoring what the user
  // actually asked for. strict: true converts both into one catchable,
  // well-typed ERR_PARSE_ARGS_* error, handled below with the same usage
  // text and exit code every other CLI error already uses.
  let positionals: string[];
  let values: { config?: string; "dry-run": boolean; help: boolean; out?: string; script?: string; all: boolean; targets?: string };
  try {
    const parsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      strict: true,
      options: {
        config: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        out: { type: "string" },
        script: { type: "string" },
        all: { type: "boolean", default: false },
        targets: { type: "string" },
      },
    });
    positionals = parsed.positionals;
    values = parsed.values as typeof values;
  } catch (err) {
    console.error(`✖ ${(err as Error).message}\n\n${USAGE}`);
    process.exit(1);
  }

  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const command = positionals[0];
  const configPath = resolveConfigPath(process.cwd(), values.config);

  if (command === "init") {
    runInit(configPath);
    return;
  }

  if (command === "outDir") {
    const arg = positionals[1];
    if (!arg) {
      console.error(`✖ Usage: npx token-wand outDir <path>`);
      process.exit(1);
    }
    runSetOutDir(configPath, arg);
    return;
  }

  if (command === "wandFile") {
    const arg = positionals[1];
    if (!arg) {
      console.error(`✖ Usage: npx token-wand wandFile <path>`);
      process.exit(1);
    }
    runSetWandFile(configPath, arg);
    return;
  }

  if (command === "add") {
    const formatArg = positionals[1];
    if (!formatArg) {
      console.error(`✖ Usage: npx token-wand add <format> [--out <dir>] [--script <file>]`);
      process.exit(1);
    }
    runAdd(configPath, formatArg, values.out, values.script);
    return;
  }

  if (command === "list") {
    runList(configPath);
    return;
  }

  if (command === "script-help") {
    console.log(SCRIPT_HELP);
    return;
  }

  if (command !== "build") {
    console.error(`${USAGE}\n\nGot: ${process.argv.slice(2).join(" ") || "(nothing)"}`);
    process.exit(1);
  }

  const dryRun = values["dry-run"];

  if (values.all && values.targets !== undefined) {
    console.error(`✖ --all and --targets can't be used together — --all already means "every target."`);
    process.exit(1);
  }

  try {
    const config = loadConfigFile(configPath);
    const wandPath = resolve(process.cwd(), config.wandFile);
    const projectStore = loadWandFile(wandPath);

    // Selective build: --all always means every target (skips the picker
    // entirely, for CI/scripting); --targets <indices> picks specific ones,
    // no prompt; otherwise, with 2+ configured targets and neither flag
    // given, show the interactive checkbox picker (see promptForTargetIndices) —
    // a single-target config has nothing to pick between, so it just builds
    // directly, same as today's behavior before this feature existed.
    let targetIndices: Set<number> | undefined;
    if (values.all) {
      targetIndices = undefined;
    } else if (values.targets !== undefined) {
      try {
        targetIndices = parseTargetIndices(values.targets, config.targets.length);
      } catch (err) {
        console.error(`✖ --targets: ${(err as Error).message}`);
        process.exit(1);
      }
    } else if (config.targets.length > 1) {
      targetIndices = await promptForTargetIndices(config);
    }

    const result = runBuild(projectStore, config, { dryRun, configDir: dirname(configPath), targetIndices });

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
        console.log(`  + ${verb} fileNames["${entry.role}"] = ${JSON.stringify(entry.defaultFileName)} to targets[${entry.targetIndex}] in ${configPath}`);
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

main().catch((err) => {
  // Only a genuinely unexpected error reaches here — WandFileError/
  // ConfigFileError are already caught and handled (clear message, exit 1)
  // inside main()'s own try/catch; this is the async-main equivalent of
  // letting an uncaught synchronous throw crash the process with its real
  // stack trace, not a substitute for that handling.
  console.error(err);
  process.exit(1);
});
