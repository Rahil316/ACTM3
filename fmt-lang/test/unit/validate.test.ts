// Phase 4 checkpoint — one deliberately-broken fixture per diagnostic
// category (syntax, semantic, runtime, warning), asserting correct
// category + non-empty message + no crash/silent-empty-result (Part E).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument, checkExpressionSyntax, stripJson5Extras } from "../../src/validate/syntax";
import { checkShapeMatch, checkWhereFields } from "../../src/validate/typecheck";
import { validateFileEntries, type FileEntryLike } from "../../src/validate/semantic";
import { checkNamingCollisions, checkShapeExists, checkIdentityExists, checkCycles } from "../../src/validate/runtime";
import { buildDataset } from "../../src/data/adapter";
import type { FileEntry } from "../../src/xref/fileEntry";
import { DEFAULT_NAMING } from "../../src/lang/defs/naming";
import { DEFAULT_VALUE_FORMAT } from "../../src/lang/defs/valueFormat";
import { cssKeyValue } from "../../src/lang/stdlib/entryPresets";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/nmobile-fixture.json"), "utf-8")) as {
  result: EngineResult;
  exportConfig: ExportConfig;
};

// ── Category 1: Syntax ─────────────────────────────────────────────────────

test("SYNTAX: malformed JSON5 document produces a syntax diagnostic, never throws uncaught", () => {
  const { value, diagnostics } = parseDocument("{ defs: { naming: ");
  assert.equal(value, undefined);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].category, "syntax");
  assert.equal(diagnostics[0].severity, "error");
  assert.ok(diagnostics[0].message.length > 0);
});

test("SYNTAX: stripJson5Extras handles comments and trailing commas", () => {
  const src = `{
    // a comment
    "a": 1,
    "b": 2, /* trailing */
  }`;
  const cleaned = stripJson5Extras(src);
  assert.deepEqual(JSON.parse(cleaned), { a: 1, b: 2 });
});

test("SYNTAX: an invalid expression in a 'where' field is caught, with a location", () => {
  const doc = { select: { primaryTokens: { shape: "token", where: "theme ==" } } };
  const diags = checkExpressionSyntax(doc);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].category, "syntax");
  assert.ok(diags[0].loc!.includes("where"));
});

test("SYNTAX: a valid expression produces no diagnostics", () => {
  const doc = { select: { primaryTokens: { shape: "token", where: "theme == 'light'" } } };
  assert.deepEqual(checkExpressionSyntax(doc), []);
});

// ── Category 2: Semantic (shape mismatch + cross-file refs) ────────────────

test("SEMANTIC: a token-shaped entryFormat applied to a scaleStep selection is a shape-mismatch error", () => {
  const diags = checkShapeMatch("entryFormat", "cssVar", "token", "scaleStep", "files[0].entryFormat");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].category, "semantic");
  assert.equal(diags[0].code, "shape-mismatch");
  assert.ok(diags[0].message.includes("token") && diags[0].message.includes("scaleStep"));
});

test("SEMANTIC: a matching shape produces no diagnostic", () => {
  assert.deepEqual(checkShapeMatch("entryFormat", "cssVar", "token", "token", "files[0].entryFormat"), []);
  assert.deepEqual(checkShapeMatch("entryFormat", "cssVar", ["token", "scaleStep"], "scaleStep", "files[0].entryFormat"), []);
});

test("SEMANTIC: a where clause referencing a field that doesn't exist on that shape is caught", () => {
  const diags = checkWhereFields("contrast.ratio > 4.5", "scaleStep", "files[0].select.where");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].code, "unknown-field");
});

test("SEMANTIC: a where clause referencing a real field for that shape produces no diagnostic", () => {
  assert.deepEqual(checkWhereFields("contrast.ratio > 4.5", "token", "files[0].select.where"), []);
  assert.deepEqual(checkWhereFields("stepKey == '500'", "scaleStep", "files[0].select.where"), []);
});

test("SEMANTIC: a forward reference to a not-yet-declared role is a config-load-time error", () => {
  const entries: FileEntryLike[] = [
    { role: "index", repeatFor: undefined, path: "index.css", templateText: "{{files.theme-file.each}}...{{/files.theme-file.each}}" },
    { role: "theme-file", repeatFor: {}, path: "${theme}.css", templateText: "..." },
  ];
  const diags = validateFileEntries(entries);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].code, "forward-or-self-reference");
});

