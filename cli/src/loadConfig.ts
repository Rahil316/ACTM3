// Reads and validates token-wand.config.json — the repo-local config that
// says which .wand file to read and where each export format should be
// written. Plain JSON on purpose: no runtime TS/JS execution, no extra
// dependency, no "what does this config file actually do" trust question.

import { readFileSync } from "fs";

// Must match the format keys buildExportBundle() switches on in
// src/shared/exportEng/bundler.ts. "wand" and "csv"/"json" are intentionally
// excluded — csv/json need extra content-filling normally done by Figma-
// sandbox-only code (ExportFormatter.toCSV, see src/figma/index.ts), and
// re-exporting a .wand from a .wand doesn't make sense as a CLI output.
export const SUPPORTED_FORMATS = ["css", "scss", "tailwind", "dtcg", "style-dictionary", "ios-swift", "android", "rn-ts"] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

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
    if (code === "ENOENT") throw new ConfigFileError(`Config file not found: ${path}\nCreate a token-wand.config.json in your project root — see the CLI README.`);
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
    if (typeof t.format !== "string" || !SUPPORTED_FORMATS.includes(t.format as SupportedFormat)) {
      throw new ConfigFileError(`targets[${i}].format in ${path} must be one of: ${SUPPORTED_FORMATS.join(", ")} (got ${JSON.stringify(t.format)}).`);
    }
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
  });

  return config as TokenWandConfig;
}
