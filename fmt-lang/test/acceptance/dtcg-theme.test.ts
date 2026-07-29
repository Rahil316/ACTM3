// Phase 6 acceptance — byte-diff fmt-lang's rendered output against REAL
// fmtDTCG.theme() output on the same fixture. This is the nested-JSON-tree
// proof (distinct from CSS's flat-lines proof in Phase 2) — token.tokenRef
// aliasing (-> DTCG path reference), isAdjusted (-> $description), and
// _setNestedSlug's real nesting-by-segment behavior, all reproduced via
// fmt-lang's general primitives (renderNestedTree + naming), no
// format-specific engine code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../../src/data/adapter";
import { renderNestedTree } from "../../src/pipeline/nestedTree";
import { DEFAULT_NAMING } from "../../src/lang/defs/naming";
import { splitTokenRef } from "../../src/lang/defs/valueFormat";
import { fmtDTCG } from "../../../src/shared/exportEng/fmtDTCG";
import { resolveExport } from "../../../src/shared/exportEng/resolve";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

test("fmt-lang reproduces fmtDTCG.theme()'s real nested-JSON output, byte-for-byte", () => {
  const { tokens: resolvedTokens } = resolveExport(fixture.result, fixture.exportConfig);
  const real = fmtDTCG.theme(fixture.result, resolvedTokens, fixture.exportConfig, "light");

  const ds = buildDataset(fixture.result, fixture.exportConfig);
  const lightTokens = ds.tokensForTheme("light");

  // fmtDTCG.theme()'s exact leaf shape (read directly from its source):
  //   { "$value": <literal or "{color.step}" ref>, "$type": "color",
  //     "$description"?: "⚠ Adjusted for contrast" if isAdjusted }
  // Reproduced here via renderNestedTree (general nesting-by-segment
  // primitive) + a leaf function using the SAME reference-vs-literal
  // mechanism (splitTokenRef) fmtDTCG.theme() itself uses.
  const namingDef = { ...DEFAULT_NAMING, guardLeadingDigit: false, preferShorthand: true };
  const tree = renderNestedTree(lightTokens, fixture.exportConfig.tokenNameSegments as ("color" | "role" | "variation")[] ?? ["color", "role", "variation"], namingDef, (token) => {
    let dtcgValue: string;
    if (token.data.tokenRef) {
      const { refColor, refStep } = splitTokenRef(token.data.tokenRef);
      dtcgValue = `{${refColor}.${refStep}}`;
    } else {
      // fmtDTCG.theme() writes the raw engine value VERBATIM — confirmed
      // directly against its source (`dtcgValue = token.value;`, no _slug/
      // case normalization at all) — never through valueFormat. Using
      // renderLiteralValue/toHex here would incorrectly uppercase it.
      dtcgValue = token.data.value;
    }
    const node: Record<string, string> = { $value: dtcgValue, $type: "color" };
    if (token.data.isAdjusted) node.$description = "⚠ Adjusted for contrast";
    return node;
  });

  const mine = JSON.stringify(tree, null, 2);
  assert.equal(mine, real);
});
