/**
 * Token Wand — Feature Test Presets
 *
 * One preset per feature cluster. Each preset is self-documenting:
 * the description field lists exactly which settings and code paths it exercises.
 * Together they form a full coverage matrix of every configurable surface.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ Coverage matrix (each row = one preset)                                     │
 * ├─────────────────┬───────────────────────────────────────────────────────────┤
 * │ TEST-01         │ Scale mode · Natural algo · 11-step · global variations   │
 * │                 │ contrast mapping · 2 themes · alphaValues · descriptions  │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-02         │ role-scoped solver overrides (5 solvers used) · 2 themes  │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-03         │ localBg hex kind · per-theme hex map on role              │
 * │                 │ contrast calculated vs explicit bg, not page bg           │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-04         │ localBg color kind · bg hex taken from named color entity │
 * │                 │ same hex for all themes (color entity = static hex)       │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-05         │ localBg token kind (fixed) · points to a static token     │
 * │                 │ two-pass engine: resolveTokenRefBgs resolves once         │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-06         │ localBg token kind (dynamic) · [color] placeholder        │
 * │                 │ per-color bg map computed by resolveTokenRefBgs           │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-07         │ scopedColorIds: null (all) · [] (none) · [id] (single)   │
 * │                 │ 3 roles × 3 colors to exercise all three modes           │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-08         │ index mapping method · explicit step indices             │
 * │                 │ vs contrast mapping on same color · scale mode only       │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-09         │ customVariationList=true on roles · per-role variations   │
 * │                 │ global fallback variations also present                   │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-10         │ tokenNameSegments all 6 permutations of [c,r,v]          │
 * │                 │ useShorthandColors/Roles/Variations/Steps all=true        │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-11         │ Named step names · custom shorthand map                   │
 * │                 │ useShorthandSteps=true · 7-step named scale              │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-12         │ Multiple scale algorithms on different colors             │
 * │                 │ algorithmScopeLevel=color · all 7 algorithms used         │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-13         │ 3 themes · theme deduplication (duplicate names)          │
 * │                 │ tokenGrouping='role' · multi-mode token collection        │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-14         │ includeSourceColors=true · sourceCollectionName custom    │
 * │                 │ includeAlphaTints=true · full alphaValues string          │
 * ├─────────────────┼───────────────────────────────────────────────────────────┤
 * │ TEST-15         │ Minimal: 1 color · 1 role · 1 variation · 1 theme        │
 * │                 │ all optional features disabled · stress test defaults     │
 * └─────────────────┴───────────────────────────────────────────────────────────┘
 */

import type { Preset } from "../../../../shared/themeShop";

// ─────────────────────────────────────────────────────────────────────────────
// TEST-01 — Scale mode baseline
// ─────────────────────────────────────────────────────────────────────────────

