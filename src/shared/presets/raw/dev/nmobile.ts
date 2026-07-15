/**
 * nMobile — Mobile app preset built around a vibrant teal accent.
 *
 * Scale mode (Fidelity algorithm) · Light + Dark · 13 colors · 6 roles
 *
 * Token template: color.role.variation (no modifier) or
 *                 color.role.modifier.variation (component-scoped roles).
 * Nesting ("/") in a role name IS the modifier level — it's reserved for
 * component-context roles (fill/button, text/button), not for the plain
 * structural roles, which stay flat on purpose (bg, text, fill, border).
 * Nesting in color names is reserved for category grouping (unused here —
 * all 8 semantic colors are flat; only Spare/N groups under a folder).
 *
 * Colors:
 *   Primary (teal brand) · Secondary (indigo)
 *   Success · Error · Warning · Info · Attention
 *   Neutral (cool blue-gray)
 *   Spare/1–5 (raw values only, no roles — source collection)
 *
 * Roles (no modifier — shared vocabulary, scoped to all 8 semantic colors):
 *   bg      — 5 steps, e.g. success.bg.1 (dim) … success.bg.5 (strong)
 *   text    — 5 steps, e.g. error.text.1 (dim) … error.text.5 (strong)
 *   fill    — 5 steps, e.g. neutral.fill.1 (dim) … neutral.fill.5 (strong)
 *   border  — 5 steps, e.g. neutral.border.1 (dim) … neutral.border.5 (strong)
 *
 * Roles (component modifier — Primary + Secondary only):
 *   fill/button  — 5 steps, e.g. primary.fill.button.1 (disabled) … .5 (pressed)
 *   text/button  — 1 step only (primary.text.button.3 / "default"), localBg-
 *                  chained to fill/button's own step-3 fill. See that role's
 *                  comment for why it's 1 step, not 5 — a single fixed
 *                  localBg background has a hard contrast ceiling that a
 *                  5-step ladder chained to it would silently overshoot.
 *
 * All variation names are numeric-first (labels are decorative — this preset
 * is meant to be read by shorthand: bg.1 … bg.5, not by name) so the same
 * 1–5 vocabulary reads identically across every scoped color.
 */

import type { Preset } from "../../themeShop";

// ── Stable color IDs ──────────────────────────────────────────────────────────

