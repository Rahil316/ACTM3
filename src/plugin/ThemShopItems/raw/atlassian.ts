/**
 * Atlassian Design System (ADS) preset.
 *
 * Collection names match ADS exactly:
 *   scaleCollectionName  = "color-palette"   (the base palette ramps)
 *   tokenCollectionName  = "color"            (semantic tokens, maps to --ds-* CSS vars)
 *
 * Token structure: property.role.emphasis.state
 *   color.background.brand.bold
 *   color.text.danger
 *   color.border.focused
 *   elevation.surface.raised
 *
 * Figma folder nesting via '/':
 *   tokenNameSegments: ["role", "variation"]
 *   Role     = property + semantic (e.g. "background/brand")
 *   Variation = emphasis + state   (e.g. "bold", "bold/hovered", "default")
 *
 * Key colors (ADS palette seeds):
 *   Brand / Selected / Information  #0C66E4  Atlassian Blue
 *   Neutral                         #44546F  Slate gray
 *   Success                         #22A06B  Green
 *   Warning                         #E2B203  Yellow
 *   Danger                          #C9372C  Red
 *   Discovery                       #8270DB  Purple
 *   Warning inverse (text on bold)  #E56910  Orange-adjacent warm
 *
 * Contrast targets per ADS emphasis tier (solved against theme bg):
 *   Background subtlest / subtle    1.05 – 1.15   tinted wash
 *   Background default              1.3            standard fill
 *   Background bold                 4.5            strong container (AA)
 *   Background boldest              8.0            highest-contrast container
 *   Background hovered              +0.3 on base   interactive step
 *   Background pressed              +0.6 on base   pressed step
 *   Text default                    7.0            body text (AAA)
 *   Text subtle                     4.5            secondary text (AA)
 *   Text subtlest                   3.0            hint / disabled
 *   Text inverse                    14.0           text on bold fills
 *   Icon default                    4.5            functional icon (AA)
 *   Icon subtle                     3.0            decorative icon
 *   Border default                  2.5            interactive border
 *   Border bold                     4.5            strong border (AA)
 *   Border focused                  3.0            focus ring
 *   Elevation surface               1.0 – 1.3      layered surface stack
 *   Blanket                         14.0           modal overlay (near-black)
 *   Skeleton                        1.1 – 1.05     shimmer placeholder
 *
 * Themes: Light (#FFFFFF) · Dark (#1D2125) — ADS exact values.
 */

import type { Preset } from "../../../shared/themeShop";

