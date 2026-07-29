// Phase 6 acceptance — byte-diff fmt-lang's rendered output against REAL
// fmtTailwind.config() output. A distinct shape: a single JS config file
// (module.exports) whose entries are all CSS-VAR REFERENCES rather than
// literal values (var(--foo)) — the reference-vs-literal choice (B.4)
// applied uniformly even to non-aliased tokens/source-colors, plus
// fmtTailwind's own "first theme only" semantic-token restriction.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../../src/data/adapter";
import { renderName, DEFAULT_NAMING } from "../../src/lang/defs/naming";
import { fmtTailwind } from "../../../src/shared/exportEng/fmtTailwind";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

test("fmt-lang reproduces fmtTailwind.config()'s real CSS-var-reference output, byte-for-byte", () => {
  const real = fmtTailwind.config(fixture.result, fixture.exportConfig);

  const ds = buildDataset(fixture.result, fixture.exportConfig);
  const namingDef = { ...DEFAULT_NAMING, guardLeadingDigit: false, preferShorthand: true };

  const lines: string[] = [
    "/** @type {import('tailwindcss').Config} */",
    "module.exports = {",
    "  theme: {",
    "    extend: {",
    "      colors: {",
  ];

  // This fixture is Direct mode (no scale collection) — scaleSteps is
  // deliberately empty here, exercising fmtTailwind's "no scale at all"
  // path (lastScaleColor stays null, no closing "}," emitted) rather than
  // the scale-nesting branch, which style-dictionary-global.test.ts already
  // covers with a dedicated Scale-mode fixture.
  let lastScaleColor: string | null = null;
  for (const step of ds.scaleSteps) {
    const colorKey = renderName([{ kind: "color", identity: step.data.color }], namingDef);
    if (colorKey !== lastScaleColor) {
      if (lastScaleColor !== null) lines.push("        },");
      lines.push(`        ${JSON.stringify(colorKey)}: {`);
      lastScaleColor = colorKey;
    }
    const stepSlug = step.data.stepKey;
    lines.push(`          ${JSON.stringify(stepSlug)}: "var(--${colorKey}-${stepSlug})",`);
  }
  if (lastScaleColor !== null) lines.push("        },");

  if (ds.sourceColors.length > 0) {
    lines.push("        // Source colors (CSS var references)");
    for (const colorRecord of ds.sourceColors) {
      const key = renderName([{ kind: "color", identity: colorRecord.data.color }], namingDef);
      lines.push(`        ${JSON.stringify(key)}: "var(--${key})",`);
      const alphasForColor = ds.sourceAlphas.filter((a) => a.data.color.name === colorRecord.data.color.name);
      for (const alpha of alphasForColor) {
        const alphaKey = `${key}-alpha-${alpha.data.opacity}`;
        lines.push(`        ${JSON.stringify(alphaKey)}: "var(--${alphaKey})",`);
      }
    }
  }

  const firstTheme = ds.themeNames[0];
  if (firstTheme) {
    lines.push("        // Semantic tokens (CSS var references)");
    for (const token of ds.tokensForTheme(firstTheme)) {
      const tokenKey = renderName(
        token.data.segs.map((s) => ({ kind: s.type, identity: s.identity })),
        namingDef
      );
      lines.push(`        ${JSON.stringify(tokenKey)}: "var(--${tokenKey})",`);
    }
  }

  lines.push("      },");
  lines.push("    },");
  lines.push("  },");
  lines.push("  plugins: [],");
  lines.push("};");
  const mine = lines.join("\n");

  assert.equal(mine, real);
});
