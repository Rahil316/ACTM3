// Minimal ProjectStore-shaped fixtures for the export-test harness.
//
// Kept deliberately small (2 colors x 2 roles x 2 variations x 2 themes) —
// enough depth to exercise every code path (multi-theme dark-mode CSS
// fallback, Android qualifiers, per-theme Swift files, role/variation
// nesting) without generating hundreds of tokens per format.
//
// This file has no dependency on export-test's other scripts — it only
// builds plain data objects matching src/ui/types/state.ts's ProjectStore
// shape (structurally, not import-checked against it, to keep this harness
// fully standalone from the UI type surface).

export interface Fixture {
  id: string;
  description: string;
  projectStore: Record<string, unknown>;
}

function baseColors() {
  return [
    { _id: "c-primary", name: "Primary", shorthand: "pr", value: "#0066FF", description: "Brand primary" },
    { _id: "c-gray", name: "Gray", shorthand: "gr", value: "#6B7280", description: "" },
  ];
}

function baseRoles() {
  return [
    {
      _id: "r-text",
      name: "Text",
      shorthand: "tx",
      variations: [
        { _id: "v-subtle", name: "Subtle", shorthand: "sub", target: 3 },
        { _id: "v-default", name: "Default", shorthand: "def", target: 4.5 },
      ],
    },
    {
      _id: "r-bg",
      name: "Background",
      shorthand: "bg",
      variations: [
        { _id: "v-subtle", name: "Subtle", shorthand: "sub", target: 1.2 },
        { _id: "v-default", name: "Default", shorthand: "def", target: 1.5 },
      ],
    },
  ];
}

function baseThemes() {
  return [
    { _id: "t-light", name: "Light", bg: "#FFFFFF" },
    { _id: "t-dark", name: "Dark", bg: "#0F0F0F" },
  ];
}

function baseStore(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Export Test",
    description: "",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 12,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",
    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,
    includeSourceColors: false,
    sourceCollectionName: "_constants",
    alphaValues: [],
    includeColorScalesCollection: true,
    includeDescriptions: false,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    scaleSteps: null,
    variations: [
      { _id: "v-subtle", name: "Subtle", shorthand: "sub", target: 3 },
      { _id: "v-default", name: "Default", shorthand: "def", target: 4.5 },
    ],
    useSharedRoleVariants: false,
    colors: baseColors(),
    roles: baseRoles(),
    themes: baseThemes(),
    ...overrides,
  };
}

// One config per meaningfully distinct code path this session's changes
// touched — a curated set, not a full cartesian product (which would explode
// combinatorially without adding real coverage: e.g. useShorthandColors x
// useShorthandRoles x useShorthandVariations x useShorthandSteps independently
// is 16 configs that all exercise the exact same _colorLabel/_roleLabel/etc.
// code path one at a time).
export function buildFixtures(): Fixture[] {
  return [
    {
      id: "scale-basic",
      description: "Scale mode, defaults — the baseline every other fixture diffs against.",
      projectStore: baseStore(),
    },
    {
      id: "scale-no-scale-collection",
      description: "Scale mode with includeColorScalesCollection off — scale.css/scale.json/etc must NOT appear, but tokens still derive from the (uncollected) scale internally.",
      projectStore: baseStore({ includeColorScalesCollection: false }),
    },
    {
      id: "direct-basic",
      description: "Direct mode — no scale data should exist anywhere in any export (EngineResult.scales is undefined).",
      projectStore: baseStore({ pluginMode: "direct" }),
    },
    {
      id: "direct-with-source",
      description: "Direct mode + source colors + alpha tints, to confirm source export doesn't accidentally depend on scale mode.",
      projectStore: baseStore({ pluginMode: "direct", includeSourceColors: true, alphaValues: [10, 50] }),
    },
    {
      id: "source-and-alpha",
      description: "Scale mode with source colors + multiple alpha tints — exercises the new source/alpha export sections in every formatter.",
      projectStore: baseStore({ includeSourceColors: true, alphaValues: [10, 25, 50, 75] }),
    },
    {
      id: "source-no-alpha",
      description: "Source colors on, but zero alpha values — source base swatch only, no alpha variants.",
      projectStore: baseStore({ includeSourceColors: true, alphaValues: [] }),
    },
    {
      id: "shorthand-everything",
      description: "All useShorthand* flags on + reordered tokenNameSegments — exercises _colorLabel/_roleLabel/_varLabel/_stepLabel shorthand branches and non-default segment order together.",
      projectStore: baseStore({
        useShorthandColors: true,
        useShorthandRoles: true,
        useShorthandVariations: true,
        useShorthandSteps: true,
        tokenNameSegments: ["role", "variation", "color"],
        includeSourceColors: true,
        alphaValues: [20],
      }),
    },
    {
      id: "descriptions-on",
      description: "includeDescriptions on — scale/token/source entries should carry $description (DTCG) / description comments where the format supports it.",
      projectStore: baseStore({ includeDescriptions: true, includeSourceColors: true, alphaValues: [50] }),
    },
    {
      id: "single-theme",
      description: "Only one theme — exercises the Android \"values\" default-qualifier path and CSS's :root-only selector (no dark-mode media query, no second data-theme block).",
      projectStore: baseStore({ themes: [{ _id: "t-light", name: "Light", bg: "#FFFFFF" }] }),
    },
    {
      id: "non-standard-theme-name",
      description: "A theme named something other than Light/Dark — exercises Android's non-standard-qualifier comment path and its theme-overlay note.",
      projectStore: baseStore({
        themes: [
          { _id: "t-light", name: "Light", bg: "#FFFFFF" },
          { _id: "t-midnight", name: "Midnight", bg: "#000022" },
        ],
      }),
    },
  ];
}
