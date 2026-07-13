/**
 * Token Wand UI — The plugin's own color system.
 *
 * Direct mode · Light + Dark · 5 colors · 7 roles
 *
 * Design principles:
 *   - Icons share the text role — same color, same contrast, no separate icon role
 *   - All 7 roles generate tokens for every color, so status colors get
 *     danger/text/muted, danger/fill/button/default, etc. for free
 *   - No overlay role — modal scrims are a CSS alpha, not a design token
 *   - No scoped status roles — colors are the semantic axis, roles are structural
 *
 * Roles:
 *   bg            — App chrome (app window → panel/header → overlay tint)
 *   surface       — Raised elements: cards, inputs, popovers, sheets + hover/active states
 *   border        — Hairline dividers through input borders (4 weights)
 *                   focus ring comes from brand/border/strong for free
 *   text          — Full hierarchy: primary → secondary → muted → dim → disabled
 *                   also used for icons — same color, same contrast targets
 *   fill          — Tinted washes and badge fills (low contrast, decorative)
 *                   5 steps: subtle → default → strong → stronger → strongest
 *   fill/button   — Interactive CTA fills with 5 interaction states (constant-chroma solver)
 *                   brand → blue button, danger → red delete button, etc.
 *   text/button   — On-button labels, contrast chained to [color]/fill/button/default
 *                   hue-locked solver picks light or dark text per color automatically
 *
 * Colors:
 *   Neutral — pure gray seed (787878) · all chrome, surface, border, text work
 *   Brand   — deep blue (0062FF) · CTA, focus ring, active tab
 *   Danger  — destructive actions, errors
 *   Success — confirmations, synced state
 *   Warning — blocked actions, caution
 *
 * Themes: Light (F2F2F7) · Dark (0D0D0D)
 * Alpha tints: 5 10 15 20 30 40 50 60 75 90
 * Names: color / role / variation  ·  shorthands on colors + roles
 */

import type { Preset } from "../../themeShop";

