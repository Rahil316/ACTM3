// Phase 1 unit tests — data layer, against the real, frozen nmobile fixture
// (test/fixtures/nmobile-fixture.json). Verifies shape/count/order
// correctness and the specific claims made in the plan's Part A: raw
// identity (name/shorthand/segments) preserved for color, role, AND
// variation; "/"-named colors ("Spare/1") split correctly; shape-4
// (cross-output references) deliberately out of scope here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../../src/data/adapter";
import { Dataset } from "../../src/data/dataset";
import type { EngineResult, ExportConfig } from "../../../src/shared/exportEng/types";

const fixturePath = join(__dirname, "../fixtures/nmobile-fixture.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf-8")) as { result: EngineResult; exportConfig: ExportConfig };

function load() {
  return buildDataset(fixture.result, fixture.exportConfig);
}

test("Dataset carries both real project themes, in declared order", () => {
  const ds = load();
  // The fixture's own themes array order is dark-then-light (confirmed when
  // the fixture was generated) — Dataset must preserve that, not alphabetize
  // or otherwise reorder it.
  assert.deepEqual(ds.themeNames, ["dark", "light"]);
});

test("Dataset.hasScaleCollection reflects the real project mode (Direct mode here)", () => {
  const ds = load();
  assert.equal(ds.hasScaleCollection, false);
  assert.equal(ds.scaleSteps.length, 0);
});

test("Dataset.tokenNameSegments matches the project's declared order", () => {
  const ds = load();
  assert.deepEqual(ds.tokenNameSegments, ["role", "color", "variation"]);
});

test("source color records carry raw color identity, not flattened", () => {
  // "Spare/1" (and Spare/2-5) are colors[] entries in the fixture, but no
  // role's scopedColorIds includes them — they only ever appear as source
  // colors (includeSourceColors: true), never as tokens. Confirmed directly
  // against the fixture's real exportConfig.roles before writing this
  // assertion, rather than assuming they'd show up as tokens.
  const ds = load();
  const spareOne = ds.sourceColors.find((s) => s.data.color.name === "Spare/1");
  assert.ok(spareOne, "expected a source color record for 'Spare/1'");
  assert.equal(spareOne!.data.color.name, "Spare/1");
  // Confirmed against real code: _slug() would collapse this to "spare-1",
  // destroying the "/" — Dataset must NOT do that; segments must reflect
  // the real split instead.
  assert.deepEqual(spareOne!.data.color.segments, ["Spare", "1"]);
});

test("a color with no \"/\" in its name gets a 1-element segments array", () => {
  const ds = load();
  const primary = ds.tokens.find((t) => t.data.color.name === "Primary");
  assert.ok(primary, "expected at least one token for color 'Primary'");
  assert.deepEqual(primary!.data.color.segments, ["Primary"]);
});

test("every token record carries color, role, AND variation identity (not just color)", () => {
  const ds = load();
  assert.ok(ds.tokens.length > 0, "fixture should have produced at least one token");
  for (const t of ds.tokens.slice(0, 5)) {
    assert.ok(t.data.color.name.length > 0);
    assert.ok(t.data.role.name.length > 0);
    assert.ok(t.data.variation.name.length > 0, "variation identity must be recovered, not left empty");
  }
});

test("token records are tagged with __shape 'token', scale steps with 'scaleStep'", () => {
  const ds = load();
  for (const t of ds.tokens) assert.equal(t.__shape, "token");
  for (const s of ds.scaleSteps) assert.equal(s.__shape, "scaleStep");
});

test("source colors and their alpha variants are both present when includeSourceColors is on", () => {
  const ds = load();
  assert.ok(ds.sourceColors.length > 0, "expected source color records — fixture has includeSourceColors: true");
  for (const sc of ds.sourceColors) assert.equal(sc.__shape, "sourceColor");
  for (const sa of ds.sourceAlphas) assert.equal(sa.__shape, "sourceAlpha");
});

test("Dataset.tokensForTheme returns only that theme's tokens", () => {
  const ds = load();
  const darkTokens = ds.tokensForTheme("dark");
  assert.ok(darkTokens.length > 0);
  for (const t of darkTokens) assert.equal(t.data.theme, "dark");
});

test("Dataset.matchesIdentity matches by raw name or shorthand, interchangeably", () => {
  const ds = load();
  const primary = ds.tokens.find((t) => t.data.color.name === "Primary")!.data.color;
  assert.equal(Dataset.matchesIdentity(primary, "Primary"), true);
  if (primary.shorthand) assert.equal(Dataset.matchesIdentity(primary, primary.shorthand), true);
  assert.equal(Dataset.matchesIdentity(primary, "definitely-not-a-real-name"), false);
});
