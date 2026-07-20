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
    {
      id: "with-version-history",
      description: "Has 3 saved versions — the .wand format must exclude them entirely (current state only); wand-backup must include all 3 plus the current state.",
      projectStore: baseStore({
        versions: [
          { _id: "ver-3", name: "Published — v3", description: "12 updated", createdAt: 3000, state: baseStore({ name: "Export Test (v3 snapshot)" }) },
          { _id: "ver-2", name: "Published — v2", description: "8 updated", createdAt: 2000, state: baseStore({ name: "Export Test (v2 snapshot)" }) },
          { _id: "ver-1", name: "Published — v1", description: "created", createdAt: 1000, state: baseStore({ name: "Export Test (v1 snapshot)" }) },
        ],
      }),
    },
    {
      id: "legacy-alpha-values-string",
      description: "alphaValues stored as a comma-separated string (legacy .wand shape some hand-edited/older files carry) instead of number[] — must not crash translateConfig's downstream .map() calls. Reproduces the CLI's real \"alphaValues.map is not a function\" bug.",
      projectStore: baseStore({ includeSourceColors: true, alphaValues: "10, 25,50 ,75" as unknown as number[] }),
    },
    {
      id: "legacy-alpha-values-string-export-override",
      description: "Same legacy string shape, but on exportSettings.custom.alphaValues (the Export Settings tab's override) rather than the top-level field — a second, independent code path (applyExportOverrides) that needs the same guard.",
      projectStore: baseStore({
        exportSettings: {
          matchFigma: false,
          custom: {
            tokenNameSegments: ["color", "role", "variation"],
            useShorthandColors: false,
            useShorthandRoles: false,
            useShorthandVariations: false,
            useShorthandSteps: false,
            includeSourceColors: true,
            alphaValues: "5,15,30" as unknown as number[],
            includeColorScalesCollection: true,
            includeDescriptions: false,
          },
        },
      }),
    },

    // ── segments/ — every tokenNameSegments shape: all 6 full 3-element
    // permutations (2 covered above by "scale-basic" and "shorthand-everything",
    // 4 new here), all 3 two-segment omissions (each segment dropped once),
    // one omission combined with shorthands (the exact shape Fix 2's roleLabel
    // change exists for), and 2 single-segment degenerate probes. ──
    { id: "segments/3seg-rcv", description: "Full 3-segment order: role, color, variation.", projectStore: baseStore({ tokenNameSegments: ["role", "color", "variation"] }) },
    { id: "segments/3seg-vcr", description: "Full 3-segment order: variation, color, role.", projectStore: baseStore({ tokenNameSegments: ["variation", "color", "role"] }) },
    { id: "segments/3seg-vrc", description: "Full 3-segment order: variation, role, color.", projectStore: baseStore({ tokenNameSegments: ["variation", "role", "color"] }) },
    { id: "segments/3seg-crv", description: "Full 3-segment order: color, role, variation (same as default, explicit for completeness).", projectStore: baseStore({ tokenNameSegments: ["color", "role", "variation"] }) },
    { id: "segments/2seg-drop-color", description: "2-segment: role, variation — color omitted from every token name entirely.", projectStore: baseStore({ tokenNameSegments: ["role", "variation"] }) },
    { id: "segments/2seg-drop-role", description: "2-segment: color, variation — role omitted. This is the shape Style Dictionary's attributes.role field must still resolve correctly for (see resolve.ts's roleLabel removal — theme() now computes it locally).", projectStore: baseStore({ tokenNameSegments: ["color", "variation"] }) },
    { id: "segments/2seg-drop-variation", description: "2-segment: color, role — variation omitted. This is the highest-risk omission: two variations under the same color/role now collide on the exact same name (see naming-collisions/ batch for the deliberate version of this).", projectStore: baseStore({ tokenNameSegments: ["color", "role"] }) },
    { id: "segments/2seg-drop-role-shorthand", description: "2-segment (role omitted) + all shorthand flags on together — the combination Fix 2 (roleLabel computed locally in fmtStyleDictionary.ts instead of carried on ResolvedToken) exists to keep correct.", projectStore: baseStore({ tokenNameSegments: ["color", "variation"], useShorthandColors: true, useShorthandRoles: true, useShorthandVariations: true, useShorthandSteps: true }) },
    { id: "segments/1seg-color-only", description: "Degenerate 1-segment: color only. Every role/variation combination for a given color collapses onto the same name — a robustness probe, not a realistic user config (the UI's Token Name Format control only offers 2-3 element arrays per Documentations/knowledge/project_settings_spec.md).", projectStore: baseStore({ tokenNameSegments: ["color"] }) },
    { id: "segments/1seg-role-only", description: "Degenerate 1-segment: role only. Every color/variation combination for a given role collapses onto the same name — same robustness-probe caveat as 1seg-color-only.", projectStore: baseStore({ tokenNameSegments: ["role"] }) },

    // ── shorthand/ — each useShorthand* flag exercised alone, isolating which
    // formatter's _colorLabel/_roleLabel/_varLabel/_stepLabel branch breaks if
    // any one flag's wiring regresses, rather than only ever testing all 4 at
    // once (shorthand-everything, above). ──
    { id: "shorthand/colors-only", description: "useShorthandColors on, all other shorthand flags off.", projectStore: baseStore({ useShorthandColors: true }) },
    { id: "shorthand/roles-only", description: "useShorthandRoles on, all other shorthand flags off.", projectStore: baseStore({ useShorthandRoles: true }) },
    { id: "shorthand/variations-only", description: "useShorthandVariations on, all other shorthand flags off.", projectStore: baseStore({ useShorthandVariations: true }) },
    { id: "shorthand/steps-only", description: "useShorthandSteps on, all other shorthand flags off — only observable in scale-mode formats (scale.css/scale.json/etc), since step shorthands only apply to tonal-scale step names.", projectStore: baseStore({ useShorthandSteps: true }) },
    { id: "shorthand/none-explicit", description: "All 4 shorthand flags explicitly false — same as scale-basic's implicit default, kept as an explicit same-batch anchor so shorthand/ can be diffed as a self-contained set.", projectStore: baseStore() },

    // ── themes/ — theme count and identity edge cases beyond the existing
    // single-theme/non-standard-theme-name fixtures: 3+ themes (dark-mode CSS
    // fallback and Android qualifier assignment both branch on theme identity,
    // not just count), two theme names that slug to the same Android
    // qualifier (bundler.ts's _androidQualifiers has an explicit numeric-
    // suffix collision path that's never been exercised by any fixture), and
    // Dark listed before Light (confirms isFirst/dark-fallback logic keys off
    // theme NAME, not array position). ──
    { id: "themes/three-themes", description: "Light, Dark, and a third theme (Midnight) — exercises 3-way Android qualifier assignment and confirms the CSS dark-mode @media fallback still only fires for the theme literally named \"dark\", not merely the last one.", projectStore: baseStore({ themes: [{ _id: "t-light", name: "Light", bg: "#FFFFFF" }, { _id: "t-dark", name: "Dark", bg: "#0F0F0F" }, { _id: "t-midnight", name: "Midnight", bg: "#000022" }] }) },
    { id: "themes/qualifier-collision", description: "Two non-standard theme names that both slug to the same Android resource qualifier (\"Dark Mode\" and \"dark-mode\" both slug to \"values-dark-mode\") — exercises bundler.ts's _androidQualifiers numeric-suffix collision path, which no prior fixture reached.", projectStore: baseStore({ themes: [{ _id: "t-light", name: "Light", bg: "#FFFFFF" }, { _id: "t-a", name: "Dark Mode", bg: "#111111" }, { _id: "t-b", name: "dark-mode", bg: "#222222" }] }) },
    { id: "themes/dark-listed-first", description: "Dark theme listed BEFORE Light in the themes array — confirms isFirst (CSS's :root selector) and the dark-mode @media fallback both key off theme NAME/position correctly rather than assuming Light is always index 0.", projectStore: baseStore({ themes: [{ _id: "t-dark", name: "Dark", bg: "#0F0F0F" }, { _id: "t-light", name: "Light", bg: "#FFFFFF" }] }) },

    // ── scoping/ — scopedColorIds (restricts a role to a color subset) and
    // useSharedRoleVariants, both real ProjectStore/Role fields that no
    // existing fixture ever set, plus a role with an EXPLICIT empty
    // variations array (the exact case resolve.ts's role-no-variations
    // warning exists to catch, as opposed to a role simply having fewer
    // variations than another, which is the normal/silent case). ──
    { id: "scoping/scoped-role-subset", description: "The Background role is scoped to only the Primary color via scopedColorIds — Gray should have Text tokens but no Background tokens in the resolved output, and no formatter should crash walking the resulting sparse role/color matrix.", projectStore: baseStore({ roles: [baseRoles()[0], { ...baseRoles()[1], scopedColorIds: ["c-primary"] }] }) },
    { id: "scoping/shared-role-variants-on", description: "useSharedRoleVariants true — confirms this flag (untested by any prior fixture) doesn't change resolveExport's naming/segment behavior even though it affects how the UI edits per-role variation lists.", projectStore: baseStore({ useSharedRoleVariants: true }) },
    { id: "scoping/role-empty-variations", description: "The Background role has an EXPLICIT empty variations array ([], not null/undefined) — this is the one case resolve.ts's role-no-variations warning is designed to catch; a role with merely FEWER variations than another (the normal case) must stay silent.", projectStore: baseStore({ roles: [baseRoles()[0], { ...baseRoles()[1], variations: [] }] }) },

    // ── variation-counts/ — uneven variation counts across roles, beyond the
    // base fixture's two roles both having exactly 2 variations. Exercises
    // the "if (!token) continue" skip in resolveExport for the role with
    // fewer variations, which every existing fixture takes the same number
    // of times (0) since counts were always equal. ──
    { id: "variation-counts/uneven-2-vs-1", description: "Text role has 2 variations (Subtle, Default), Background role has only 1 (Default) — Background's \"Subtle\" slot must be skipped cleanly in every format, not produce an empty/undefined entry.", projectStore: baseStore({ roles: [baseRoles()[0], { ...baseRoles()[1], variations: [{ _id: "v-default", name: "Default", shorthand: "def", target: 1.5 }] }] }) },
    { id: "variation-counts/uneven-1-vs-3", description: "Text role has only 1 variation (Default), Background role has 3 (Subtle, Default, Strong) — the opposite skew from uneven-2-vs-1, confirms the skip logic isn't accidentally keyed to \"the first role always has more.\"", projectStore: baseStore({ roles: [{ ...baseRoles()[0], variations: [{ _id: "v-default", name: "Default", shorthand: "def", target: 4.5 }] }, { ...baseRoles()[1], variations: [{ _id: "v-subtle", name: "Subtle", shorthand: "sub", target: 1.2 }, { _id: "v-default", name: "Default", shorthand: "def", target: 1.5 }, { _id: "v-strong", name: "Strong", shorthand: "str", target: 3 }] }] }) },

    // ── naming-collisions/ — deliberately provoke resolveExport's
    // duplicate-token-name warning from two different directions: two colors
    // sharing a shorthand (collision from the color side) and the
    // segment-omission collision confirmed manually in a prior session, now
    // captured as a permanent fixture instead of a one-off scratch file. ──
    { id: "naming-collisions/duplicate-color-shorthand", description: "Primary and Gray both use shorthand \"pr\" — with useShorthandColors on, every token for both colors resolves to the identical name, which resolveExport's duplicate-token-name warning must catch even though tokenNameSegments itself is left at the default 3-segment order.", projectStore: baseStore({ useShorthandColors: true, colors: [baseColors()[0], { ...baseColors()[1], shorthand: "pr" }] }) },
    { id: "naming-collisions/segment-omission-collision", description: "tokenNameSegments drops variation entirely (color, role only) — every variation under the same color/role now collides on one name; this is the exact scenario manually verified via a scratch .wand file in a prior session, now a permanent regression fixture.", projectStore: baseStore({ tokenNameSegments: ["color", "role"] }) },

    // ── mode-cross/ — fills the one pluginMode x includeColorScalesCollection
    // matrix cell no prior fixture covered: Direct mode with the scale-
    // collection flag explicitly TRUE (as opposed to Direct mode's default,
    // which never sets it either way) — confirms the flag is truly inert in
    // Direct mode rather than accidentally causing resolveScaleSteps to try
    // to walk EngineResult.scales, which is undefined in Direct mode. ──
    { id: "mode-cross/direct-with-scale-flag-true", description: "Direct mode with includeColorScalesCollection explicitly true — must produce byte-identical output to direct-basic (which leaves it at the baseStore default of true already, but this fixture makes the intent explicit and self-documenting rather than relying on the default).", projectStore: baseStore({ pluginMode: "direct", includeColorScalesCollection: true }) },
  ];
}
