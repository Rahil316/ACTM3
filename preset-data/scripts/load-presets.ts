// Discovers every preset .ts file under src/shared/presets/raw/** (mirrors
// build-presets.ts's own discovery — no manual registration list), imports
// each one's default-exported Preset[], and returns them as a flat list ready
// to run through the engine.
//
// This is preset-data's equivalent of the stress harness's generate-configs.ts,
// except the "cases" here are real, hand-authored presets, not synthetic
// seed/algorithm sweeps — there is nothing to *generate*, only to *discover*.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type { Preset } from "../../src/shared/presets/themeShop";

const RAW_DIR = path.resolve(__dirname, "../../src/shared/presets/raw");

export interface DiscoveredPreset {
  filePath: string; // absolute path, for error messages
  relativePath: string; // e.g. "dev/nmobile.ts" — used as the stable id
  preset: Preset;
}

export async function discoverPresetFiles(): Promise<DiscoveredPreset[]> {
  const files = fs
    .readdirSync(RAW_DIR, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".ts"))
    .map((e) => path.join(e.parentPath, e.name));

  const discovered: DiscoveredPreset[] = [];
  for (const filePath of files) {
    const mod = await import(pathToFileURL(filePath).href);
    const presets: Preset[] = mod.default;
    if (!Array.isArray(presets)) {
      console.warn(`[preset-data] skipping ${filePath}: no default-exported Preset[]`);
      continue;
    }
    const relativePath = path.relative(RAW_DIR, filePath);
    for (const preset of presets) {
      discovered.push({ filePath, relativePath, preset });
    }
  }
  return discovered;
}

// Filters discovered presets by a list of ids/relative-paths/names passed on
// the CLI, e.g. `npx tsx preset-data/scripts/run.ts nmobile` — matches
// against preset.id, the file's basename (no extension), or the full
// relative path, whichever is given.
export function filterPresets(all: DiscoveredPreset[], selectors: string[]): DiscoveredPreset[] {
  if (selectors.length === 0) return all;
  const wanted = new Set(selectors.map((s) => s.toLowerCase()));
  return all.filter((d) => {
    const basename = path.basename(d.relativePath, ".ts").toLowerCase();
    return wanted.has(d.preset.id.toLowerCase()) || wanted.has(basename) || wanted.has(d.relativePath.toLowerCase());
  });
}
