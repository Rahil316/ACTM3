/**
 * Apple Human Interface Guidelines preset.
 *
 * Role = semantic color family. Variations = the named slots within that family.
 *
 * Apple's adaptive color system uses four semantic stacks, all solved against
 * the system background. includeSourceColors emits the fixed system hex values
 * (systemBlue, systemRed, etc.) to a separate "_system-colors" primitives collection —
 * matching Apple's requirement that those values never change per theme.
 *
 * Collection names mirror Apple's system:
 *   scaleCollectionName: "system-colors"   → fixed system color primitives (hex constants)
 *   tokenCollectionName: "semantic-colors"  → adaptive role tokens (light + dark modes)
 *
 * Role/variation architecture (role = semantic family, variation = tier within family):
 *   label/          primary · secondary · tertiary · quaternary
 *   fill/           primary · secondary · tertiary · quaternary
 *   background/     default · secondary · tertiary
 *   background/grouped/  default · secondary · tertiary
 *   separator/      default · opaque
 *   tint/           primary · secondary · tertiary · quaternary
 *   status/error/   primary · secondary · tertiary · quaternary
 *   status/success/ primary · secondary · tertiary · quaternary
 *   status/warning/ primary · secondary · tertiary · quaternary
 *
 * Contrast targets per slot (solved against theme bg #F2F2F7 light / #000000 dark):
 *   primary     7.0   full-opacity label / fill intent (AAA)
 *   secondary   4.5   60% opacity equivalent (AA body)
 *   tertiary    3.0   30% opacity equivalent (AA-large)
 *   quaternary  2.0   18% opacity equivalent (muted/disabled)
 *   background/default    1.0   system background (matches page)
 *   background/secondary  1.1   grouped table background
 *   background/tertiary   1.2   nested group / card
 *   separator/default     1.5   translucent hairline divider
 *   separator/opaque      2.5   solid separator (screenshot-safe)
 */

import type { Preset } from '../types';

