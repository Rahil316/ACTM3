/**
 * nMobile — Mobile app preset built around a vibrant teal accent.
 *
 * Scale mode (Fidelity algorithm) · Light + Dark · 14 colors · 9 roles
 *
 * Colors:
 *   Teal (brand accent) · Secondary (indigo)
 *   Success · Error · Warning · Info · Attention
 *   Gray (flat neutral) · Neutral (cool blue-gray, complements Teal without duplicating it)
 *   Spare/1–5 (raw values only, no roles — source collection)
 *
 * Roles:
 *   bg      — App → Scrim (5 elevation steps, natural layer progression)
 *   text    — Disabled → Emphasis (5 contrast steps, also used for icon fills)
 *   fill    — Disabled → Pressed (5 contrast steps, buttons/tags/solid elements)
 *   stroke  — Hairline → Focus (5 contrast steps, outlines/borders)
 *   status/*— 5 scoped roles, Bg/Tint/Fill/Text/Border, one per status color
 *
 * Every shorthand (colors, roles) is 2 characters max. Variation shorthands
 * are numeric 1–5 across every role, including the scoped status roles.
 */

import type { Preset } from "../../themeShop";

// ── Stable color IDs ──────────────────────────────────────────────────────────

const NM_IDS = {
  teal: "nm-tl",
  secondary: "nm-id",
  gray: "nm-gy",
  neutral: "nm-nt",
  success: "nm-su",
  error: "nm-er",
  warning: "nm-wr",
  info: "nm-if",
  attention: "nm-at",
  spare1: "nm-s1",
  spare2: "nm-s2",
  spare3: "nm-s3",
  spare4: "nm-s4",
  spare5: "nm-s5",
};

// ── Status role helper ────────────────────────────────────────────────────────

