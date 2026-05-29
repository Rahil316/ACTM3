#!/usr/bin/env tsx
/**
 * build-presets.ts
 *
 * Imports every typed preset file from src/ui/lib/presets/raw/*.ts,
 * merges them in display order, and writes a single presets.json.
 *
 * Run automatically via `prebuild:react` in package.json.
 * Output file is gitignored — source of truth is raw/*.ts.
 *
 * Flags:
 *   --release   Omit test presets (TEST-xx) from the output bundle.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import wandPresets      from '../src/ui/lib/presets/raw/wand';
import nclarityPresets  from '../src/ui/lib/presets/raw/nclarity';
import showcasePresets  from '../src/ui/lib/presets/raw/showcase';
import testPresets      from '../src/ui/lib/presets/raw/test';
import materialPresets  from '../src/ui/lib/presets/raw/material';
import atlassianPresets from '../src/ui/lib/presets/raw/atlassian';
import radixPresets     from '../src/ui/lib/presets/raw/radix';
import applePresets     from '../src/ui/lib/presets/raw/apple';
import tailwindPresets  from '../src/ui/lib/presets/raw/tailwind';
import carbonPresets    from '../src/ui/lib/presets/raw/carbon';
import polarisPresets   from '../src/ui/lib/presets/raw/polaris';
import blankPresets     from '../src/ui/lib/presets/raw/blank';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE  = path.resolve(__dirname, '../src/ui/lib/presets/presets.json');

const isRelease = process.argv.includes('--release');

const all = [
  ...wandPresets,
  ...nclarityPresets,
  ...showcasePresets,
  ...(isRelease ? [] : testPresets),
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
  ['nclarity',  nclarityPresets],
  ['showcase',  showcasePresets],
  ...(!isRelease ? [['test', testPresets] as [string, unknown[]]] : []),
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

if (isRelease) console.log('  test: excluded (--release)');

fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
console.log(`\nWrote ${all.length} presets → ${path.relative(process.cwd(), OUT_FILE)}`);
