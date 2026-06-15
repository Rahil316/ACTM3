// Unified watcher: runs esbuild (plugin) + vite (UI) in parallel and flushes
// output only when BOTH have finished their current rebuild cycle — so Figma
// reloads exactly once per save, not twice.
//
// Usage:
//   node scripts/watch.js [--release]
//     --release   writes to dist-release, enables minification, emits manifest

const esbuild = require('esbuild');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const isRelease = process.argv.includes('--release');
const outDirName = isRelease ? 'dist-release' : 'dist';
const lbl = isRelease ? 'watch:release' : 'watch';
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(root, outDirName);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ── State ────────────────────────────────────────────────────────────────────

const state = {
  plugin: { ready: false, error: null },
  ui:     { ready: false, error: null, ms: null },
};

function markDone(who, error, ms) {
  state[who].ready = true;
  state[who].error = error;
  if (ms !== undefined) state[who].ms = ms;
  maybeFlush();
}

function markDirty(who) {
  state[who].ready = false;
  state[who].error = null;
}

function maybeFlush() {
  if (!state.plugin.ready || !state.ui.ready) return;

  const ts = new Date().toLocaleTimeString();
  const errors = [state.plugin.error, state.ui.error].filter(Boolean);

  if (errors.length) {
    for (const e of errors) console.error(`[${lbl}] ${e}  ${ts}`);
    return;
  }

  const ms = state.ui.ms ? ` in ${state.ui.ms}` : '';
  console.log(`[${lbl}] rebuilt${ms}  ${ts}`);
}

// ── esbuild (plugin) ─────────────────────────────────────────────────────────

function emitManifest() {
  const src = JSON.parse(fs.readFileSync(path.resolve(root, 'manifest.json'), 'utf8'));
  const dist = { ...src, main: 'scripts.js', ui: 'ui.html' };
  fs.writeFileSync(path.resolve(outDir, 'manifest.json'), JSON.stringify(dist, null, 2));
}

const esbuildConfig = {
  entryPoints: [path.resolve(root, 'src/figma/index.ts')],
  bundle:   true,
  outfile:  path.resolve(outDir, 'scripts.js'),
  target:   'es2017',
  platform: 'browser',
  format:   'iife',
  external: [],
  logLevel: 'silent',
  define:   { __RELEASE__: String(isRelease) },
  ...(isRelease && { drop: ['debugger'], pure: ['console.log'], minify: true }),
};

async function startPlugin() {
  const ctx = await esbuild.context({
    ...esbuildConfig,
    plugins: [{
      name: 'coordinator',
      setup(build) {
        build.onStart(() => markDirty('plugin'));
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            if (isRelease) emitManifest();
            markDone('plugin', null);
          } else {
            markDone('plugin', `plugin: ${result.errors.length} error(s)`);
          }
        });
      },
    }],
  });
  if (isRelease) emitManifest();
  await ctx.watch();
}

// ── vite (UI) ────────────────────────────────────────────────────────────────

function startVite() {
  const env = { ...process.env };
  if (isRelease) env.VITE_OUT_DIR = 'dist-release';

  const vite = spawn('npx', ['vite', 'build', '--watch'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });

  vite.stdout.on('data', (buf) => {
    const text = buf.toString();
    if (text.includes('watching for file changes')) return; // initial ready — don't count as rebuild
    if (/building for|transforming/.test(text)) { markDirty('ui'); return; }
    const m = text.match(/built in ([\d.]+\w+)/);
    if (m || text.includes('✓ built')) {
      markDone('ui', null, m?.[1] ?? null);
      return;
    }
    if (/error|Error/.test(text)) {
      markDone('ui', `ui: ${text.trim()}`);
    }
  });

  vite.stderr.on('data', (buf) => {
    const line = buf.toString().trimEnd();
    if (!line.trim() || line.includes('CJS build of Vite')) return;
    console.error(`[${lbl}] ui: ${line}  ${new Date().toLocaleTimeString()}`);
  });

  vite.on('exit', (code) => {
    if (code !== 0) console.error(`[${lbl}] vite exited with code ${code}`);
    process.exit(code ?? 0);
  });
}

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  await startPlugin();
  startVite();
  console.log(`[${lbl}] watching → ${outDirName}${isRelease ? ' (release)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
