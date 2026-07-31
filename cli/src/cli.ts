#!/usr/bin/env node
import { parseArgs } from "util";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join, dirname, resolve } from "path";
import * as readline from "readline";
import { loadWandFile, WandFileError } from "./loadWand";
import { loadConfigFile, backfillFileNames, resolveConfigPath, resolveFormat, DEFAULT_CONFIG_NAME, DEFAULT_OUT_DIR, ConfigFileError, FORMATS, type TokenWandConfig, type ResolvedTokenWandConfig } from "./loadConfig";
import { runBuild } from "./build";
import type { ScriptMeta } from "../../src/shared/exportEng/scriptExport";

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
  add <format>       Append an export to "exports" — creates the config if
                     it doesn't exist yet. [--out <dir>] [--script <file>]
  outDir <path>      Set the project-wide default output directory
                     (used by any export that doesn't set its own outDir;
                     default: "${DEFAULT_OUT_DIR}")
  wandFile <path>    Set the "wandFile" field
  list               Print the currently configured exports
  script-help        Print the "script" format's API reference (the data
                     your export function receives)
  script-init <file> Write a starter "script" format file at <file>

Options for "build":
  --config <path>    Path to the config file (default: ./${DEFAULT_CONFIG_NAME}, or the
                     "token-wand.config" field in package.json — see README)
  --dry-run          Preview what would be generated without writing files
  --all              Build every configured export, skipping the picker
                     below (for CI/scripting)
  --exports <list>   Build only these exports by index, e.g. "0,2" — same
                     0-based numbers "list" prints. Skips the picker.

  With 2+ exports configured and neither --all nor --exports given, "build"
  shows an interactive checkbox picker instead of building everything
  automatically (↑/↓ move, Space toggle, a = toggle all, Enter confirm,
  Esc cancel) — a single-export config always just builds it directly, no
  prompt. A non-interactive terminal (piped input, most CI) can't show the
  picker at all and falls back to building everything, same as --all.

Options for "init"/"add"/"outDir"/"wandFile"/"list":
  --config <path>    Config file to read/write (default: ./${DEFAULT_CONFIG_NAME})

Options for "add":
  --out <dir>        This export's own outDir (default: falls back to the
                     project-wide outDir, see the "outDir" command)
  --script <file>    Required when <format> is "script" — path to your
                     export function file, see "npx token-wand script-help".
                     Scaffolded automatically if <file> doesn't exist yet.

  -h, --help         Show this help

Export formats (exports[].format accepts either spelling below):
${renderFormatTable()}

The "script" format runs a plain .ts/.js file you write yourself — run
"npx token-wand script-help" for what it receives and how to write one, or
"npx token-wand script-init <file>" to scaffold a starter file directly.`;

// A native, hand-authored API reference for the "script" format, printed by
// `token-wand script-help` — kept as its own content INSIDE cli/, rather
// than a copy of (or generated from) src/shared/exportEng/how-to.md, since
// that file lives outside this package's own directory and npm's "files"
// field can't reach outside the package root to ship it (confirmed by
// packing and installing the real tarball — how-to.md was silently absent).
// This is deliberately a second, independent description of the same
// ScriptExportContext shape, not derived from how-to.md at build time.
const SCRIPT_HELP = `The "script" format — write a plain .ts or .js file, get the
same pre-resolved token data every built-in formatter (css, react-native,
etc.) already works from.

  1. Scaffold a starter file (or write your own from scratch) — the
     extension you give it picks the style:

       npx token-wand script-init ./tokens.script.js   # CommonJS + JSDoc
       npx token-wand script-init ./tokens.script.ts   # import type / export default

     The .js form:

       module.exports = function (ctx) {
         return "some file content built from ctx.tokens";
       };

     The .ts form:

       export default function (ctx: ScriptExportContext): string {
         return "some file content built from ctx.tokens";
       }

     script-init picks whichever style suits the extension you gave it —
     Node 22.6+ strips plain TypeScript syntax from a .ts file with no build
     step needed, same as a .js file always required none.

  2. Point an export at it:

       npx token-wand add script --script ./tokens.script.js

     (this also runs step 1 automatically if the file doesn't exist yet.)

  3. Run "npx token-wand build" like any other export.

Your function's return value:
  - a string           -> one file's content (named "output" by default;
                          rename it with fileNames: {"output": "..."})
  - [{path, content}]   -> several files at once, each path relative to
                          this export's outDir (e.g. a per-theme file plus
                          an index file, React-Native-style)