test("SEMANTIC: wrong reference form (.content against a perTheme role) is caught", () => {
  const entries: FileEntryLike[] = [
    { role: "theme-file", repeatFor: {}, path: "${theme}.css", templateText: "..." },
    { role: "index", repeatFor: undefined, path: "index.css", templateText: "{{files.theme-file.content}}" },
  ];
  const diags = validateFileEntries(entries);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].code, "wrong-reference-form");
});

test("SEMANTIC: a correctly-ordered, correctly-formed reference produces no diagnostics", () => {
  const entries: FileEntryLike[] = [
    { role: "theme-file", repeatFor: {}, path: "${theme}.css", templateText: "..." },
    { role: "index", repeatFor: undefined, path: "index.css", templateText: "{{files.theme-file.each}}...{{/files.theme-file.each}}" },
  ];
  assert.deepEqual(validateFileEntries(entries), []);
});

// ── Category 3: Runtime/data ────────────────────────────────────────────────

test("RUNTIME: a naming scheme causing two distinct colors to collide is a runtime warning, not a crash", () => {
  const diags = checkNamingCollisions(
    [{ rawName: "Café", rendered: "caf" }, { rawName: "Caf", rendered: "caf" }],
    "tokenName"
  );
  assert.equal(diags.length, 1);
  assert.equal(diags[0].category, "runtime");
  assert.equal(diags[0].severity, "warning");
  assert.ok(diags[0].message.includes("Café") && diags[0].message.includes("Caf"));
});

test("RUNTIME: no collision produces no diagnostic", () => {
  assert.deepEqual(checkNamingCollisions([{ rawName: "Primary", rendered: "primary" }], "tokenName"), []);
});

test("RUNTIME: referencing a shape that doesn't exist (Direct mode, no scale collection) is a runtime error — the plan's exact example", () => {
  const ds = buildDataset(fixture.result, fixture.exportConfig);
  assert.equal(ds.hasScaleCollection, false); // confirmed fixture is Direct mode
  const diags = checkShapeExists(ds, "scaleStep", "tokens.scale");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].category, "runtime");
  assert.equal(diags[0].severity, "error");
  assert.equal(diags[0].code, "missing-shape");
});

test("RUNTIME: an unmatched getEntriesByColor-style query is a runtime error, never silently empty", () => {
  const diags = checkIdentityExists("definitely-not-a-real-color", false, "color");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].category, "runtime");
  assert.equal(diags[0].code, "unknown-identity");
});

test("RUNTIME: a matched query produces no diagnostic", () => {
  assert.deepEqual(checkIdentityExists("Primary", true, "color"), []);
});

test("RUNTIME: a real cross-file cycle is caught at the late-semantic stage, never an infinite loop", () => {
  const ds = buildDataset(fixture.result, fixture.exportConfig);
  const commonRender = {
    select: { shape: "token" as const },
    arrange: { kind: "flat" as const, join: "\n" },
    compose: {
      namingDef: DEFAULT_NAMING,
      valueFormatDef: DEFAULT_VALUE_FORMAT,
      resolveSegments: (): ("color" | "role" | "variation" | "step")[] => ["color", "role", "variation"],
      entryFormat: cssKeyValue,
    },
  };
  const entries: FileEntry[] = [
    { role: "a", path: "a.css", shape: "token", render: { ...commonRender, before: "{{files.b.content}}" } },
    { role: "b", path: "b.css", shape: "token", render: { ...commonRender, before: "{{files.a.content}}" } },
  ];
  const diags = checkCycles(entries, ds);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].category, "semantic");
  assert.equal(diags[0].code, "reference-cycle");
});

test("RUNTIME: no cycle produces no diagnostic", () => {
  const ds = buildDataset(fixture.result, fixture.exportConfig);
  const commonRender = {
    select: { shape: "token" as const },
    arrange: { kind: "flat" as const, join: "\n" },
    compose: {
      namingDef: DEFAULT_NAMING,
      valueFormatDef: DEFAULT_VALUE_FORMAT,
      resolveSegments: (): ("color" | "role" | "variation" | "step")[] => ["color", "role", "variation"],
      entryFormat: cssKeyValue,
    },
  };
  const entries: FileEntry[] = [{ role: "a", path: "a.css", shape: "token", render: commonRender }];
  assert.deepEqual(checkCycles(entries, ds), []);
});
