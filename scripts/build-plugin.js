// Build script for the Figma plugin sandbox code (dist/scripts.js)
// Uses esbuild to bundle src/plugin/index.ts → dist/scripts.js
// Usage: node scripts/build-plugin.js [outDir]   (default: dist)
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  const outDirName = process.argv[2] || 'dist';
  const outDir = path.resolve(__dirname, '..', outDirName);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/plugin/index.ts')],
    bundle: true,
    outfile: path.resolve(outDir, 'scripts.js'),
    target: 'es2017',
    platform: 'browser',
    format: 'iife',
    // Figma plugin typings are only available at type-check time
    // The actual figma global is injected by the Figma runtime
    external: [],
    logLevel: 'info',
  });

  console.log(`✓ ${outDirName}/scripts.js built`);

  // Write a manifest.json with paths relative to the output dir
  const rootManifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../manifest.json'), 'utf8'));
  const distManifest = { ...rootManifest, main: 'scripts.js', ui: 'ui.html' };
  fs.writeFileSync(path.resolve(outDir, 'manifest.json'), JSON.stringify(distManifest, null, 2));
  console.log(`✓ ${outDirName}/manifest.json written`);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
