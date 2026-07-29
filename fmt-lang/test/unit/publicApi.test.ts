// Integration test of the full public API (src/index.ts) — parse a real
// JSON5 document string -> build a Dataset -> generate() -> the exact
// path the CLI bridge (Part G) will call. Proves the public surface, not
// just individual internal modules, works end to end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset, parseFmtLangDocument, generate } from "../../src/index";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

test("public API: a simple JSON5 document string renders a real CSS file end-to-end", () => {
  const docSrc = `{
    // a simple, single-file custom export
    "$schema": "fmt-lang/v1",
    "files": [
      {
        "role": "tokens",
        "shape": "token",
        "path": "tokens.css",
      },
    ],
  }`;

  const { doc, diagnostics: parseDiagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(parseDiagnostics.length, 0);
  assert.ok(doc);

  const dataset = buildDataset(fixture.result, fixture.exportConfig);
  const { files, diagnostics } = generate(doc!, dataset);

  assert.equal(diagnostics.length, 0);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, "tokens.css");
  assert.ok(files[0].content.length > 0);
  assert.match(files[0].content, /^ {2}--[a-z0-9-]+: #[0-9A-Fa-f]{6};/);
});

test("public API: an unsupported $schema version is a clear semantic error, not a silent misinterpretation", () => {
  const { doc, diagnostics } = parseFmtLangDocument(`{ "$schema": "fmt-lang/v99", "files": [] }`);
  assert.equal(doc, undefined);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "unsupported-schema-version");
});

test("public API: malformed JSON5 never throws uncaught, always a syntax diagnostic", () => {
  const { doc, diagnostics } = parseFmtLangDocument("{ files: [ { role: 'a' ");
  assert.equal(doc, undefined);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].category, "syntax");
});

test("public API: a token-only field (contrast.ratio) referenced in a scaleStep-shaped select.where is a semantic error, never a silent empty-set result — a real bug found via the CLI, now regression-tested here", () => {
  const docSrc = `{
    "files": [
      { "role": "tokens", "shape": "scaleStep", "path": "tokens.css",
        "select": { "shape": "scaleStep", "where": "contrast.ratio > 4.5" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(doc, undefined, "a shape-mismatched where clause must abort parsing, never silently succeed");
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "semantic");
  assert.equal(errors[0].code, "unknown-field");
});
