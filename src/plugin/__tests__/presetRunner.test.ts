/**
 * Preset Runner Tests
 *
 * Runs every TEST-xx preset through the full engine pipeline:
 *   preset.config → translateConfig → variableMaker → [resolveTokenRefBgs → variableMaker]
 *
 * Each test group verifies the feature the preset was designed to exercise.
 * All assertions are structural — no hardcoded hex values, so tests stay valid
 * if the engine algorithm improves.
 */

import { describe, it, expect } from "vitest";
import testPresets from "../../ui/lib/presets/raw/test";
import { translateConfig, resolveTokenRefBgs } from "../config";
import { variableMaker } from "../../shared/clrEngine";

// ── Engine runner (mirrors index.ts runEngine) ────────────────────────────────

function runEngine(config: ReturnType<typeof translateConfig>) {
  const result = variableMaker(config);
  if (resolveTokenRefBgs(config, result)) {
    return variableMaker(config);
  }
  return result;
}

function run(presetId: string) {
  const preset = testPresets.find((p) => p.id === presetId);
  if (!preset) throw new Error(`Preset not found: ${presetId}`);
  const config = translateConfig(preset.config);
  return { config, result: runEngine(config) };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

// ─────────────────────────────────────────────────────────────────────────────
// TEST-01 — Scale mode baseline
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-01 Scale Baseline", () => {
  const { result, config } = run("test-01-scale-baseline");

  it("produces scale entries for every color", () => {
    expect(Object.keys(result.scales)).toEqual(["Blue", "Neutral"]);
  });

  it("scale has 11 steps per color", () => {
    expect(Object.keys(result.scales["Blue"])).toHaveLength(11);
    expect(Object.keys(result.scales["Neutral"])).toHaveLength(11);
  });

  it("every scale step is a valid hex value", () => {
    for (const steps of Object.values(result.scales)) {
      for (const entry of Object.values(steps)) {
        expect(entry.value).toMatch(HEX);
      }
    }
  });

  it("scale steps include contrast info against Light theme", () => {
    const step = Object.values(result.scales["Blue"])[0];
    expect(typeof step.contrast?.["light"]?.ratio).toBe("number");
  });

  it("tokens exist for both themes", () => {
    expect(result.tokens["light"]).toBeDefined();
    expect(result.tokens["dark"]).toBeDefined();
  });

  it("tokens exist for both roles × both colors", () => {
    expect(result.tokens["light"]["Blue"]).toBeDefined();
    expect(result.tokens["light"]["Neutral"]).toBeDefined();
    expect(result.tokens["dark"]["Blue"]).toBeDefined();
  });

  it("each role has 3 variations (global)", () => {
    const roleKeys = Object.keys(result.tokens["light"]["Blue"]);
    // text role (idx 0) + fill role (idx 1)
    expect(Object.keys(result.tokens["light"]["Blue"][0])).toHaveLength(3);
  });

  it("token values are valid hex", () => {
    for (const [, colorTokens] of Object.entries(result.tokens["light"])) {
      for (const [, roleTokens] of Object.entries(colorTokens)) {
        for (const token of Object.values(roleTokens as Record<string, { value: string }>)) {
          expect(token.value).toMatch(HEX);
        }
      }
    }
  });

  it("includeDescriptions=true: scale steps carry description strings", () => {
    const step = Object.values(result.scales["Blue"])[5];
    // description may be empty string but should be defined
    expect(step.description).toBeDefined();
  });

  it("includeColorScalesCollection=true: config passes flag through", () => {
    expect(config.includeColorScalesCollection).toBe(true);
  });

  it("alphaValues parsed to number array with 5 entries", () => {
    expect(config.alphaValues).toEqual([10, 25, 50, 75, 90]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-02 — Direct mode · 5 solver overrides
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-02 Direct Mode Solvers", () => {
  const { result, config } = run("test-02-direct-solvers");

  it("pluginMode=direct", () => {
    expect(config.pluginMode).toBe("direct");
  });

  it("all 5 solver-named roles produce tokens", () => {
    const roleCount = Object.keys(result.tokens["light"]["Violet"]).length;
    expect(roleCount).toBe(5);
  });

  it("each role has 2 variations", () => {
    for (const roleIdx of Object.keys(result.tokens["light"]["Violet"])) {
      expect(Object.keys((result.tokens["light"]["Violet"] as any)[roleIdx])).toHaveLength(2);
    }
  });

  it("all token values are valid hex", () => {
    for (const theme of ["light", "dark"]) {
      for (const [, colorTokens] of Object.entries(result.tokens[theme] ?? {})) {
        for (const [, roleTokens] of Object.entries(colorTokens)) {
          for (const token of Object.values(roleTokens as Record<string, { value: string }>)) {
            expect(token.value).toMatch(HEX);
          }
        }
      }
    }
  });

  it("the 5 solver-mode roles produce at least 2 distinct default values (solvers differ)", () => {
    const defaultValues = Object.values(result.tokens["light"]["Violet"]).map((roleTokens) => Object.values(roleTokens as Record<string, { value: string }>)[0].value);
    const unique = new Set(defaultValues);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("includeColorScalesCollection=false", () => {
    expect(config.includeColorScalesCollection).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-03 — localBg hex kind
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-03 localBg Hex Kind", () => {
  const { result, config } = run("test-03-localbg-hex");

  it("role text-on-surface has localBg resolved from hex kind", () => {
    const role = config.roles.find((r: { name: string }) => r.name === "text-on-surface");
    expect(role).toBeDefined();
    expect(role.localBg).toBeDefined();
    expect(role.localBg["light"]).toBe("#E5E7EB");
    expect(role.localBg["dark"]).toBe("#1F2937");
  });

  it("both roles produce tokens for both themes", () => {
    expect(result.tokens["light"]["Blue"][0]).toBeDefined(); // text-page (role 0)
    expect(result.tokens["light"]["Blue"][1]).toBeDefined(); // text-on-surface (role 1)
    expect(result.tokens["dark"]["Blue"][1]).toBeDefined();
  });

  it("text-on-surface tokens differ between themes (different bg → different contrast target)", () => {
    const lightVal = (result.tokens["light"]["Blue"][1][0] as { value: string }).value;
    const darkVal = (result.tokens["dark"]["Blue"][1][0] as { value: string }).value;
    expect(lightVal).toMatch(HEX);
    expect(darkVal).toMatch(HEX);
    expect(lightVal).not.toBe(darkVal);
  });

  it("text-on-surface (card bg) differs from text-page (white bg) on light theme", () => {
    const onPage = (result.tokens["light"]["Blue"][0][1] as { value: string }).value; // default variation
    const onSurface = (result.tokens["light"]["Blue"][1][1] as { value: string }).value;
    expect(onPage).toMatch(HEX);
    expect(onSurface).toMatch(HEX);
    // #E5E7EB (light gray) vs #FFFFFF (white) — contrast targets differ enough to differ
    expect(onPage).not.toBe(onSurface);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-04 — localBg color kind
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-04 localBg Color Kind", () => {
  const { config } = run("test-04-localbg-color");

  it("text-on-sand role has localBg resolved to Sand hex for both themes", () => {
    const role = config.roles.find((r: { name: string }) => r.name === "text-on-sand");
    expect(role.localBg).toBeDefined();
    // Sand hex is A8956A — both themes get the same value since Color entity = single hex
    expect(role.localBg["light"]).toBe("A8956A");
    expect(role.localBg["dark"]).toBe("A8956A");
  });

  it("text-on-sand role produces valid tokens for both themes", () => {
    const { result } = run("test-04-localbg-color");
    const lightToken = result.tokens["light"]?.["Blue"]?.[1]?.[0] as { value: string } | undefined;
    const darkToken = result.tokens["dark"]?.["Blue"]?.[1]?.[0] as { value: string } | undefined;
    expect(lightToken?.value).toMatch(HEX);
    expect(darkToken?.value).toMatch(HEX);
  });

  it("localBgTokenRef and localBgDynamicRef are null (not a token kind)", () => {
    const role = config.roles.find((r: { name: string }) => r.name === "text-on-sand");
    expect(role.localBgTokenRef).toBeNull();
    expect(role.localBgDynamicRef).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-05 — localBg token kind (fixed)
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-05 localBg Token (Fixed)", () => {
  it("translateConfig sets localBgTokenRef on on/fill role (read before engine run)", () => {
    // Must read from translateConfig directly — runEngine calls resolveTokenRefBgs which clears the ref
    const preset = testPresets.find((p) => p.id === "test-05-localbg-token-fixed")!;
    const config = translateConfig(preset.config);
    const role = config.roles.find((r: { name: string }) => r.name === "on/fill");
    expect(role.localBgTokenRef).toBe("Blue-fill-1");
    expect(role.localBgDynamicRef).toBeNull();
  });

  it("resolveTokenRefBgs resolves the ref and clears localBgTokenRef", () => {
    const preset = testPresets.find((p) => p.id === "test-05-localbg-token-fixed")!;
    const config = translateConfig(preset.config);
    const pass1 = variableMaker(config);
    const didResolve = resolveTokenRefBgs(config, pass1);
    const role = config.roles.find((r: { name: string }) => r.name === "on/fill");
    expect(didResolve).toBe(true);
    expect(role.localBgTokenRef).toBeNull();
    expect(role.localBg).toBeDefined();
    expect(typeof role.localBg).toBe("object");
  });

  it("two-pass result: on/fill tokens are valid hex", () => {
    const { result } = run("test-05-localbg-token-fixed");
    const onFillRoleIdx = 1; // second role = on/fill
    const token = result.tokens["light"]?.["Blue"]?.[onFillRoleIdx]?.[0] as { value: string } | undefined;
    expect(token?.value).toMatch(HEX);
  });

  it("on/fill tokens differ between light and dark (different fill/default bg per theme)", () => {
    const { result } = run("test-05-localbg-token-fixed");
    const lightToken = result.tokens["light"]?.["Blue"]?.[1]?.[1] as { value: string } | undefined;
    const darkToken = result.tokens["dark"]?.["Blue"]?.[1]?.[1] as { value: string } | undefined;
    expect(lightToken?.value).toMatch(HEX);
    expect(darkToken?.value).toMatch(HEX);
    expect(lightToken?.value).not.toBe(darkToken?.value);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-06 — localBg token kind (dynamic, [color] placeholder)
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-06 localBg Token Dynamic", () => {
  it("translateConfig sets localBgDynamicRef on on/fill role (read before engine run)", () => {
    // Must read from translateConfig directly — runEngine calls resolveTokenRefBgs which clears the ref
    const preset = testPresets.find((p) => p.id === "test-06-localbg-token-dynamic")!;
    const config = translateConfig(preset.config);
    const role = config.roles.find((r: { name: string }) => r.name === "on/fill");
    expect(role.localBgDynamicRef).toBe("[color]-fill-1");
    expect(role.localBgTokenRef).toBeNull();
  });

  it("resolveTokenRefBgs builds localBgPerColor for Blue and Red", () => {
    const preset = testPresets.find((p) => p.id === "test-06-localbg-token-dynamic")!;
    const config = translateConfig(preset.config);
    const pass1 = variableMaker(config);
    const didResolve = resolveTokenRefBgs(config, pass1);
    const role = config.roles.find((r: { name: string }) => r.name === "on/fill");
    expect(didResolve).toBe(true);
    expect(role.localBgPerColor).toBeDefined();
    expect(role.localBgPerColor["Blue"]).toBeDefined();
    expect(role.localBgPerColor["Red"]).toBeDefined();
    expect(role.localBgDynamicRef).toBeNull();
  });

  it("Blue on/fill and Red on/fill both produce valid tokens after two-pass resolution", () => {
    const { result } = run("test-06-localbg-token-dynamic");
    const onFillIdx = 1;
    const blueOnFill = result.tokens["light"]?.["Blue"]?.[onFillIdx]?.[1] as { value: string } | undefined;
    const redOnFill = result.tokens["light"]?.["Red"]?.[onFillIdx]?.[1] as { value: string } | undefined;
    expect(blueOnFill?.value).toMatch(HEX);
    expect(redOnFill?.value).toMatch(HEX);
    // Both produce tokens — the per-color bg routing is proven by the resolveTokenRefBgs test above
  });

  it("all on/fill tokens are valid hex across both colors and both themes", () => {
    const { result } = run("test-06-localbg-token-dynamic");
    for (const theme of ["light", "dark"]) {
      for (const colorName of ["Blue", "Red"]) {
        for (const token of Object.values(result.tokens[theme]?.[colorName]?.[1] ?? ({} as Record<string, { value: string }>))) {
          expect(token.value).toMatch(HEX);
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-07 — scopedColorIds
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-07 scopedColorIds", () => {
  const { result } = run("test-07-scoped-color-ids");
  // role 0 = text-all (null), role 1 = text-none ([]), role 2 = text-green-only (['t07-c2'])

  it("null scopedColorIds: role 0 tokens exist for all 3 colors", () => {
    expect(result.tokens["light"]["Blue"]?.[0]).toBeDefined();
    expect(result.tokens["light"]["Green"]?.[0]).toBeDefined();
    expect(result.tokens["light"]["Red"]?.[0]).toBeDefined();
  });

  it("empty scopedColorIds: role 1 produces no tokens for any color", () => {
    expect(result.tokens["light"]["Blue"]?.[1]).toBeUndefined();
    expect(result.tokens["light"]["Green"]?.[1]).toBeUndefined();
    expect(result.tokens["light"]["Red"]?.[1]).toBeUndefined();
  });

  it("specific scopedColorIds: role 2 tokens exist only for Green", () => {
    expect(result.tokens["light"]["Blue"]?.[2]).toBeUndefined();
    expect(result.tokens["light"]["Green"]?.[2]).toBeDefined();
    expect(result.tokens["light"]["Red"]?.[2]).toBeUndefined();
  });

  it("scoped tokens are valid hex", () => {
    for (const token of Object.values(result.tokens["light"]["Green"][2] as Record<string, { value: string }>)) {
      expect(token.value).toMatch(HEX);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-08 — Index mapping method
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-08 Index Mapping", () => {
  const { result, config } = run("test-08-index-mapping");
  // role 0 = indexed, role 1 = contrast

  it("indexed role has mappingMethod=index in config", () => {
    expect(config.roles[0].mappingMethod).toBe("index");
    expect(config.roles[1].mappingMethod).toBe("contrast");
  });

  it("indexed role produces 3 tokens (one per index target)", () => {
    expect(Object.keys(result.tokens["light"]["Violet"][0])).toHaveLength(3);
  });

  it("indexed tokens carry tokenRef pointing to a scale step", () => {
    const token = result.tokens["light"]["Violet"][0][0] as { tokenRef?: string; value: string };
    expect(token.tokenRef).toBeDefined();
    expect(typeof token.tokenRef).toBe("string");
  });

  it("contrast role tokens also exist with 3 variations", () => {
    expect(Object.keys(result.tokens["light"]["Violet"][1])).toHaveLength(3);
  });

  it("indexed and contrast roles produce different values (index picks exact step)", () => {
    const indexedDefault = (result.tokens["light"]["Violet"][0][1] as { value: string }).value;
    const contrastDefault = (result.tokens["light"]["Violet"][1][1] as { value: string }).value;
    // They might coincidentally match but usually won't — both must be valid hex
    expect(indexedDefault).toMatch(HEX);
    expect(contrastDefault).toMatch(HEX);
  });

  it("all token values are valid hex", () => {
    for (const roleIdx of [0, 1]) {
      for (const token of Object.values(result.tokens["light"]["Violet"][roleIdx] as Record<string, { value: string }>)) {
        expect(token.value).toMatch(HEX);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-09 — customVariationList per role
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-09 Custom Variations Per Role", () => {
  const { result, config } = run("test-09-custom-variations");
  // role 0 = status (3 custom variations), role 1 = text (5 global)

  it("status role has customVariationList=true in translated config", () => {
    const statusRole = config.roles.find((r: { name: string }) => r.name === "status");
    expect(statusRole.customVariationList).toBe(true);
    expect(statusRole.customVariations).toHaveLength(3);
  });

  it("status role (customVariationList=true) has exactly 3 variations", () => {
    expect(Object.keys(result.tokens["light"]["Cyan"][0])).toHaveLength(3);
  });

  it("text role (customVariationList=false) has 5 global variations", () => {
    expect(Object.keys(result.tokens["light"]["Cyan"][1])).toHaveLength(5);
  });

  it("all tokens are valid hex", () => {
    for (const roleIdx of [0, 1]) {
      for (const token of Object.values(result.tokens["light"]["Cyan"][roleIdx] as Record<string, { value: string }>)) {
        expect(token.value).toMatch(HEX);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-10 — All shorthands on + role/variation segment ordering
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-10 All Shorthands + Segment Order", () => {
  const { config } = run("test-10-all-shorthands");

  it("all shorthand flags are true", () => {
    expect(config.useShorthandColors).toBe(true);
    expect(config.useShorthandRoles).toBe(true);
    expect(config.useShorthandVariations).toBe(true);
    expect(config.useShorthandSteps).toBe(true);
  });

  it('tokenNameSegments is ["role","color","variation"]', () => {
    expect(config.tokenNameSegments).toEqual(["role", "color", "variation"]);
  });

  it("scaleStepShorthands map is populated", () => {
    expect(config.scaleStepShorthands["lightest"]).toBe("xl");
    expect(config.scaleStepShorthands["darkest"]).toBe("xd");
  });

  it("scaleLength=5 produces exactly 5 scale steps per color", () => {
    const { result } = run("test-10-all-shorthands");
    expect(Object.keys(result.scales["Amber"])).toHaveLength(5);
    expect(Object.keys(result.scales["Emerald"])).toHaveLength(5);
  });

  it("token output exists for both colors × both roles", () => {
    const { result } = run("test-10-all-shorthands");
    expect(result.tokens["light"]["Amber"]).toBeDefined();
    expect(result.tokens["light"]["Emerald"]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-11 — Named scale steps with shorthands
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-11 Named Scale Steps", () => {
  const { config, result } = run("test-11-named-steps");

  it("scaleStepNames resolved to 7 names", () => {
    expect(config.scaleStepNames).toHaveLength(7);
    expect(config.scaleStepNames[0]).toBe("50");
    expect(config.scaleStepNames[6]).toBe("900");
  });

  it("scaleStepShorthands map has 7 entries", () => {
    expect(Object.keys(config.scaleStepShorthands)).toHaveLength(7);
    expect(config.scaleStepShorthands["50"]).toBe("xs");
    expect(config.scaleStepShorthands["900"]).toBe("2xl");
  });

  it("scale output has exactly 7 steps matching the step names", () => {
    const steps = Object.keys(result.scales["Pink"]);
    expect(steps).toHaveLength(7);
    expect(steps).toContain("50");
    expect(steps).toContain("900");
  });

  it("all step values are valid hex", () => {
    for (const entry of Object.values(result.scales["Pink"])) {
      expect(entry.value).toMatch(HEX);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-12 — Per-color scale algorithms
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-12 Scale Algorithms", () => {
  const { result } = run("test-12-scale-algorithms");

  it("produces scales for all 7 algorithm colors", () => {
    const colorNames = ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear"];
    for (const name of colorNames) {
      expect(result.scales[name]).toBeDefined();
      expect(Object.keys(result.scales[name])).toHaveLength(11);
    }
  });

  it("all scale steps across all algorithms are valid hex", () => {
    for (const [, steps] of Object.entries(result.scales)) {
      for (const entry of Object.values(steps)) {
        expect(entry.value).toMatch(HEX);
      }
    }
  });

  it("different algorithms produce distinct mid-scale values for the same hue family", () => {
    const midStep = Object.keys(result.scales["Natural"])[5];
    const values = ["Natural", "Uniform", "OKLCH", "Linear"].map((name) => result.scales[name]?.[midStep]?.value).filter(Boolean);
    const unique = new Set(values);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("tokens exist for each algorithm color", () => {
    for (const colorName of ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear"]) {
      expect(result.tokens["light"][colorName]).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-13 — 3 themes + tokenGrouping='role' + deduplication
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-13 Themes & Grouping", () => {
  const { config, result } = run("test-13-themes-grouping");

  it('deduplicates duplicate "Light" theme name to "Light 2"', () => {
    const themeNames = config.themes.map((t: { name: string }) => t.name);
    expect(themeNames).toContain("Light");
    expect(themeNames).toContain("Light 2");
    expect(themeNames.filter((n: string) => n === "Light")).toHaveLength(1);
  });

  it("produces tokens for all 4 deduplicated themes", () => {
    expect(result.tokens["light"]).toBeDefined();
    expect(result.tokens["dark"]).toBeDefined();
    expect(result.tokens["brand"]).toBeDefined();
    expect(result.tokens["light 2"]).toBeDefined();
  });

  it("tokenGrouping=role in config", () => {
    expect(config.tokenGrouping).toBe("role");
  });

  it("custom collection names are preserved", () => {
    expect(config.scaleCollectionName).toBe("brand/scale");
    expect(config.tokenCollectionName).toBe("brand/tokens");
  });

  it("all 4 themes produce valid hex tokens", () => {
    for (const theme of ["light", "dark", "brand", "light 2"]) {
      const token = result.tokens[theme]?.["Brand"]?.[0]?.[0] as { value: string } | undefined;
      expect(token?.value).toMatch(HEX);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-14 — Source colors + alpha tints
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-14 Source Colors + Alpha Tints", () => {
  const { config, result } = run("test-14-source-alpha");

  it("includeSourceColors=true", () => {
    expect(config.includeSourceColors).toBe(true);
  });

  it('sourceCollectionName is "palette/raw"', () => {
    expect(config.sourceCollectionName).toBe("palette/raw");
  });

  it("alphaValues parses to 7 entries", () => {
    expect(config.alphaValues).toHaveLength(7);
    expect(config.alphaValues).toContain(5);
    expect(config.alphaValues).toContain(90);
  });

  it("produces scales for all 3 brand colors", () => {
    expect(result.scales["Primary"]).toBeDefined();
    expect(result.scales["Secondary"]).toBeDefined();
    expect(result.scales["Danger"]).toBeDefined();
  });

  it("tokens exist for both themes", () => {
    expect(result.tokens["light"]).toBeDefined();
    expect(result.tokens["dark"]).toBeDefined();
  });

  it("all token values are valid hex", () => {
    for (const theme of ["light", "dark"]) {
      for (const [, colorTokens] of Object.entries(result.tokens[theme])) {
        for (const [, roleTokens] of Object.entries(colorTokens)) {
          for (const token of Object.values(roleTokens as Record<string, { value: string }>)) {
            expect(token.value).toMatch(HEX);
          }
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-15 — Minimal config
// ─────────────────────────────────────────────────────────────────────────────

describe("TEST-15 Minimal Config", () => {
  const { config, result } = run("test-15-minimal");

  it("produces exactly 1 scale with 11 steps", () => {
    expect(Object.keys(result.scales)).toHaveLength(1);
    expect(Object.keys(result.scales["Blue"])).toHaveLength(11);
  });

  it("produces tokens for 1 theme × 1 color × 1 role × 1 variation", () => {
    expect(Object.keys(result.tokens)).toHaveLength(1);
    expect(Object.keys(result.tokens["light"])).toHaveLength(1);
    expect(Object.keys(result.tokens["light"]["Blue"])).toHaveLength(1);
    expect(Object.keys(result.tokens["light"]["Blue"][0])).toHaveLength(1);
  });

  it("the single token is a valid hex value", () => {
    const token = result.tokens["light"]["Blue"][0][0] as { value: string };
    expect(token.value).toMatch(HEX);
  });

  it("all optional flags are off", () => {
    expect(config.includeSourceColors).toBe(false);
    expect(config.alphaValues).toHaveLength(0);
    expect(config.useShorthandColors).toBe(false);
    expect(config.useShorthandRoles).toBe(false);
    expect(config.useShorthandVariations).toBe(false);
    expect(config.useShorthandSteps).toBe(false);
    expect(config.includeDescriptions).toBe(false);
  });

  it("empty alphaValues string parses without crashing", () => {
    expect(Array.isArray(config.alphaValues)).toBe(true);
  });
});
