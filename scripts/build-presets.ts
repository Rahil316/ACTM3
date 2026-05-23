#!/usr/bin/env tsx
/**
 * build-presets.ts
 *
 * Imports every typed preset file from react-src/lib/presets/raw/*.ts,
 * merges them in display order, and writes a single presets.json.
 *
 * Run automatically via `prebuild:react` in package.json.
 * Output file is gitignored — source of truth is raw/*.ts.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import wandPresets      from '../react-src/lib/presets/raw/wand';
import materialPresets  from '../react-src/lib/presets/raw/material';
import atlassianPresets from '../react-src/lib/presets/raw/atlassian';
import radixPresets     from '../react-src/lib/presets/raw/radix';
import applePresets     from '../react-src/lib/presets/raw/apple';
import tailwindPresets  from '../react-src/lib/presets/raw/tailwind';
import carbonPresets    from '../react-src/lib/presets/raw/carbon';
import polarisPresets   from '../react-src/lib/presets/raw/polaris';
import blankPresets     from '../react-src/lib/presets/raw/blank';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE  = path.resolve(__dirname, '../react-src/lib/presets/presets.json');

const all = [
  ...wandPresets,
  ...materialPresets,
  ...atlassianPresets,
  ...radixPresets,
  ...applePresets,
  ...tailwindPresets,
  ...carbonPresets,
  ...polarisPresets,
  ...blankPresets,
];

for (const [name, arr] of [
  ['wand',      wandPresets],
  ['material',  materialPresets],
  ['atlassian', atlassianPresets],
  ['radix',     radixPresets],
  ['apple',     applePresets],
  ['tailwind',  tailwindPresets],
  ['carbon',    carbonPresets],
  ['polaris',   polarisPresets],
  ['blank',     blankPresets],
] as [string, unknown[]][]) {
  console.log(`  ${name}: ${arr.length} preset${arr.length !== 1 ? 's' : ''}`);
}

fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
console.log(`\nWrote ${all.length} presets → ${path.relative(process.cwd(), OUT_FILE)}`);
