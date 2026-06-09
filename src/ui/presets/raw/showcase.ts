/**
 * Token Wand Showcase Presets
 *
 * Two presets that exercise every plugin feature:
 *   - TW Scale Full  — scale mode, all scale features
 *   - TW Direct Full — direct mode, localBg, per-role solvers, 3 themes
 *
 * Color groups:
 *   Brand/Primary · Brand/Secondary · Brand/Neutral
 *   Status/Success · Status/Warning · Status/Danger · Status/Info
 *   Spare/Rose · Spare/Coral · Spare/Gold · Spare/Mint · Spare/Teal
 *   Spare/Indigo · Spare/Fuchsia · Spare/Sand
 */

import type { Preset } from "../themeShop";

// ── Stable color IDs ──────────────────────────────────────────────────────────
// Used for scopedColorIds on status roles so they only apply to their own color.

const SCALE_IDS = {
  brandPrimary: "sc-bp",
  brandSecondary: "sc-bs",
  brandNeutral: "sc-bn",
  statusSuccess: "sc-ss",
  statusWarning: "sc-sw",
  statusDanger: "sc-sd",
  statusInfo: "sc-si",
  spareRose: "sc-r",
  spareCoral: "sc-co",
  spareGold: "sc-go",
  spareMint: "sc-mi",
  spareTeal: "sc-te",
  spareIndigo: "sc-in",
  spareFuchsia: "sc-fu",
  spareSand: "sc-sa",
};

const DIRECT_IDS = {
  brandPrimary: "dc-bp",
  brandSecondary: "dc-bs",
  brandNeutral: "dc-bn",
  statusSuccess: "dc-ss",
  statusWarning: "dc-sw",
  statusDanger: "dc-sd",
  statusInfo: "dc-si",
  spareRose: "dc-r",
  spareCoral: "dc-co",
  spareGold: "dc-go",
  spareMint: "dc-mi",
  spareTeal: "dc-te",
  spareIndigo: "dc-in",
  spareFuchsia: "dc-fu",
  spareSand: "dc-sa",
};

// ── Shared color definitions (same palette, different IDs per preset) ─────────

function makeColors(ids: typeof SCALE_IDS) {
  return [
    // Brand
    { _id: ids.brandPrimary, name: "Brand/Primary", shorthand: "bp", value: "0066FF", description: "Primary brand — vivid blue" },
    { _id: ids.brandSecondary, name: "Brand/Secondary", shorthand: "bs", value: "7C3AED", description: "Secondary brand — violet" },
    { _id: ids.brandNeutral, name: "Brand/Neutral", shorthand: "bn", value: "64748B", description: "Neutral slate — surfaces, borders, text" },
    // Status
    { _id: ids.statusSuccess, name: "Status/Success", shorthand: "ss", value: "16A34A", description: "Positive / confirm" },
    { _id: ids.statusWarning, name: "Status/Warning", shorthand: "sw", value: "D97706", description: "Caution / attention" },
    { _id: ids.statusDanger, name: "Status/Danger", shorthand: "sd", value: "DC2626", description: "Error / destructive" },
    { _id: ids.statusInfo, name: "Status/Info", shorthand: "si", value: "0284C7", description: "Informational" },
    // Spare — extra palette colors for exploration
    { _id: ids.spareRose, name: "Spare/Rose", shorthand: "ro", value: "F43F5E", description: "Rose — warm pink" },
    { _id: ids.spareCoral, name: "Spare/Coral", shorthand: "cr", value: "F97316", description: "Coral — warm orange" },
    { _id: ids.spareGold, name: "Spare/Gold", shorthand: "gd", value: "EAB308", description: "Gold — warm yellow" },
    { _id: ids.spareMint, name: "Spare/Mint", shorthand: "mn", value: "10B981", description: "Mint — cool green" },
    { _id: ids.spareTeal, name: "Spare/Teal", shorthand: "tl", value: "0D9488", description: "Teal — blue-green" },
    { _id: ids.spareIndigo, name: "Spare/Indigo", shorthand: "ig", value: "6366F1", description: "Indigo — blue-violet" },
    { _id: ids.spareFuchsia, name: "Spare/Fuchsia", shorthand: "fu", value: "D946EF", description: "Fuchsia — vivid pink" },
    { _id: ids.spareSand, name: "Spare/Sand", shorthand: "sa", value: "A8956A", description: "Sand — warm neutral" },
  ];
}

// ── Status role helper ────────────────────────────────────────────────────────
// Each status role is scoped to its own color so Status/Success only generates
// tokens for the green, not for every palette color.

