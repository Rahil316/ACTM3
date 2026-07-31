// Reads and validates wand.config.json — the repo-local config that
// says which .wand file to read and where each export format should be
// written. Plain JSON on purpose: no runtime TS/JS execution, no extra
// dependency, no "what does this config file actually do" trust question.
// (The one deliberate exception is the "script" format below — see
// `npx token-wand script-help`.)

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export const DEFAULT_CONFIG_NAME = "wand.config.json";

// The output directory an export falls back to when it sets neither its own
// `outDir` nor a config-level `outDir` (below) — so a user with one, simple
// output location doesn't have to repeat it on every export.
export const DEFAULT_OUT_DIR = "wand-exports/";

// Resolves which config path to use, in order:
// 1. --config <path> (explicit CLI flag — always wins)
// 2. "token-wand": { "config": "<path>" } in the caller's package.json,
//    read from cwd so a team can commit the config's name/location once
//    instead of passing --config on every invocation
// 3. ./wand.config.json (default)
// configFlag is undefined when the user didn't pass --config at all (as
// opposed to passing it with an empty value, which parseArgs won't produce
// for a `type: "string"` option).
export function resolveConfigPath(cwd: string, configFlag: string | undefined): string {
  if (configFlag !== undefined) return resolve(cwd, configFlag);

  const pkgPath = resolve(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { "token-wand"?: { config?: string } };
      const configuredPath = pkg["token-wand"]?.config;
      if (typeof configuredPath === "string" && configuredPath.length > 0) {
        return resolve(cwd, configuredPath);
      }
    } catch {
      // Malformed package.json isn't this function's problem to report —
      // fall through to the default and let normal config loading proceed.
    }
  }

  return resolve(cwd, DEFAULT_CONFIG_NAME);
}

// Must match the format keys buildExportBundle() switches on in
// src/shared/exportEng/bundler.ts. "wand" and "csv"/"json" are intentionally
// excluded — csv/json need extra content-filling normally done by Figma-
// sandbox-only code (ExportFormatter.toCSV, see src/figma/index.ts), and
// re-exporting a .wand from a .wand doesn't make sense as a CLI output.
//
// Each format has exactly two accepted spellings in exports[].format: its
// full name (the canonical value, shared with the plugin's ExportFormat
// type) and one short alias. No other spelling is accepted. Where the full
// name is already short (css, scss, dtcg, android) the alias is identical
// to the full name, not omitted — it's still "two accepted spellings," they
// just happen to collide.
export interface FormatInfo {
  full: SupportedFormat;
  short: string;
  description: string;
}

export const FORMATS: FormatInfo[] = [
  { full: "css", short: "css", description: "CSS custom properties (:root variables)" },
  { full: "scss", short: "scss", description: "SCSS variables + maps" },
  { full: "tailwind", short: "tw", description: "Tailwind config + CSS variables" },
  { full: "dtcg", short: "dtcg", description: "W3C Design Tokens Community Group JSON" },
  { full: "style-dictionary", short: "sd", description: "Amazon Style Dictionary JSON tokens" },
  { full: "ios-swift", short: "swift", description: "UIColor + SwiftUI Color static extensions" },
  { full: "android", short: "android", description: "values/ + values-night/ color resources" },
  { full: "react-native", short: "rn", description: "Typed token objects with useTokens() helper" },
  { full: "script", short: "script", description: "User-authored plain TS/JS export function — see scriptFile" },
];

export const SUPPORTED_FORMATS = FORMATS.map((f) => f.full) as SupportedFormat[];
export type SupportedFormat = "css" | "scss" | "tailwind" | "dtcg" | "style-dictionary" | "ios-swift" | "android" | "react-native" | "script";

const FORMAT_BY_SPELLING = new Map<string, SupportedFormat>(FORMATS.flatMap((f) => [
  [f.full, f.full],
  [f.short, f.full],
] as [string, SupportedFormat][]));

// Resolves either accepted spelling (full name or short alias) to the
// canonical full name used everywhere past config-loading. Returns undefined
// for anything else — including partial matches or casing variants — so
// callers can produce one clear error rather than guessing at intent.
export function resolveFormat(spelling: string): SupportedFormat | undefined {
  return FORMAT_BY_SPELLING.get(spelling);
}

