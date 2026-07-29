// Phase 6 acceptance — byte-diff fmt-lang's rendered output against REAL
// fmtSCSS.tokens() output. A genuinely different shape from CSS/DTCG/Style
// Dictionary: a SCSS map literal per theme (quoted string keys, comma-
// terminated entries, "// <colorName>" comment as the group header instead
// of a structural nesting level), plus the reference-vs-literal choice
// rendered as a bare SCSS variable reference ($color-step, no "--"/"var()").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../../src/data/adapter";
import { arrangeRecords } from "../../src/lang/defs/arrange";
import { renderName, DEFAULT_NAMING } from "../../src/lang/defs/naming";
import { splitTokenRef } from "../../src/lang/defs/valueFormat";
import { fmtSCSS } from "../../../src/shared/exportEng/fmtSCSS";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";
import type { TokenRecord } from "../../src/data/shapes";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

test("fmt-lang reproduces fmtSCSS.tokens()'s real per-theme SCSS-map output, byte-for-byte", () => {
  const real = fmtSCSS.tokens(fixture.result, fixture.exportConfig);

  const ds = buildDataset(fixture.result, fixture.exportConfig);
  const projectName = fixture.exportConfig.name || "tokens";
  const hasScales = Object.keys(fixture.result.scales || {}).length > 0;
  const namingDef = { ...DEFAULT_NAMING, guardLeadingDigit: false, preferShorthand: true }; // fixture has useShorthandColors/Roles/Variations: true

  const lines: string[] = [
    `// ${projectName} — semantic token maps`,
    "@use 'sass:map';\n",
    ...(hasScales ? ["@forward 'scale';\n"] : []),
  ];

  // fmtSCSS.tokens() iterates result.tokens' own theme-key order — same
  // dimension Dataset.themeNames already preserves in first-seen order.
  for (const theme of ds.themeNames) {
    lines.push(`$tokens-${theme}: (`);
    const themeTokens = ds.tokensForTheme(theme);
    // arrangeRecords' nested-by-color grouping is exactly the "// <colorName>
    // header on color change" loop fmtSCSS.tokens() runs itself, keyed by
    // Dataset's own canonical (first-seen) order.
    const tree = arrangeRecords(themeTokens, { kind: "nested", groupBy: ["color.name"] });
    if (tree.kind === "nested") {
      for (const group of tree.groups) {
        lines.push(`  // ${group.key}`);
        const leaf = group.children as { kind: "leaf"; records: TokenRecord[] };
        for (const record of leaf.records) {
          const key = renderName(
            record.data.segs.map((s) => ({ kind: s.type, identity: s.identity })),
            namingDef
          );
          let ref: string;
          if (record.data.tokenRef) {
            const { refColor, refStep } = splitTokenRef(record.data.tokenRef);
            ref = `$${refColor}-${refStep}`;
          } else {
            ref = record.data.value;
          }
          const note = record.data.isAdjusted ? " /* ⚠ adjusted */" : "";
          lines.push(`  "${key}": ${ref},${note}`);
        }
      }
    }
    lines.push(");\n");
  }
  const mine = lines.join("\n");

  assert.equal(mine, real);
});
