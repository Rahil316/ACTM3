// Prints a build summary: timestamp + size of each file in the output directory.
// Usage: node scripts/build-summary.js [outDir]
const fs = require('fs');
const path = require('path');

const outDirName = process.argv[2] || 'dist';
const outDir = path.resolve(__dirname, '..', outDirName);

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function walk(dir, root) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full, root));
    else files.push(full);
  }
  return files;
}

const now = new Date();
const timestamp = now.toLocaleString('en-US', {
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

const files = walk(outDir, outDir);
const maxLen = Math.max(...files.map(f => path.relative(outDir, f).length));
const rows = files.map(f => {
  const rel = path.relative(outDir, f);
  const size = fs.statSync(f).size;
  return { rel, size };
}).sort((a, b) => a.rel.localeCompare(b.rel));

const totalSize = rows.reduce((s, r) => s + r.size, 0);

console.log('');
console.log(`\x1b[1m\x1b[36m── Build Summary ─── ${timestamp} ───\x1b[0m`);
console.log(`\x1b[2m   ${outDirName}/\x1b[0m`);
console.log('');
for (const { rel, size } of rows) {
  const pad = ' '.repeat(maxLen - rel.length + 2);
  console.log(`  \x1b[32m${rel}\x1b[0m${pad}\x1b[33m${fmtSize(size)}\x1b[0m`);
}
console.log('');
console.log(`  \x1b[2m${'─'.repeat(maxLen + 12)}\x1b[0m`);
console.log(`  \x1b[1mTotal\x1b[0m  ${' '.repeat(maxLen - 3)}${fmtSize(totalSize)}`);
console.log('');