export interface ExportTarget {
  format: SupportedFormat;
  // Optional — falls back to the config-level `outDir` (TokenWandConfig.outDir),
  // and if THAT'S unset too, to DEFAULT_OUT_DIR ("wand-exports/"). Resolved
  // onto every export in loadConfigFile() before it's ever returned, so
  // nothing downstream (build.ts, cli.ts) needs to know the fallback exists —
  // by the time a caller sees a TokenWandConfig, every export's outDir is a
  // real, non-empty string.
  outDir?: string;
  // Optional per-file rename map, keyed by that file's ROLE within the
  // format (not the default filename) — "scale", "source", "tokens",
  // "index", or a theme name (lowercased). See src/shared/exportEng/types.ts's
  // ExportFile.role for exactly which roles each format produces, and the
  // README's table for a per-format list. A role with no entry here keeps
  // its default generated name. Values are filenames only (e.g.
  // "brand-light.css"), not full paths — outDir still controls the
  // directory (except Android, whose res/{qualifier}/colors.xml structure
  // is fixed by platform convention and can't be renamed here).
  fileNames?: Record<string, string>;
  // Only used when format is "script" — required. A path (resolved relative
  // to this config file's own directory, same convention as wandFile) to a
  // plain .ts/.js file whose default export is a function receiving the
  // SAME pre-resolved data every built-in formatter gets (see
  // src/shared/exportEng/scriptExport.ts's ScriptExportContext) and
  // returning either one file's content (a string) or several files at
  // once (a ScriptExportFile[]). This genuinely runs the export's file as
  // TypeScript/JavaScript — run `npx token-wand script-help` before using
  // this.
  scriptFile?: string;
}

export interface TokenWandConfig {
  wandFile: string;
  // Project-wide default output directory — any export that omits its own
  // `outDir` uses this instead. Optional; if this is ALSO unset, DEFAULT_OUT_DIR
  // applies. Set via `npx token-wand outDir <path>` instead of hand-editing.
  outDir?: string;
  exports: ExportTarget[];
}

// What loadConfigFile() actually returns: every export's `outDir` has
// already been resolved (export -> config-level -> DEFAULT_OUT_DIR) to a
// real, non-empty string — so callers past this point (build.ts, cli.ts)
// never need to know the fallback chain exists or handle `undefined`.
export interface ResolvedExportTarget extends ExportTarget {
  outDir: string;
}
export interface ResolvedTokenWandConfig extends TokenWandConfig {
  exports: ResolvedExportTarget[];
}

export class ConfigFileError extends Error {}

// Backfills each export's fileNames map with default-name entries for every
// role this run actually produced, WITHOUT overwriting anything the user
// already set: an export that already has a fileNames key (even {}) is
// treated as "user is managing this themselves" and only gains entries for
// roles genuinely missing from it; an export with no fileNames key at all
// gets one created from scratch. Mutates `config` in place (exports/fileNames
// objects only — wandFile and export order are untouched) and returns which
// export/role pairs were newly added, so the caller can print a notice and
// decide whether to persist the change (e.g. skipped entirely under --dry-run).
export interface FileNamesBackfillEntry {
  exportIndex: number;
  role: string;
  defaultFileName: string;
}

export function backfillFileNames(config: TokenWandConfig, rolesByExportIndex: Array<{ role: string; defaultFileName: string }[]>): FileNamesBackfillEntry[] {
  const added: FileNamesBackfillEntry[] = [];
  config.exports.forEach((exp, exportIndex) => {
    const roles = rolesByExportIndex[exportIndex] ?? [];
    if (roles.length === 0) return;
    if (!exp.fileNames) exp.fileNames = {};
    for (const { role, defaultFileName } of roles) {
      if (exp.fileNames[role] !== undefined) continue; // never overwrite an existing entry
      exp.fileNames[role] = defaultFileName;
      added.push({ exportIndex, role, defaultFileName });
    }
  });
  return added;
}

