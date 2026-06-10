// Builds or watches src/figma/index.ts → <outDir>/scripts.js via esbuild.
//
// Usage:
//   node scripts/plugin.js [outDir] [--watch] [--manifest]
//
//   outDir      output directory relative to project root  (default: dist)
//   --watch     rebuild on every save instead of building once
//   --manifest  write manifest.json into outDir (release builds only)

const esbuild = require('esbuild');
const path    = require('path');
const fs      = require('fs');

const args         = process.argv.slice(2);
const outDirName   = args.find(a => !a.startsWith('--')) || 'dist';
const isWatch      = args.includes('--watch');
const writeManifest = args.includes('--manifest');
const isRelease    = writeManifest;

const root   = path.resolve(__dirname, '..');
const outDir = path.resolve(root, outDirName);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const esbuildConfig = {
  entryPoints: [path.resolve(root, 'src/figma/index.ts')],
  bundle:      true,
  outfile:     path.resolve(outDir, 'scripts.js'),
  target:      'es2017',
  platform:    'browser',
  format:      'iife',
  external:    [],
  logLevel:    'info',
  define:      { __RELEASE__: String(isRelease) },
  ...(isRelease && { drop: ['debugger'], pure: ['console.log'], minify: true }),
};

function emitManifest() {
  const src  = JSON.parse(fs.readFileSync(path.resolve(root, 'manifest.json'), 'utf8'));
  const dist = { ...src, main: 'scripts.js', ui: 'ui.html' };
  fs.writeFileSync(path.resolve(outDir, 'manifest.json'), JSON.stringify(dist, null, 2));
}

function printSummary() {
  function fmtSize(b) {
    if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
    if (b >= 1024)        return (b / 1024).toFixed(1) + ' KB';
    return b + ' B';
  }
  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
    );
  }
  const files = walk(outDir).map(f => ({ rel: path.relative(outDir, f), size: fs.statSync(f).size }))
    .sort((a, b) => a.rel.localeCompare(b.rel));
  const maxLen   = Math.max(...files.map(f => f.rel.length));
  const total    = files.reduce((s, f) => s + f.size, 0);
  const ts       = new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  console.log('');
  console.log(`\x1b[1m\x1b[36m── Build Summary ─── ${ts} ───\x1b[0m`);
  console.log(`\x1b[2m   ${outDirName}/\x1b[0m\n`);
  for (const { rel, size } of files) {
    console.log(`  \x1b[32m${rel}\x1b[0m${' '.repeat(maxLen - rel.length + 2)}\x1b[33m${fmtSize(size)}\x1b[0m`);
  }
  console.log(`\n  \x1b[2m${'─'.repeat(maxLen + 12)}\x1b[0m`);
  console.log(`  \x1b[1mTotal\x1b[0m  ${' '.repeat(maxLen - 3)}${fmtSize(total)}\n`);
}

async function run() {
  if (isWatch) {
    const ctx = await esbuild.context({
      ...esbuildConfig,
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
    console.log(`[plugin] watching src/figma/** → ${outDirName}${writeManifest ? ' (with manifest)' : ''}`);
  } else {
    await esbuild.build(esbuildConfig);
    console.log(`✓ ${outDirName}/scripts.js built`);
    if (writeManifest) {
      emitManifest();
      console.log(`✓ ${outDirName}/manifest.json written`);
      printSummary();
    }
  }
}

run().catch(e => { console.error(e); process.exit(1); });
