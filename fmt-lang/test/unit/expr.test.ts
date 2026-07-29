// Phase 2 unit tests — the embedded expression language (B.1/B.1a).
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, evaluateString, isTruthy } from "../../src/lang/expr";

test("string/number/boolean literals", () => {
  assert.equal(evaluate("'hello'", {}), "hello");
  assert.equal(evaluate("42", {}), 42);
  assert.equal(evaluate("true", {}), true);
  assert.equal(evaluate("false", {}), false);
  assert.equal(evaluate("null", {}), null);
});

test("comparisons", () => {
  assert.equal(evaluate("5 > 4.5", {}), true);
  assert.equal(evaluate("'light' == 'light'", {}), true);
  assert.equal(evaluate("'light' == 'dark'", {}), false);
  assert.equal(evaluate("'a' != 'b'", {}), true);
});

test("boolean operators && || !", () => {
  assert.equal(evaluate("true && false", {}), false);
  assert.equal(evaluate("true || false", {}), true);
  assert.equal(evaluate("!true", {}), false);
  assert.equal(evaluate("!false", {}), true);
});

test("ternary", () => {
  assert.equal(evaluate("true ? 'a' : 'b'", {}), "a");
  assert.equal(evaluate("false ? 'a' : 'b'", {}), "b");
});

test("field access on a record (bare identifier resolves against ctx.record)", () => {
  const record = { __shape: "token", data: { theme: "light", roleId: "primary" } };
  assert.equal(evaluate("theme", { record }), "light");
  assert.equal(evaluate("theme == 'light'", { record }), true);
});

test("B.1a: null comparisons never throw, always resolve to false (except == / != null)", () => {
  const record = { __shape: "token", data: { contrast: { ratio: null } } };
  assert.equal(evaluate("contrast.ratio > 4.5", { record }), false);
  assert.equal(evaluate("contrast.ratio == null", { record }), true);
});

test("the plan's exact B.1a worked example: token A (ratio 5.0) included, token B (ratio null) not", () => {
  const tokenA = { __shape: "token", data: { contrast: { ratio: 5.0 } } };
  const tokenB = { __shape: "token", data: { contrast: { ratio: null } } };
  assert.equal(isTruthy(evaluate("contrast.ratio > 4.5", { record: tokenA })), true);
  assert.equal(isTruthy(evaluate("contrast.ratio > 4.5", { record: tokenB })), false);
});

test("chained field access through nested objects", () => {
  const record = { __shape: "token", data: { color: { name: "Primary", shorthand: "pr" } } };
  assert.equal(evaluate("color.name", { record }), "Primary");
  assert.equal(evaluate("color.shorthand", { record }), "pr");
});

test("chained field access on a missing intermediate field propagates null, never throws", () => {
  const record = { __shape: "token", data: { color: { name: "Primary" } } };
  assert.doesNotThrow(() => evaluate("color.shorthand.length", { record }));
  assert.equal(evaluate("color.shorthand", { record }), null);
});

test("built-in functions: upper, lower, slug", () => {
  assert.equal(evaluate("upper('abc')", {}), "ABC");
  assert.equal(evaluate("lower('ABC')", {}), "abc");
  assert.equal(evaluate("slug('Spare/1')", {}), "spare-1");
});

test("evaluateString stringifies and treats null/undefined as empty string", () => {
  assert.equal(evaluateString("42", {}), "42");
  assert.equal(evaluateString("null", {}), "");
});

test("vars are available alongside record (e.g. a repeatFor loop variable)", () => {
  assert.equal(evaluate("theme.name", { vars: { theme: { name: "dark" } } }), "dark");
});

test("string concatenation with +", () => {
  assert.equal(evaluate("'a' + 'b'", {}), "ab");
});
