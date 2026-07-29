// Reads and validates wand.config.json — the repo-local config that
// says which .wand file to read and where each export format should be
// written. Plain JSON on purpose: no runtime TS/JS execution, no extra
// dependency, no "what does this config file actually do" trust question.

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export const DEFAULT_CONFIG_NAME = "wand.config.json";

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
// Each format has exactly two accepted spellings in targets[].format: its
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
  { full: "custom", short: "custom", description: "User-authored fmt-lang template — see custom/customFile" },
];

export const SUPPORTED_FORMATS = FORMATS.map((f) => f.full) as SupportedFormat[];
export type SupportedFormat = "css" | "scss" | "tailwind" | "dtcg" | "style-dictionary" | "ios-swift" | "android" | "react-native" | "custom";

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
  outDir: string;
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
  // Only used when format is "custom" — exactly one of these two is
  // required. `custom` is the fmt-lang document (defs + files[]) written
  // inline, as text, directly in this config file. `customFile` is a path
  // to a standalone fmt-lang document file, resolved relative to this
  // config file's own directory (same convention as wandFile). Either way,
  // the text is handed to fmt-lang's own JSON5 parser unchanged — this repo
  // never interprets it itself. See fmt-lang/README.md and the plan's Part G.
  custom?: string;
  customFile?: string;
}

export interface TokenWandConfig {
  wandFile: string;
  targets: ExportTarget[];
}

export class ConfigFileError extends Error {}

// Backfills each target's fileNames map with default-name entries for every
// role this run actually produced, WITHOUT overwriting anything the user
// already set: a target that already has a fileNames key (even {}) is
// treated as "user is managing this themselves" and only gains entries for
// roles genuinely missing from it; a target with no fileNames key at all
// gets one created from scratch. Mutates `config` in place (targets/fileNames
// objects only — wandFile and target order are untouched) and returns which
// target/role pairs were newly added, so the caller can print a notice and
// decide whether to persist the change (e.g. skipped entirely under --dry-run).
export interface FileNamesBackfillEntry {
  targetIndex: number;
  role: string;
  defaultFileName: string;
}

export function backfillFileNames(config: TokenWandConfig, rolesByTargetIndex: Array<{ role: string; defaultFileName: string }[]>): FileNamesBackfillEntry[] {
  const added: FileNamesBackfillEntry[] = [];
  config.targets.forEach((target, targetIndex) => {
    const roles = rolesByTargetIndex[targetIndex] ?? [];
    if (roles.length === 0) return;
    if (!target.fileNames) target.fileNames = {};
    for (const { role, defaultFileName } of roles) {
      if (target.fileNames[role] !== undefined) continue; // never overwrite an existing entry
      target.fileNames[role] = defaultFileName;
      added.push({ targetIndex, role, defaultFileName });
    }
  });
  return added;
}

export function loadConfigFile(path: string): TokenWandConfig {
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

  if (!Array.isArray(config.targets) || config.targets.length === 0) {
    throw new ConfigFileError(`Config file at ${path} is missing a non-empty "targets" array.`);
  }

  config.targets.forEach((target, i) => {
    if (typeof target !== "object" || target === null) {
      throw new ConfigFileError(`targets[${i}] in ${path} must be an object with "format" and "outDir".`);
    }
    const t = target as Partial<ExportTarget>;
    if (typeof t.format !== "string") {
      throw new ConfigFileError(`targets[${i}].format in ${path} must be one of: ${SUPPORTED_FORMATS.join(", ")} (got ${JSON.stringify(t.format)}).`);
    }
    const resolvedFormat = resolveFormat(t.format);
    if (!resolvedFormat) {
      const spellings = FORMATS.map((f) => (f.full === f.short ? f.full : `${f.full} (or ${f.short})`)).join(", ");
      throw new ConfigFileError(`targets[${i}].format in ${path} must be one of: ${spellings} (got ${JSON.stringify(t.format)}).`);
    }
    t.format = resolvedFormat; // normalize to the canonical full name for everything downstream
    if (typeof t.outDir !== "string" || t.outDir.length === 0) {
      throw new ConfigFileError(`targets[${i}].outDir in ${path} must be a non-empty string.`);
    }
    if (t.fileNames !== undefined) {
      if (typeof t.fileNames !== "object" || t.fileNames === null || Array.isArray(t.fileNames)) {
        throw new ConfigFileError(`targets[${i}].fileNames in ${path} must be an object mapping role -> filename.`);
      }
      for (const [role, name] of Object.entries(t.fileNames)) {
        if (typeof name !== "string" || name.length === 0) {
          throw new ConfigFileError(`targets[${i}].fileNames["${role}"] in ${path} must be a non-empty string.`);
        }
        if (name.includes("/") || name.includes("\\")) {
          throw new ConfigFileError(`targets[${i}].fileNames["${role}"] in ${path} must be a filename, not a path (got ${JSON.stringify(name)}) — outDir already controls the directory.`);
        }
      }
    }
    if (t.format === "custom") {
      const hasCustom = typeof t.custom === "string" && t.custom.length > 0;
      const hasCustomFile = typeof t.customFile === "string" && t.customFile.length > 0;
      if (hasCustom === hasCustomFile) {
        throw new ConfigFileError(`targets[${i}] in ${path} has format "custom" — exactly one of "custom" (inline fmt-lang document) or "customFile" (a path to one) is required (got ${hasCustom ? "both" : "neither"}).`);
      }
    }
  });

  return config as TokenWandConfig;
}
