/**
 * Shopify Polaris Design System preset.
 *
 * Role = semantic color group. Variations = the named slots within that group.
 *
 * Polaris token architecture: Background / Surface / Text / Border / Icon / Action / Status.
 * Status channels: Brand / Info / Success / Caution / Critical / Magic (Shopify AI).
 *
 * Collection names match Polaris conventions:
 *   scaleCollectionName: "color-palette"   → raw tonal palette ramps
 *   tokenCollectionName: "color"            → semantic Polaris color tokens
 *
 * Role/variation architecture (role = semantic group, variation = state/slot):
 *   background/         default · subdued · hover
 *   surface/            default · raised · overlay · subdued
 *   text/               default · subdued · critical · disabled
 *   border/             default · subdued · interactive
 *   icon/               default · subdued · critical · disabled
 *   action/primary/     default · hover · pressed · selected · disabled
 *   action/secondary/   default · hover · pressed · selected · disabled
 *   status/success/     bg/subtle · bg/default · fg · border
 *   status/caution/     bg/subtle · bg/default · fg · border
 *   status/critical/    bg/subtle · bg/default · fg · border
 *   status/info/        bg/subtle · bg/default · fg · border
 *   status/magic/       bg/subtle · bg/default · fg · border
 *
 * Contrast targets per slot (solved against theme bg):
 *   background/default    1.0   page background
 *   background/subdued    1.15  subdued section bg
 *   background/hover      1.3   hover on background
 *   surface/default       1.0   card / popover
 *   surface/raised        1.05  elevated card (dragging)
 *   surface/overlay       1.1   modal / sheet
 *   surface/subdued       1.2   deemphasized panel
 *   text/default          7.0   body text (AAA)
 *   text/subdued          4.5   secondary / helper text (AA)
 *   text/critical         4.5   error text
 *   text/disabled         2.0   disabled label
 *   border/default        2.0   standard UI border
 *   border/subdued        1.5   divider / subtle border
 *   border/interactive    3.0   focus ring
 *   icon/default          4.5   standard icon
 *   icon/subdued          3.0   muted icon
 *   icon/critical         4.5   error icon
 *   icon/disabled         2.0   disabled icon
 *   action/primary/*      4.5 → 7.0 → 8.0 → 9.0 → 2.0 (default→hover→pressed→selected→disabled)
 *   action/secondary/*    same 5-state model
 *   status/[channel]/bg/subtle    1.3   tinted status background
 *   status/[channel]/bg/default   1.8   stronger status fill
 *   status/[channel]/fg           4.5   status foreground text / icon
 *   status/[channel]/border       2.5   status border
 *   status/magic/fg               5.5   elevated for AI brand expression
 */

import type { Preset } from '../types';

