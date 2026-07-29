// Phase 6 acceptance — byte-diff fmt-lang's rendered output against REAL
// fmtStyleDictionary.global()'s output. Covers a genuinely different nesting
// case from DTCG: scale steps get their own 2-level color/step nesting
// (renderScaleStepTree), and source colors live in a SIBLING "source"
// namespace rather than merged into "color" (per fmtStyleDictionary's own
// comment: two colors can share a name between scale and source, merging
// would silently clobber one).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDataset } from "../../src/data/adapter";
import { renderScaleStepTree } from "../../src/pipeline/nestedTree";
import { DEFAULT_NAMING } from "../../src/lang/defs/naming";
import { fmtStyleDictionary } from "../../../src/shared/exportEng/fmtStyleDictionary";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

// nmobile's fixture is Direct mode (no scale) — Style Dictionary's global()
// needs a Scale-mode fixture to exercise its scale-nesting branch at all.
// Build one inline: minimal Scale-mode EngineResult/ExportConfig, matching
// exactly the shapes resolveScaleSteps()/buildDataset() read.
const scaleModeResult: EngineResult = {
  tokens: {},
  errors: { critical: [], warnings: [], notices: [] },
  scales: {
    Primary: {
      "100": { value: "#e4fffa", stepName: "100", shorthand: "100", description: "", contrast: {} },
      "500": { value: "#0f998a", stepName: "500", shorthand: "500", description: "", contrast: {} },
    },
  },
};
const scaleModeConfig: ExportConfig = {
  name: "Scale Test",
  colors: [{ name: "Primary", shorthand: "pr", value: "#0f998a" }],
  includeColorScalesCollection: true,
  includeSourceColors: false,
  useShorthandColors: true, // real _colorLabel() only uses the shorthand when this is on
};

test("fmt-lang reproduces fmtStyleDictionary.global()'s real scale-nesting output, byte-for-byte", () => {
  const real = fmtStyleDictionary.global(scaleModeResult, scaleModeConfig);
  const realParsed = JSON.parse(real) as { color: unknown; source?: unknown };
  assert.equal(realParsed.source, undefined, "no source in this fixture — confirms the sibling-namespace branch is correctly skipped");

  const ds = buildDataset(scaleModeResult, scaleModeConfig);
  const namingDef = { ...DEFAULT_NAMING, guardLeadingDigit: false, preferShorthand: true };
  const colorTree = renderScaleStepTree(ds.scaleSteps, namingDef, (step) => ({
    value: step.data.value,
    type: "color",
    attributes: { category: "color", scale: namingDef.preferShorthand && step.data.color.shorthand ? step.data.color.shorthand : step.data.color.name.toLowerCase(), step: step.data.stepKey },
  }));

  const mine = JSON.stringify({ color: colorTree }, null, 2);
  assert.equal(mine, real);
});