Prescribing your own config (optional): export a "meta" object alongside
your default function —

  module.exports.meta = {
    outDir: "./src/styles/tokens",         // this export's default outDir
    fileNames: { output: "tokens.css" },   // this export's default fileNames
  };

  (or "export const meta = {...}" if you compile from TS/ESM.)

"npx token-wand add script --script <file>" reads this — from an EXISTING
file only, not one it just scaffolded for you in that same call — and
copies outDir/fileNames straight into the new export, so whoever adds your
already-written script gets ITS intended config, not a guess. Both fields
are optional and only applied when --out/an existing outDir isn't already
set; harmless to omit entirely.

Type-checked authoring — real autocomplete/type errors for ctx AND meta, in
either a .ts file or a plain .js file, via this package's published types:

  TypeScript (.ts):
    import type { ScriptExportContext, ScriptMeta } from "@rahil316/token-wand/script";
    export default function (ctx: ScriptExportContext): string { ... }
    export const meta: ScriptMeta = { fileNames: { output: "tokens.css" } };

  Plain JavaScript (.js), via a JSDoc annotation — no build step needed,
  your editor's TS language server still checks it:
    /** @param {import("@rahil316/token-wand/script").ScriptExportContext} ctx */
    module.exports = function (ctx) { ... };
    /** @type {import("@rahil316/token-wand/script").ScriptMeta} */
    module.exports.meta = { fileNames: { output: "tokens.css" } };

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
  outDir: "./src/styles/tokens",
  exports: [{ format: "css" }],
};

// Starter content for a new "script" format file — written by both
// `add script --script <file>` (when <file> doesn't exist yet) and the
// standalone `script-init <file>` command, so there's exactly one place
// that defines what a fresh script looks like for each authoring style.
// Two variants, picked by scaffoldScriptFile() based on <file>'s extension
// (see SCRIPT_HELP's own "Type-checked authoring" section, which documents
// both the same way): a .ts file gets real `import type`/`export default`/
// `export const meta`, everything else gets the CommonJS + JSDoc form. A
// CommonJS scaffold written into a .ts file would be valid-but-unidiomatic
// TypeScript (Node's stripping accepts it) — not wrong, but not what
// SCRIPT_HELP tells a .ts author to write, so the scaffold now matches
// whichever extension was actually asked for instead of assuming JS always.
//
// Comments are kept deliberately SHORT and point at `script-help` rather
// than re-explaining the full ctx shape inline — script-help IS the single
// source of truth for that; duplicating it here risks the exact drift this
// session's own doc audit just found and fixed in the README.
const SCRIPT_STARTER_JS = `/** @param {import("@rahil316/token-wand/script").ScriptExportContext} ctx */
module.exports = function (ctx) {
  // ctx.tokens is your main input — run "npx token-wand script-help" for
  // every field it and the rest of ctx (scaleSteps, sourceColors, config) carry.
  const lines = ctx.tokens.map((t) => {
    const name = t.segs.map((s) => s.label).join("-");
    return \`--\${name}: \${t.value};\`;
  });

  return \`:root {\\n  \${lines.join("\\n  ")}\\n}\\n\`;
};

// Optional — "npx token-wand add script --script <this file>" reads this and
// copies it straight into the new export, so anyone adding your script gets
// its intended outDir/fileNames automatically instead of guessing. Safe to
// delete if you don't need it; a single "output" file only needs
// fileNames: {"output": "..."} if you want to rename it away from the default.
/** @type {import("@rahil316/token-wand/script").ScriptMeta} */
module.exports.meta = {
  // outDir: "./src/styles/tokens",
  fileNames: { output: "tokens.css" },
};
`;