const presets: Preset[] = [
  {
    id: "apple-hig",
    name: "Apple HIG",
    badge: "Apple",
    description: "iOS/macOS adaptive semantic colors. Role = Apple color family (label, fill, background, separator). Variation = tier (primary → quaternary). Fixed system color primitives in a separate collection.",
    tags: ["apple", "ios", "macos", "hig", "adaptive", "system-colors"],
    swatches: ["007AFF", "FF3B30", "34C759", "FF9500", "8E8E93"],
    config: {
      name: "Apple HIG",
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
      includeSourceColors: true,
      sourceCollectionName: "system-colors",
      includeAlphaTints: true,
      alphaValues: "8, 16, 32, 50, 70, 85",
      tokenGrouping: "color",
      includeColorScalesCollection: false,
      includeDescriptions: true,
      scaleCollectionName: "system-colors",
      tokenCollectionName: "semantic-colors",

      scaleStepNames: null,

      // Global variations — not used directly (all roles use customVariationList).
      variations: [
        { name: "default", shorthand: "default" },
      ],

      colors: [
        { name: "System/Blue",   shorthand: "System/Blue",   value: "007AFF", description: "systemBlue — primary interactive tint" },
        { name: "System/Red",    shorthand: "System/Red",    value: "FF3B30", description: "systemRed — destructive actions" },
        { name: "System/Green",  shorthand: "System/Green",  value: "34C759", description: "systemGreen — success / go" },
        { name: "System/Orange", shorthand: "System/Orange", value: "FF9500", description: "systemOrange — warnings / attention" },
        { name: "System/Gray",   shorthand: "System/Gray",   value: "8E8E93", description: "systemGray — neutral fills and borders" },
      ],

      roles: [

        // ── LABEL ───────────────────────────────────────────────────────────────
        // systemLabel → quaternaryLabel — text over system backgrounds.
        // Apple uses opacity-based rendering; contrast targets approximate the
        // perceptual intent of each opacity tier.
        {
          name: "label",
          shorthand: "label",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "primary",    shorthand: "primary"    }, // systemLabel            — full opacity
            { name: "secondary",  shorthand: "secondary"  }, // secondaryLabel         — ~60% opacity
            { name: "tertiary",   shorthand: "tertiary"   }, // tertiaryLabel          — ~30% opacity
            { name: "quaternary", shorthand: "quaternary" }, // quaternaryLabel        — ~18% opacity
          ],
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "Text label hierarchy · primary → secondary → tertiary → quaternary",
        },

        // ── FILL ────────────────────────────────────────────────────────────────
        // systemFill → quaternarySystemFill — interactive control fills.
        // Same 4-tier structure as label but serving as control backgrounds.
        {
          name: "fill",
          shorthand: "fill",
          minContrast: 1.5,
          customVariationList: true,
          customVariations: [
            { name: "primary",    shorthand: "primary"    }, // systemFill
            { name: "secondary",  shorthand: "secondary"  }, // secondarySystemFill
            { name: "tertiary",   shorthand: "tertiary"   }, // tertiarySystemFill
            { name: "quaternary", shorthand: "quaternary" }, // quaternarySystemFill
          ],
          variationTargets: [2.5, 2.0, 1.7, 1.4],
          description: "System fill hierarchy · interactive control surfaces · 4 tiers",
        },

        // ── BACKGROUND ──────────────────────────────────────────────────────────
        // systemBackground / secondarySystemBackground / tertiarySystemBackground
        {
          name: "background",
          shorthand: "background",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",   shorthand: "default"   }, // systemBackground        — page canvas
            { name: "secondary", shorthand: "secondary" }, // secondarySystemBackground — grouped tables
            { name: "tertiary",  shorthand: "tertiary"  }, // tertiarySystemBackground  — nested groups
          ],
          variationTargets: [1.0, 1.1, 1.2],
          description: "System background · page / grouped / nested surface",
        },

        // ── BACKGROUND / GROUPED ────────────────────────────────────────────────
        // systemGroupedBackground — insetGrouped style table bg, distinct in dark mode.
        {
          name: "background/grouped",
          shorthand: "background/grouped",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",   shorthand: "default"   }, // systemGroupedBackground
            { name: "secondary", shorthand: "secondary" }, // secondarySystemGroupedBackground
            { name: "tertiary",  shorthand: "tertiary"  }, // tertiarySystemGroupedBackground
          ],
          variationTargets: [1.0, 1.15, 1.3],
          description: "Grouped-style (insetGrouped) background hierarchy",
        },

        // ── SEPARATOR ───────────────────────────────────────────────────────────
        // systemSeparator (alpha-blended) / systemOpaqueSeparator (solid)
        {
          name: "separator",
          shorthand: "separator",
          minContrast: 1.5,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // systemSeparator       — translucent hairline
            { name: "opaque",  shorthand: "opaque"  }, // systemOpaqueSeparator — screenshot-safe solid
          ],
          variationTargets: [1.5, 2.5],
          description: "Separator lines · translucent hairline and opaque fallback",
        },

        // ── TINT ────────────────────────────────────────────────────────────────
        // The tint color (systemBlue) in all four label-like rendering tiers.
        {
          name: "tint",
          shorthand: "tint",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "primary",    shorthand: "primary"    }, // primary tint (links, buttons)
            { name: "secondary",  shorthand: "secondary"  }, // secondary tint
            { name: "tertiary",   shorthand: "tertiary"   }, // tertiary tint
            { name: "quaternary", shorthand: "quaternary" }, // quaternary tint
          ],
          variationTargets: [4.5, 3.5, 3.0, 2.0],
          description: "Interactive tint · primary accent in four rendering tiers",
        },

        // ── STATUS / ERROR ───────────────────────────────────────────────────────
        {
          name: "status/error",
          shorthand: "status/error",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "primary",    shorthand: "primary"    },
            { name: "secondary",  shorthand: "secondary"  },
            { name: "tertiary",   shorthand: "tertiary"   },
            { name: "quaternary", shorthand: "quaternary" },
          ],
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "Error / destructive semantic hierarchy · 4 rendering tiers",
        },

        // ── STATUS / SUCCESS ─────────────────────────────────────────────────────
        {
          name: "status/success",
          shorthand: "status/success",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "primary",    shorthand: "primary"    },
            { name: "secondary",  shorthand: "secondary"  },
            { name: "tertiary",   shorthand: "tertiary"   },
            { name: "quaternary", shorthand: "quaternary" },
          ],
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "Success / confirmation semantic hierarchy · 4 rendering tiers",
        },

        // ── STATUS / WARNING ─────────────────────────────────────────────────────
        {
          name: "status/warning",
          shorthand: "status/warning",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "primary",    shorthand: "primary"    },
            { name: "secondary",  shorthand: "secondary"  },
            { name: "tertiary",   shorthand: "tertiary"   },
            { name: "quaternary", shorthand: "quaternary" },
          ],
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "Warning / attention semantic hierarchy · 4 rendering tiers",
        },

      ],

      themes: [
        { name: "Light", bg: "F2F2F7" },
        { name: "Dark",  bg: "000000" },
      ],
    },
  },
];

export default presets;
