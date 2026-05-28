// Watches src/plugin/index.ts and rebuilds <outDir>/scripts.js on every save.
// Usage: node scripts/watch-plugin.js [outDir] [--manifest]
//   outDir     output directory name relative to project root  (default: dist)
//   --manifest  write/update manifest.json on every rebuild (release watch only)
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const outDirName = args.find(a => !a.startsWith('--')) || 'dist';
const writeManifest = args.includes('--manifest');

const outDir = path.resolve(__dirname, '..', outDirName);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function emitManifest() {
  const rootManifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../manifest.json'), 'utf8'));
  const distManifest = { ...rootManifest, main: 'scripts.js', ui: 'ui.html' };
  fs.writeFileSync(path.resolve(outDir, 'manifest.json'), JSON.stringify(distManifest, null, 2));
}

async function watch() {
  const ctx = await esbuild.context({
    entryPoints: [path.resolve(__dirname, '../src/plugin/index.ts')],
    bundle: true,
    outfile: path.resolve(outDir, 'scripts.js'),
    target: 'es2017',
    platform: 'browser',
    format: 'iife',
    external: [],
    plugins: [{
      name: 'on-rebuild',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            if (writeManifest) emitManifest();
            console.log(`[plugin] rebuilt → ${outDirName}  ${new Date().toLocaleTimeString()}`);
          }
        });
      },
    }],
  });

  if (writeManifest) emitManifest();
  await ctx.watch();
  console.log(`[plugin] watching src/plugin/** → ${outDirName}${writeManifest ? ' (with manifest)' : ''}`);
}

watch().catch((e) => { console.error(e); process.exit(1); });