const SCRIPT_STARTER_TS = `import type { ScriptExportContext, ScriptMeta } from "@rahil316/token-wand/script";

export default function (ctx: ScriptExportContext): string {
  // ctx.tokens is your main input — run "npx token-wand script-help" for
  // every field it and the rest of ctx (scaleSteps, sourceColors, config) carry.
  const lines = ctx.tokens.map((t) => {
    const name = t.segs.map((s) => s.label).join("-");
    return \`--\${name}: \${t.value};\`;
  });

  return \`:root {\\n  \${lines.join("\\n  ")}\\n}\\n\`;
}

// Optional — "npx token-wand add script --script <this file>" reads this and
// copies it straight into the new export, so anyone adding your script gets
// its intended outDir/fileNames automatically instead of guessing. Safe to
// delete if you don't need it; a single "output" file only needs
// fileNames: {"output": "..."} if you want to rename it away from the default.
export const meta: ScriptMeta = {
  // outDir: "./src/styles/tokens",
  fileNames: { output: "tokens.css" },
};
`;

// Every FIXED (theme-independent) file role each built-in format produces,
// in the order buildExportBundle() (src/shared/exportEng/bundler.ts) emits
// them — kept as a hand-maintained mirror of that switch, same reasoning as
// SCRIPT_HELP's own header comment: bundler.ts lives outside cli/'s package
// root and isn't shipped in the published tarball, so this can't import or
// derive from it directly.
//
// Deliberately excludes every THEME-named role (a css/dtcg/.../android/
// react-native file per theme) — theme names only exist once a real .wand
// file is loaded (see resolveExport()'s themeKeys), so there is no correct
// placeholder to write at `add` time, before any .wand file has been read.
// Those entries still get added automatically, with their REAL theme names,
// by the first `build` (see backfillFileNames in loadConfig.ts) — this table
// only pre-seeds what's genuinely knowable up front, so a user doesn't have
// to guess ANY of it, format-independent or not.
const FIXED_ROLES_BY_FORMAT: Partial<Record<string, string[]>> = {
  css: ["source", "scale"],
  scss: ["source", "scale", "tokens", "index"],
  tailwind: ["config", "source", "scale"],
  dtcg: ["source", "scale"],
  "style-dictionary": ["global"],
  "react-native": ["index"],
  // ios-swift, android: every file they produce is theme-named — nothing
  // fixed to pre-seed, so they're simply absent from this map.
};

// Placeholder filename for a fixed role, following each format's own
// extension/naming convention closely enough to be an obviously-a-placeholder
// but plausible starting point (e.g. "scale.css", not "scale.EXT").
function placeholderFileName(format: string, role: string): string {
  const ext: Record<string, string> = { css: "css", scss: "scss", tailwind: "css", dtcg: "json", "style-dictionary": "json", "react-native": "ts" };
  if (format === "tailwind" && role === "config") return "tailwind.config.js";
  if (format === "react-native" && role === "index") return "index.ts";
  if (format === "scss") return `_${role}.scss`;
  return `${role}.${ext[format] ?? "txt"}`;
}

// Shared by runAdd/runScriptInit: writes the TS or JS starter (picked by
// `path`'s own extension) unless something's already there — never
// overwrites a script the user has started editing.
function scaffoldScriptFile(path: string): "created" | "exists" {
  if (existsSync(path)) return "exists";
  mkdirSync(dirname(path), { recursive: true });
  const content = /\.tsx?$/.test(path) ? SCRIPT_STARTER_TS : SCRIPT_STARTER_JS;
  writeFileSync(path, content, "utf-8");
  return "created";
}

function runScriptInit(scriptPath: string): void {
  const result = scaffoldScriptFile(scriptPath);
  if (result === "exists") {
    console.error(`✖ ${scriptPath} already exists — not overwriting it.`);
    process.exit(1);
  }
  console.log(`Created ${scriptPath}`);
  console.log(`\nWire it into an export, then build:\n  npx token-wand add script --script ${scriptPath}\n  npx token-wand build`);
}

