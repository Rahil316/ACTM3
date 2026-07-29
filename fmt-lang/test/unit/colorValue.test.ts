// Phase 2 unit tests — stdlib color value formatting, against the plan's own
// worked example (B.4: red at 50% opacity, hexa vs argbHex byte order).
import { test } from "node:test";
import assert from "node:assert/strict";
import { toHex, toHexa, toArgbHex, toRgba, toHsla, parseHex } from "../../src/lang/stdlib/colorValue";

test("toHex normalizes case and adds #", () => {
  assert.equal(toHex("ff0000"), "#FF0000");
  assert.equal(toHex("#ff0000"), "#FF0000");
});

test("hexa is #RRGGBBAA, alpha last (the plan's exact worked example)", () => {
  assert.equal(toHexa("#FF0000", 0.5), "#FF000080");
});

test("argbHex is #AARRGGBB, alpha first (the plan's exact worked example)", () => {
  assert.equal(toArgbHex("#FF0000", 0.5), "#80FF0000");
});

test("hexa and argbHex are deliberately distinct byte orders, not near-duplicates", () => {
  const hex = "#00FF00";
  assert.notEqual(toHexa(hex, 0.25), toArgbHex(hex, 0.25));
});

test("toRgba produces a real rgba() string", () => {
  assert.equal(toRgba("#FF0000", 1), "rgba(255, 0, 0, 1)");
});

test("toHsla produces a real hsla() string for a known color", () => {
  // pure red -> hue 0, full saturation, 50% lightness
  assert.equal(toHsla("#FF0000", 1), "hsla(0, 100%, 50%, 1)");
});

test("parseHex handles 3-digit shorthand hex", () => {
  assert.deepEqual(parseHex("#F00"), { r: 255, g: 0, b: 0 });
});
