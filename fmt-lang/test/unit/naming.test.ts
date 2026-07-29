// Phase 2 unit tests — the naming definition (B.3), against the plan's own
// worked examples: expandSlashSegments splicing, custom join, leading-digit
// guard.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderName, DEFAULT_NAMING, type NamingDef } from "../../src/lang/defs/naming";
import type { IdentityLabel } from "../../src/data/shapes";

function id(name: string, shorthand: string | null = null): IdentityLabel {
  return { name, shorthand, segments: name.split("/") };
}

test("default naming: kebab-case, no expansion — matches today's CLI flattening behavior", () => {
  const segs = [
    { kind: "color" as const, identity: id("Primary") },
    { kind: "role" as const, identity: id("text") },
    { kind: "variation" as const, identity: id("default") },
  ];
  assert.equal(renderName(segs, DEFAULT_NAMING), "primary-text-default");
});

test("expandSlashSegments: 'Interactive/Blue' + 'text' + 'default' -> replaces 1 slot with N in place (the plan's exact worked example)", () => {
  const def: NamingDef = { ...DEFAULT_NAMING, expandSlashSegments: true };
  const segs = [
    { kind: "color" as const, identity: id("Interactive/Blue") },
    { kind: "role" as const, identity: id("text") },
    { kind: "variation" as const, identity: id("default") },
  ];
  assert.equal(renderName(segs, def), "interactive-blue-text-default");
});

test("expandSlashSegments off (default): slash-named color stays one atomic segment", () => {
  const segs = [
    { kind: "color" as const, identity: id("Interactive/Blue") },
    { kind: "role" as const, identity: id("text") },
  ];
  assert.equal(renderName(segs, DEFAULT_NAMING), "interactive-blue-text");
});

test("guardLeadingDigit prefixes an underscore when the result would start with a digit", () => {
  const segs = [{ kind: "color" as const, identity: id("100% Black") }];
  assert.equal(renderName(segs, DEFAULT_NAMING), "_100-black");
});

test("guardLeadingDigit can be disabled explicitly", () => {
  const def: NamingDef = { ...DEFAULT_NAMING, guardLeadingDigit: false };
  const segs = [{ kind: "color" as const, identity: id("100% Black") }];
  assert.equal(renderName(segs, def), "100-black");
});

test("rewrite replaces one specific segment's value by raw identity", () => {
  const def: NamingDef = { ...DEFAULT_NAMING, rewrite: { "role:primary": "brand" } };
  const segs = [{ kind: "role" as const, identity: id("primary") }];
  assert.equal(renderName(segs, def), "brand");
});

test("preferShorthand uses the shorthand when the project declared one", () => {
  const def: NamingDef = { ...DEFAULT_NAMING, preferShorthand: true };
  const segs = [{ kind: "color" as const, identity: id("Primary", "pr") }];
  assert.equal(renderName(segs, def), "pr");
});

test("preferShorthand falls back to the raw name when no shorthand is set", () => {
  const def: NamingDef = { ...DEFAULT_NAMING, preferShorthand: true };
  const segs = [{ kind: "color" as const, identity: id("Primary", null) }];
  assert.equal(renderName(segs, def), "primary");
});

test("case:\"custom\" join expression — reproduces the plan's own worked example's actual BEHAVIOR (first join empty, every later one '__') via a per-gap expression with an implicit `index`, since the plan's literal .map()/.join() syntax isn't expressible in this deliberately array/lambda-free grammar — a real gap: `join` was declared in the plan/NamingDef comments but never implemented at all before this", () => {
  const def: NamingDef = { ...DEFAULT_NAMING, case: "custom", join: "index == 0 ? '' : '__'" };
  const segs = [
    { kind: "role" as const, identity: id("text") },
    { kind: "color" as const, identity: id("primary") },
    { kind: "variation" as const, identity: id("default") },
  ];
  // role+color joined directly (index 0 -> ''), color+variation joined
  // with '__' (index 1 -> '__') — matches the plan's own stated intent.
  assert.equal(renderName(segs, def), "textprimary__default");
});

test("case:\"custom\" join expression overrides `separator` when both are set", () => {
  const def: NamingDef = { ...DEFAULT_NAMING, case: "custom", separator: "-", join: "'::'" };
  const segs = [
    { kind: "color" as const, identity: id("primary") },
    { kind: "role" as const, identity: id("text") },
  ];
  assert.equal(renderName(segs, def), "primary::text");
});

test("case:\"custom\" with no `join` at all still falls back to `separator` unchanged (regression: adding join support must not affect the existing separator-only path)", () => {
  const def: NamingDef = { ...DEFAULT_NAMING, case: "custom", separator: "_" };
  const segs = [
    { kind: "color" as const, identity: id("primary") },
    { kind: "role" as const, identity: id("text") },
  ];
  assert.equal(renderName(segs, def), "primary_text");
});

test("camelCase naming for JS-flavored blocks", () => {
  const def: NamingDef = { ...DEFAULT_NAMING, case: "camel" };
  const segs = [
    { kind: "color" as const, identity: id("Primary") },
    { kind: "role" as const, identity: id("text") },
  ];
  assert.equal(renderName(segs, def), "primaryText");
});