function runInit(configPath: string): void {
  if (existsSync(configPath)) {
    console.error(`✖ ${configPath} already exists — not overwriting it.`);
    process.exit(1);
  }
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(STARTER_CONFIG, null, 2) + "\n", "utf-8");
  console.log(`Created ${configPath}`);
  console.log(`\nEdit "wandFile" and "exports", then run:\n  npx token-wand build`);
  console.log(`(Multiple exports sharing one output dir? npx token-wand outDir <path>)`);
}

// Shared by outDir/wandFile/add: read the raw config object for in-place
// editing if it already exists, or start a fresh, minimal one (exports: [])
// if it doesn't — the caller fills in whatever field it's responsible for.
// Deliberately NOT loadConfigFile() here: that function validates/normalizes
// for a real BUILD (resolves every export's effective outDir, requires a
// non-empty exports[], etc.) — these commands edit the file directly and
// need to see/write exactly what's on disk, including a config that's
// still incomplete (e.g. `add`'s very first call, before any export exists).
function readRawConfigOrStarter(configPath: string): Partial<TokenWandConfig> {
  if (!existsSync(configPath)) {
    return { wandFile: "./design/project.wand", exports: [] };
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

// A script file can optionally export metadata alongside its default
// function — `module.exports.meta = { outDir?, fileNames? }` (or
// `export const meta = {...}` if compiled from TS/ESM, same dual-convention
// support as the default export itself — see resolveDefaultExport() in
// scriptExport.ts). `add script --script <file>` reads this, if present,
// and copies outDir/fileNames straight into the new exports[] entry — so a
// script author can PRESCRIBE its own config shape (e.g. "this script always
// wants fileNames: {output: 'tokens.kt'}") and a user adding it gets that
// for free, no guessing which keys apply to a custom format. ScriptMeta
// itself lives in scriptExport.ts (published under @rahil316/token-wand/
// script), not here, so a TS script author can import and type-check it.
//
// Reading `meta` means require()'ing the script file at `add` time, not just
// `build` time as before — an intentional, confirmed exception: `--script`
// already only ever points at a file the user explicitly chose to run (the
// same trust boundary scriptExport.ts's own header comment describes for
// `build`), so this doesn't cross a NEW boundary, just moves an existing one
// earlier. A script with no `meta` export (the common case) or one that
// fails to load is silently ignored here — `add` should still succeed and
// register the export; any real problem with the script surfaces later at
// `build` time with its own clear error, not duplicated here.

function readScriptMeta(scriptPath: string): ScriptMeta | undefined {
  if (!existsSync(scriptPath)) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(resolve(scriptPath)) as { meta?: unknown; default?: { meta?: unknown } };
    const meta = mod.meta ?? mod.default?.meta;
    if (!meta || typeof meta !== "object") return undefined;
    const m = meta as ScriptMeta;
    const result: ScriptMeta = {};
    if (typeof m.outDir === "string" && m.outDir.length > 0) result.outDir = m.outDir;
    if (m.fileNames && typeof m.fileNames === "object") result.fileNames = m.fileNames;
    return result;
  } catch {
    return undefined; // not this command's job to report a broken script — build will
  }
}

// Appends one export to exports[] without the user ever hand-editing JSON.
// Creates the config (with the same placeholder wandFile `init` uses) if it
// doesn't exist yet, same as outDir/wandFile above.
//
// For every format, the new entry's `fileNames` is pre-populated with
// placeholder names for whatever's knowable right now:
//   - a built-in format: its FIXED_ROLES_BY_FORMAT roles (theme roles are
//     added later, with their real names, by the first `build`)
//   - "script": scaffolds --script's file if nothing exists there yet (so
//     `add` alone is enough to get a runnable export), then reads that
//     file's own `meta` export (see readScriptMeta) for its prescribed
//     outDir/fileNames — a script's own declared shape always wins over any
//     generic placeholder, since it's the one place that actually knows
//     what it returns.
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

  // Validated/read BEFORE any disk write below (script scaffolding
  // included) — readRawConfigOrStarter calls process.exit(1) on a malformed
  // existing config, and that check needs to happen before this command
  // commits any other side effect, not after. An earlier version scaffolded
  // the script file first, so a broken wand.config.json left a stray
  // scaffolded file behind when the command then died on the config read.
  const config = readRawConfigOrStarter(configPath);
  const existed = existsSync(configPath);
  if (!Array.isArray(config.exports)) config.exports = [];

  // scriptFile is documented (loadConfig.ts's ExportTarget.scriptFile) as
  // resolved relative to the CONFIG FILE's own directory, same convention as
  // wandFile — and that's exactly what build.ts's renderScriptTarget does
  // (join(configDir, exp.scriptFile!)). Scaffolding/reading meta against
  // process.cwd() instead (a real earlier bug here) silently breaks the
  // moment --config points outside the cwd: `add` would scaffold the file
  // next to the cwd, `build` would then look for it next to the config, and
  // whichever one loses the mismatch fails with a confusing "not found"
  // that has nothing to do with the file actually existing.
  const scriptAbsPath = scriptArg ? resolve(dirname(configPath), scriptArg) : undefined;

  let scaffolded = false;
  let scriptMeta: ScriptMeta | undefined;
  if (resolvedFormat === "script" && scriptAbsPath) {
    scaffolded = scaffoldScriptFile(scriptAbsPath) === "created";
    // Only read `meta` from a script that ALREADY EXISTED before this call —
    // a freshly scaffolded file's `meta` is the starter template's own
    // generic placeholder (fileNames: {output: "tokens.css"}), not anything
    // the user wrote. Applying that stub and telling the user their script's "own
    // meta export" was applied would be actively misleading on the most
    // common path (add script --script <new file> in one shot) — the
    // placeholder fileNames handling below covers this case instead.
    if (!scaffolded) scriptMeta = readScriptMeta(scriptAbsPath);
  }

  const exp: Record<string, unknown> = { format: resolvedFormat };
  if (outArg) {
    exp.outDir = outArg;
  } else if (scriptMeta?.outDir) {
    exp.outDir = scriptMeta.outDir;
  }
  if (resolvedFormat === "script") {
    exp.scriptFile = scriptArg;
    if (scriptMeta?.fileNames) exp.fileNames = scriptMeta.fileNames;
  } else {
    const fixedRoles = FIXED_ROLES_BY_FORMAT[resolvedFormat];
    if (fixedRoles) {
      exp.fileNames = Object.fromEntries(fixedRoles.map((role) => [role, placeholderFileName(resolvedFormat, role)]));
    }
  }
  config.exports.push(exp as never);

  writeConfig(configPath, config);
  // Reuses describeExport (same one-line format `list` prints) rather than
  // hand-building a second summary format here — a prior version of this
  // line built its own string and silently omitted `fileNames`, so the
  // confirmation for `add` and `list`'s own listing disagreed about what an
  // export's summary should show.
  console.log(`${existed ? "Updated" : "Created"} ${configPath} — added export: ${describeExport(exp, config.outDir)}`);
  if (scaffolded) console.log(`Created ${scriptArg} (starter script — see "npx token-wand script-help")`);
  if (scriptMeta?.outDir || scriptMeta?.fileNames) console.log(`Applied ${scriptArg}'s own "meta" export (outDir/fileNames) to this export.`);
  if (exp.fileNames && !scriptMeta?.fileNames) {
    // "source"/"scale"/"global" are only ACTUALLY produced when the .wand
    // file has includeSourceColors/a tonal scale enabled — unknowable here,
    // before any .wand file is loaded — so this placeholder set is a
    // best-case guess, not a guarantee. An entry for a role your project
    // doesn't produce is harmless (build.ts only ever looks up fileNames by
    // the roles it actually generates; an unused key just sits there inert),
    // but worth being upfront about rather than implying every key applies.
    console.log(`  fileNames pre-filled with placeholder names (some may not apply — e.g. "source"/"scale" only exist if your project enables them) — edit the values in ${configPath}${resolvedFormat !== "script" ? " (theme-named files are added after your first build)" : ""}.`);
  }
}

