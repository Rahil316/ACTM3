// Watch script for the Figma plugin sandbox code.
// Uses esbuild's incremental watch API → rebuilds dist/scripts.js on every save.
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const outDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function writeManifest() {
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
            writeManifest();
            console.log(`[plugin] rebuilt — ${new Date().toLocaleTimeString()}`);
          }
        });
      },
    }],
  });

  writeManifest();
  await ctx.watch();
  console.log('[plugin] watching src/plugin/**');
}

watch().catch((e) => {
  console.error(e);
  process.exit(1);
});
