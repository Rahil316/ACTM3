// Phase 2 unit tests — stdlib escaping (§3's "Escaping" requirement): a
// value containing a quote/backslash must never produce invalid structured
// output when outputKind is known.
import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeJsonString, escapeXmlAttribute, escapeForOutputKind } from "../../src/lang/stdlib/escaping";

test("escapeJsonString escapes quotes and backslashes", () => {
  assert.equal(escapeJsonString('He said "hi"'), 'He said \\"hi\\"');
  assert.equal(escapeJsonString("a\\b"), "a\\\\b");
});

test("a value with a quote, embedded in a hand-built JSON string, stays valid JSON", () => {
  const raw = 'Brand name: "Acme"';
  const jsonLine = `{"description": "${escapeJsonString(raw)}"}`;
  const parsed = JSON.parse(jsonLine);
  assert.equal(parsed.description, raw);
});

test("escapeXmlAttribute escapes &, <, >, and \"", () => {
  assert.equal(escapeXmlAttribute('Tom & "Jerry" <3'), "Tom &amp; &quot;Jerry&quot; &lt;3");
});

test("escapeForOutputKind: none passes through unchanged", () => {
  assert.equal(escapeForOutputKind('has "quotes"', "none"), 'has "quotes"');
});
