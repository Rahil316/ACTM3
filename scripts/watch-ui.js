// Watches the React UI and rebuilds on every save via `vite build --watch`.
// Usage: node scripts/watch-ui.js [--release]
//   --release   targets dist-release (sets VITE_OUT_DIR=dist-release)
const { spawn } = require('child_process');
const path = require('path');

const isRelease = process.argv.includes('--release');
const label = isRelease ? 'ui:release' : 'ui';
const env = { ...process.env };
if (isRelease) env.VITE_OUT_DIR = 'dist-release';

const vite = spawn(
  'npx',
  ['vite', 'build', '--watch'],
  { cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'], env }
);

vite.stdout.on('data', (buf) => {
  const line = buf.toString().trimEnd();
  if (!line.trim()) return;
  const ts = new Date().toLocaleTimeString();
  if (line.includes('built in') || line.includes('✓')) {
    console.log(`[${label}] rebuilt  ${ts}`);
  } else {
    console.log(`[${label}] ${line}`);
  }
});

vite.stderr.on('data', (buf) => {
  const line = buf.toString().trimEnd();
  if (!line.trim()) return;
  if (line.includes('CJS build of Vite')) return;
  console.error(`[${label}] ${line}  ${new Date().toLocaleTimeString()}`);
});

vite.on('exit', (code) => process.exit(code ?? 0));