const tokenWandUi: Preset = {
  id: "token-wand-ui",
  name: "Token Wand UI",
  badge: "TW",
  description:
    "Token Wand's own interface system. 5 colors × 6 universal roles = every token " +
    "the plugin needs. Icons share the text role. Status colors get all role tokens " +
    "automatically. Poetic: the plugin styles itself.",
  tags: ["Tool UI", "Direct", "Semantic", "Light+Dark", "Dense"],
  swatches: ["18A0FB", "6B7280", "EF4444", "22C55E", "F59E0B"],
  config: {
    name: "Token Wand UI",
    description: "The plugin's own color system — use Token Wand to style Token Wand.",

    // ── Mode ──────────────────────────────────────────────────────────────────
    pluginMode: "direct",
    scaleAlgorithm: "Natural",
    useUniformAlgorithm: false,
    algorithmScopeLevel: "role",
    solverMode: "natural",

    // ── Token naming ──────────────────────────────────────────────────────────
    // color shorthands + role shorthands = compact paths in Figma
    // e.g. "n/sf/default", "b/fi/btn/default", "d/tx/muted"
    tokenNameSegments: ["color", "role", "variation"],
    useShorthandColors: true,
    useShorthandRoles: true,
    useShorthandVariations: false,
    useShorthandSteps: false,

    // ── Output ────────────────────────────────────────────────────────────────
    includeSourceColors: true,
    sourceCollectionName: "tw-ui/source",
    alphaValues: [5, 10, 15, 20, 30, 40, 50, 60, 75, 90],
    includeColorScalesCollection: false,
    includeDescriptions: true,
    scaleCollectionName: "tw-ui/scale",
    tokenCollectionName: "tw-ui/tokens",

    scaleSteps: null,
    canEditRoleVariants: true,

    // Global fallback — all roles define their own variations
    variations: [{ _id: "twui-v-default", name: "default", shorthand: "default" }],

    // ── Colors ────────────────────────────────────────────────────────────────
    // 5 seeds. Neutral is the workhorse for all chrome, surfaces, borders, text.
    // Brand = Figma blue. Status colors match current CSS tokens exactly.
    colors: [
      {
        _id: "twui-neutral",
        name: "Neutral",
        shorthand: "n",
        value: "787878",
        description: "Neutral gray — drives all surfaces, borders, and text",
      },
      {
        _id: "twui-brand",
        name: "Brand",
        shorthand: "b",
        value: "0062FF",
        description: "Figma blue — CTA, focus ring, active tab, accent",
      },
      {
        _id: "twui-danger",
        name: "Danger",
        shorthand: "d",
        value: "EF4444",
        description: "Destructive actions — delete, error banners, danger fills",
      },
      {
        _id: "twui-success",
        name: "Success",
        shorthand: "s",
        value: "22C55E",
        description: "Positive confirmation — toast, sync success, saved state",
      },
      {
        _id: "twui-warning",
        name: "Warning",
        shorthand: "w",
        value: "F59E0B",
        description: "Caution — blocked actions, degraded state, attention",
      },
    ],

    // ── Roles ─────────────────────────────────────────────────────────────────
    // 6 roles. All run across every color.
    // Neutral generates the primary surface/text/border system.
    // Brand generates CTA fills, focus rings, active states.
    // Danger/Success/Warning generate status fills, text, and borders automatically.
    roles: [
      // ── BG ──────────────────────────────────────────────────────────────────
      // Outermost chrome. Two steps: the plugin window background and the
      // slightly lighter panel/header/tab bar that sits on top of it.
      // Low contrast targets — these are barely-there tonal shifts, not fills.
      {
        name: "bg",
        shorthand: "bg",
        solverMode: "natural",
        variations: [
          { name: "App", shorthand: "app", target: 1.0 }, // plugin window chrome
          { name: "Panel", shorthand: "panel", target: 1.15 }, // header, tab bar, sidebar
          { name: "Overly", shorthand: "overly", target: 2.0 }, // overlay tint / scrim base
        ],
        description: "App chrome · window bg → panel/header → overlay tint",
      },

      // ── SURFACE ─────────────────────────────────────────────────────────────
      // All raised elements above the chrome: cards, inputs, popovers, sheets,
      // and the hover/active states that sit on those surfaces.
      // Input has its own named step — slightly different shade from a card.
      // Hover and Active are named states used as fill overlays on interactive rows/cards.
      {
        name: "surface",
        shorthand: "sf",
        solverMode: "natural",
        variations: [
          { name: "Sunken", shorthand: "sunken", target: 1.05 }, // recessed inset / dim well
          { name: "Default", shorthand: "default", target: 1.2 }, // card / list item
          { name: "Input", shorthand: "input", target: 1.35 }, // input field background
          { name: "Raised", shorthand: "raised", target: 1.5 }, // popover / dropdown / tooltip
          { name: "Overlay", shorthand: "overlay", target: 1.7 }, // sheet / drawer / modal bg
          { name: "Hover", shorthand: "hover", target: 1.55 }, // hover state on interactive surface
          { name: "Active", shorthand: "active", target: 1.85 }, // pressed / mouse-down
        ],
        description: "Raised surfaces · sunken → card → input → popover → sheet · hover · active",
      },

      // ── BORDER ──────────────────────────────────────────────────────────────
      // All dividers, outlines, and separators.
      // Hairline = the thinnest structural line (tab separator, section divider).
      // Subtle = card border at rest.
      // Default = card border on hover, input border at rest.
      // Strong = emphasis border (active input, selected card, focus ring).
      // brand/border/strong = the focus ring — no separate role needed.
      {
        name: "border",
        shorthand: "br",
        solverMode: "natural",
        variations: [
          { name: "Hairline", shorthand: "hairline", target: 1.3 }, // structural divider / separator
          { name: "Subtle", shorthand: "subtle", target: 1.7 }, // card border at rest
          { name: "Default", shorthand: "default", target: 2.4 }, // card hover, input rest
          { name: "Strong", shorthand: "strong", target: 4.5 }, // emphasis outline, focus ring
        ],
        description: "Borders · hairline → card rest → card hover/input → emphasis/focus",
      },

      // ── TEXT ────────────────────────────────────────────────────────────────
      // All readable copy AND all icon fills.
      // Icons are the same visual weight as text — no separate role.
      // brand/text/primary = vivid blue label (active tab text, link color)
      // danger/text/muted = muted red hint text
      // The full 5-step hierarchy from placeholder to AAA heading.
      {
        name: "text",
        shorthand: "tx",
        solverMode: "hue-locked",
        variations: [
          { name: "Primary", shorthand: "primary", target: 12.0 }, // AAA — headings, active labels, toolbar icons
          { name: "Secondary", shorthand: "secondary", target: 7.0 }, // AA — body copy, descriptions, icons
          { name: "Muted", shorthand: "muted", target: 4.5 }, // AA — field labels, supporting text, secondary icons
          { name: "Dim", shorthand: "dim", target: 3.0 }, // AA-large — placeholders, timestamps, ghost text
          { name: "Disabled", shorthand: "disabled", target: 1.8 }, // clearly inactive
        ],
        description: "Text + icon hierarchy · AAA headings → AA body → AA labels → placeholder → disabled",
      },

      // ── FILL ────────────────────────────────────────────────────────────────
      // Low-contrast tinted washes for badges, chips, tag backgrounds, and
      // subtle highlight states. Not interactive — use fill/button for CTAs.
      // brand/fill/default = active tab pill background
      // danger/fill/subtle = error banner tint
      {
        name: "fill",
        shorthand: "fi",
        solverMode: "natural",
        variations: [
          { name: "Subtle", shorthand: "subtle", target: 1.3 }, // barely-there tint wash
          { name: "Default", shorthand: "default", target: 1.8 }, // badge bg, chip, tag
          { name: "Strong", shorthand: "strong", target: 3.0 }, // bolder decorative fill
          { _id: "6xil5fgggq8v", name: "Stronger", shorthand: "stronger", target: 4.5 }, // high-contrast fill
          { _id: "lneogcit96cu", name: "Strongest", shorthand: "strongest", target: 4.5 }, // max fill
        ],
        description: "Tinted fills · badge bg · chip · subtle wash · not interactive",
      },

      // ── FILL / BUTTON ────────────────────────────────────────────────────────
      // Interactive CTA fills. Saturated solver keeps colors vivid at every state.
      // All 5 colors get the full button token set automatically:
      //   brand   → primary action button
      //   danger  → delete / destructive button
      //   success → confirm / save button
      //   warning → caution action
      //   neutral → secondary / ghost button fill
      {
        name: "fill/button",
        shorthand: "fi/btn",
        solverMode: "constant-chroma",
        variations: [
          { name: "Disabled", shorthand: "disabled", target: 2.0 }, // clearly inactive
          { name: "Subtle", shorthand: "subtle", target: 3.0 }, // ghost / secondary button
          { name: "Default", shorthand: "default", target: 5.0 }, // primary CTA at rest (AA)
          { name: "Hover", shorthand: "hover", target: 6.5 }, // hover
          { name: "Pressed", shorthand: "pressed", target: 8.0 }, // mouse-down / active
        ],
        description: "CTA fills · 5 states · all colors get brand/danger/success buttons (saturated)",
      },

      // ── TEXT / BUTTON-TEXT ───────────────────────────────────────────────────
      // Label text and icons that sit on top of fill/button/default.
      // Local bg is dynamically chained to [color]/fill/button/default so contrast
      // is calculated against each color's own button fill, not the page background.
      // Luminance solver picks the lightest or darkest value that passes — ensuring
      // brand gets white text, danger gets white text, warning might get dark text, etc.
      // Mirror the same 5 states as fill/button so every button state has a paired label.
      {
        name: "text/button",
        shorthand: "tx/btn",
        solverMode: "hue-locked",
        localBg: {
          kind: "token-dynamic",
          value: "[color]/fill/button/default",
        },
        variations: [
          { name: "Disabled", shorthand: "disabled", target: 2.0 }, // label on disabled button
          { name: "Subtle", shorthand: "subtle", target: 3.0 }, // label on ghost button
          { name: "Default", shorthand: "default", target: 4.5 }, // label on primary CTA
          { name: "Hover", shorthand: "hover", target: 6.0 }, // label on hovered button
          { name: "Pressed", shorthand: "pressed", target: 7.5 }, // label on pressed button
        ],
        description: "On-button labels · contrast against [color]/fill/button/default · luminance solver",
      },
    ],

    // ── Themes ────────────────────────────────────────────────────────────────
    // Light = slightly warm off-white (iOS system grouped background).
    // Dark = near-black matching the plugin's current --bg-app.
    themes: [
      { name: "Light", bg: "F2F2F7" },
      { name: "Dark", bg: "0D0D0D" },
    ],
  },
};

const presets: Preset[] = [tokenWandUi];
export default presets;
