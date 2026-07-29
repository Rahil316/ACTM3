// Phase 2 unit tests — sort (B.6), arrange (B.7), select (B.9), against
// synthetic tagged records (real Dataset integration is covered separately
// once the pipeline wires these together end-to-end).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sortRecords, type SortDef } from "../../src/lang/defs/sort";
import { arrangeRecords, type ArrangeDef, type NestedArrangement, type FlatArrangement } from "../../src/lang/defs/arrange";
import { selectRecords, matchesWhere, type SelectDef } from "../../src/lang/defs/select";
import type { TokenRecord } from "../../src/data/shapes";
import { tagRecord } from "../../src/data/shapes";

function makeToken(theme: string, colorName: string, ratio: number | null): TokenRecord {
  return tagRecord("token", {
    theme,
    color: { name: colorName, shorthand: null, segments: [colorName] },
    role: { name: "text", shorthand: null, segments: ["text"] },
    variation: { name: "default", shorthand: null, segments: ["default"] },
    segs: [],
    value: "#000000",
    tokenRef: null,
    isAdjusted: false,
    contrast: { ratio, rating: null },
  });
}

test("sortRecords: alpha order by a raw field", () => {
  const records = [makeToken("light", "Zeta", 1), makeToken("light", "Alpha", 1)];
  const def: SortDef = { keys: [{ by: "color.name", order: "alpha" }] };
  const sorted = sortRecords(records, def);
  assert.deepEqual(sorted.map((r) => r.data.color.name), ["Alpha", "Zeta"]);
});

test("sortRecords: numeric order, descending, nulls sort last without throwing", () => {
  const records = [makeToken("light", "A", 3), makeToken("light", "B", null), makeToken("light", "C", 7)];
  const def: SortDef = { keys: [{ by: "contrast.ratio", order: "numeric", direction: "desc" }] };
  const sorted = sortRecords(records, def);
  assert.deepEqual(sorted.map((r) => r.data.color.name), ["C", "A", "B"]);
});

test("sortRecords: multi-key — primarily by theme, then alphabetically within (the plan's exact example)", () => {
  const records = [makeToken("dark", "Zeta", 1), makeToken("light", "Zeta", 1), makeToken("dark", "Alpha", 1)];
  const def: SortDef = { keys: [
    { by: "theme", order: "declared", declaredOrder: ["light", "dark"] },
    { by: "color.name", order: "alpha" },
  ] };
  const sorted = sortRecords(records, def);
  assert.deepEqual(sorted.map((r) => `${r.data.theme}/${r.data.color.name}`), ["light/Zeta", "dark/Alpha", "dark/Zeta"]);
});

test("sortRecords: manual order, unlisted values sort last", () => {
  const records = [makeToken("light", "C", 1), makeToken("light", "A", 1), makeToken("light", "B", 1)];
  const def: SortDef = { keys: [{ by: "color.name", order: "manual", values: ["B", "A"] }] };
  const sorted = sortRecords(records, def);
  assert.deepEqual(sorted.map((r) => r.data.color.name), ["B", "A", "C"]);
});

test("arrangeRecords: flat just wraps the sorted array, unchanged order", () => {
  const records = [makeToken("light", "A", 1), makeToken("light", "B", 1)];
  const def: ArrangeDef = { kind: "flat" };
  const arranged = arrangeRecords(records, def) as FlatArrangement;
  assert.equal(arranged.kind, "flat");
  assert.equal(arranged.records.length, 2);
});

test("arrangeRecords: nested groups by first-seen order, not alphabetical (matches fmtCSS.ts's own _groupByColor convention)", () => {
  const records = [makeToken("light", "Zeta", 1), makeToken("light", "Zeta", 1), makeToken("light", "Alpha", 1)];
  const def: ArrangeDef = { kind: "nested", groupBy: ["color.name"] };
  const arranged = arrangeRecords(records, def) as NestedArrangement;
  assert.equal(arranged.kind, "nested");
  assert.deepEqual(arranged.groups.map((g) => g.key), ["Zeta", "Alpha"]);
});

test("selectRecords: inclusive where filter", () => {
  const records = [makeToken("light", "A", 1), makeToken("dark", "A", 1)];
  const def: SelectDef = { shape: "token", where: "theme == 'light'" };
  const selected = selectRecords(records, def, {});
  assert.equal(selected.length, 1);
  assert.equal(selected[0].data.theme, "light");
});

test("selectRecords: no where means all records of this shape", () => {
  const records = [makeToken("light", "A", 1), makeToken("dark", "A", 1)];
  const def: SelectDef = { shape: "token" };
  assert.equal(selectRecords(records, def, {}).length, 2);
});

test("matchesWhere: exclusion-style result achieved via the same inclusive mechanism (roleId != 'primary')", () => {
  const record = makeToken("light", "A", 1);
  assert.equal(matchesWhere(record, "color.name != 'B'", {}), true);
  assert.equal(matchesWhere(record, "color.name != 'A'", {}), false);
});