// Shared by `list` and the interactive build picker — one export's
// one-line description, with its EFFECTIVE outDir (its own, or the
// config-level default, or DEFAULT_OUT_DIR) resolved the same way a real
// build would, so what's shown always matches what `build` would actually do.
function describeExport(t: Partial<import("./loadConfig").ExportTarget>, configOutDir: string | undefined): string {
  const effectiveOutDir = t.outDir ?? configOutDir ?? DEFAULT_OUT_DIR;
  const parts = [`format=${t.format}`, `outDir=${JSON.stringify(effectiveOutDir)}`];
  if (t.scriptFile) parts.push(`scriptFile=${JSON.stringify(t.scriptFile)}`);
  if (t.fileNames && Object.keys(t.fileNames).length > 0) parts.push(`fileNames=${JSON.stringify(t.fileNames)}`);
  return parts.join(", ");
}

// Prints every configured export without the user opening the file.
function runList(configPath: string): void {
  const config = readRawConfigOrStarter(configPath);
  const exports = Array.isArray(config.exports) ? config.exports : [];
  if (exports.length === 0) {
    console.log(`No exports configured in ${configPath}. Add one with:\n  npx token-wand add <format> [--out <dir>]`);
    return;
  }
  console.log(`${configPath}\n  wandFile: ${config.wandFile ?? "(not set)"}\n`);
  exports.forEach((t, i) => {
    console.log(`  [${i}] ${describeExport(t, config.outDir)}`);
  });
}

