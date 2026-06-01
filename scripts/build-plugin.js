// Builds src/plugin/index.ts → <outDir>/scripts.js via esbuild.
// Usage: node scripts/build-plugin.js [outDir] [--manifest]
//   outDir     output directory name relative to project root  (default: dist)
//   --manifest  write manifest.json into outDir (release builds only)
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  const args = process.argv.slice(2);
  const outDirName = args.find(a => !a.startsWith('--')) || 'dist';
  const writeManifest = args.includes('--manifest');
  const isRelease = writeManifest; // --manifest is only passed for release builds

  const outDir = path.resolve(__dirname, '..', outDirName);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/plugin/index.ts')],
    bundle: true,
    outfile: path.resolve(outDir, 'scripts.js'),
    target: 'es2017',
    platform: 'browser',
    format: 'iife',
    external: [],
    logLevel: 'info',
    // Drop console.log (not warn/error) in release builds
    ...(isRelease && { drop: ['debugger'], pure: ['console.log'] }),
    define: {
      __RELEASE__: String(isRelease),
    },
  });

  console.log(`✓ ${outDirName}/scripts.js built`);

  if (writeManifest) {
    const rootManifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../manifest.json'), 'utf8'));
    const distManifest = { ...rootManifest, main: 'scripts.js', ui: 'ui.html' };
    fs.writeFileSync(path.resolve(outDir, 'manifest.json'), JSON.stringify(distManifest, null, 2));
    console.log(`✓ ${outDirName}/manifest.json written`);
  }
}

build().catch((e) => { console.error(e); process.exit(1); });
