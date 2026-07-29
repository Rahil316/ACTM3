// Phase 3 checkpoint — the canonical multi-file case (Part D/B.12): one
// repeatFor (perTheme) file entry producing one CSS file per theme, plus an
// aggregator "index" entry that imports all of them via
// {{files.<role>.each}} — must render in dependency order, with the index
// genuinely containing other files' FINAL resolved names/content, not
// placeholder text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../../src/data/adapter";
import { renderAllFiles } from "../../src/xref/render";
import { resolveGenerationOrder, scanFileRefs, nodeId, CycleError } from "../../src/xref/graph";
import type { FileEntry } from "../../src/xref/fileEntry";
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

test("scanFileRefs finds {{files.<role>.each}} and {{files.<role>.content/name}} forms", () => {
  assert.deepEqual(scanFileRefs("${files.themeFile.each}"), []); // wrong syntax (${} not {{}}) -> no match, confirms the scanner is strict
  assert.deepEqual(scanFileRefs("{{files.themeFile.each}}"), [{ role: "themeFile", form: "each" }]);
  assert.deepEqual(scanFileRefs("{{files.themeFile.content}} and {{files.other.name}}"), [
    { role: "themeFile", form: "content" },
    { role: "other", form: "name" },
  ]);
});

test("resolveGenerationOrder: a file referencing another is generated AFTER it", () => {
  const order = resolveGenerationOrder([
    { id: "index", role: "index", refs: [{ role: "theme-file", form: "each" }], isPerTheme: false },
    { id: nodeId("theme-file", "light"), role: "theme-file", refs: [], isPerTheme: true },
    { id: nodeId("theme-file", "dark"), role: "theme-file", refs: [], isPerTheme: true },
  ]);
  const indexPos = order.indexOf("index");
  const lightPos = order.indexOf(nodeId("theme-file", "light"));
  const darkPos = order.indexOf(nodeId("theme-file", "dark"));
  assert.ok(lightPos < indexPos, "theme-file[light] must render before index");
  assert.ok(darkPos < indexPos, "theme-file[dark] must render before index");
});

test("resolveGenerationOrder: a real cycle is detected and reported with the exact path, never infinite recursion", () => {
  assert.throws(
    () =>
      resolveGenerationOrder([
        { id: "a", role: "a", refs: [{ role: "b", form: "content" }], isPerTheme: false },
        { id: "b", role: "b", refs: [{ role: "a", form: "content" }], isPerTheme: false },
      ]),
    (err: unknown) => {
      assert.ok(err instanceof CycleError);
      assert.ok(err.cyclePath.includes("a") && err.cyclePath.includes("b"));
      return true;
    }
  );
});

test("renderAllFiles: one perTheme CSS file per theme + an aggregator index referencing them by REAL resolved name/content", () => {
  const ds = dataset();
  const entries: FileEntry[] = [
    {
      role: "theme-file",
      repeatFor: { over: "themes", as: "theme" },
      path: "tokens/${theme}.css",
      shape: "token",
      render: {
        select: { shape: "token" },
        arrange: { kind: "flat", join: "\n" },
        compose: {
          namingDef: DEFAULT_NAMING,
          valueFormatDef: DEFAULT_VALUE_FORMAT,
          resolveSegments: () => ["color", "role", "variation"],
          entryFormat: cssKeyValue,
        },
      },
    },
    {
      role: "index",
      path: "tokens/index.css",
      shape: "token",
      render: {
        select: { shape: "token", where: "theme == '__none__'" }, // index has no token content of its own
        arrange: { kind: "flat", join: "\n" },
        compose: {
          namingDef: DEFAULT_NAMING,
          valueFormatDef: DEFAULT_VALUE_FORMAT,
          resolveSegments: () => ["color", "role", "variation"],
          entryFormat: cssKeyValue,
        },
        before: "{{files.theme-file.each}}@import './{{item.name}}';\n{{/files.theme-file.each}}",
      },
    },
  ];

  const files = renderAllFiles(entries, ds);
  assert.equal(files.length, 1 + ds.themeNames.length); // one per theme + the aggregator

  const themeFiles = files.filter((f) => f.role === "theme-file");
  assert.deepEqual(themeFiles.map((f) => f.loopValue).sort(), [...ds.themeNames].sort());
  for (const tf of themeFiles) {
    assert.equal(tf.path, `tokens/${tf.loopValue}.css`);
    assert.ok(tf.content.length > 0, "each per-theme file must have real content");
  }

  const index = files.find((f) => f.role === "index")!;
  for (const themeName of ds.themeNames) {
    assert.ok(index.content.includes(`@import './tokens/${themeName}.css';`), `index must import the REAL resolved path for theme "${themeName}", not a placeholder`);
  }
  // Confirm it's genuinely the resolved name, not literal placeholder text.
  assert.ok(!index.content.includes("{{item.name}}"));
  assert.ok(!index.content.includes("{{files."));
});