const NM_IDS = {
  primary: "nm-pr",
  secondary: "nm-sc",
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

const SEMANTIC_COLOR_IDS = [NM_IDS.primary, NM_IDS.secondary, NM_IDS.neutral, NM_IDS.success, NM_IDS.error, NM_IDS.warning, NM_IDS.info, NM_IDS.attention];

// ── Stable role/variation IDs ─────────────────────────────────────────────────

const NM_ROLE_IDS = {
  bg: "nm-r-bg",
  text: "nm-r-tx",
  fill: "nm-r-fl",
  border: "nm-r-bd",
  fillButton: "nm-r-flb",
  textButton: "nm-r-txb",
};

// ── Shared 5-step variation ladder ────────────────────────────────────────────
// One ladder shape reused by bg/text/fill/border so "1" through "5" mean the
// same relative intensity everywhere, regardless of role. Labels are minimal
// on purpose — see top-of-file note.

function ladder(roleId: string, targets: [number, number, number, number, number], labels: [string, string, string, string, string] = ["Dim", "Subtle", "Default", "Strong", "Max"]) {
  return targets.map((target, i) => ({
    _id: `${roleId}-v${i + 1}`,
    name: labels[i],
    shorthand: String(i + 1),
    target,
  }));
}

// ── Preset ────────────────────────────────────────────────────────────────────

const nmobile: Preset = {
  id: "nmobile",
  name: "nMobile",
  badge: "nM",
  description:
    "Mobile app preset built around a vibrant teal accent — Scale mode, Light + Dark, a flat color.role.variation token template shared across every semantic color, with modifier-scoped button roles for Primary/Secondary only.",
  tags: ["nMobile", "Mobile", "Scale", "Teal", "Fidelity"],
  swatches: ["14B8A6", "6366F1", "22C55E", "EF4444", "F59E0B", "3B82F6", "FACC15"],
  config: {
    name: "nMobile",
    description: "Mobile app — teal-accented Light and Dark themes, one shared role vocabulary across every semantic color.",

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
    useSharedRoleVariants: false,

    // Global fallback variation — all roles override with their own variation list.
    variations: [{ _id: "nm-v-default", name: "default", shorthand: "1" }],

    // ── Colors ──────────────────────────────────────────────────────────────
    colors: [
      { _id: NM_IDS.primary, name: "Primary", shorthand: "pr", value: "14B8A6" },
      { _id: NM_IDS.secondary, name: "Secondary", shorthand: "sc", value: "6366F1" },
      { _id: NM_IDS.neutral, name: "Neutral", shorthand: "nt", value: "71787E" },
      { _id: NM_IDS.success, name: "Success", shorthand: "su", value: "22C55E" },
      { _id: NM_IDS.error, name: "Error", shorthand: "er", value: "EF4444" },
      { _id: NM_IDS.warning, name: "Warning", shorthand: "wr", value: "F59E0B" },
      { _id: NM_IDS.info, name: "Info", shorthand: "if", value: "3B82F6" },
      { _id: NM_IDS.attention, name: "Attention", shorthand: "at", value: "FACC15" },
      // Spare — raw values only, not referenced in any role. "/" groups them
      // under one folder in Figma; this is the category-grouping use of
      // nesting in color names, distinct from the role-modifier use of "/".
      { _id: NM_IDS.spare1, name: "Spare/1", shorthand: "sp/1", value: "F97316" },
      { _id: NM_IDS.spare2, name: "Spare/2", shorthand: "sp/2", value: "EC4899" },
      { _id: NM_IDS.spare3, name: "Spare/3", shorthand: "sp/3", value: "84CC16" },
      { _id: NM_IDS.spare4, name: "Spare/4", shorthand: "sp/4", value: "06B6D4" },
      { _id: NM_IDS.spare5, name: "Spare/5", shorthand: "sp/5", value: "A855F7" },
    ],

    // ── Roles ────────────────────────────────────────────────────────────────
    roles: [
      // ── BG ──────────────────────────────────────────────────────────────────
      // color.bg.{1-5}. Scoped to all 8 semantic colors (not the 5 raw Spares) —
      // every color gets its own dim→max background wash, e.g. success.bg.1 for
      // a subtle status banner tint, neutral.bg.5 for the strongest surface.
      // One role definition; the engine emits one instance per scoped color, so
      // this is NOT duplicated per color in source. Targets spread wide on
      // purpose (verified via a headless variableMaker() run, per the
      // color-master skill's recipe) — a tighter cluster collapses 2-3 of the
      // 5 steps onto duplicate hexes at this scale length (Fidelity, length
      // 21). Accepted residual: Neutral and Info still collide at
      // Subtle/Default in the Dark theme specifically (both land on the same
      // scale step in that theme's much darker luminance band) — pushing the
      // targets further apart to fully separate them would make "Subtle"
      // visually loud enough to stop reading as a wash, which defeats the
      // role's purpose more than the collision does.
      {
        _id: NM_ROLE_IDS.bg,
        name: "bg",
        shorthand: "bg",
        variations: ladder(NM_ROLE_IDS.bg, [1.0, 1.12, 1.3, 1.55, 1.9]),
        scopedColorIds: SEMANTIC_COLOR_IDS,
        description: "Background wash, 5 steps · dim → max, shared vocabulary across every semantic color",
      },

      // ── TEXT ────────────────────────────────────────────────────────────────
      // color.text.{1-5}. Also used for icon fills. Scoped to all 8 semantic
      // colors, e.g. error.text.3 for default error copy, success.text.5 for
      // emphasized success headings.
      {
        _id: NM_ROLE_IDS.text,
        name: "text",
        shorthand: "tx",
        variations: ladder(NM_ROLE_IDS.text, [2.0, 3.2, 4.5, 7.0, 11.0]),
        scopedColorIds: SEMANTIC_COLOR_IDS,
        description: "Text/icon-fill hierarchy, 5 steps · dim (disabled) → max (AAA), shared vocabulary across every semantic color",
      },

      // ── FILL ────────────────────────────────────────────────────────────────
      // color.fill.{1-5}. Structural/status solid fills — tags, badges,
      // dividers. Scoped to all 8 semantic colors. Button-specific interactive
      // fills for Primary/Secondary live in fill/button below, not here.
      {
        _id: NM_ROLE_IDS.fill,
        name: "fill",
        shorthand: "fl",
        variations: ladder(NM_ROLE_IDS.fill, [1.5, 2.5, 4.5, 6.0, 8.0]),
        scopedColorIds: SEMANTIC_COLOR_IDS,
        description: "Solid fill, 5 steps · dim → max, shared vocabulary across every semantic color",
      },

      // ── BORDER ──────────────────────────────────────────────────────────────
      // color.border.{1-5}. Outlines, dividers, focus rings. Scoped to all 8
      // semantic colors, e.g. error.border.3 for an invalid-field outline.
      {
        _id: NM_ROLE_IDS.border,
        name: "border",
        shorthand: "bd",
        variations: ladder(NM_ROLE_IDS.border, [1.4, 1.8, 2.5, 3.5, 4.5]),
        scopedColorIds: SEMANTIC_COLOR_IDS,
        description: "Outlines and borders, 5 steps · dim (hairline) → max (focus ring), shared vocabulary across every semantic color",
      },

      // ── FILL/BUTTON ─────────────────────────────────────────────────────────
      // color.fill.button.{1-5}. Component-scoped — the "/" here IS the
      // modifier level per the token template, restricted to Primary and
      // Secondary (the only colors with dedicated CTA buttons). Solved
      // against the theme bg (button sits on page/card).
      {
        _id: NM_ROLE_IDS.fillButton,
        name: "fill/button",
        shorthand: "fl/btn",
        variations: ladder(NM_ROLE_IDS.fillButton, [1.3, 2.0, 4.5, 6.0, 8.0], ["Disabled", "Subtle", "Default", "Hover", "Pressed"]),
        scopedColorIds: [NM_IDS.primary, NM_IDS.secondary],
        description: "Button fill, 5 steps · disabled → pressed, Primary/Secondary only",
      },

      // ── TEXT/BUTTON ─────────────────────────────────────────────────────────
      // color.text.button.3 ("Default") only — not a 5-step ladder. localBg
      // fixes ONE background per role (no per-variation override exists in
      // the schema), so a label role chained to fill/button's Default step
      // can only reliably support ONE achievable target: the button's fill
      // has its own hard contrast ceiling (verified ~4.4-5.1:1 against a
      // mid-tone Primary/Secondary fill), so Hover/Pressed-strength text
      // targets (6.0+) are mathematically unreachable and silently collapse
      // to clipped black/white with no isAdjusted flag if you try. A button's
      // label color doesn't change on hover/press in practice anyway — only
      // the fill does — so one Default token is what's actually needed.
      {
        _id: NM_ROLE_IDS.textButton,
        name: "text/button",
        shorthand: "tx/btn",
        variations: [{ _id: `${NM_ROLE_IDS.textButton}-v3`, name: "Default", shorthand: "3", target: 4.3 }],
        scopedColorIds: [NM_IDS.primary, NM_IDS.secondary],
        localBg: { kind: "token-dynamic", value: "[color]/fill/button/Default" },
        description: "Button label text, single Default token, contrast-chained to the button's own fill, Primary/Secondary only",
      },
    ],

    // ── Themes ───────────────────────────────────────────────────────────────
    themes: [
      { _id: "nm-th-light", name: "Light", bg: "FFFFFF" },
      { _id: "nm-th-dark", name: "Dark", bg: "0B0F0F" }, // faint teal-black tint — lets the brand hue read against dark canvas
    ],
  },
};

const presets: Preset[] = [nmobile];
export default presets;
