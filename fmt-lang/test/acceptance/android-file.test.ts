// Phase 6 acceptance — byte-diff fmt-lang's rendered output against REAL
// fmtAndroid.file() output. A distinct shape: Android XML resource entries
// (<color name="...">#AARRGGBB</color>), the alpha-FIRST ARGB hex byte
// order (toArgbHex, distinct from CSS's alpha-last hexa — B.4), snake_case
// naming, and "<!-- colorName -->" comment group headers per section.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../../src/data/adapter";
import { toArgbHex } from "../../src/lang/stdlib/colorValue";
import { renderName, DEFAULT_NAMING } from "../../src/lang/defs/naming";
import { fmtAndroid } from "../../../src/shared/exportEng/fmtAndroid";
import { resolveExport, resolveScaleSteps } from "../../../src/shared/exportEng/resolve";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

test("fmt-lang reproduces fmtAndroid.file()'s real XML resource output, byte-for-byte", () => {
  const { tokens: resolvedTokens } = resolveExport(fixture.result, fixture.exportConfig);
  const resolvedSteps = resolveScaleSteps(fixture.result, fixture.exportConfig);
  const themeName = "light";
  const real = fmtAndroid.file(fixture.result, resolvedTokens, resolvedSteps, fixture.exportConfig, themeName, false);

  const ds = buildDataset(fixture.result, fixture.exportConfig);
  const namingDef = { ...DEFAULT_NAMING, guardLeadingDigit: false, preferShorthand: true, case: "snake" as const };
  const themeTokens = ds.tokensForTheme(themeName);

  const lines: string[] = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>", ""];

  if (ds.sourceColors.length > 0) {
    lines.push("    <!-- Source Colors (raw, no theme processing) -->");
    for (const colorRecord of ds.sourceColors) {
      const name = renderName(
        [
          { kind: "color", identity: colorRecord.data.color },
          { kind: "step", identity: { name: "source", shorthand: null, segments: ["source"] } },
        ],
        namingDef
      );
      lines.push(`    <color name="${name}">${toArgbHex(colorRecord.data.hex, 1)}</color>`);
      const alphasForColor = ds.sourceAlphas.filter((a) => a.data.color.name === colorRecord.data.color.name);
      for (const alpha of alphasForColor) {
        const alphaName = renderName(
          [
            { kind: "color", identity: colorRecord.data.color },
            { kind: "step", identity: { name: "source", shorthand: null, segments: ["source"] } },
            { kind: "step", identity: { name: "alpha", shorthand: null, segments: ["alpha"] } },
            { kind: "step", identity: { name: String(alpha.data.opacity), shorthand: null, segments: [String(alpha.data.opacity)] } },
          ],
          namingDef
        );
        lines.push(`    <color name="${alphaName}">${toArgbHex(colorRecord.data.hex, alpha.data.rgba.a)}</color>`);
      }
    }
    lines.push("");
  }

  if (ds.scaleSteps.length > 0) {
    lines.push("    <!-- Color Scales -->");
    let lastScaleColor: string | null = null;
    for (const step of ds.scaleSteps) {
      if (step.data.color.name !== lastScaleColor) {
        lines.push(`    <!-- ${step.data.color.name} -->`);
        lastScaleColor = step.data.color.name;
      }
      const resName = renderName(
        [
          { kind: "color", identity: step.data.color },
          { kind: "step", identity: { name: step.data.stepKey, shorthand: null, segments: [step.data.stepKey] } },
        ],
        namingDef
      );
      lines.push(`    <color name="${resName}">${toArgbHex(step.data.value, 1)}</color>`);
    }
    lines.push("");
  }

  if (themeTokens.length > 0) {
    lines.push(`    <!-- Semantic Tokens — ${themeName} -->`);
    let lastColor: string | null = null;
    for (const token of themeTokens) {
      if (token.data.color.name !== lastColor) {
        lines.push(`    <!-- ${token.data.color.name} -->`);
        lastColor = token.data.color.name;
      }
      const resName = renderName(
        token.data.segs.map((s) => ({ kind: s.type, identity: s.identity })),
        namingDef
      );
      lines.push(`    <color name="${resName}">${toArgbHex(token.data.value, 1)}</color>`);
    }
    lines.push("");
  }

  lines.push("</resources>");
  const mine = lines.join("\n");

  assert.equal(mine, real);
});