const test01: Preset = {
  id: "test-01-scale-baseline",
  name: "TEST-01 Scale Baseline",
  badge: "T01",
  description: "Scale mode · Natural algo · 11 steps · contrast mapping · global variations · 2 themes · alpha tints · descriptions on · scale collection on",
  tags: ["test", "scale", "baseline"],
  swatches: ["3B82F6", "6B7280"],
  config: {
    name: "Test 01 — Scale Baseline",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 25, 50, 75, 90],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "Subtle", shorthand: "1", target: 1.0 },
      { name: "Default", shorthand: "2", target: 4.5 },
      { name: "Strong", shorthand: "3", target: 7.0 },
    ],

    colors: [
      { _id: "t01-c1", name: "Blue", shorthand: "bl", value: "3B82F6", description: "Primary blue" },
      { _id: "t01-c2", name: "Neutral", shorthand: "nt", value: "6B7280", description: "Gray neutral" },
    ],

    roles: [
      {
        name: "text",
        shorthand: "tx",
        mappingMethod: "contrast",
        variations: [
          { name: "Subtle", shorthand: "1", target: 3.0 },
          { name: "Default", shorthand: "2", target: 4.5 },
          { name: "Strong", shorthand: "3", target: 7.0 },
        ],
        description: "Body text AA→AAA",
      },
      {
        name: "fill",
        shorthand: "fi",
        mappingMethod: "contrast",
        variations: [
          { name: "Subtle", shorthand: "1", target: 1.5 },
          { name: "Default", shorthand: "2", target: 4.5 },
          { name: "Strong", shorthand: "3", target: 7.0 },
        ],
        description: "Interactive fills",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "111827" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-02 — Direct mode · resolver solvers
// ─────────────────────────────────────────────────────────────────────────────

const test02: Preset = {
  id: "test-02-direct-solvers",
  name: "TEST-02 Direct Mode Solvers",
  badge: "T02",
  tags: ["test", "direct", "solverMode"],
  swatches: ["8B5CF6", "EC4899"],
  config: {
    name: "Test 02 — Direct Solvers",
    pluginMode: "direct",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: false,
    algorithmScopeLevel: "role",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 25, 50],
    includeColorScalesCollection: false,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "default", shorthand: "d", target: 4.5 },
      { name: "strong", shorthand: "s", target: 7.0 },
    ],

    colors: [
      { _id: "t02-c1", name: "Violet", shorthand: "vi", value: "8B5CF6", description: "Violet brand" },
      { _id: "t02-c2", name: "Pink", shorthand: "pk", value: "EC4899", description: "Pink accent" },
    ],

    roles: [
      {
        name: "role-natural",
        shorthand: "nat",
        solverMode: "natural",
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "solver=natural — default perceptual solver",
        mappingMethod: "contrast",
      },
      {
        name: "role-saturated",
        shorthand: "sat",
        solverMode: "saturated",
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "solver=saturated — maximises chroma while hitting contrast",
        mappingMethod: "contrast",
      },
      {
        name: "role-luminance",
        shorthand: "lum",
        solverMode: "luminance",
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "solver=luminance — adjusts lightness only, preserves hue+chroma",
        mappingMethod: "contrast",
      },
      {
        name: "role-hue-locked",
        shorthand: "hlo",
        solverMode: "hue-locked",
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "solver=hue-locked — never shifts hue angle",
        mappingMethod: "contrast",
      },
      {
        name: "role-chroma-max",
        shorthand: "crm",
        solverMode: "chroma-maximized",
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "solver=chroma-maximized — pushes chroma to gamut limit",
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F0F23" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-03 — localBg hex kind
// ─────────────────────────────────────────────────────────────────────────────

const test03: Preset = {
  id: "test-03-localbg-hex",
  name: "TEST-03 localBg Hex",
  badge: "T03",
  description: 'localBg.kind="hex" · value={Light:"#E5E7EB", Dark:"#1F2937"} · on-surface role contrast is vs explicit hex not page bg · companion role has no localBg for comparison',
  tags: ["test", "localBg", "hex"],
  swatches: ["2563EB", "E5E7EB"],
  config: {
    name: "Test 03 — localBg Hex",
    pluginMode: "direct",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "subtle", shorthand: "1", target: 1.5 },
      { name: "default", shorthand: "2", target: 4.5 },
      { name: "strong", shorthand: "3", target: 7.0 },
    ],

    colors: [{ _id: "t03-c1", name: "Blue", shorthand: "bl", value: "2563EB", description: "Blue — primary" }],

    roles: [
      {
        name: "text-page",
        shorthand: "tp",
        variations: [
          { name: "subtle", shorthand: "1", target: 3.0 },
          { name: "default", shorthand: "2", target: 4.5 },
          { name: "strong", shorthand: "3", target: 7.0 },
        ],
        description: "Contrast vs page bg · no localBg · baseline comparison",
        mappingMethod: "contrast",
      },
      {
        name: "text-on-surface",
        shorthand: "ts",
        localBg: {
          kind: "hex",
          value: { light: "#E5E7EB", dark: "#1F2937" },
        },
        variations: [
          { name: "subtle", shorthand: "1", target: 3.0 },
          { name: "default", shorthand: "2", target: 4.5 },
          { name: "strong", shorthand: "3", target: 7.0 },
        ],
        description: "Contrast vs #E5E7EB (Light) / #1F2937 (Dark) — card surface hex localBg",
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-04 — localBg color kind
// ─────────────────────────────────────────────────────────────────────────────

const test04: Preset = {
  id: "test-04-localbg-color",
  name: "TEST-04 localBg Color",
  badge: "T04",
  description: 'localBg.kind="color" · value="Sand" (named color in palette) · _resolveLocalBg maps to { light: sand.value, dark: sand.value } · same bg hex for all themes · role on-sand contrast vs Sand hex',
  tags: ["test", "localBg", "color-kind"],
  swatches: ["2563EB", "A8956A"],
  config: {
    name: "Test 04 — localBg Color Kind",
    pluginMode: "direct",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "default", shorthand: "d", target: 4.5 },
      { name: "strong", shorthand: "s", target: 7.0 },
    ],

    colors: [
      { _id: "t04-c1", name: "Blue", shorthand: "bl", value: "2563EB", description: "Primary blue" },
      { _id: "t04-c2", name: "Sand", shorthand: "sa", value: "A8956A", description: "Sand — warm card surface" },
    ],

    roles: [
      {
        name: "text-base",
        shorthand: "tb",
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "Text vs page bg · no localBg · baseline",
        mappingMethod: "contrast",
      },
      {
        name: "text-on-sand",
        shorthand: "tos",
        localBg: {
          kind: "color",
          value: "Sand",
        },
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: 'Text on Sand surface · localBg.kind=color, value="Sand" → same hex (#A8956A) for all themes',
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-05 — localBg token-static kind (fixed, non-dynamic)
// ─────────────────────────────────────────────────────────────────────────────

const test05: Preset = {
  id: "test-05-localbg-token-fixed",
  name: "TEST-05 localBg Token (Fixed)",
  badge: "T05",
  description: 'localBg.kind="token-static" · value="Blue-fill-1" → localBgTokenRef set · two-pass engine: resolveTokenRefBgs() resolves token per theme · on/fill contrast vs fill/default hex',
  tags: ["test", "localBg", "token", "two-pass"],
  swatches: ["1D4ED8", "93C5FD"],
  config: {
    name: "Test 05 — localBg Token Fixed",
    pluginMode: "direct",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "subtle", shorthand: "1", target: 1.5 },
      { name: "default", shorthand: "2", target: 4.5 },
      { name: "strong", shorthand: "3", target: 7.0 },
    ],

    colors: [{ _id: "t05-c1", name: "Blue", shorthand: "bl", value: "1D4ED8", description: "Deep blue" }],

    roles: [
      {
        name: "fill",
        shorthand: "fi",
        variations: [
          { name: "subtle", shorthand: "1", target: 1.5 },
          { name: "default", shorthand: "2", target: 4.5 },
          { name: "strong", shorthand: "3", target: 7.0 },
        ],
        description: "Fill role — produces Blue/fill/default which on/fill references",
        mappingMethod: "contrast",
      },
      {
        name: "on/fill",
        shorthand: "onfi",
        solverMode: "luminance",
        localBg: {
          kind: "token-static",
          value: "Blue-fill-1",
        },
        variations: [
          { name: "subtle", shorthand: "1", target: 3.0 },
          { name: "default", shorthand: "2", target: 4.5 },
          { name: "strong", shorthand: "3", target: 7.0 },
        ],
        description: 'on/fill · localBg.kind=token-static · ref "Blue-fill-1" = fill/default · two-pass resolves per theme',
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-06 — localBg token-dynamic kind (dynamic, [color] placeholder)
// ─────────────────────────────────────────────────────────────────────────────

const test06: Preset = {
  id: "test-06-localbg-token-dynamic",
  name: "TEST-06 localBg Token (Dynamic)",
  badge: "T06",
  description: 'localBg.kind="token-dynamic" · value="[color]-fill-1" → localBgDynamicRef set · resolveTokenRefBgs replaces [color] per color → localBgPerColor · Blue on/fill vs Blue fill/default, Red on/fill vs Red fill/default',
  tags: ["test", "localBg", "dynamic", "two-pass"],
  swatches: ["1D4ED8", "DC2626"],
  config: {
    name: "Test 06 — localBg Token Dynamic",
    pluginMode: "direct",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "subtle", shorthand: "1", target: 1.5 },
      { name: "default", shorthand: "2", target: 4.5 },
      { name: "strong", shorthand: "3", target: 7.0 },
    ],

    colors: [
      { _id: "t06-c1", name: "Blue", shorthand: "bl", value: "1D4ED8", description: "Primary blue" },
      { _id: "t06-c2", name: "Red", shorthand: "rd", value: "DC2626", description: "Danger red" },
    ],

    roles: [
      {
        name: "fill",
        shorthand: "fi",
        variations: [
          { name: "subtle", shorthand: "1", target: 1.5 },
          { name: "default", shorthand: "2", target: 4.5 },
          { name: "strong", shorthand: "3", target: 7.0 },
        ],
        description: "Fill role — Blue/fill/default and Red/fill/default are resolved as localBg",
        mappingMethod: "contrast",
      },
      {
        name: "on/fill",
        shorthand: "onfi",
        solverMode: "luminance",
        localBg: {
          kind: "token-dynamic",
          value: "[color]-fill-1",
        },
        variations: [
          { name: "subtle", shorthand: "1", target: 3.0 },
          { name: "default", shorthand: "2", target: 4.5 },
          { name: "strong", shorthand: "3", target: 7.0 },
        ],
        description: 'on/fill · localBg.kind=token-dynamic · "[color]-fill-1" placeholder → per-color localBgPerColor',
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-07 — scopedColorIds (null / [] / [specific])
// ─────────────────────────────────────────────────────────────────────────────

const test07: Preset = {
  id: "test-07-scoped-color-ids",
  name: "TEST-07 scopedColorIds",
  badge: "T07",
  description: '3 colors · 3 roles: (A) scopedColorIds=null → all colors; (B) scopedColorIds=[] → no colors; (C) scopedColorIds=["t07-c2"] → Green only · exercises scope filtering in engine',
  tags: ["test", "scopedColorIds", "scope"],
  swatches: ["3B82F6", "16A34A", "DC2626"],
  config: {
    name: "Test 07 — scopedColorIds",
    pluginMode: "direct",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "default", shorthand: "d", target: 4.5 },
      { name: "strong", shorthand: "s", target: 7.0 },
    ],

    colors: [
      { _id: "t07-c1", name: "Blue", shorthand: "bl", value: "3B82F6", description: "Blue" },
      { _id: "t07-c2", name: "Green", shorthand: "gr", value: "16A34A", description: "Green" },
      { _id: "t07-c3", name: "Red", shorthand: "rd", value: "DC2626", description: "Red" },
    ],

    roles: [
      {
        name: "text-all",
        shorthand: "ta",
        scopedColorIds: null,
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "scopedColorIds=null → all 3 colors get tokens",
        mappingMethod: "contrast",
      },
      {
        name: "text-none",
        shorthand: "tn",
        scopedColorIds: [],
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "scopedColorIds=[] → zero token output",
        mappingMethod: "contrast",
      },
      {
        name: "text-green-only",
        shorthand: "tg",
        scopedColorIds: ["t07-c2"],
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: 'scopedColorIds=["t07-c2"] → Green only',
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "111827" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-08 — Index mapping method
// ─────────────────────────────────────────────────────────────────────────────

const test08: Preset = {
  id: "test-08-index-mapping",
  name: "TEST-08 Index Mapping",
  badge: "T08",
  description: 'mappingMethod="index" · indexTargets=[2] picks step 2 · indexTargets=[8] picks step 8 · contrast-mapped companion role for comparison · scale mode',
  tags: ["test", "index", "mappingMethod"],
  swatches: ["7C3AED", "C4B5FD"],
  config: {
    name: "Test 08 — Index Mapping",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "light", shorthand: "L", target: 1.0 },
      { name: "mid", shorthand: "M", target: 1.0 },
      { name: "dark", shorthand: "D", target: 1.0 },
    ],

    colors: [{ _id: "t08-c1", name: "Violet", shorthand: "vi", value: "7C3AED", description: "Violet" }],

    roles: [
      {
        name: "indexed",
        shorthand: "ix",
        mappingMethod: "index",
        variations: [
          { name: "light", shorthand: "L", target: 2 },
          { name: "mid", shorthand: "M", target: 5 },
          { name: "dark", shorthand: "D", target: 8 },
        ],
        description: "mappingMethod=index · picks scale steps at indices 2, 5, 8",
      },
      {
        name: "contrast",
        shorthand: "cx",
        mappingMethod: "contrast",
        variations: [
          { name: "light", shorthand: "L", target: 2.0 },
          { name: "mid", shorthand: "M", target: 4.5 },
          { name: "dark", shorthand: "D", target: 7.0 },
        ],
        description: "mappingMethod=contrast · finds closest step meeting contrast target",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-09 — customVariationList per role
// ─────────────────────────────────────────────────────────────────────────────

const test09: Preset = {
  id: "test-09-custom-variations",
  name: "TEST-09 Custom Variations",
  badge: "T09",
  description: "canEditRoleVariants=true · role A: customVariationList=true, 3 custom variations (bg/fill/text) · role B: customVariationList=false, uses global 5 variations · same color, different variation counts",
  tags: ["test", "customVariations", "perRole"],
  swatches: ["0891B2", "67E8F9"],
  config: {
    name: "Test 09 — Custom Variations",
    pluginMode: "direct",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: true,

    // Global fallback variations (5)
    variations: [
      { name: "v1", shorthand: "v1", target: 1.5 },
      { name: "v2", shorthand: "v2", target: 2.0 },
      { name: "v3", shorthand: "v3", target: 3.0 },
      { name: "v4", shorthand: "v4", target: 4.5 },
      { name: "v5", shorthand: "v5", target: 7.0 },
    ],

    colors: [{ _id: "t09-c1", name: "Cyan", shorthand: "cy", value: "0891B2", description: "Cyan" }],

    roles: [
      {
        name: "status",
        shorthand: "st",
        variations: [
          { name: "bg", shorthand: "bg", target: 1.3 },
          { name: "fill", shorthand: "fi", target: 4.5 },
          { name: "text", shorthand: "tx", target: 4.5 },
        ],
        description: "customVariationList=true · 3 variations: bg, fill, text",
        mappingMethod: "contrast",
      },
      {
        name: "text",
        shorthand: "tx",
        variations: [
          { name: "v1", shorthand: "v1", target: 1.5 },
          { name: "v2", shorthand: "v2", target: 2.0 },
          { name: "v3", shorthand: "v3", target: 3.0 },
          { name: "v4", shorthand: "v4", target: 4.5 },
          { name: "v5", shorthand: "v5", target: 7.0 },
        ],
        description: "customVariationList=false · uses 5 global variations",
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-10 — All shorthand flags + role/variation ordering
// ─────────────────────────────────────────────────────────────────────────────

const test10: Preset = {
  id: "test-10-all-shorthands",
  name: "TEST-10 All Shorthands",
  badge: "T10",
  description: 'useShorthandColors/Roles/Variations/Steps all=true · tokenNameSegments=["role","color","variation"] (role-first ordering) · scaleStepNames with shorthand map · all token names use short labels',
  tags: ["test", "shorthand", "tokenNameSegments"],
  swatches: ["F59E0B", "10B981"],
  config: {
    name: "Test 10 — All Shorthands",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 5,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["role", "color", "variation"],
    useShorthandColors: true,
    useShorthandRoles: true,
    useShorthandVariations: true,
    useShorthandSteps: true,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: false,
    scaleCollectionName: "_scale",
    tokenCollectionName: "tokens",

    canEditRoleVariants: false,

    variations: [
      { name: "subtle", shorthand: "s", target: 1.1 },
      { name: "default", shorthand: "d", target: 1.3 },
      { name: "strong", shorthand: "x", target: 1.6 },
    ],

    colors: [
      { _id: "t10-c1", name: "Amber", shorthand: "am", value: "F59E0B", description: "Amber" },
      { _id: "t10-c2", name: "Emerald", shorthand: "em", value: "10B981", description: "Emerald" },
    ],

    roles: [
      {
        name: "background",
        shorthand: "bg",
        variations: [
          { name: "subtle", shorthand: "s", target: 1.1 },
          { name: "default", shorthand: "d", target: 1.3 },
          { name: "strong", shorthand: "x", target: 1.6 },
        ],
        description: "Shorthand: bg",
        mappingMethod: "contrast",
      },
      {
        name: "text",
        shorthand: "tx",
        variations: [
          { name: "subtle", shorthand: "s", target: 3.0 },
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "x", target: 7.0 },
        ],
        description: "Shorthand: tx",
        mappingMethod: "contrast",
      },
    ],

    themes: [{ name: "Light", bg: "FFFFFF" }],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-11 — Named scale steps with shorthands
// ─────────────────────────────────────────────────────────────────────────────

const test11: Preset = {
  id: "test-11-named-steps",
  name: "TEST-11 Named Scale Steps",
  badge: "T11",
  description: "scaleSteps: 7 named steps (50→900 T-shirt) with shorthands (xs→3xl) · useShorthandSteps=true · scaleLength=7 · tests _parseStepNames + _parseStepShorthands in translateConfig",
  tags: ["test", "scaleStepNames", "shorthands"],
  swatches: ["DB2777", "FBBF24"],
  config: {
    name: "Test 11 — Named Steps",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 7,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: true,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",

    canEditRoleVariants: false,

    variations: [
      { name: "default", shorthand: "d", target: 4.5 },
      { name: "strong", shorthand: "s", target: 7.0 },
    ],

    colors: [
      { _id: "t11-c1", name: "Pink", shorthand: "pk", value: "DB2777", description: "Pink" },
      { _id: "t11-c2", name: "Amber", shorthand: "am", value: "FBBF24", description: "Amber" },
    ],

    roles: [
      {
        name: "text",
        shorthand: "tx",
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "Text using named + shorthand step labels",
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-12 — Per-color scale algorithms
// ─────────────────────────────────────────────────────────────────────────────

const test12: Preset = {
  id: "test-12-scale-algorithms",
  name: "TEST-12 Scale Algorithms",
  badge: "T12",
  description: 'algorithmScopeLevel="color" · 7 colors × 7 algorithms: Natural / Uniform / Expressive / Symmetric / OKLCH / Material / Linear · each color independently uses a different scale generation algorithm',
  tags: ["test", "scaleAlgorithm", "algorithms"],
  swatches: ["3B82F6", "8B5CF6", "EC4899", "F59E0B", "10B981", "14B8A6", "6366F1"],
  config: {
    name: "Test 12 — Scale Algorithms",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: false,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: false,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [{ name: "default", shorthand: "d", target: 4.5 }],

    colors: [
      { _id: "t12-c1", name: "Natural", shorthand: "na", value: "3B82F6", scaleAlgorithm: "Natural", description: "Natural algorithm" },
      { _id: "t12-c2", name: "Uniform", shorthand: "un", value: "8B5CF6", scaleAlgorithm: "Uniform", description: "Uniform algorithm" },
      { _id: "t12-c3", name: "Expressive", shorthand: "ex", value: "EC4899", scaleAlgorithm: "Expressive", description: "Expressive algorithm" },
      { _id: "t12-c4", name: "Symmetric", shorthand: "sy", value: "F59E0B", scaleAlgorithm: "Symmetric", description: "Symmetric algorithm" },
      { _id: "t12-c5", name: "OKLCH", shorthand: "ok", value: "10B981", scaleAlgorithm: "OKLCH", description: "OKLCH algorithm" },
      { _id: "t12-c6", name: "Material", shorthand: "ma", value: "14B8A6", scaleAlgorithm: "Material", description: "Material algorithm" },
      { _id: "t12-c7", name: "Linear", shorthand: "li", value: "6366F1", scaleAlgorithm: "Linear", description: "Linear algorithm" },
    ],

    roles: [
      {
        name: "text",
        shorthand: "tx",
        variations: [{ name: "default", shorthand: "d", target: 4.5 }],
        description: "Single variation to show algorithm difference clearly",
        mappingMethod: "contrast",
      },
    ],

    themes: [{ name: "Light", bg: "FFFFFF" }],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-13 — 3 themes + tokenGrouping='role' + theme deduplication
// ─────────────────────────────────────────────────────────────────────────────

const test13: Preset = {
  id: "test-13-themes-grouping",
  name: "TEST-13 Themes & Grouping",
  badge: "T13",
  description: '3 themes (Light, Dark, Brand) + 1 duplicate "Light" → deduped to "Light 2" · tokenGrouping="role" → role-keyed output · custom collection names · exercises _deduplicateThemeNames',
  tags: ["test", "themes", "tokenGrouping", "deduplication"],
  swatches: ["0055CC", "003080", "001840"],
  config: {
    name: "Test 13 — Themes Grouping",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [10, 50],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "brand/scale",
    tokenCollectionName: "brand/tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "subtle", shorthand: "1", target: 3.0 },
      { name: "default", shorthand: "2", target: 4.5 },
      { name: "strong", shorthand: "3", target: 7.0 },
    ],

    colors: [{ _id: "t13-c1", name: "Brand", shorthand: "br", value: "0055CC", description: "Brand blue" }],

    roles: [
      {
        name: "text",
        shorthand: "tx",
        variations: [
          { name: "subtle", shorthand: "1", target: 3.0 },
          { name: "default", shorthand: "2", target: 4.5 },
          { name: "strong", shorthand: "3", target: 7.0 },
        ],
        description: "Text across 3 themes + 1 deduped",
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
      { name: "Brand", bg: "001840" },
      { name: "Light", bg: "F8FAFC" }, // duplicate → 'Light 2'
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-14 — Source colors + alpha tints
// ─────────────────────────────────────────────────────────────────────────────

const test14: Preset = {
  id: "test-14-source-alpha",
  name: "TEST-14 Source Colors + Alpha",
  badge: "T14",
  description: 'includeSourceColors=true · sourceCollectionName="palette/raw" · includeAlphaTints=true · alphaValues="5,10,20,30,50,75,90" (7 values) · 3 brand colors → 7 alpha opacity variants each in source collection',
  tags: ["test", "sourceColors", "alphaTints"],
  swatches: ["0066FF", "7C3AED", "DC2626"],
  config: {
    name: "Test 14 — Source + Alpha",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: true,
    sourceCollectionName: "palette/raw",
    alphaValues: [5, 10, 20, 30, 50, 75, 90],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [
      { name: "default", shorthand: "d", target: 4.5 },
      { name: "strong", shorthand: "s", target: 7.0 },
    ],

    colors: [
      { _id: "t14-c1", name: "Primary", shorthand: "pr", value: "0066FF", description: "Primary blue — brand constant" },
      { _id: "t14-c2", name: "Secondary", shorthand: "se", value: "7C3AED", description: "Secondary violet — brand constant" },
      { _id: "t14-c3", name: "Danger", shorthand: "da", value: "DC2626", description: "Danger red — brand constant" },
    ],

    roles: [
      {
        name: "text",
        shorthand: "tx",
        variations: [
          { name: "default", shorthand: "d", target: 4.5 },
          { name: "strong", shorthand: "s", target: 7.0 },
        ],
        description: "Semantic text tokens alongside source constants",
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST-15 — Minimal (all optional features off)
// ─────────────────────────────────────────────────────────────────────────────

const test15: Preset = {
  id: "test-15-minimal",
  name: "TEST-15 Minimal",
  badge: "T15",
  description: "1 color · 1 role · 1 variation · 1 theme · all optional features off · default names · no shorthands · no alpha · no source colors · no step names · minimum viable config",
  tags: ["test", "minimal", "defaults"],
  swatches: ["3B82F6"],
  config: {
    name: "Test 15 — Minimal",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 11,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: false,
    alphaValues: [],
    includeColorScalesCollection: true,
    includeDescriptions: false,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    canEditRoleVariants: false,

    variations: [{ name: "default", shorthand: "d", target: 4.5 }],

    colors: [{ _id: "t15-c1", name: "Blue", shorthand: "bl", value: "3B82F6", description: "" }],

    roles: [
      {
        name: "text",
        shorthand: "tx",
        variations: [{ name: "default", shorthand: "d", target: 4.5 }],
        description: "",
        mappingMethod: "contrast",
      },
    ],

    themes: [{ name: "Light", bg: "FFFFFF" }],
  },
};

const presets: Preset[] = [test01, test02, test03, test04, test05, test06, test07, test08, test09, test10, test11, test12, test13, test14, test15];

export default presets;
