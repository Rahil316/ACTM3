// Phase 2 integration test — the full 6-stage pipeline (renderFile), against
// the real nmobile fixture. Confirms select -> sort -> arrange -> format ->
// composeEntry -> composeBlock genuinely produces correct end-to-end text,
// not just that each stage passes in isolation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../../src/data/adapter";
import { renderFile } from "../../src/pipeline/stages";
import { DEFAULT_NAMING } from "../../src/lang/defs/naming";
import { DEFAULT_VALUE_FORMAT } from "../../src/lang/defs/valueFormat";
import { cssKeyValue } from "../../src/lang/stdlib/entryPresets";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

function dataset() {
  return buildDataset(fixture.result, fixture.exportConfig);
}

test("renderFile: light-theme tokens, flat arrangement, default css entry format", () => {
  const ds = dataset();
  const lightTokens = ds.tokensForTheme("light");
  const content = renderFile({
    records: lightTokens,
    select: { shape: "token" },
    arrange: { kind: "flat", join: "\n" },
    compose: {
      namingDef: DEFAULT_NAMING,
      valueFormatDef: DEFAULT_VALUE_FORMAT,
      resolveSegments: (def) => (Array.isArray(def.segments) ? def.segments : ["color", "role", "variation"]),
      entryFormat: cssKeyValue,
    },
  });
  const lines = content.split("\n");
  assert.equal(lines.length, lightTokens.length);
  for (const line of lines) assert.match(line, /^ {2}--[a-z0-9-]+: #[0-9A-Fa-f]{6};$/);
});

test("renderFile: select narrows by theme via where", () => {
  const ds = dataset();
  const content = renderFile({
    records: ds.tokens,
    select: { shape: "token", where: "theme == 'dark'" },
    arrange: { kind: "flat", join: "\n" },
    compose: {
      namingDef: DEFAULT_NAMING,
      valueFormatDef: DEFAULT_VALUE_FORMAT,
      resolveSegments: () => ["color", "role", "variation"],
      entryFormat: cssKeyValue,
    },
  });
  assert.equal(content.split("\n").length, ds.tokensForTheme("dark").length);
});

test("renderFile: nested arrangement groups by color, with group headers (B.11's onGroupStart)", () => {
  const ds = dataset();
  const lightTokens = ds.tokensForTheme("light");
  const content = renderFile({
    records: lightTokens,
    select: { shape: "token" },
    arrange: { kind: "nested", groupBy: ["color.name"], indent: 2 },
    compose: {
      namingDef: DEFAULT_NAMING,
      valueFormatDef: DEFAULT_VALUE_FORMAT,
      resolveSegments: () => ["color", "role", "variation"],
      entryFormat: cssKeyValue,
      onGroupStart: (key) => `  /* ${key} */`,
    },
  });
  const uniqueColors = new Set(lightTokens.map((t) => t.data.color.name));
  for (const colorName of uniqueColors) {
    assert.ok(content.includes(`/* ${colorName} */`), `expected a group header for color "${colorName}"`);
  }
});
