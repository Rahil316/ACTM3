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

import materialPresets from "../src/shared/presets/raw/material";
import atlassianPresets from "../src/shared/presets/raw/atlassian";
import radixPresets from "../src/shared/presets/raw/radix";
import applePresets from "../src/shared/presets/raw/apple";
import tailwindPresets from "../src/shared/presets/raw/tailwind";
import carbonPresets from "../src/shared/presets/raw/carbon";
import polarisPresets from "../src/shared/presets/raw/polaris";
import nclarityPresets from "../src/shared/presets/raw/dev/nclarity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPreset = Record<string, any>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../src/shared/presets/presets.json");
const DEV_DIR = path.resolve(__dirname, "../src/shared/presets/raw/dev");
const isRelease = process.argv.includes("--release");

async function main() {
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

  // ── Log summary ─────────────────────────────────────────────────────────────
  for (const [name, arr] of [
    ["material", materialPresets as AnyPreset[]],
    ["nClarity", nclarityPresets as AnyPreset[]],
    ["atlassian", atlassianPresets as AnyPreset[]],
    ["radix", radixPresets as AnyPreset[]],
    ["apple", applePresets as AnyPreset[]],
    ["tailwind", tailwindPresets as AnyPreset[]],
    ["carbon", carbonPresets as AnyPreset[]],
    ["polaris", polarisPresets as AnyPreset[]],
  ] as [string, AnyPreset[]][]) {
    console.log(`  ${name}: ${arr.length} preset${arr.length !== 1 ? "s" : ""}`);
  }

  if (!isRelease && devPresets.length > 0) {
    console.log(`  dev (${devFileNames.join(", ")}): ${devPresets.length} preset${devPresets.length !== 1 ? "s" : ""}`);
  } else if (isRelease) {
    console.log(`  raw/dev/: excluded (--release)`);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log(`\nWrote ${all.length} presets → ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