const presets: Preset[] = [
  {
    id: "atlassian-ds",
    name: "Atlassian Design System",
    badge: "ADS",
    description: "Property-first token hierarchy matching color.background.brand.bold and --ds-* CSS variables. Collection names match ADS: 'color-palette' + 'color'.",
    tags: ["atlassian", "ads", "jira", "confluence", "semantic", "design-system"],
    swatches: ["0C66E4", "44546F", "22A06B", "E2B203", "C9372C", "8270DB"],
    config: {
      name: "Atlassian Design System",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      useUniformAlgorithm: true,
      algorithmScopeLevel: "color",
      solverMode: "natural",
      tokenNameSegments: ["role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      includeSourceColors: false,
      sourceCollectionName: "global",
      alphaValues: [8, 16, 32, 50, 70, 85],
      includeColorScalesCollection: true,
      includeDescriptions: true,

      // ── Collection names matching ADS exactly ──────────────────────────────
      scaleCollectionName: "color-palette",
      tokenCollectionName: "color",

      scaleSteps: null,

      // Single global variation — not used (every role uses customVariationList).
      variations: [{ name: "default", shorthand: "default" }],

      // ── Key colors ─────────────────────────────────────────────────────────
      // ADS separates Brand and Information even though they share the same hue.
      // Selected also maps to blue. Each gets its own palette ramp so tonal
      // spacing is independent.
      colors: [
        { name: "brand", shorthand: "brand", value: "0C66E4", description: "Atlassian brand blue — primary action, links, focus" },
        { name: "neutral", shorthand: "neutral", value: "44546F", description: "Neutral slate — surfaces, borders, default text" },
        { name: "success", shorthand: "success", value: "22A06B", description: "Success green — positive states, confirmations" },
        { name: "warning", shorthand: "warning", value: "E2B203", description: "Warning yellow — caution, alert states" },
        { name: "danger", shorthand: "danger", value: "C9372C", description: "Danger red — errors, destructive actions" },
        { name: "information", shorthand: "information", value: "0055CC", description: "Information blue — informational banners and messages" },
        { name: "discovery", shorthand: "discovery", value: "8270DB", description: "Discovery purple — new features, onboarding, spotlights" },
      ],

      roles: [
        // ══════════════════════════════════════════════════════════════════════
        // BACKGROUND  →  color.background.*
        // Role = property + semantic family. Variation = emphasis + state.
        // All 7 semantic colors run through these roles.
        // ══════════════════════════════════════════════════════════════════════

        // color.background.brand.*
        {
          name: "background/brand",
          shorthand: "background/brand",
          variations: [
            { name: "subtlest", shorthand: "subtlest", target: 1.05 }, // color.background.brand.subtlest
            { name: "subtlest/hovered", shorthand: "subtlest/hovered", target: 1.1 },
            { name: "subtlest/pressed", shorthand: "subtlest/pressed", target: 1.15 },
            { name: "bold", shorthand: "bold", target: 4.5 }, // color.background.brand.bold
            { name: "bold/hovered", shorthand: "bold/hovered", target: 5.0 },
            { name: "bold/pressed", shorthand: "bold/pressed", target: 5.5 },
            { name: "boldest", shorthand: "boldest", target: 8.0 }, // color.background.brand.boldest
            { name: "boldest/hovered", shorthand: "boldest/hovered", target: 9.0 },
            { name: "boldest/pressed", shorthand: "boldest/pressed", target: 10.0 },
          ],
          description: "color.background.brand — brand-tinted fills from subtlest wash to boldest container",
        },

        // color.background.neutral.*
        {
          name: "background/neutral",
          shorthand: "background/neutral",
          variations: [
            { name: "subtle", shorthand: "subtle", target: 1.05 }, // color.background.neutral.subtle
            { name: "subtle/hovered", shorthand: "subtle/hovered", target: 1.1 },
            { name: "subtle/pressed", shorthand: "subtle/pressed", target: 1.15 },
            { name: "default", shorthand: "default", target: 1.3 }, // color.background.neutral
            { name: "default/hovered", shorthand: "default/hovered", target: 1.4 },
            { name: "default/pressed", shorthand: "default/pressed", target: 1.5 },
            { name: "bold", shorthand: "bold", target: 4.5 }, // color.background.neutral.bold
            { name: "bold/hovered", shorthand: "bold/hovered", target: 5.0 },
            { name: "bold/pressed", shorthand: "bold/pressed", target: 5.5 },
          ],
          description: "color.background.neutral — neutral fills: subtle wash · default container · bold",
        },

        // color.background.success.*
        {
          name: "background/success",
          shorthand: "background/success",
          variations: [
            { name: "default", shorthand: "default", target: 1.1 }, // color.background.success
            { name: "default/hovered", shorthand: "default/hovered", target: 1.2 },
            { name: "default/pressed", shorthand: "default/pressed", target: 1.3 },
            { name: "bold", shorthand: "bold", target: 4.5 }, // color.background.success.bold
            { name: "bold/hovered", shorthand: "bold/hovered", target: 5.0 },
            { name: "bold/pressed", shorthand: "bold/pressed", target: 5.5 },
          ],
          description: "color.background.success — success tinted fills",
        },

        // color.background.warning.*
        {
          name: "background/warning",
          shorthand: "background/warning",
          variations: [
            { name: "default", shorthand: "default", target: 1.1 }, // color.background.warning
            { name: "default/hovered", shorthand: "default/hovered", target: 1.2 },
            { name: "default/pressed", shorthand: "default/pressed", target: 1.3 },
            { name: "bold", shorthand: "bold", target: 3.0 }, // color.background.warning.bold
            { name: "bold/hovered", shorthand: "bold/hovered", target: 3.5 },
            { name: "bold/pressed", shorthand: "bold/pressed", target: 4.0 },
          ],
          description: "color.background.warning — warning tinted fills",
        },

        // color.background.danger.*
        {
          name: "background/danger",
          shorthand: "background/danger",
          variations: [
            { name: "default", shorthand: "default", target: 1.1 }, // color.background.danger
            { name: "default/hovered", shorthand: "default/hovered", target: 1.2 },
            { name: "default/pressed", shorthand: "default/pressed", target: 1.3 },
            { name: "bold", shorthand: "bold", target: 4.5 }, // color.background.danger.bold
            { name: "bold/hovered", shorthand: "bold/hovered", target: 5.0 },
            { name: "bold/pressed", shorthand: "bold/pressed", target: 5.5 },
          ],
          description: "color.background.danger — danger/error tinted fills",
        },

        // color.background.information.*
        {
          name: "background/information",
          shorthand: "background/information",
          variations: [
            { name: "default", shorthand: "default", target: 1.1 }, // color.background.information
            { name: "default/hovered", shorthand: "default/hovered", target: 1.2 },
            { name: "default/pressed", shorthand: "default/pressed", target: 1.3 },
            { name: "bold", shorthand: "bold", target: 4.5 }, // color.background.information.bold
            { name: "bold/hovered", shorthand: "bold/hovered", target: 5.0 },
            { name: "bold/pressed", shorthand: "bold/pressed", target: 5.5 },
          ],
          description: "color.background.information — informational tinted fills",
        },

        // color.background.discovery.*
        {
          name: "background/discovery",
          shorthand: "background/discovery",
          variations: [
            { name: "default", shorthand: "default", target: 1.1 }, // color.background.discovery
            { name: "default/hovered", shorthand: "default/hovered", target: 1.2 },
            { name: "default/pressed", shorthand: "default/pressed", target: 1.3 },
            { name: "bold", shorthand: "bold", target: 4.5 }, // color.background.discovery.bold
            { name: "bold/hovered", shorthand: "bold/hovered", target: 5.0 },
            { name: "bold/pressed", shorthand: "bold/pressed", target: 5.5 },
          ],
          description: "color.background.discovery — discovery/feature tinted fills",
        },

        // color.background.selected.* — blue, same hue as brand
        {
          name: "background/selected",
          shorthand: "background/selected",
          variations: [
            { name: "default", shorthand: "default", target: 1.1 }, // color.background.selected
            { name: "default/hovered", shorthand: "default/hovered", target: 1.2 },
            { name: "default/pressed", shorthand: "default/pressed", target: 1.3 },
            { name: "bold", shorthand: "bold", target: 4.5 }, // color.background.selected.bold
            { name: "bold/hovered", shorthand: "bold/hovered", target: 5.0 },
            { name: "bold/pressed", shorthand: "bold/pressed", target: 5.5 },
          ],
          description: "color.background.selected — selected state fills",
        },

        // color.background.input.* — neutral hue, input field bg
        {
          name: "background/input",
          shorthand: "background/input",
          variations: [
            { name: "default", shorthand: "default", target: 1.0 }, // color.background.input
            { name: "default/hovered", shorthand: "default/hovered", target: 1.05 },
            { name: "default/pressed", shorthand: "default/pressed", target: 1.1 },
          ],
          description: "color.background.input — form field background",
        },

        // ══════════════════════════════════════════════════════════════════════
        // TEXT  →  color.text.*
        // ══════════════════════════════════════════════════════════════════════

        // color.text (neutral default body text + subtlest/subtle/disabled/inverse/selected)
        {
          name: "text",
          shorthand: "text",
          variations: [
            { name: "default", shorthand: "default", target: 7.0 }, // color.text
            { name: "subtle", shorthand: "subtle", target: 4.5 }, // color.text.subtle
            { name: "subtlest", shorthand: "subtlest", target: 3.0 }, // color.text.subtlest
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // color.text.disabled
            { name: "inverse", shorthand: "inverse", target: 14.0 }, // color.text.inverse
            { name: "selected", shorthand: "selected", target: 4.5 }, // color.text.selected
          ],
          description: "color.text — default body text through inverse",
        },

        // color.text.brand / danger / success / warning / information / discovery
        {
          name: "text/brand",
          shorthand: "text/brand",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // color.text.brand
          ],
          description: "color.text.brand — brand-colored text (AA)",
        },
        {
          name: "text/success",
          shorthand: "text/success",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // color.text.success
          ],
          description: "color.text.success — success-colored text (AA)",
        },
        {
          name: "text/warning",
          shorthand: "text/warning",
          variations: [
            { name: "default", shorthand: "default", target: 3.0 }, // color.text.warning
            { name: "inverse", shorthand: "inverse", target: 14.0 }, // color.text.warning.inverse
          ],
          description: "color.text.warning — warning text and inverse on bold warning bg",
        },
        {
          name: "text/danger",
          shorthand: "text/danger",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // color.text.danger
          ],
          description: "color.text.danger — danger/error text (AA)",
        },
        {
          name: "text/information",
          shorthand: "text/information",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // color.text.information
          ],
          description: "color.text.information — informational text (AA)",
        },
        {
          name: "text/discovery",
          shorthand: "text/discovery",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // color.text.discovery
          ],
          description: "color.text.discovery — discovery/feature text (AA)",
        },

        // ══════════════════════════════════════════════════════════════════════
        // ICON  →  color.icon.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "icon",
          shorthand: "icon",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // color.icon
            { name: "subtle", shorthand: "subtle", target: 3.0 }, // color.icon.subtle
            { name: "subtlest", shorthand: "subtlest", target: 2.0 }, // color.icon.subtlest (disabled)
            { name: "inverse", shorthand: "inverse", target: 14.0 }, // color.icon.inverse
            { name: "selected", shorthand: "selected", target: 4.5 }, // color.icon.selected
          ],
          description: "color.icon — functional · decorative · disabled · inverse · selected",
        },
        {
          name: "icon/brand",
          shorthand: "icon/brand",
          variations: [{ name: "default", shorthand: "default", target: 4.5 }],
          description: "color.icon.brand",
        },
        {
          name: "icon/success",
          shorthand: "icon/success",
          variations: [{ name: "default", shorthand: "default", target: 4.5 }],
          description: "color.icon.success",
        },
        {
          name: "icon/warning",
          shorthand: "icon/warning",
          variations: [
            { name: "default", shorthand: "default", target: 3.0 }, // color.icon.warning
            { name: "inverse", shorthand: "inverse", target: 14.0 }, // color.icon.warning.inverse
          ],
          description: "color.icon.warning — warning icon and inverse",
        },
        {
          name: "icon/danger",
          shorthand: "icon/danger",
          variations: [{ name: "default", shorthand: "default", target: 4.5 }],
          description: "color.icon.danger",
        },
        {
          name: "icon/information",
          shorthand: "icon/information",
          variations: [{ name: "default", shorthand: "default", target: 4.5 }],
          description: "color.icon.information",
        },
        {
          name: "icon/discovery",
          shorthand: "icon/discovery",
          variations: [{ name: "default", shorthand: "default", target: 4.5 }],
          description: "color.icon.discovery",
        },

        // ══════════════════════════════════════════════════════════════════════
        // BORDER  →  color.border.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "border",
          shorthand: "border",
          variations: [
            { name: "default", shorthand: "default", target: 2.5 }, // color.border
            { name: "bold", shorthand: "bold", target: 4.5 }, // color.border.bold
            { name: "focused", shorthand: "focused", target: 3.0 }, // color.border.focused
            { name: "input", shorthand: "input", target: 2.5 }, // color.border.input
            { name: "inverse", shorthand: "inverse", target: 14.0 }, // color.border.inverse
            { name: "selected", shorthand: "selected", target: 4.5 }, // color.border.selected
            { name: "disabled", shorthand: "disabled", target: 1.5 }, // color.border.disabled
          ],
          description: "color.border — default · bold · focused · input · inverse · selected · disabled",
        },
        {
          name: "border/brand",
          shorthand: "border/brand",
          variations: [{ name: "default", shorthand: "default", target: 3.0 }],
          description: "color.border.brand",
        },
        {
          name: "border/success",
          shorthand: "border/success",
          variations: [{ name: "default", shorthand: "default", target: 3.0 }],
          description: "color.border.success",
        },
        {
          name: "border/warning",
          shorthand: "border/warning",
          variations: [{ name: "default", shorthand: "default", target: 2.5 }],
          description: "color.border.warning",
        },
        {
          name: "border/danger",
          shorthand: "border/danger",
          variations: [{ name: "default", shorthand: "default", target: 3.0 }],
          description: "color.border.danger",
        },
        {
          name: "border/information",
          shorthand: "border/information",
          variations: [{ name: "default", shorthand: "default", target: 3.0 }],
          description: "color.border.information",
        },
        {
          name: "border/discovery",
          shorthand: "border/discovery",
          variations: [{ name: "default", shorthand: "default", target: 3.0 }],
          description: "color.border.discovery",
        },

        // ══════════════════════════════════════════════════════════════════════
        // LINK  →  color.link.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "link",
          shorthand: "link",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // color.link (default)
            { name: "pressed", shorthand: "pressed", target: 7.0 }, // color.link.pressed
          ],
          description: "color.link — default and pressed link colors (AA+)",
        },

        // ══════════════════════════════════════════════════════════════════════
        // ELEVATION / SURFACE  →  elevation.surface.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "elevation/surface",
          shorthand: "elevation/surface",
          variations: [
            { name: "sunken", shorthand: "sunken", target: 1.05 }, // elevation.surface.sunken
            { name: "default", shorthand: "default", target: 1.0 }, // elevation.surface
            { name: "default/hovered", shorthand: "default/hovered", target: 1.03 },
            { name: "default/pressed", shorthand: "default/pressed", target: 1.06 },
            { name: "raised", shorthand: "raised", target: 1.1 }, // elevation.surface.raised
            { name: "raised/hovered", shorthand: "raised/hovered", target: 1.13 },
            { name: "raised/pressed", shorthand: "raised/pressed", target: 1.16 },
            { name: "overlay", shorthand: "overlay", target: 1.2 }, // elevation.surface.overlay
            { name: "overlay/hovered", shorthand: "overlay/hovered", target: 1.23 },
            { name: "overlay/pressed", shorthand: "overlay/pressed", target: 1.26 },
          ],
          description: "elevation.surface — sunken · default · raised · overlay with hover/press states",
        },

        // ══════════════════════════════════════════════════════════════════════
        // Blanket  →  color.blanket
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "blanket",
          shorthand: "blanket",
          variations: [
            { name: "default", shorthand: "default", target: 14.0 }, // color.blanket
            { name: "selected", shorthand: "selected", target: 10.0 }, // color.blanket.selected (blue-tinted)
          ],
          description: "color.blanket — modal overlay and selection overlay",
        },

        // ══════════════════════════════════════════════════════════════════════
        // SKELETON  →  color.skeleton.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "skeleton",
          shorthand: "skeleton",
          variations: [
            { name: "default", shorthand: "default", target: 1.15 }, // color.skeleton
            { name: "subtle", shorthand: "subtle", target: 1.05 }, // color.skeleton.subtle
          ],
          description: "color.skeleton — shimmer placeholder base and highlight",
        },

        // ══════════════════════════════════════════════════════════════════════
        // INTERACTION  →  color.interaction.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "interaction",
          shorthand: "interaction",
          variations: [
            { name: "hovered", shorthand: "hovered", target: 1.1 }, // color.interaction.hovered
            { name: "pressed", shorthand: "pressed", target: 1.2 }, // color.interaction.pressed
            { name: "inverse/hovered", shorthand: "inverse/hovered", target: 14.0 }, // color.interaction.inverse.hovered
            { name: "inverse/pressed", shorthand: "inverse/pressed", target: 16.0 }, // color.interaction.inverse.pressed
          ],
          description: "color.interaction — hover/press overlay tones for default and inverse surfaces",
        },
      ],

      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark", bg: "1D2125" },
      ],
    },
  },
];

export default presets;
