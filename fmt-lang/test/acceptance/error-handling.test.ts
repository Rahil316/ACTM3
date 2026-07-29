// Phase 6 acceptance — §7.3's requirement: misconfigurations are caught
// with correctly-categorized, actionable diagnostics, never a silent wrong
// result. One deliberately-broken document per category, run through the
// FULL public API (parseFmtLangDocument), not just the underlying
// validate/* unit functions in isolation — this is the real end-to-end
// proof a user would actually experience.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFmtLangDocument } from "../../src/index";

test("§7.3 SYNTAX: malformed JSON5 is caught before anything else runs", () => {
  const { doc, diagnostics } = parseFmtLangDocument(`{ "files": [ { "role": "a", `);
  assert.equal(doc, undefined);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].category, "syntax");
  assert.equal(diagnostics[0].severity, "error");
});

test("§7.3 SEMANTIC (shape mismatch): a token-only field used against a scaleStep select never silently produces empty output", () => {
  const docSrc = `{
    "files": [
      { "role": "a", "shape": "scaleStep", "path": "a.css",
        "select": { "shape": "scaleStep", "where": "tokenRef == null" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(doc, undefined, "must abort, not silently generate");
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "semantic");
  assert.equal(errors[0].code, "unknown-field");
});

test("§7.3 SEMANTIC (cross-file): a forward reference is a config-load-time error, not a runtime placeholder leak", () => {
  const docSrc = `{
    "files": [
      { "role": "index", "shape": "token", "path": "index.css",
        "before": "{{files.theme-file.each}}...{{/files.theme-file.each}}" },
      { "role": "theme-file", "shape": "token", "path": "\${theme}.css", "repeatFor": { "over": "themes", "as": "theme" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.equal(doc, undefined);
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, "semantic");
  assert.equal(errors[0].code, "forward-or-self-reference");
});

test("§7.3: a well-formed document produces zero diagnostics and real output — the contrast case", () => {
  const docSrc = `{
    "files": [
      { "role": "a", "shape": "token", "path": "a.css",
        "select": { "shape": "token", "where": "theme == 'light'" } }
    ]
  }`;
  const { doc, diagnostics } = parseFmtLangDocument(docSrc);
  assert.ok(doc);
  assert.equal(diagnostics.filter((d) => d.severity === "error").length, 0);
});
