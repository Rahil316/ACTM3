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

import type { Preset } from '../types';

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
      resolveTokensDirectly: false,
      includeSourceColors: false,
      sourceCollectionName: "global",
      includeAlphaTints: false,
      alphaValues: "8, 16, 32, 50, 70, 85",
      tokenGrouping: "role",
      includeColorScalesCollection: true,
      includeDescriptions: true,

      // ── Collection names matching ADS exactly ──────────────────────────────
      scaleCollectionName: "color-palette",
      tokenCollectionName: "color",

      scaleStepNames: null,

      // Single global variation — not used (every role uses customVariationList).
      variations: [
        { name: "default", shorthand: "default" },
      ],

      // ── Key colors ─────────────────────────────────────────────────────────
      // ADS separates Brand and Information even though they share the same hue.
      // Selected also maps to blue. Each gets its own palette ramp so tonal
      // spacing is independent.
      colors: [
        { name: "brand",       shorthand: "brand",       value: "0C66E4", description: "Atlassian brand blue — primary action, links, focus" },
        { name: "neutral",     shorthand: "neutral",     value: "44546F", description: "Neutral slate — surfaces, borders, default text" },
        { name: "success",     shorthand: "success",     value: "22A06B", description: "Success green — positive states, confirmations" },
        { name: "warning",     shorthand: "warning",     value: "E2B203", description: "Warning yellow — caution, alert states" },
        { name: "danger",      shorthand: "danger",      value: "C9372C", description: "Danger red — errors, destructive actions" },
        { name: "information", shorthand: "information", value: "0055CC", description: "Information blue — informational banners and messages" },
        { name: "discovery",   shorthand: "discovery",   value: "8270DB", description: "Discovery purple — new features, onboarding, spotlights" },
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
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "subtlest",        shorthand: "subtlest"        }, // color.background.brand.subtlest
            { name: "subtlest/hovered", shorthand: "subtlest/hovered" },
            { name: "subtlest/pressed", shorthand: "subtlest/pressed" },
            { name: "bold",            shorthand: "bold"            }, // color.background.brand.bold
            { name: "bold/hovered",    shorthand: "bold/hovered"    },
            { name: "bold/pressed",    shorthand: "bold/pressed"    },
            { name: "boldest",         shorthand: "boldest"         }, // color.background.brand.boldest
            { name: "boldest/hovered", shorthand: "boldest/hovered" },
            { name: "boldest/pressed", shorthand: "boldest/pressed" },
          ],
          variationTargets: [1.05, 1.1, 1.15, 4.5, 5.0, 5.5, 8.0, 9.0, 10.0],
          description: "color.background.brand — brand-tinted fills from subtlest wash to boldest container",
        },

        // color.background.neutral.*
        {
          name: "background/neutral",
          shorthand: "background/neutral",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "subtle",          shorthand: "subtle"          }, // color.background.neutral.subtle
            { name: "subtle/hovered",  shorthand: "subtle/hovered"  },
            { name: "subtle/pressed",  shorthand: "subtle/pressed"  },
            { name: "default",         shorthand: "default"         }, // color.background.neutral
            { name: "default/hovered", shorthand: "default/hovered" },
            { name: "default/pressed", shorthand: "default/pressed" },
            { name: "bold",            shorthand: "bold"            }, // color.background.neutral.bold
            { name: "bold/hovered",    shorthand: "bold/hovered"    },
            { name: "bold/pressed",    shorthand: "bold/pressed"    },
          ],
          variationTargets: [1.05, 1.1, 1.15, 1.3, 1.4, 1.5, 4.5, 5.0, 5.5],
          description: "color.background.neutral — neutral fills: subtle wash · default container · bold",
        },

        // color.background.success.*
        {
          name: "background/success",
          shorthand: "background/success",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",         shorthand: "default"         }, // color.background.success
            { name: "default/hovered", shorthand: "default/hovered" },
            { name: "default/pressed", shorthand: "default/pressed" },
            { name: "bold",            shorthand: "bold"            }, // color.background.success.bold
            { name: "bold/hovered",    shorthand: "bold/hovered"    },
            { name: "bold/pressed",    shorthand: "bold/pressed"    },
          ],
          variationTargets: [1.1, 1.2, 1.3, 4.5, 5.0, 5.5],
          description: "color.background.success — success tinted fills",
        },

        // color.background.warning.*
        {
          name: "background/warning",
          shorthand: "background/warning",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",         shorthand: "default"         }, // color.background.warning
            { name: "default/hovered", shorthand: "default/hovered" },
            { name: "default/pressed", shorthand: "default/pressed" },
            { name: "bold",            shorthand: "bold"            }, // color.background.warning.bold
            { name: "bold/hovered",    shorthand: "bold/hovered"    },
            { name: "bold/pressed",    shorthand: "bold/pressed"    },
          ],
          variationTargets: [1.1, 1.2, 1.3, 3.0, 3.5, 4.0],
          description: "color.background.warning — warning tinted fills",
        },

        // color.background.danger.*
        {
          name: "background/danger",
          shorthand: "background/danger",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",         shorthand: "default"         }, // color.background.danger
            { name: "default/hovered", shorthand: "default/hovered" },
            { name: "default/pressed", shorthand: "default/pressed" },
            { name: "bold",            shorthand: "bold"            }, // color.background.danger.bold
            { name: "bold/hovered",    shorthand: "bold/hovered"    },
            { name: "bold/pressed",    shorthand: "bold/pressed"    },
          ],
          variationTargets: [1.1, 1.2, 1.3, 4.5, 5.0, 5.5],
          description: "color.background.danger — danger/error tinted fills",
        },

        // color.background.information.*
        {
          name: "background/information",
          shorthand: "background/information",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",         shorthand: "default"         }, // color.background.information
            { name: "default/hovered", shorthand: "default/hovered" },
            { name: "default/pressed", shorthand: "default/pressed" },
            { name: "bold",            shorthand: "bold"            }, // color.background.information.bold
            { name: "bold/hovered",    shorthand: "bold/hovered"    },
            { name: "bold/pressed",    shorthand: "bold/pressed"    },
          ],
          variationTargets: [1.1, 1.2, 1.3, 4.5, 5.0, 5.5],
          description: "color.background.information — informational tinted fills",
        },

        // color.background.discovery.*
        {
          name: "background/discovery",
          shorthand: "background/discovery",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",         shorthand: "default"         }, // color.background.discovery
            { name: "default/hovered", shorthand: "default/hovered" },
            { name: "default/pressed", shorthand: "default/pressed" },
            { name: "bold",            shorthand: "bold"            }, // color.background.discovery.bold
            { name: "bold/hovered",    shorthand: "bold/hovered"    },
            { name: "bold/pressed",    shorthand: "bold/pressed"    },
          ],
          variationTargets: [1.1, 1.2, 1.3, 4.5, 5.0, 5.5],
          description: "color.background.discovery — discovery/feature tinted fills",
        },

        // color.background.selected.* — blue, same hue as brand
        {
          name: "background/selected",
          shorthand: "background/selected",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",         shorthand: "default"         }, // color.background.selected
            { name: "default/hovered", shorthand: "default/hovered" },
            { name: "default/pressed", shorthand: "default/pressed" },
            { name: "bold",            shorthand: "bold"            }, // color.background.selected.bold
            { name: "bold/hovered",    shorthand: "bold/hovered"    },
            { name: "bold/pressed",    shorthand: "bold/pressed"    },
          ],
          variationTargets: [1.1, 1.2, 1.3, 4.5, 5.0, 5.5],
          description: "color.background.selected — selected state fills",
        },

        // color.background.input.* — neutral hue, input field bg
        {
          name: "background/input",
          shorthand: "background/input",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",         shorthand: "default"         }, // color.background.input
            { name: "default/hovered", shorthand: "default/hovered" },
            { name: "default/pressed", shorthand: "default/pressed" },
          ],
          variationTargets: [1.0, 1.05, 1.1],
          description: "color.background.input — form field background",
        },

        // ══════════════════════════════════════════════════════════════════════
        // TEXT  →  color.text.*
        // ══════════════════════════════════════════════════════════════════════

        // color.text (neutral default body text + subtlest/subtle/disabled/inverse/selected)
        {
          name: "text",
          shorthand: "text",
          minContrast: 3.0,
          customVariationList: true,
          customVariations: [
            { name: "default",  shorthand: "default"  }, // color.text
            { name: "subtle",   shorthand: "subtle"   }, // color.text.subtle
            { name: "subtlest", shorthand: "subtlest" }, // color.text.subtlest
            { name: "disabled", shorthand: "disabled" }, // color.text.disabled
            { name: "inverse",  shorthand: "inverse"  }, // color.text.inverse
            { name: "selected", shorthand: "selected" }, // color.text.selected
          ],
          variationTargets: [7.0, 4.5, 3.0, 2.0, 14.0, 4.5],
          description: "color.text — default body text through inverse",
        },

        // color.text.brand / danger / success / warning / information / discovery
        {
          name: "text/brand",
          shorthand: "text/brand",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // color.text.brand
          ],
          variationTargets: [4.5],
          description: "color.text.brand — brand-colored text (AA)",
        },
        {
          name: "text/success",
          shorthand: "text/success",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // color.text.success
          ],
          variationTargets: [4.5],
          description: "color.text.success — success-colored text (AA)",
        },
        {
          name: "text/warning",
          shorthand: "text/warning",
          minContrast: 3.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // color.text.warning
            { name: "inverse", shorthand: "inverse" }, // color.text.warning.inverse
          ],
          variationTargets: [3.0, 14.0],
          description: "color.text.warning — warning text and inverse on bold warning bg",
        },
        {
          name: "text/danger",
          shorthand: "text/danger",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // color.text.danger
          ],
          variationTargets: [4.5],
          description: "color.text.danger — danger/error text (AA)",
        },
        {
          name: "text/information",
          shorthand: "text/information",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // color.text.information
          ],
          variationTargets: [4.5],
          description: "color.text.information — informational text (AA)",
        },
        {
          name: "text/discovery",
          shorthand: "text/discovery",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // color.text.discovery
          ],
          variationTargets: [4.5],
          description: "color.text.discovery — discovery/feature text (AA)",
        },

        // ══════════════════════════════════════════════════════════════════════
        // ICON  →  color.icon.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "icon",
          shorthand: "icon",
          minContrast: 3.0,
          customVariationList: true,
          customVariations: [
            { name: "default",  shorthand: "default"  }, // color.icon
            { name: "subtle",   shorthand: "subtle"   }, // color.icon.subtle
            { name: "subtlest", shorthand: "subtlest" }, // color.icon.subtlest (disabled)
            { name: "inverse",  shorthand: "inverse"  }, // color.icon.inverse
            { name: "selected", shorthand: "selected" }, // color.icon.selected
          ],
          variationTargets: [4.5, 3.0, 2.0, 14.0, 4.5],
          description: "color.icon — functional · decorative · disabled · inverse · selected",
        },
        {
          name: "icon/brand",
          shorthand: "icon/brand",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [4.5],
          description: "color.icon.brand",
        },
        {
          name: "icon/success",
          shorthand: "icon/success",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [4.5],
          description: "color.icon.success",
        },
        {
          name: "icon/warning",
          shorthand: "icon/warning",
          minContrast: 3.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // color.icon.warning
            { name: "inverse", shorthand: "inverse" }, // color.icon.warning.inverse
          ],
          variationTargets: [3.0, 14.0],
          description: "color.icon.warning — warning icon and inverse",
        },
        {
          name: "icon/danger",
          shorthand: "icon/danger",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [4.5],
          description: "color.icon.danger",
        },
        {
          name: "icon/information",
          shorthand: "icon/information",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [4.5],
          description: "color.icon.information",
        },
        {
          name: "icon/discovery",
          shorthand: "icon/discovery",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [4.5],
          description: "color.icon.discovery",
        },

        // ══════════════════════════════════════════════════════════════════════
        // BORDER  →  color.border.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "border",
          shorthand: "border",
          minContrast: 1.5,
          customVariationList: true,
          customVariations: [
            { name: "default",  shorthand: "default"  }, // color.border
            { name: "bold",     shorthand: "bold"     }, // color.border.bold
            { name: "focused",  shorthand: "focused"  }, // color.border.focused
            { name: "input",    shorthand: "input"    }, // color.border.input
            { name: "inverse",  shorthand: "inverse"  }, // color.border.inverse
            { name: "selected", shorthand: "selected" }, // color.border.selected
            { name: "disabled", shorthand: "disabled" }, // color.border.disabled
          ],
          variationTargets: [2.5, 4.5, 3.0, 2.5, 14.0, 4.5, 1.5],
          description: "color.border — default · bold · focused · input · inverse · selected · disabled",
        },
        {
          name: "border/brand",
          shorthand: "border/brand",
          minContrast: 3.0,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [3.0],
          description: "color.border.brand",
        },
        {
          name: "border/success",
          shorthand: "border/success",
          minContrast: 3.0,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [3.0],
          description: "color.border.success",
        },
        {
          name: "border/warning",
          shorthand: "border/warning",
          minContrast: 2.5,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [2.5],
          description: "color.border.warning",
        },
        {
          name: "border/danger",
          shorthand: "border/danger",
          minContrast: 3.0,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [3.0],
          description: "color.border.danger",
        },
        {
          name: "border/information",
          shorthand: "border/information",
          minContrast: 3.0,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [3.0],
          description: "color.border.information",
        },
        {
          name: "border/discovery",
          shorthand: "border/discovery",
          minContrast: 3.0,
          customVariationList: true,
          customVariations: [{ name: "default", shorthand: "default" }],
          variationTargets: [3.0],
          description: "color.border.discovery",
        },

        // ══════════════════════════════════════════════════════════════════════
        // LINK  →  color.link.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "link",
          shorthand: "link",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // color.link (default)
            { name: "pressed", shorthand: "pressed" }, // color.link.pressed
          ],
          variationTargets: [4.5, 7.0],
          description: "color.link — default and pressed link colors (AA+)",
        },

        // ══════════════════════════════════════════════════════════════════════
        // ELEVATION / SURFACE  →  elevation.surface.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "elevation/surface",
          shorthand: "elevation/surface",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "sunken",           shorthand: "sunken"           }, // elevation.surface.sunken
            { name: "default",          shorthand: "default"          }, // elevation.surface
            { name: "default/hovered",  shorthand: "default/hovered"  },
            { name: "default/pressed",  shorthand: "default/pressed"  },
            { name: "raised",           shorthand: "raised"           }, // elevation.surface.raised
            { name: "raised/hovered",   shorthand: "raised/hovered"   },
            { name: "raised/pressed",   shorthand: "raised/pressed"   },
            { name: "overlay",          shorthand: "overlay"          }, // elevation.surface.overlay
            { name: "overlay/hovered",  shorthand: "overlay/hovered"  },
            { name: "overlay/pressed",  shorthand: "overlay/pressed"  },
          ],
          variationTargets: [1.05, 1.0, 1.03, 1.06, 1.1, 1.13, 1.16, 1.2, 1.23, 1.26],
          description: "elevation.surface — sunken · default · raised · overlay with hover/press states",
        },

        // ══════════════════════════════════════════════════════════════════════
        // BLANKET  →  color.blanket
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "blanket",
          shorthand: "blanket",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",  shorthand: "default"  }, // color.blanket
            { name: "selected", shorthand: "selected" }, // color.blanket.selected (blue-tinted)
          ],
          variationTargets: [14.0, 10.0],
          description: "color.blanket — modal overlay and selection overlay",
        },

        // ══════════════════════════════════════════════════════════════════════
        // SKELETON  →  color.skeleton.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "skeleton",
          shorthand: "skeleton",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // color.skeleton
            { name: "subtle",  shorthand: "subtle"  }, // color.skeleton.subtle
          ],
          variationTargets: [1.15, 1.05],
          description: "color.skeleton — shimmer placeholder base and highlight",
        },

        // ══════════════════════════════════════════════════════════════════════
        // INTERACTION  →  color.interaction.*
        // ══════════════════════════════════════════════════════════════════════

        {
          name: "interaction",
          shorthand: "interaction",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "hovered",          shorthand: "hovered"          }, // color.interaction.hovered
            { name: "pressed",          shorthand: "pressed"          }, // color.interaction.pressed
            { name: "inverse/hovered",  shorthand: "inverse/hovered"  }, // color.interaction.inverse.hovered
            { name: "inverse/pressed",  shorthand: "inverse/pressed"  }, // color.interaction.inverse.pressed
          ],
          variationTargets: [1.1, 1.2, 14.0, 16.0],
          description: "color.interaction — hover/press overlay tones for default and inverse surfaces",
        },

      ],

      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "1D2125" },
      ],
    },
  },
];

export default presets;
