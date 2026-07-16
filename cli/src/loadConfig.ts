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
}

export interface TokenWandConfig {
  wandFile: string;
  targets: ExportTarget[];
}

export class ConfigFileError extends Error {}

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
  });

  return config as TokenWandConfig;
}
