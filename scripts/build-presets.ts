#!/usr/bin/env tsx
/**
 * build-presets.ts
 *
 * Imports every typed preset file from src/shared/presets/raw/*.ts,
 * merges them in display order, and writes a single presets.json.
 *
 * Dev-only presets live in src/shared/presets/raw/dev/ and are
 * automatically excluded from release builds — no manual list to maintain.
 * Add any new dev/test presets as .ts files in that folder; no script edits needed.
 *
 * Flags:
 *   --release   Skip everything in raw/dev/
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import prettier from "prettier";

import materialPresets from "../src/shared/presets/raw/material";
import atlassianPresets from "../src/shared/presets/raw/atlassian";
import radixPresets from "../src/shared/presets/raw/radix";
import applePresets from "../src/shared/presets/raw/apple";
import tailwindPresets from "../src/shared/presets/raw/tailwind";
import carbonPresets from "../src/shared/presets/raw/carbon";
import polarisPresets from "../src/shared/presets/raw/polaris";
import { validateAndFixPreset } from "../src/shared/presets/validatePreset";
import type { Preset } from "../src/shared/presets/themeShop";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPreset = Record<string, any>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../src/shared/presets/presets.json");
const RAW_DIR = path.resolve(__dirname, "../src/shared/presets/raw");
const DEV_DIR = path.resolve(RAW_DIR, "dev");
const isRelease = process.argv.includes("--release");

// ── Auto-format every raw preset .ts file in place with the project's Prettier
//    config, so preset source style stays consistent without a manual step.
async function formatRawPresets() {
  const config = await prettier.resolveConfig(RAW_DIR);
  const files = fs
    .readdirSync(RAW_DIR, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".ts"))
    .map((e) => path.join(e.parentPath, e.name));

  let formattedCount = 0;
  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const formatted = await prettier.format(original, { ...config, filepath: file });
    if (formatted !== original) {
      fs.writeFileSync(file, formatted);
      formattedCount++;
    }
  }
  if (formattedCount > 0) {
    console.log(`[presets] formatted ${formattedCount} raw preset file${formattedCount !== 1 ? "s" : ""}`);
  }
}

async function main() {
  await formatRawPresets();

  // ── Load dev presets dynamically — every .ts/.js in raw/dev/ is included.
  //    Skipped entirely on --release. No edits needed here for new files.
  let devPresets: AnyPreset[] = [];
  const devFileNames: string[] = [];

  if (!isRelease && fs.existsSync(DEV_DIR)) {
    const devFiles = fs
      .readdirSync(DEV_DIR)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
      .sort();

    const mods = await Promise.all(devFiles.map((f) => import(pathToFileURL(path.join(DEV_DIR, f)).href)));

    mods.forEach((mod, i) => {
      const exported = mod.default ?? mod;
      if (Array.isArray(exported)) {
        devPresets = devPresets.concat(exported as AnyPreset[]);
        devFileNames.push(devFiles[i]);
      }
    });
  }

  // ── Merge in display order ──────────────────────────────────────────────────
  const all = [...devPresets, ...materialPresets, ...atlassianPresets, ...radixPresets, ...applePresets, ...tailwindPresets, ...carbonPresets, ...polarisPresets];

  // ── Validate & auto-fix each preset ─────────────────────────────────────────
  const validationErrors: string[] = [];
  for (const preset of all as Preset[]) {
    const { errors, fixed } = validateAndFixPreset(preset);
    if (fixed.length > 0) {
      console.log(`[presets] ${preset.id}: auto-fixed ${fixed.length} issue${fixed.length !== 1 ? "s" : ""}`);
    }
    if (errors.length > 0) {
      validationErrors.push(...errors.map((e) => `${preset.id}: ${e.path} — ${e.message}`));
    }
  }
  if (validationErrors.length > 0) {
    throw new Error(`[presets] validation failed:\n${validationErrors.join("\n")}`);
  }

  // ── Fail on duplicate id/name across all sources ────────────────────────────
  for (const key of ["id", "name"] as const) {
    const seen = new Map<string, number>();
    for (const preset of all) {
      const value = preset[key];
      if (value === undefined) continue;
      seen.set(value, (seen.get(value) ?? 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, count]) => count > 1).map(([value]) => value);
    if (dupes.length > 0) {
      throw new Error(`[presets] duplicate preset ${key}(s) across sources: ${dupes.join(", ")}`);
    }
  }

  // ── Log summary ─────────────────────────────────────────────────────────────
  for (const [name, arr] of [
    ["material", materialPresets as AnyPreset[]],
    ["atlassian", atlassianPresets as AnyPreset[]],
    ["radix", radixPresets as AnyPreset[]],
    ["apple", applePresets as AnyPreset[]],
    ["tailwind", tailwindPresets as AnyPreset[]],
    ["carbon", carbonPresets as AnyPreset[]],
    ["polaris", polarisPresets as AnyPreset[]],
  ] as [string, AnyPreset[]][]) {
    console.log(`[presets] ${name}: ${arr.length} preset${arr.length !== 1 ? "s" : ""}`);
  }

  if (!isRelease && devPresets.length > 0) {
    console.log(`[presets] dev (${devFileNames.join(", ")}): ${devPresets.length} preset${devPresets.length !== 1 ? "s" : ""}`);
  } else if (isRelease) {
    console.log(`[presets] raw/dev/: excluded (--release)`);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log(`[presets] wrote ${all.length} total → ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
