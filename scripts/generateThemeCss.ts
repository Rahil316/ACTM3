#!/usr/bin/env tsx
/**
 * Generates src/ui/theme/theme.generated.css from tokens.ts.
 * Run:  npx tsx scripts/generateThemeCss.ts
 * Or add to package.json scripts:  "theme:gen": "tsx scripts/generateThemeCss.ts"
 *
 * The generated file is committed so Vite/PostCSS can import it without
 * requiring a build step. Re-run whenever tokens.ts changes.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { dark, light, typography } from '../src/ui/theme/tokens';
import { themeBlock } from '../src/ui/theme/cssVars';

const fontBlock = `
  --font: ${typography.fontSans.join(', ')};
  --font-mono: ${typography.fontMono.join(', ')};`;

const output = `/* ============================================================================
   AUTO-GENERATED — do not edit by hand.
   Source: src/ui/theme/tokens.ts
   Regenerate: npx tsx scripts/generateThemeCss.ts
   ============================================================================ */

@layer base {

  /* ── DARK (default) ─────────────────────────────────────────────────────── */
  :root,
  body[data-ui-theme="dark"] {
${themeBlock('', dark).replace(/^[^{]+\{/, '').replace(/\}$/, '')}${fontBlock}
  }

  /* ── LIGHT ──────────────────────────────────────────────────────────────── */
  body[data-ui-theme="light"] {
${themeBlock('', light).replace(/^[^{]+\{/, '').replace(/\}$/, '')}${fontBlock}
  }

}
`;

const outPath = join(import.meta.dirname, '../src/ui/theme/theme.generated.css');
writeFileSync(outPath, output, 'utf-8');
console.log('✓ theme.generated.css written');
