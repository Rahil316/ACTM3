// Phase 2 unit tests — stdlib casing, against the plan's own worked examples
// (B.3a's leading-digit guard, B.3's segment-join behavior).
import { test } from "node:test";
import assert from "node:assert/strict";
import { toKebab, toCamel, toPascal, toSnake, toScreaming, ensureNotLeadingDigit } from "../../src/lang/stdlib/casing";

test("toKebab joins multi-word segments with hyphens, lowercased", () => {
  assert.equal(toKebab(["Primary"]), "primary");
  assert.equal(toKebab(["Primary", "text", "default"]), "primary-text-default");
  assert.equal(toKebab(["100% Black"]), "100-black");
});

test("toCamel/toPascal handle multi-word segments", () => {
  assert.equal(toCamel(["primary", "text", "default"]), "primaryTextDefault");
  assert.equal(toPascal(["primary", "text", "default"]), "PrimaryTextDefault");
});

test("toSnake/toScreaming", () => {
  assert.equal(toSnake(["Primary", "Text"]), "primary_text");
  assert.equal(toScreaming(["Primary", "Text"]), "PRIMARY_TEXT");
});

test("ensureNotLeadingDigit matches the plan's worked examples exactly", () => {
  assert.equal(ensureNotLeadingDigit("100-black"), "_100-black");
  assert.equal(ensureNotLeadingDigit("2nd-tier"), "_2nd-tier");
  assert.equal(ensureNotLeadingDigit("primary"), "primary");
});

test("full pipeline: '100% Black' kebab-cased then digit-guarded matches the plan exactly", () => {
  const kebab = toKebab(["100% Black"]);
  assert.equal(ensureNotLeadingDigit(kebab), "_100-black");
});