// Parses a comma-separated list of export indices (as shown by `list`/the
// picker below) into a validated Set<number> — used by both --exports and
// the interactive picker's typed response, so the two share one parsing/
// error-reporting rule rather than drifting apart.
function parseExportIndices(input: string, exportCount: number): Set<number> {
  const indices = new Set<number>();
  for (const part of input.split(",").map((p) => p.trim()).filter((p) => p.length > 0)) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n >= exportCount) {
      throw new Error(`"${part}" is not a valid export index (expected a number from 0 to ${exportCount - 1}).`);
    }
    indices.add(n);
  }
  if (indices.size === 0) throw new Error("No export indices given.");
  return indices;
}

// The interactive picker: only shown when `build` is run with no --all/--exports
// AND there's more than one export to choose from (a single-export config has
// nothing to pick between, so it just builds directly — see main()).
//
// A real arrow-key, multi-select checkbox UI — hand-rolled on Node's own
// `readline` (emitKeypressEvents + raw mode), no dependency. Rows use the
// SAME 0-based indices `list`/--exports already use (a real gap found in an
// earlier version of this picker: it showed "[0] All, [1] css, [2] rn, ..."
// — one slot further than list's own "[0] css, [1] rn, ...", so the same
// number meant a different export depending on which command showed it).
// "All" is its own row here, toggled independently, not competing for index 0.
//
// Controls: ↑/↓ move, Space toggles the highlighted row, "a" toggles ALL
// rows (mirroring the "All" row, for a fast top-of-list shortcut), Enter
// confirms whatever's checked, Esc/Ctrl+C cancels the whole build.
function promptForExportIndices(config: ResolvedTokenWandConfig): Promise<Set<number> | undefined> {
  const exports = config.exports;
  const rowLabels = exports.map((t, i) => `[${i}] ${describeExport(t, config.outDir)}`);
  const checked = new Array<boolean>(exports.length).fill(false);
  let cursor = 0;

  const allChecked = () => checked.length > 0 && checked.every(Boolean);

  function render(firstDraw: boolean): void {
    const lines = ["Which exports do you want to build? (↑/↓ move, Space toggle, a = toggle all, Enter confirm, Esc cancel)", ""];
    lines.push(`  ${cursor === -1 ? ">" : " "} [${allChecked() ? "x" : " "}] All`);
    rowLabels.forEach((label, i) => {
      lines.push(`  ${cursor === i ? ">" : " "} [${checked[i] ? "x" : " "}] ${label}`);
    });
    const text = lines.join("\n");
    if (!firstDraw) {
      // Move the cursor back up to the start of the previous render and
      // clear downward before redrawing — avoids leaving stale duplicate
      // frames scrolling the terminal on every keypress.
      process.stdout.write(`[${lines.length}A[0J`);
    }
    process.stdout.write(text + "\n");
  }

  return new Promise((resolvePromise) => {
    // A non-interactive stdin (piped input, CI without a TTY) can't support
    // raw-mode key reading at all — rather than hang forever waiting for
    // keypresses that can never come, fall back to "All" immediately. Real
    // CI/scripting usage should reach for --all or --exports anyway; this
    // is a safety net, not the intended path.
    if (!process.stdin.isTTY) {
      console.log("(non-interactive terminal — building All; use --all or --exports to be explicit)");
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
        cursor = cursor <= -1 ? exports.length - 1 : cursor - 1;
      } else if (key.name === "down") {
        cursor = cursor >= exports.length - 1 ? -1 : cursor + 1;
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
  let values: { config?: string; "dry-run": boolean; help: boolean; out?: string; script?: string; all: boolean; exports?: string };
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
        exports: { type: "string" },
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

  if (command === "script-init") {
    const arg = positionals[1];
    if (!arg) {
      console.error(`✖ Usage: npx token-wand script-init <file>`);
      process.exit(1);
    }
    runScriptInit(arg);
    return;
  }

  if (command !== "build") {
    console.error(`${USAGE}\n\nGot: ${process.argv.slice(2).join(" ") || "(nothing)"}`);
    process.exit(1);
  }

  const dryRun = values["dry-run"];

  if (values.all && values.exports !== undefined) {
    console.error(`✖ --all and --exports can't be used together — --all already means "every export."`);
    process.exit(1);
  }

  try {
    const config = loadConfigFile(configPath);
    const wandPath = resolve(process.cwd(), config.wandFile);
    const projectStore = loadWandFile(wandPath);

    // Selective build: --all always means every export (skips the picker
    // entirely, for CI/scripting); --exports <indices> picks specific ones,
    // no prompt; otherwise, with 2+ configured exports and neither flag
    // given, show the interactive checkbox picker (see promptForExportIndices) —
    // a single-export config has nothing to pick between, so it just builds
    // directly, same as today's behavior before this feature existed.
    let exportIndices: Set<number> | undefined;
    if (values.all) {
      exportIndices = undefined;
    } else if (values.exports !== undefined) {
      try {
        exportIndices = parseExportIndices(values.exports, config.exports.length);
      } catch (err) {
        console.error(`✖ --exports: ${(err as Error).message}`);
        process.exit(1);
      }
    } else if (config.exports.length > 1) {
      exportIndices = await promptForExportIndices(config);
    }

    const result = runBuild(projectStore, config, { dryRun, configDir: dirname(configPath), exportIndices });

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
      const roleNote = w.role ? ` (role: ${w.role})` : "";
      console.log(`  ${verbFor(w.status)}  ${join(w.outDir, w.path)}${roleNote}`);
    }

    const summary = [
      counts.created > 0 ? `${counts.created} ${dryRun ? "to create" : "created"}` : null,
      counts.updated > 0 ? `${counts.updated} ${dryRun ? "to update" : "updated"}` : null,
      counts.unchanged > 0 ? `${counts.unchanged} unchanged` : null,
    ].filter(Boolean);
    console.log(`\n${result.written.length} file(s): ${summary.join(", ")}${dryRun ? " (dry run — nothing written)" : ""}`);

    // Backfill each export's fileNames map with default names for any role
    // that had none, so a user never has to guess the role-key vocabulary
    // (see loadConfig.ts's backfillFileNames doc comment) — never touched
    // under --dry-run, matching that flag's "preview only, nothing on disk
    // changes" contract; the notice below still tells the user what WOULD
    // be added so they know to re-run without --dry-run to get it.
    const added = backfillFileNames(config, result.rolesByExportIndex);
    if (added.length > 0) {
      const verb = dryRun ? "would add" : "added";
      for (const entry of added) {
        console.log(`  + ${verb} fileNames["${entry.role}"] = ${JSON.stringify(entry.defaultFileName)} to exports[${entry.exportIndex}] in ${configPath}`);
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
