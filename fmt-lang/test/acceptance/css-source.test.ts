// Phase 2's early acceptance checkpoint (moved up per the plan's explicit
// decision) — byte-diff a fmt-lang-rendered output against REAL fmtCSS.ts
// output on the same fixture. This is the first concrete proof the design
// (data layer + language + 6-stage pipeline) can reproduce a real built-in
// format, before Phase 3/4 build further on top of it.
//
// Test-only import of fmtCSS.ts directly — NOT part of fmt-lang's shipped
// src/ code (only data/adapter.ts imports from src/shared/exportEng in the
// real package, per README.md's boundary) — this file exists purely to
// generate the "real, independently-produced output" the plan's §7.1
// requires as a comparison target.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../../src/data/adapter";
import { renderFile } from "../../src/pipeline/stages";
import { DEFAULT_NAMING } from "../../src/lang/defs/naming";
import type { NamingDef } from "../../src/lang/defs/naming";
import { DEFAULT_VALUE_FORMAT } from "../../src/lang/defs/valueFormat";
import { fmtCSS } from "../../../src/shared/exportEng/fmtCSS";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

test("fmt-lang reproduces fmtCSS.source()'s real output, byte-for-byte", () => {
  const real = fmtCSS.source(fixture.exportConfig);

  const ds = buildDataset(fixture.result, fixture.exportConfig);
  // fmtCSS.source()'s exact shape (read directly from its source): per
  // source color, one base "--{cLabel}: {hex};" line immediately followed
  // by that SAME color's alpha lines, before moving to the next color —
  // interleaved per-color, not two separate flat blocks. sourceColors and
  // sourceAlphas are two different shapes (Part A's "four shapes" rule), so
  // this reproduces the interleaving by rendering one color's base entry
  // then its own alpha entries via two renderFile calls per color, matching
  // fmtCSS's real per-color loop exactly rather than assuming one shape's
  // flat arrangement can express a cross-shape interleave.
  const namingDef: NamingDef = { ...DEFAULT_NAMING, guardLeadingDigit: false, preferShorthand: true }; // fmtCSS never guards leading digits; this fixture has useShorthandColors: true
  const projectName = fixture.exportConfig.name || "tokens";
  const lines: string[] = [`/* ${projectName} — source colors */`, ":root {"];

  for (const colorRecord of ds.sourceColors) {
    lines.push(
      renderFile({
        records: [colorRecord],
        select: { shape: "sourceColor" },
        arrange: { kind: "flat", join: "\n" },
        compose: {
          namingDef,
          valueFormatDef: DEFAULT_VALUE_FORMAT,
          resolveSegments: () => ["color"],
          entryFormat: (e) => `  --${e.name}: ${e.value};`,
        },
      })
    );
    const alphasForColor = ds.sourceAlphas.filter((a) => a.data.color.name === colorRecord.data.color.name);
    if (alphasForColor.length > 0) {
      lines.push(
        renderFile({
          records: alphasForColor,
          select: { shape: "sourceAlpha" },
          arrange: { kind: "flat", join: "\n" },
          compose: {
            namingDef: { ...namingDef, guardLeadingDigit: false },
            valueFormatDef: { appliesTo: "sourceAlpha", kind: "rgba" },
            resolveSegments: () => ["color"],
            entryFormat: (e) => `  --${e.name}: ${e.value};`,
          },
        })
      );
    }
  }
  lines.push("}");
  const mine = lines.join("\n");

  assert.equal(mine, real);
});