export function loadConfigFile(path: string): ResolvedTokenWandConfig {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new ConfigFileError(`Config file not found: ${path}\nRun "npx token-wand init" to create one, or create a wand.config.json in your project root — see the CLI README.`);
    throw new ConfigFileError(`Could not read config file at ${path}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigFileError(`Config file at ${path} is not valid JSON.`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new ConfigFileError(`Config file at ${path} does not contain a JSON object.`);
  }

  const config = parsed as Partial<TokenWandConfig>;

  if (typeof config.wandFile !== "string" || config.wandFile.length === 0) {
    throw new ConfigFileError(`Config file at ${path} is missing a "wandFile" string field.`);
  }

  if (config.outDir !== undefined && (typeof config.outDir !== "string" || config.outDir.length === 0)) {
    throw new ConfigFileError(`"outDir" in ${path} must be a non-empty string.`);
  }

  if (!Array.isArray(config.exports) || config.exports.length === 0) {
    throw new ConfigFileError(`Config file at ${path} is missing a non-empty "exports" array.`);
  }

  config.exports.forEach((exp, i) => {
    if (typeof exp !== "object" || exp === null) {
      throw new ConfigFileError(`exports[${i}] in ${path} must be an object with "format" and "outDir".`);
    }
    const t = exp as Partial<ExportTarget>;

    if (typeof t.format !== "string") {
      throw new ConfigFileError(`exports[${i}].format in ${path} must be one of: ${SUPPORTED_FORMATS.join(", ")} (got ${JSON.stringify(t.format)}).`);
    }
    const resolvedFormat = resolveFormat(t.format);
    if (!resolvedFormat) {
      const spellings = FORMATS.map((f) => (f.full === f.short ? f.full : `${f.full} (or ${f.short})`)).join(", ");
      throw new ConfigFileError(`exports[${i}].format in ${path} must be one of: ${spellings} (got ${JSON.stringify(t.format)}).`);
    }
    t.format = resolvedFormat; // normalize to the canonical full name for everything downstream

    if (t.outDir !== undefined && (typeof t.outDir !== "string" || t.outDir.length === 0)) {
      throw new ConfigFileError(`exports[${i}].outDir in ${path} must be a non-empty string.`);
    }
    // Resolve the effective outDir NOW (export -> config-level -> default) so
    // every consumer past this point (build.ts, cli.ts) always sees a real,
    // non-empty export.outDir and never has to know the fallback chain exists.
    if (t.outDir === undefined) {
      t.outDir = config.outDir ?? DEFAULT_OUT_DIR;
    }
    if (t.fileNames !== undefined) {
      if (typeof t.fileNames !== "object" || t.fileNames === null || Array.isArray(t.fileNames)) {
        throw new ConfigFileError(`exports[${i}].fileNames in ${path} must be an object mapping role -> filename.`);
      }
      for (const [role, name] of Object.entries(t.fileNames)) {
        if (typeof name !== "string" || name.length === 0) {
          throw new ConfigFileError(`exports[${i}].fileNames["${role}"] in ${path} must be a non-empty string.`);
        }
        // A bare "." or ".." has no "/" in it at all, so the slash/backslash
        // check alone misses it — a real gap found by testing nonsense
        // fileNames values: fileNames: { "source": ".." } passed validation
        // here, then resolved to outDir's own PARENT directory at write
        // time, where the actual on-disk collision (usually a real
        // directory, not a file) crashed with an unhandled EISDIR
        // TypeError instead of a clear config error.
        if (name.includes("/") || name.includes("\\") || name === "." || name === "..") {
          throw new ConfigFileError(`exports[${i}].fileNames["${role}"] in ${path} must be a filename, not a path (got ${JSON.stringify(name)}) — outDir already controls the directory.`);
        }
      }
    }
    if (t.format === "script" && (typeof t.scriptFile !== "string" || t.scriptFile.length === 0)) {
      throw new ConfigFileError(`exports[${i}] in ${path} has format "script" — a non-empty "scriptFile" path is required.`);
    }
  });

  return config as ResolvedTokenWandConfig;
}
