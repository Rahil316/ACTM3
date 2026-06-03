/**
 * nClarity — Personal mobile app preset
 *
 * Direct mode · Light + Dark · 15 colors · 11 roles
 *
 * Colors:
 *   Brand/Primary · Brand/Secondary · Brand/Tertiary
 *   Status/Success · Status/Warning · Status/Danger · Status/Info · Status/Attention
 *   Gray/Cool · Gray/Neutral
 *   Spare/1–5 (raw values + alpha only, no roles)
 *
 * Roles:
 *   background      — Base → Scrim (5 depth steps)
 *   stroke          — Hairline → Focus (5 contrast steps)
 *   fill            — Wash → Bold (5 contrast steps)
 *   fill/button     — interactive states, saturated solver, solved on theme bg
 *   text/buttonLabel— interactive states, luminance solver, solved on fill/button/default
 *   text            — Faint → Emphasis (5 contrast steps)
 *   status/*        — 5 scoped roles, chroma-maximized, Bg/Tint/Fill/Text/Border
 *
 * Alpha tints: 5, 10, 15 … 95 (19 steps) on all colors.
 * No descriptions. Variation shorthands are always numeric 1–5.
 */

import type { Preset } from "../../../../ui/screens/ThemeShopOverlay";

// ── Stable color IDs ──────────────────────────────────────────────────────────

const NC_IDS = {
  brandPrimary: "nc-bp",
  brandSecondary: "nc-bs",
  brandTertiary: "nc-bt",
  statusSuccess: "nc-ss",
  statusWarning: "nc-sw",
  statusDanger: "nc-sd",
  statusInfo: "nc-si",
  statusAttention: "nc-sa",
  grayCool: "nc-gc",
  grayNeutral: "nc-gn",
  spare1: "nc-s1",
  spare2: "nc-s2",
  spare3: "nc-s3",
  spare4: "nc-s4",
  spare5: "nc-s5",
};

// ── Status role helper ────────────────────────────────────────────────────────

function statusRole(name: string, shorthand: string, colorId: string) {
  return {
    name,
    shorthand,
    solverMode: "chroma-maximized" as const,
    variations: [
      { name: "Bg", shorthand: "1", target: 1.15 },
      { name: "Tint", shorthand: "2", target: 1.8 },
      { name: "Fill", shorthand: "3", target: 4.5 },
      { name: "Text", shorthand: "4", target: 4.5 },
      { name: "Border", shorthand: "5", target: 3.0 },
    ],
    scopedColorIds: [colorId],
  };
}

// ── Preset ────────────────────────────────────────────────────────────────────