function statusRole(name: string, shorthand: string, colorId: string, description: string) {
  return {
    name,
    shorthand,
    variations: [
      { name: "bg", shorthand: "bg", target: 1.2 }, // subtle tinted background
      { name: "tint", shorthand: "ti", target: 1.8 }, // stronger tinted fill
      { name: "fill", shorthand: "fi", target: 4.5 }, // solid AA fill for chips/badges
      { name: "text", shorthand: "tx", target: 4.5 }, // AA body text
      { name: "border", shorthand: "bo", target: 3.0 }, // AA-large border
    ],
    scopedColorIds: [colorId],
    description,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESET 1 — TW Scale Full
// ─────────────────────────────────────────────────────────────────────────────

const scaleShowcase: Preset = {
  id: "tw-scale-full",
  name: "TW Scale Full",
  badge: "TW",
  description: "Scale mode showcase. Every feature enabled: 15 nested colors, 9 roles with custom variations, status roles scoped to their color, alpha tints, scale collection, per-color algorithm.",
  tags: ["Showcase", "Scale", "Full Featured", "Light+Dark"],
  swatches: ["0066FF", "7C3AED", "64748B", "16A34A", "DC2626", "F43F5E", "D946EF", "0D9488"],
  config: {
    name: "TW Scale Full",
    pluginMode: "scale",
    scaleAlgorithm: "Natural",
    scaleLength: 25,
    useUniformAlgorithm: false,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: true,
    sourceCollectionName: "palette/source",
    alphaValues: [10, 20, 40, 60, 80],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "palette/scale",
    tokenCollectionName: "tokens",

    scaleSteps: null,
    canEditRoleVariants: true,

    // Global variations — fallback only; all roles override with custom variation arrays.
    variations: [{ name: "default", shorthand: "default", target: 1 }],

    colors: makeColors(SCALE_IDS),

    roles: [
      // ── Background ─────────────────────────────────────────────────────────
      // Very low contrast — page washes and section dividers.
      {
        name: "background",
        shorthand: "bg",
        variations: [
          { name: "subtle", shorthand: "subtle", target: 1.05 }, // barely-there page wash
          { name: "soft", shorthand: "soft", target: 1.1 }, // light section tint
          { name: "default", shorthand: "default", target: 1.2 }, // standard section bg
          { name: "raised", shorthand: "raised", target: 1.35 }, // slightly elevated
          { name: "overlay", shorthand: "overlay", target: 1.6 }, // hover/focus overlay
        ],
        description: "Page and section backgrounds · 5 depth steps",
        mappingMethod: "contrast",
      },

      // ── Surface ─────────────────────────────────────────────────────────────
      // Card and elevated surface fills.
      {
        name: "surface",
        shorthand: "sf",
        variations: [
          { name: "sunken", shorthand: "sunken", target: 1.03 }, // recessed well / input bg
          { name: "default", shorthand: "default", target: 1.07 }, // card / panel canvas
          { name: "raised", shorthand: "raised", target: 1.15 }, // elevated card
          { name: "elevated", shorthand: "elevated", target: 1.3 }, // popover / dropdown
          { name: "scrim", shorthand: "scrim", target: 14.0 }, // modal backdrop
        ],
        description: "Surface elevation stack · sunken → card → popover → modal scrim",
        mappingMethod: "contrast",
      },

      // ── Fill ────────────────────────────────────────────────────────────────
      // Solid colored fills for interactive and decorative elements.
      {
        name: "fill",
        shorthand: "fi",
        variations: [
          { name: "subtle", shorthand: "subtle", target: 1.5 }, // very light tint / badge bg
          { name: "tint", shorthand: "tint", target: 2.2 }, // light tinted fill
          { name: "default", shorthand: "default", target: 4.5 }, // AA interactive fill
          { name: "strong", shorthand: "strong", target: 7.0 }, // AAA fill / CTA
          { name: "bold", shorthand: "bold", target: 12.0 }, // maximum contrast fill
        ],
        description: "Colored fills · tint → AA → AAA · badges, chips, CTAs",
        mappingMethod: "contrast",
      },

      // ── Text ────────────────────────────────────────────────────────────────
      // All readable copy — AAA body through disabled.
      {
        name: "text",
        shorthand: "tx",
        variations: [
          { name: "disabled", shorthand: "disabled", target: 2.0 }, // disabled / placeholder
          { name: "muted", shorthand: "muted", target: 3.0 }, // hint / caption
          { name: "subtle", shorthand: "subtle", target: 4.5 }, // secondary body text
          { name: "default", shorthand: "default", target: 7.0 }, // AA primary body
          { name: "strong", shorthand: "strong", target: 11.5 }, // AAA headings
        ],
        description: "Text hierarchy · disabled → hint → secondary → AA → AAA",
        mappingMethod: "contrast",
      },

      // ── Stroke ──────────────────────────────────────────────────────────────
      // Borders, dividers, focus rings.
      {
        name: "stroke",
        shorthand: "st",
        variations: [
          { name: "ghost", shorthand: "ghost", target: 1.4 }, // decorative hairline
          { name: "subtle", shorthand: "subtle", target: 1.8 }, // light divider
          { name: "default", shorthand: "default", target: 2.5 }, // standard UI border
          { name: "strong", shorthand: "strong", target: 3.5 }, // emphasis outline
          { name: "focus", shorthand: "focus", target: 4.5 }, // keyboard focus ring
        ],
        description: "Borders and dividers · hairline → focus ring",
        mappingMethod: "contrast",
      },

      // ── Status roles — scoped to their own color ────────────────────────────
      statusRole("status/success", "ss", SCALE_IDS.statusSuccess, "Success channel · bg · tint · fill · text · border"),
      statusRole("status/warning", "sw", SCALE_IDS.statusWarning, "Warning channel · bg · tint · fill · text · border"),
      statusRole("status/danger", "sd", SCALE_IDS.statusDanger, "Danger / error channel · bg · tint · fill · text · border"),
      statusRole("status/info", "si", SCALE_IDS.statusInfo, "Info channel · bg · tint · fill · text · border"),
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0F172A" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESET 2 — TW Direct Full
// ─────────────────────────────────────────────────────────────────────────────

const directShowcase: Preset = {
  id: "tw-direct-full",
  name: "TW Direct Full",
  badge: "TW",
  description: "Direct mode showcase. Every feature: 15 nested colors, localBg on on/fill (dynamic token ref per color), per-role solver overrides, alpha tints, 3 themes, scoped status roles.",
  tags: ["Showcase", "Direct", "Full Featured", "Multi-theme", "localBg"],
  swatches: ["0055E5", "7C3AED", "64748B", "16A34A", "DC2626", "F43F5E", "D946EF", "0D9488"],
  config: {
    name: "TW Direct Full",
    pluginMode: "direct",
    scaleAlgorithm: "Natural",
    scaleLength: 25,
    useUniformAlgorithm: false,
    algorithmScopeLevel: "role",
    solverMode: "natural",

    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    includeSourceColors: true,
    sourceCollectionName: "palette/source",
    alphaValues: [10, 20, 40, 60, 80],
    includeColorScalesCollection: false,
    includeDescriptions: true,
    scaleCollectionName: "palette/scale",
    tokenCollectionName: "tokens",

    scaleSteps: null,
    canEditRoleVariants: true,

    variations: [{ name: "default", shorthand: "default", target: 1 }],

    colors: makeColors(DIRECT_IDS),

    roles: [
      // ── Surface ─────────────────────────────────────────────────────────────
      {
        name: "surface",
        shorthand: "sf",
        solverMode: "natural",
        variations: [
          { name: "page", shorthand: "page", target: 1.03 }, // page canvas
          { name: "card", shorthand: "card", target: 1.08 }, // card / panel
          { name: "raised", shorthand: "raised", target: 1.18 }, // elevated card
          { name: "overlay", shorthand: "overlay", target: 1.35 }, // popover / dropdown
          { name: "scrim", shorthand: "scrim", target: 14.0 }, // modal backdrop
        ],
        description: "Surface elevation · page → card → popover → modal scrim",
        mappingMethod: "contrast",
      },

      // ── Fill ────────────────────────────────────────────────────────────────
      {
        name: "fill",
        shorthand: "fi",
        solverMode: "natural",
        variations: [
          { name: "subtle", shorthand: "subtle", target: 1.5 }, // tinted wash
          { name: "soft", shorthand: "soft", target: 2.5 }, // light interactive fill
          { name: "default", shorthand: "default", target: 4.5 }, // AA fill (main CTA)
          { name: "strong", shorthand: "strong", target: 7.0 }, // AAA fill
          { name: "inverse", shorthand: "inverse", target: 14.0 }, // near-maximum fill
        ],
        description: "Solid fills · subtle tint → AA → AAA → inverse",
        mappingMethod: "contrast",
      },

      // ── On/Fill — localBg: dynamic token ref ────────────────────────────────
      // Text/icon placed ON top of a fill. Uses [color]/fill/default as local bg
      // so contrast is calculated against each color's own fill, not the page bg.
      {
        name: "on/fill",
        shorthand: "onfi",
        solverMode: "luminance",
        variations: [
          { name: "disabled", shorthand: "disabled", target: 2.0 }, // disabled label on fill
          { name: "muted", shorthand: "muted", target: 3.0 }, // secondary label on fill
          { name: "subtle", shorthand: "subtle", target: 4.5 }, // tertiary label on fill
          { name: "default", shorthand: "default", target: 7.0 }, // AA label on fill
          { name: "strong", shorthand: "strong", target: 11.5 }, // AAA label on fill
        ],
        localBg: {
          kind: "token-dynamic",
          value: "[color]/fill/default",
        },
        description: "Text / icon on fill · contrast vs fill/default per color · luminance solver",
        mappingMethod: "contrast",
      },

      // ── Text ────────────────────────────────────────────────────────────────
      {
        name: "text",
        shorthand: "tx",
        solverMode: "natural",
        variations: [
          { name: "disabled", shorthand: "disabled", target: 2.0 },
          { name: "muted", shorthand: "muted", target: 3.0 },
          { name: "subtle", shorthand: "subtle", target: 4.5 },
          { name: "default", shorthand: "default", target: 7.0 },
          { name: "strong", shorthand: "strong", target: 11.5 },
        ],
        description: "Text hierarchy · disabled → hint → secondary → AA → AAA",
        mappingMethod: "contrast",
      },

      // ── Border ──────────────────────────────────────────────────────────────
      {
        name: "border",
        shorthand: "bo",
        solverMode: "natural",
        variations: [
          { name: "ghost", shorthand: "ghost", target: 1.4 },
          { name: "subtle", shorthand: "subtle", target: 1.8 },
          { name: "default", shorthand: "default", target: 2.5 },
          { name: "strong", shorthand: "strong", target: 3.5 },
          { name: "focus", shorthand: "focus", target: 4.5 },
        ],
        description: "Borders and dividers · hairline → focus ring",
        mappingMethod: "contrast",
      },

      // ── Status roles — scoped + chroma-maximized solver ─────────────────────
      {
        name: "status/success",
        shorthand: "ss",
        solverMode: "chroma-maximized",
        variations: [
          { name: "bg", shorthand: "bg", target: 1.2 },
          { name: "tint", shorthand: "ti", target: 1.8 },
          { name: "fill", shorthand: "fi", target: 4.5 },
          { name: "text", shorthand: "tx", target: 4.5 },
          { name: "border", shorthand: "bo", target: 3.0 },
        ],
        scopedColorIds: [DIRECT_IDS.statusSuccess],
        description: "Success channel · chroma-maximized · scoped to Status/Success",
        mappingMethod: "contrast",
      },
      {
        name: "status/warning",
        shorthand: "sw",
        solverMode: "chroma-maximized",
        variations: [
          { name: "bg", shorthand: "bg", target: 1.2 },
          { name: "tint", shorthand: "ti", target: 1.8 },
          { name: "fill", shorthand: "fi", target: 4.5 },
          { name: "text", shorthand: "tx", target: 4.5 },
          { name: "border", shorthand: "bo", target: 3.0 },
        ],
        scopedColorIds: [DIRECT_IDS.statusWarning],
        description: "Warning channel · chroma-maximized · scoped to Status/Warning",
        mappingMethod: "contrast",
      },
      {
        name: "status/danger",
        shorthand: "sd",
        solverMode: "chroma-maximized",
        variations: [
          { name: "bg", shorthand: "bg", target: 1.2 },
          { name: "tint", shorthand: "ti", target: 1.8 },
          { name: "fill", shorthand: "fi", target: 4.5 },
          { name: "text", shorthand: "tx", target: 4.5 },
          { name: "border", shorthand: "bo", target: 3.0 },
        ],
        scopedColorIds: [DIRECT_IDS.statusDanger],
        description: "Danger / error channel · chroma-maximized · scoped to Status/Danger",
        mappingMethod: "contrast",
      },
      {
        name: "status/info",
        shorthand: "si",
        solverMode: "chroma-maximized",
        variations: [
          { name: "bg", shorthand: "bg", target: 1.2 },
          { name: "tint", shorthand: "ti", target: 1.8 },
          { name: "fill", shorthand: "fi", target: 4.5 },
          { name: "text", shorthand: "tx", target: 4.5 },
          { name: "border", shorthand: "bo", target: 3.0 },
        ],
        scopedColorIds: [DIRECT_IDS.statusInfo],
        description: "Info channel · chroma-maximized · scoped to Status/Info",
        mappingMethod: "contrast",
      },
    ],

    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "111827" },
      { name: "Brand", bg: "0A1628" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const presets: Preset[] = [scaleShowcase, directShowcase];
export default presets;
