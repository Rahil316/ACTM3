// Watch script for the React UI. Wraps `vite build --watch` and adds timestamps.
const { spawn } = require('child_process');
const path = require('path');

const vite = spawn(
  'npx',
  ['vite', 'build', '--watch'],
  { cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] }
);

vite.stdout.on('data', (buf) => {
  const line = buf.toString().trimEnd();
  if (!line.trim()) return;
  const ts = new Date().toLocaleTimeString();
  if (line.includes('built in') || line.includes('✓')) {
    console.log(`[ui] rebuilt — ${ts}`);
  } else {
    console.log(`[ui] ${line}`);
  }
});

vite.stderr.on('data', (buf) => {
  const line = buf.toString().trimEnd();
  if (!line.trim()) return;
  // suppress the noisy CJS deprecation warning
  if (line.includes('CJS build of Vite')) return;
  const ts = new Date().toLocaleTimeString();
  console.error(`[ui] ${line}  (${ts})`);
});

vite.on('exit', (code) => process.exit(code ?? 0));
