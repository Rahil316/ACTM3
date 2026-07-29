// Phase 6 acceptance — §7.2's requirement: produce at least one output
// shape that does NOT correspond to any commonly-known design-token format
// at all, proving the engine imposes no hidden assumption that output must
// look like a token file. A plain-language markdown summary/report of the
// color palette, generated entirely from the user's own configuration
// (the markdownTableRow stdlib preset + the same select/sort/arrange/
// compose pipeline every format above uses — no special "report mode").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../../src/data/adapter";
import { renderFile } from "../../src/pipeline/stages";
import { DEFAULT_NAMING } from "../../src/lang/defs/naming";
import { DEFAULT_VALUE_FORMAT } from "../../src/lang/defs/valueFormat";
import { markdownTableRow } from "../../src/lang/stdlib/entryPresets";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

test("§7.2: a plain-language palette report — prose/documentation, not a token config file at all", () => {
  const ds = buildDataset(fixture.result, fixture.exportConfig);

  const header = `# ${fixture.exportConfig.name || "Color Palette"}\n\nThis document describes every color token used in the light theme.\n\n| Token | Color | Notes |\n|---|---|---|`;
  const body = renderFile({
    records: ds.tokensForTheme("light"),
    select: { shape: "token" },
    sort: { keys: [{ by: "color.name", order: "alpha" }] },
    arrange: { kind: "flat", join: "\n" },
    compose: {
      namingDef: DEFAULT_NAMING,
      valueFormatDef: DEFAULT_VALUE_FORMAT,
      resolveSegments: () => ["color", "role", "variation"],
      entryFormat: markdownTableRow,
    },
  });
  const report = `${header}\n${body}\n`;

  // Prove this is genuinely markdown prose, not JSON/CSS/any known
  // token-config shape: it must be a real markdown table (pipe-delimited
  // rows under a heading), parse-fail as JSON, and contain no braces at all
  // (no {, }, no $value/$type-style token-format markers).
  assert.match(report, /^# .+\n\nThis document describes/);
  assert.match(report, /\| Token \| Color \| Notes \|/);
  assert.throws(() => JSON.parse(report), "a markdown report must not parse as JSON");
  assert.ok(!report.includes("{") && !report.includes("}"), "no braces at all — not object/JSON/CSS-shaped");
  assert.ok(!report.includes("$value") && !report.includes("$type"), "no DTCG-style token markers");

  // Still genuinely useful prose — every light-theme token appears as a row.
  const lightTokenCount = ds.tokensForTheme("light").length;
  const rowCount = report.split("\n").filter((l) => l.startsWith("| ") && !l.includes("Token")).length;
  assert.equal(rowCount, lightTokenCount);
});