function statusRole(name: string, shorthand: string, colorId: string) {
  return {
    name,
    shorthand,
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

const nmobile: Preset = {
  id: "nmobile",
  name: "nMobile",
  badge: "nM",
  description: "Mobile app preset built around a vibrant teal accent — Scale mode, Light + Dark, elevation-driven backgrounds, and scoped status roles for success/error/warning/info/attention states.",
  tags: ["nMobile", "Mobile", "Scale", "Teal"],
  swatches: ["14B8A6", "6366F1", "22C55E", "EF4444", "F59E0B", "3B82F6", "FACC15"],
  config: {
    name: "nMobile",
    description: "Mobile app — teal-accented Light and Dark themes with elevation-based backgrounds and scoped status roles.",

    // ── Mode ────────────────────────────────────────────────────────────────
    pluginMode: "scale",
    scaleAlgorithm: "Fidelity",
    scaleLength: 21,
    useUniformAlgorithm: true,
    algorithmScopeLevel: "color",
    solverMode: "natural",

    // ── Token naming ────────────────────────────────────────────────────────
    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: true,
    useShorthandRoles: true,
    useShorthandVariations: true,
    useShorthandSteps: true,

    // ── Output ──────────────────────────────────────────────────────────────
    includeSourceColors: true,
    sourceCollectionName: "nmobile/source",
    alphaValues: [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 85, 90, 95],
    includeColorScalesCollection: true,
    includeDescriptions: true,
    scaleCollectionName: "nmobile/scale",
    tokenCollectionName: "nmobile/tokens",

    scaleSteps: null,
    canEditRoleVariants: true,

    // Global fallback variation — all roles override with their own variation list.
    variations: [{ name: "default", shorthand: "1" }],

    // ── Colors ──────────────────────────────────────────────────────────────
    colors: [
      { _id: NM_IDS.teal, name: "Teal", shorthand: "tl", value: "14B8A6" },
      { _id: NM_IDS.secondary, name: "Secondary", shorthand: "id", value: "6366F1" },
      { _id: NM_IDS.gray, name: "Gray", shorthand: "gy", value: "71717A" },
      { _id: NM_IDS.neutral, name: "Neutral", shorthand: "nt", value: "71787E" },
      { _id: NM_IDS.success, name: "Success", shorthand: "su", value: "22C55E" },
      { _id: NM_IDS.error, name: "Error", shorthand: "er", value: "EF4444" },
      { _id: NM_IDS.warning, name: "Warning", shorthand: "wr", value: "F59E0B" },
      { _id: NM_IDS.info, name: "Info", shorthand: "if", value: "3B82F6" },
      { _id: NM_IDS.attention, name: "Attention", shorthand: "at", value: "FACC15" },
      // Spare — raw values only, not referenced in any role
      { _id: NM_IDS.spare1, name: "Spare/1", shorthand: "s1", value: "F97316" },
      { _id: NM_IDS.spare2, name: "Spare/2", shorthand: "s2", value: "EC4899" },
      { _id: NM_IDS.spare3, name: "Spare/3", shorthand: "s3", value: "84CC16" },
      { _id: NM_IDS.spare4, name: "Spare/4", shorthand: "s4", value: "06B6D4" },
      { _id: NM_IDS.spare5, name: "Spare/5", shorthand: "s5", value: "A855F7" },
    ],

    // ── Roles ────────────────────────────────────────────────────────────────
    roles: [
      // ── BG ──────────────────────────────────────────────────────────────────
      // 5 elevation steps from app canvas to modal scrim.
      // Scrim (5) uses a high contrast target to produce a near-opaque overlay.
      {
        name: "bg",
        shorthand: "bg",
        variations: [
          { name: "Sunken", shorthand: "1", target: 1.03 },
          { name: "App", shorthand: "2", target: 1.0 },
          { name: "Surface", shorthand: "3", target: 1.05 },
          { name: "Raised", shorthand: "4", target: 1.1 },
          { name: "Overlay", shorthand: "5", target: 1.15 },
        ],
        description: "Elevation ladder · sunken well · app canvas · card surface · raised layer · overlay panel",
      },

      // ── TEXT ────────────────────────────────────────────────────────────────
      // Also used for icon fills. Disabled (1) → Emphasis (5, AAA headings).
      {
        name: "text",
        shorthand: "tx",
        variations: [
          { name: "Disabled", shorthand: "1", target: 2.0 },
          { name: "Muted", shorthand: "2", target: 3.0 },
          { name: "Secondary", shorthand: "3", target: 4.5 },
          { name: "Primary", shorthand: "4", target: 7.0 },
          { name: "Emphasis", shorthand: "5", target: 11.0 },
        ],
        description: "Text hierarchy and icon fills · disabled · muted · secondary · primary (AA) · emphasis (AAA)",
      },

      // ── FILL ────────────────────────────────────────────────────────────────
      // Buttons, tags, solid interactive elements.
      {
        name: "fill",
        shorthand: "fl",
        variations: [
          { name: "Disabled", shorthand: "1", target: 1.5 },
          { name: "Subtle", shorthand: "2", target: 2.5 },
          { name: "Default", shorthand: "3", target: 4.5 },
          { name: "Hover", shorthand: "4", target: 6.0 },
          { name: "Pressed", shorthand: "5", target: 8.0 },
        ],
        description: "Solid interactive fills · disabled · subtle · default (AA) · hover · pressed",
      },

      // ── STROKE ──────────────────────────────────────────────────────────────
      // Outlines and borders.
      {
        name: "stroke",
        shorthand: "st",
        variations: [
          { name: "Hairline", shorthand: "1", target: 1.4 },
          { name: "Subtle", shorthand: "2", target: 1.8 },
          { name: "Default", shorthand: "3", target: 2.5 },
          { name: "Strong", shorthand: "4", target: 3.5 },
          { name: "Focus", shorthand: "5", target: 4.5 },
        ],
        description: "Outlines and borders · hairline · subtle · default · strong · focus ring",
      },

      // ── Status roles ───────────────────────────────────────────────────────
      // Each role is scoped to its own color so tokens are only generated
      // for the matching status color, not the entire palette.
      // Role shorthands use "s/" prefix to avoid colliding with color shorthands
      // (color su vs role s/su, etc).
      statusRole("status/success", "s/su", NM_IDS.success),
      statusRole("status/error", "s/er", NM_IDS.error),
      statusRole("status/warning", "s/wr", NM_IDS.warning),
      statusRole("status/info", "s/if", NM_IDS.info),
      statusRole("status/attention", "s/at", NM_IDS.attention),
    ],

    // ── Themes ───────────────────────────────────────────────────────────────
    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark", bg: "0B0F0F" }, // faint teal-black tint — lets the brand hue read against dark canvas
    ],
  },
};

const presets: Preset[] = [nmobile];
export default presets;