const presets: Preset[] = [
  {
    id: "shopify-polaris",
    name: "Shopify Polaris",
    badge: "Polaris",
    description: "Shopify Polaris commerce token architecture. Role = semantic group (background, surface, text, border, icon, action, status). Variation = named slot. Brand/Info/Success/Caution/Critical/Magic channels with full interaction state coverage.",
    tags: ["shopify", "polaris", "commerce", "adaptive", "ecommerce"],
    swatches: ["303ADE", "8C9196", "007B5E", "916A00", "CC1515", "7B2EA8"],
    config: {
      name: "Shopify Polaris",
      pluginMode: "direct",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      useUniformAlgorithm: true,
      algorithmScopeLevel: "color",
      solverMode: "natural",
      tokenNameSegments: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      resolveTokensDirectly: false,
      includeSourceColors: false,
      sourceCollectionName: "global",
      includeAlphaTints: false,
      alphaValues: "5, 10, 20, 25, 50, 75, 80, 90, 95",
      tokenGrouping: "color",
      includeColorScalesCollection: false,
      includeDescriptions: true,
      scaleCollectionName: "color-palette",
      tokenCollectionName: "color",

      scaleStepNames: null,

      // Global variations — not used directly (all roles use customVariationList).
      variations: [
        { name: "default", shorthand: "default" },
      ],

      colors: [
        { name: "Brand",    shorthand: "Brand",    value: "303ADE", description: "Polaris brand blue — primary actions" },
        { name: "Neutral",  shorthand: "Neutral",  value: "8C9196", description: "Polaris neutral gray — surfaces and UI chrome" },
        { name: "Success",  shorthand: "Success",  value: "007B5E", description: "Polaris success green" },
        { name: "Caution",  shorthand: "Caution",  value: "916A00", description: "Polaris caution yellow-brown" },
        { name: "Critical", shorthand: "Critical", value: "CC1515", description: "Polaris critical red — errors, destructive actions" },
        { name: "Magic",    shorthand: "Magic",    value: "7B2EA8", description: "Polaris magic purple — AI / Shopify Intelligence" },
      ],

      roles: [

        // ── BACKGROUND ──────────────────────────────────────────────────────────
        // Page canvas, subdued sections, and hover state on page background.
        {
          name: "background",
          shorthand: "background",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // page background (near-white/near-black)
            { name: "subdued", shorthand: "subdued" }, // subdued page section
            { name: "hover",   shorthand: "hover"   }, // hover state on background
          ],
          variationTargets: [1.0, 1.15, 1.3],
          description: "Page and section background fills · default · subdued · hover",
        },

        // ── SURFACE ─────────────────────────────────────────────────────────────
        // Cards, popovers, modals, and deemphasized panels.
        {
          name: "surface",
          shorthand: "surface",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // card / popover
            { name: "raised",  shorthand: "raised"  }, // elevated card (dragging state)
            { name: "overlay", shorthand: "overlay" }, // modal / sheet
            { name: "subdued", shorthand: "subdued" }, // deemphasized panel
          ],
          variationTargets: [1.0, 1.05, 1.1, 1.2],
          description: "Card, popover, and modal surface fills",
        },

        // ── TEXT ────────────────────────────────────────────────────────────────
        // Body text, helper text, error text, and disabled labels.
        {
          name: "text",
          shorthand: "text",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "default",  shorthand: "default"  }, // body text (AAA)
            { name: "subdued",  shorthand: "subdued"  }, // secondary / helper text (AA)
            { name: "critical", shorthand: "critical" }, // error / destructive text
            { name: "disabled", shorthand: "disabled" }, // disabled label
          ],
          variationTargets: [7.0, 4.5, 4.5, 2.0],
          description: "Text label hierarchy · body · subdued · critical · disabled",
        },

        // ── BORDER ──────────────────────────────────────────────────────────────
        // Standard border, subtle divider, and interactive focus ring.
        {
          name: "border",
          shorthand: "border",
          minContrast: 1.5,
          customVariationList: true,
          customVariations: [
            { name: "default",     shorthand: "default"     }, // standard UI border
            { name: "subdued",     shorthand: "subdued"     }, // divider / subtle border
            { name: "interactive", shorthand: "interactive" }, // focus ring
          ],
          variationTargets: [2.0, 1.5, 3.0],
          description: "Border and divider strokes · default · subdued · focus ring",
        },

        // ── ICON ────────────────────────────────────────────────────────────────
        // Standard, muted, error, and disabled icon fills.
        {
          name: "icon",
          shorthand: "icon",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "default",  shorthand: "default"  }, // standard icon
            { name: "subdued",  shorthand: "subdued"  }, // muted / secondary icon
            { name: "critical", shorthand: "critical" }, // error icon
            { name: "disabled", shorthand: "disabled" }, // disabled icon
          ],
          variationTargets: [4.5, 3.0, 4.5, 2.0],
          description: "Icon fills · default · subdued · critical · disabled",
        },

        // ── ACTION / PRIMARY ─────────────────────────────────────────────────────
        // Primary CTA buttons — full 5-state interaction model.
        {
          name: "action/primary",
          shorthand: "action/primary",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "default",  shorthand: "default"  }, // resting CTA fill
            { name: "hover",    shorthand: "hover"    }, // hover
            { name: "pressed",  shorthand: "pressed"  }, // pressed / active
            { name: "selected", shorthand: "selected" }, // selected / checked
            { name: "disabled", shorthand: "disabled" }, // disabled
          ],
          variationTargets: [4.5, 5.5, 6.5, 7.0, 2.0],
          description: "Primary action fills · CTA buttons · 5 interaction states",
        },

        // ── ACTION / SECONDARY ───────────────────────────────────────────────────
        // Outline / ghost buttons — same 5-state model as primary.
        {
          name: "action/secondary",
          shorthand: "action/secondary",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "default",  shorthand: "default"  },
            { name: "hover",    shorthand: "hover"    },
            { name: "pressed",  shorthand: "pressed"  },
            { name: "selected", shorthand: "selected" },
            { name: "disabled", shorthand: "disabled" },
          ],
          variationTargets: [3.0, 4.5, 5.5, 6.5, 2.0],
          description: "Secondary action fills · outline buttons · 5 interaction states",
        },

        // ── STATUS / SUCCESS ─────────────────────────────────────────────────────
        {
          name: "status/success",
          shorthand: "status/success",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "bg/subtle",  shorthand: "bg/subtle"  }, // tinted success background
            { name: "bg/default", shorthand: "bg/default" }, // stronger success fill
            { name: "fg",         shorthand: "fg"         }, // success text / icon
            { name: "border",     shorthand: "border"     }, // success field border
          ],
          variationTargets: [1.3, 1.8, 4.5, 2.5],
          description: "Success feedback channel · bg/subtle · bg/default · fg · border",
        },

        // ── STATUS / CAUTION ─────────────────────────────────────────────────────
        {
          name: "status/caution",
          shorthand: "status/caution",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "bg/subtle",  shorthand: "bg/subtle"  },
            { name: "bg/default", shorthand: "bg/default" },
            { name: "fg",         shorthand: "fg"         },
            { name: "border",     shorthand: "border"     },
          ],
          variationTargets: [1.3, 1.8, 4.5, 2.5],
          description: "Caution / warning feedback channel · bg/subtle · bg/default · fg · border",
        },

        // ── STATUS / CRITICAL ────────────────────────────────────────────────────
        {
          name: "status/critical",
          shorthand: "status/critical",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "bg/subtle",  shorthand: "bg/subtle"  },
            { name: "bg/default", shorthand: "bg/default" },
            { name: "fg",         shorthand: "fg"         },
            { name: "border",     shorthand: "border"     },
          ],
          variationTargets: [1.3, 1.8, 4.5, 2.5],
          description: "Critical / error feedback channel · bg/subtle · bg/default · fg · border",
        },

        // ── STATUS / INFO ────────────────────────────────────────────────────────
        {
          name: "status/info",
          shorthand: "status/info",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "bg/subtle",  shorthand: "bg/subtle"  },
            { name: "bg/default", shorthand: "bg/default" },
            { name: "fg",         shorthand: "fg"         },
            { name: "border",     shorthand: "border"     },
          ],
          variationTargets: [1.3, 1.8, 4.5, 2.5],
          description: "Informational feedback channel · bg/subtle · bg/default · fg · border",
        },

        // ── STATUS / MAGIC ───────────────────────────────────────────────────────
        // Shopify Intelligence / AI brand expression. Slightly elevated FG target.
        {
          name: "status/magic",
          shorthand: "status/magic",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "bg/subtle",  shorthand: "bg/subtle"  },
            { name: "bg/default", shorthand: "bg/default" },
            { name: "fg",         shorthand: "fg"         },
            { name: "border",     shorthand: "border"     },
          ],
          variationTargets: [1.3, 1.8, 5.5, 2.5],
          description: "Magic (Shopify AI) feedback channel · elevated FG contrast for brand expression",
        },

      ],

      themes: [
        { name: "Light",   bg: "FAFBFB" },
        { name: "Dark",    bg: "1A1A1A" },
        { name: "Inverse", bg: "1A1F36" },
      ],
    },
  },
];

export default presets;