const nclarity: Preset = {
  id: "nclarity",
  name: "nClarity",
  badge: "nC",
  description: "Personal mobile app preset — Direct mode, Light + Dark, full semantic role system with button contrast chaining, status roles, and alpha tints at 5–95.",
  tags: ["nClarity", "Mobile", "Direct", "iOS", "Personal"],
  swatches: ["0A84FF", "BF5AF2", "30D158", "FF453A", "FF9F0A", "32ADE6", "636366", "8338EC"],
  config: {
    name: "nClarity",

    // ── Mode ────────────────────────────────────────────────────────────────
    pluginMode: "direct",
    // scaleAlgorithm: 'Natural',
    // scaleLength: 25,
    useUniformAlgorithm: false,
    algorithmScopeLevel: "role",
    solverMode: "natural",

    // ── Token naming ────────────────────────────────────────────────────────
    tokenNameSegments: ["color", "role", "variation"],
    tokenGrouping: "color",
    useShorthandColors: true,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,

    // ── Output ──────────────────────────────────────────────────────────────
    includeSourceColors: true,
    sourceCollectionName: "nclarity/source",
    alphaValues: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
    includeColorScalesCollection: false,
    includeDescriptions: false,
    scaleCollectionName: "nclarity/scale",
    tokenCollectionName: "nclarity/tokens",

    scaleStepNames: null,
    canEditRoleVariantNames: true,

    // Global fallback variation — all roles override with customVariationList.
    variations: [{ name: "default", shorthand: "default" }],

    // ── Colors ──────────────────────────────────────────────────────────────
    colors: [
      // Brand
      { _id: NC_IDS.brandPrimary, name: "Brand/Primary", shorthand: "b/p", value: "0A84FF" },
      { _id: NC_IDS.brandSecondary, name: "Brand/Secondary", shorthand: "b/s", value: "BF5AF2" },
      { _id: NC_IDS.brandTertiary, name: "Brand/Tertiary", shorthand: "b/t", value: "30D158" },
      // Status
      { _id: NC_IDS.statusSuccess, name: "Status/Success", shorthand: "st/ss", value: "34C759" },
      { _id: NC_IDS.statusWarning, name: "Status/Warning", shorthand: "st/wr", value: "FF9F0A" },
      { _id: NC_IDS.statusDanger, name: "Status/Danger", shorthand: "st/dg", value: "FF453A" },
      { _id: NC_IDS.statusInfo, name: "Status/Info", shorthand: "st/if", value: "32ADE6" },
      { _id: NC_IDS.statusAttention, name: "Status/Attention", shorthand: "st/at", value: "FFD60A" },
      // Gray
      { _id: NC_IDS.grayCool, name: "Gray/Cool", shorthand: "gr/cl", value: "636366" },
      { _id: NC_IDS.grayNeutral, name: "Gray/Neutral", shorthand: "gr/nu", value: "8E8E93" },
      // Spare — raw values + alpha only, not referenced in any role
      { _id: NC_IDS.spare1, name: "Spare/1", shorthand: "sp/1", value: "F4A261" },
      { _id: NC_IDS.spare2, name: "Spare/2", shorthand: "sp/2", value: "E76F51" },
      { _id: NC_IDS.spare3, name: "Spare/3", shorthand: "sp/3", value: "2A9D8F" },
      { _id: NC_IDS.spare4, name: "Spare/4", shorthand: "sp/4", value: "E9C46A" },
      { _id: NC_IDS.spare5, name: "Spare/5", shorthand: "sp/5", value: "8338EC" },
    ],

    // ── Roles ────────────────────────────────────────────────────────────────
    roles: [
      // ── Background ─────────────────────────────────────────────────────────
      // 5 depth steps from page wash to modal scrim.
      // Scrim (5) uses a high contrast target to produce a near-opaque overlay.
      {
        name: "background",
        shorthand: "bg",
        solverMode: "natural",
        variations: [
          { name: "Base", shorthand: "1", target: 1.03 },
          { name: "Raised", shorthand: "2", target: 1.08 },
          { name: "Float", shorthand: "3", target: 1.18 },
          { name: "Overlay", shorthand: "4", target: 1.35 },
          { name: "Scrim", shorthand: "5", target: 14.0 },
        ],
      },

      // ── Stroke ─────────────────────────────────────────────────────────────
      // Hairline dividers through keyboard focus rings.
      {
        name: "stroke",
        shorthand: "sk",
        solverMode: "natural",
        variations: [
          { name: "Hairline", shorthand: "1", target: 1.4 },
          { name: "Subtle", shorthand: "2", target: 1.8 },
          { name: "Default", shorthand: "3", target: 2.5 },
          { name: "Strong", shorthand: "4", target: 3.5 },
          { name: "Focus", shorthand: "5", target: 4.5 },
        ],
      },

      // ── Fill ───────────────────────────────────────────────────────────────
      // General colored fills for chips, badges, and decorative elements.
      {
        name: "fill/fill",
        shorthand: "fl/fi",
        solverMode: "natural",
        variations: [
          { name: "Wash", shorthand: "1", target: 1.5 },
          { name: "Tint", shorthand: "2", target: 2.2 },
          { name: "Default", shorthand: "3", target: 4.5 },
          { name: "Strong", shorthand: "4", target: 7.0 },
          { name: "Bold", shorthand: "5", target: 12.0 },
        ],
      },

      // ── Fill/Button ────────────────────────────────────────────────────────
      // Button background fills. Saturated solver for vibrant CTAs.
      // Solved against theme background (button sits on page).
      // States ordered by contrast: Disabled (lowest) → Pressed (highest).
      {
        name: "fill/button",
        shorthand: "fi/btn",
        solverMode: "saturated",
        variations: [
          { name: "Disabled", shorthand: "1", target: 1.3 },
          { name: "Subtle", shorthand: "2", target: 2.0 },
          { name: "Default", shorthand: "3", target: 4.5 },
          { name: "Hovered", shorthand: "4", target: 6.0 },
          { name: "Pressed", shorthand: "5", target: 8.0 },
        ],
      },

      // ── Text/ButtonLabel ───────────────────────────────────────────────────
      // Label text sitting on top of fill/button.
      // Local bg = [color]/fill/button/default → contrast is calculated against
      // each color's own button fill, not the page background.
      {
        name: "text/buttonLabel",
        shorthand: "tx/btn",
        solverMode: "luminance",
        variations: [
          { name: "Disabled", shorthand: "1", target: 1.5 },
          { name: "Subtle", shorthand: "2", target: 3.0 },
          { name: "Default", shorthand: "3", target: 4.5 },
          { name: "Hovered", shorthand: "4", target: 6.0 },
          { name: "Pressed", shorthand: "5", target: 8.0 },
        ],
        localBg: {
          kind: "token",
          value: "[color]/fill/button/default",
          dynamic: true,
        },
      },

      // ── Text ───────────────────────────────────────────────────────────────
      // General body text hierarchy. Faint (1) = disabled/placeholder,
      // Emphasis (5) = AAA headings.
      {
        name: "text/text",
        shorthand: "tx/tx",
        solverMode: "natural",
        variations: [
          { name: "Faint", shorthand: "1", target: 2.0 },
          { name: "Muted", shorthand: "2", target: 3.0 },
          { name: "Secondary", shorthand: "3", target: 4.5 },
          { name: "Primary", shorthand: "4", target: 7.0 },
          { name: "Emphasis", shorthand: "5", target: 11.5 },
        ],
      },

      // ── Status roles ───────────────────────────────────────────────────────
      // Each role is scoped to its own color so tokens are only generated
      // for the matching status color, not the entire palette.
      statusRole("status/success", "st/su", NC_IDS.statusSuccess),
      statusRole("status/warning", "st/wr", NC_IDS.statusWarning),
      statusRole("status/danger", "st/dg", NC_IDS.statusDanger),
      statusRole("status/info", "st/if", NC_IDS.statusInfo),
      statusRole("status/attention", "st/at", NC_IDS.statusAttention),
    ],

    // ── Themes ───────────────────────────────────────────────────────────────
    themes: [
      { name: "Light", bg: "F2F2F7" }, // iOS system grouped background
      { name: "Dark", bg: "000000" }, // iOS true black
    ],
  },
};

const presets: Preset[] = [nclarity];
export default presets;
