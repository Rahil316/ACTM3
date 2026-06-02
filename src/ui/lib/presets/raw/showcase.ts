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

import type { Preset } from "../types";

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
    minContrast: 1.0,
    customVariationList: true as const,
    customVariations: [
      { name: "bg", shorthand: "bg" }, // subtle tinted background
      { name: "tint", shorthand: "ti" }, // stronger tinted fill
      { name: "fill", shorthand: "fi" }, // solid AA fill for chips/badges
      { name: "text", shorthand: "tx" }, // AA body text
      { name: "border", shorthand: "bo" }, // AA-large border
    ],
    variationTargets: [1.2, 1.8, 4.5, 4.5, 3.0],
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
    alphaValues: "10, 20, 40, 60, 80",
    tokenGrouping: "color",
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "palette/scale",
    tokenCollectionName: "tokens",

    scaleStepNames: null,
    canEditRoleVariantNames: true,

    // Global variations — fallback only; all roles override with customVariationList.
    variations: [{ name: "default", shorthand: "default" }],

    colors: makeColors(SCALE_IDS),

    roles: [
      // ── Background ─────────────────────────────────────────────────────────
      // Very low contrast — page washes and section dividers.
      {
        name: "background",
        shorthand: "bg",
        minContrast: 1.0,
        customVariationList: true,
        customVariations: [
          { name: "subtle", shorthand: "subtle" }, // barely-there page wash
          { name: "soft", shorthand: "soft" }, // light section tint
          { name: "default", shorthand: "default" }, // standard section bg
          { name: "raised", shorthand: "raised" }, // slightly elevated
          { name: "overlay", shorthand: "overlay" }, // hover/focus overlay
        ],
        variationTargets: [1.05, 1.1, 1.2, 1.35, 1.6],
        description: "Page and section backgrounds · 5 depth steps",
      },

      // ── Surface ─────────────────────────────────────────────────────────────
      // Card and elevated surface fills.
      {
        name: "surface",
        shorthand: "sf",
        minContrast: 1.0,
        customVariationList: true,
        customVariations: [
          { name: "sunken", shorthand: "sunken" }, // recessed well / input bg
          { name: "default", shorthand: "default" }, // card / panel canvas
          { name: "raised", shorthand: "raised" }, // elevated card
          { name: "elevated", shorthand: "elevated" }, // popover / dropdown
          { name: "scrim", shorthand: "scrim" }, // modal backdrop
        ],
        variationTargets: [1.03, 1.07, 1.15, 1.3, 14.0],
        description: "Surface elevation stack · sunken → card → popover → modal scrim",
      },

      // ── Fill ────────────────────────────────────────────────────────────────
      // Solid colored fills for interactive and decorative elements.
      {
        name: "fill",
        shorthand: "fi",
        minContrast: 1.3,
        customVariationList: true,
        customVariations: [
          { name: "subtle", shorthand: "subtle" }, // very light tint / badge bg
          { name: "tint", shorthand: "tint" }, // light tinted fill
          { name: "default", shorthand: "default" }, // AA interactive fill
          { name: "strong", shorthand: "strong" }, // AAA fill / CTA
          { name: "bold", shorthand: "bold" }, // maximum contrast fill
        ],
        variationTargets: [1.5, 2.2, 4.5, 7.0, 12.0],
        description: "Colored fills · tint → AA → AAA · badges, chips, CTAs",
      },

      // ── Text ────────────────────────────────────────────────────────────────
      // All readable copy — AAA body through disabled.
      {
        name: "text",
        shorthand: "tx",
        minContrast: 2.0,
        customVariationList: true,
        customVariations: [
          { name: "disabled", shorthand: "disabled" }, // disabled / placeholder
          { name: "muted", shorthand: "muted" }, // hint / caption
          { name: "subtle", shorthand: "subtle" }, // secondary body text
          { name: "default", shorthand: "default" }, // AA primary body
          { name: "strong", shorthand: "strong" }, // AAA headings
        ],
        variationTargets: [2.0, 3.0, 4.5, 7.0, 11.5],
        description: "Text hierarchy · disabled → hint → secondary → AA → AAA",
      },

      // ── Stroke ──────────────────────────────────────────────────────────────
      // Borders, dividers, focus rings.
      {
        name: "stroke",
        shorthand: "st",
        minContrast: 1.3,
        customVariationList: true,
        customVariations: [
          { name: "ghost", shorthand: "ghost" }, // decorative hairline
          { name: "subtle", shorthand: "subtle" }, // light divider
          { name: "default", shorthand: "default" }, // standard UI border
          { name: "strong", shorthand: "strong" }, // emphasis outline
          { name: "focus", shorthand: "focus" }, // keyboard focus ring
        ],
        variationTargets: [1.4, 1.8, 2.5, 3.5, 4.5],
        description: "Borders and dividers · hairline → focus ring",
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
    alphaValues: "10, 20, 40, 60, 80",
    tokenGrouping: "color",
    includeColorScalesCollection: false,
    includeDescriptions: true,
    scaleCollectionName: "palette/scale",
    tokenCollectionName: "tokens",

    scaleStepNames: null,
    canEditRoleVariantNames: true,

    variations: [{ name: "default", shorthand: "default" }],

    colors: makeColors(DIRECT_IDS),

    roles: [
      // ── Surface ─────────────────────────────────────────────────────────────
      {
        name: "surface",
        shorthand: "sf",
        minContrast: 1.0,
        solverMode: "natural",
        customVariationList: true,
        customVariations: [
          { name: "page", shorthand: "page" }, // page canvas
          { name: "card", shorthand: "card" }, // card / panel
          { name: "raised", shorthand: "raised" }, // elevated card
          { name: "overlay", shorthand: "overlay" }, // popover / dropdown
          { name: "scrim", shorthand: "scrim" }, // modal backdrop
        ],
        variationTargets: [1.03, 1.08, 1.18, 1.35, 14.0],
        description: "Surface elevation · page → card → popover → modal scrim",
      },

      // ── Fill ────────────────────────────────────────────────────────────────
      {
        name: "fill",
        shorthand: "fi",
        minContrast: 1.3,
        solverMode: "natural",
        customVariationList: true,
        customVariations: [
          { name: "subtle", shorthand: "subtle" }, // tinted wash
          { name: "soft", shorthand: "soft" }, // light interactive fill
          { name: "default", shorthand: "default" }, // AA fill (main CTA)
          { name: "strong", shorthand: "strong" }, // AAA fill
          { name: "inverse", shorthand: "inverse" }, // near-maximum fill
        ],
        variationTargets: [1.5, 2.5, 4.5, 7.0, 14.0],
        description: "Solid fills · subtle tint → AA → AAA → inverse",
      },

      // ── On/Fill — localBg: dynamic token ref ────────────────────────────────
      // Text/icon placed ON top of a fill. Uses [color]/fill/default as local bg
      // so contrast is calculated against each color's own fill, not the page bg.
      {
        name: "on/fill",
        shorthand: "onfi",
        minContrast: 2.0,
        solverMode: "luminance",
        customVariationList: true,
        customVariations: [
          { name: "disabled", shorthand: "disabled" }, // disabled label on fill
          { name: "muted", shorthand: "muted" }, // secondary label on fill
          { name: "subtle", shorthand: "subtle" }, // tertiary label on fill
          { name: "default", shorthand: "default" }, // AA label on fill
          { name: "strong", shorthand: "strong" }, // AAA label on fill
        ],
        variationTargets: [2.0, 3.0, 4.5, 7.0, 11.5],
        localBg: {
          kind: "token",
          value: "[color]/fill/default",
          dynamic: true,
        },
        description: "Text / icon on fill · contrast vs fill/default per color · luminance solver",
      },

      // ── Text ────────────────────────────────────────────────────────────────
      {
        name: "text",
        shorthand: "tx",
        minContrast: 2.0,
        solverMode: "natural",
        customVariationList: true,
        customVariations: [
          { name: "disabled", shorthand: "disabled" },
          { name: "muted", shorthand: "muted" },
          { name: "subtle", shorthand: "subtle" },
          { name: "default", shorthand: "default" },
          { name: "strong", shorthand: "strong" },
        ],
        variationTargets: [2.0, 3.0, 4.5, 7.0, 11.5],
        description: "Text hierarchy · disabled → hint → secondary → AA → AAA",
      },

      // ── Border ──────────────────────────────────────────────────────────────
      {
        name: "border",
        shorthand: "bo",
        minContrast: 1.3,
        solverMode: "natural",
        customVariationList: true,
        customVariations: [
          { name: "ghost", shorthand: "ghost" },
          { name: "subtle", shorthand: "subtle" },
          { name: "default", shorthand: "default" },
          { name: "strong", shorthand: "strong" },
          { name: "focus", shorthand: "focus" },
        ],
        variationTargets: [1.4, 1.8, 2.5, 3.5, 4.5],
        description: "Borders and dividers · hairline → focus ring",
      },

      // ── Status roles — scoped + chroma-maximized solver ─────────────────────
      {
        name: "status/success",
        shorthand: "ss",
        minContrast: 1.0,
        solverMode: "chroma-maximized",
        customVariationList: true,
        customVariations: [
          { name: "bg", shorthand: "bg" },
          { name: "tint", shorthand: "ti" },
          { name: "fill", shorthand: "fi" },
          { name: "text", shorthand: "tx" },
          { name: "border", shorthand: "bo" },
        ],
        variationTargets: [1.2, 1.8, 4.5, 4.5, 3.0],
        scopedColorIds: [DIRECT_IDS.statusSuccess],
        description: "Success channel · chroma-maximized · scoped to Status/Success",
      },
      {
        name: "status/warning",
        shorthand: "sw",
        minContrast: 1.0,
        solverMode: "chroma-maximized",
        customVariationList: true,
        customVariations: [
          { name: "bg", shorthand: "bg" },
          { name: "tint", shorthand: "ti" },
          { name: "fill", shorthand: "fi" },
          { name: "text", shorthand: "tx" },
          { name: "border", shorthand: "bo" },
        ],
        variationTargets: [1.2, 1.8, 4.5, 4.5, 3.0],
        scopedColorIds: [DIRECT_IDS.statusWarning],
        description: "Warning channel · chroma-maximized · scoped to Status/Warning",
      },
      {
        name: "status/danger",
        shorthand: "sd",
        minContrast: 1.0,
        solverMode: "chroma-maximized",
        customVariationList: true,
        customVariations: [
          { name: "bg", shorthand: "bg" },
          { name: "tint", shorthand: "ti" },
          { name: "fill", shorthand: "fi" },
          { name: "text", shorthand: "tx" },
          { name: "border", shorthand: "bo" },
        ],
        variationTargets: [1.2, 1.8, 4.5, 4.5, 3.0],
        scopedColorIds: [DIRECT_IDS.statusDanger],
        description: "Danger / error channel · chroma-maximized · scoped to Status/Danger",
      },
      {
        name: "status/info",
        shorthand: "si",
        minContrast: 1.0,
        solverMode: "chroma-maximized",
        customVariationList: true,
        customVariations: [
          { name: "bg", shorthand: "bg" },
          { name: "tint", shorthand: "ti" },
          { name: "fill", shorthand: "fi" },
          { name: "text", shorthand: "tx" },
          { name: "border", shorthand: "bo" },
        ],
        variationTargets: [1.2, 1.8, 4.5, 4.5, 3.0],
        scopedColorIds: [DIRECT_IDS.statusInfo],
        description: "Info channel · chroma-maximized · scoped to Status/Info",
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
