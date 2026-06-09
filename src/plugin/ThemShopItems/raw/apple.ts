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

import type { Preset } from "../../../shared/themeShop";

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
      includeSourceColors: true,
      sourceCollectionName: "system-colors",
      alphaValues: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
      includeColorScalesCollection: false,
      includeDescriptions: true,
      scaleCollectionName: "system-colors",
      tokenCollectionName: "semantic-colors",

      scaleSteps: null,

      // Global variations — not used directly (all roles use customVariationList).
      variations: [{ name: "default", shorthand: "default", target: 1 }],

      colors: [
        { name: "System/Blue", shorthand: "System/Blue", value: "007AFF", description: "systemBlue — primary interactive tint" },
        { name: "System/Red", shorthand: "System/Red", value: "FF3B30", description: "systemRed — destructive actions" },
        { name: "System/Green", shorthand: "System/Green", value: "34C759", description: "systemGreen — success / go" },
        { name: "System/Orange", shorthand: "System/Orange", value: "FF9500", description: "systemOrange — warnings / attention" },
        { name: "System/Gray", shorthand: "System/Gray", value: "8E8E93", description: "systemGray — neutral fills and borders" },
      ],

      roles: [
        // ── LABEL ───────────────────────────────────────────────────────────────
        // systemLabel → quaternaryLabel — text over system backgrounds.
        // Apple uses opacity-based rendering; contrast targets approximate the
        // perceptual intent of each opacity tier.
        {
          name: "label",
          shorthand: "label",
          variations: [
            { name: "primary", shorthand: "primary", target: 7 }, // systemLabel            — full opacity
            { name: "secondary", shorthand: "secondary", target: 4.5 }, // secondaryLabel         — ~60% opacity
            { name: "tertiary", shorthand: "tertiary", target: 3 }, // tertiaryLabel          — ~30% opacity
            { name: "quaternary", shorthand: "quaternary", target: 2 }, // quaternaryLabel        — ~18% opacity
          ],
          description: "Text label hierarchy · primary → secondary → tertiary → quaternary",
        },

        // ── FILL ────────────────────────────────────────────────────────────────
        // systemFill → quaternarySystemFill — interactive control fills.
        // Same 4-tier structure as label but serving as control backgrounds.
        {
          name: "fill",
          shorthand: "fill",
          variations: [
            { name: "primary", shorthand: "primary", target: 2.5 }, // systemFill
            { name: "secondary", shorthand: "secondary", target: 2.0 }, // secondarySystemFill
            { name: "tertiary", shorthand: "tertiary", target: 1.7 }, // tertiarySystemFill
            { name: "quaternary", shorthand: "quaternary", target: 1.4 }, // quaternarySystemFill
          ],
          description: "System fill hierarchy · interactive control surfaces · 4 tiers",
        },

        // ── BACKGROUND ──────────────────────────────────────────────────────────
        // systemBackground / secondarySystemBackground / tertiarySystemBackground
        {
          name: "background",
          shorthand: "background",
          variations: [
            { name: "default", shorthand: "default", target: 1.0 }, // systemBackground        — page canvas
            { name: "secondary", shorthand: "secondary", target: 1.1 }, // secondarySystemBackground — grouped tables
            { name: "tertiary", shorthand: "tertiary", target: 1.2 }, // tertiarySystemBackground  — nested groups
          ],
          description: "System background · page / grouped / nested surface",
        },

        // ── BACKGROUND / GROUPED ────────────────────────────────────────────────
        // systemGroupedBackground — insetGrouped style table bg, distinct in dark mode.
        {
          name: "background/grouped",
          shorthand: "background/grouped",
          variations: [
            { name: "default", shorthand: "default", target: 1.0 }, // systemGroupedBackground
            { name: "secondary", shorthand: "secondary", target: 1.15 }, // secondarySystemGroupedBackground
            { name: "tertiary", shorthand: "tertiary", target: 1.3 }, // tertiarySystemGroupedBackground
          ],
          description: "Grouped-style (insetGrouped) background hierarchy",
        },

        // ── SEPARATOR ───────────────────────────────────────────────────────────
        // systemSeparator (alpha-blended) / systemOpaqueSeparator (solid)
        {
          name: "separator",
          shorthand: "separator",
          variations: [
            { name: "default", shorthand: "default", target: 1.5 }, // systemSeparator       — translucent hairline
            { name: "opaque", shorthand: "opaque", target: 2.5 }, // systemOpaqueSeparator — screenshot-safe solid
          ],
          description: "Separator lines · translucent hairline and opaque fallback",
        },

        // ── TINT ────────────────────────────────────────────────────────────────
        // The tint color (systemBlue) in all four label-like rendering tiers.
        {
          name: "tint",
          shorthand: "tint",
          variations: [
            { name: "primary", shorthand: "primary", target: 4.5 }, // primary tint (links, buttons)
            { name: "secondary", shorthand: "secondary", target: 3.5 }, // secondary tint
            { name: "tertiary", shorthand: "tertiary", target: 3.0 }, // tertiary tint
            { name: "quaternary", shorthand: "quaternary", target: 2.0 }, // quaternary tint
          ],
          description: "Interactive tint · primary accent in four rendering tiers",
        },

        // ── STATUS / ERROR ───────────────────────────────────────────────────────
        {
          name: "status/error",
          shorthand: "status/error",
          variations: [
            { name: "primary", shorthand: "primary", target: 7.0 },
            { name: "secondary", shorthand: "secondary", target: 4.5 },
            { name: "tertiary", shorthand: "tertiary", target: 3 },
            { name: "quaternary", shorthand: "quaternary", target: 2 },
          ],
          description: "Error / destructive semantic hierarchy · 4 rendering tiers",
        },

        // ── STATUS / SUCCESS ─────────────────────────────────────────────────────
        {
          name: "status/success",
          shorthand: "status/success",
          variations: [
            { name: "primary", shorthand: "primary", target: 7.0 },
            { name: "secondary", shorthand: "secondary", target: 4.5 },
            { name: "tertiary", shorthand: "tertiary", target: 3 },
            { name: "quaternary", shorthand: "quaternary", target: 2 },
          ],
          description: "Success / confirmation semantic hierarchy · 4 rendering tiers",
        },

        // ── STATUS / WARNING ─────────────────────────────────────────────────────
        {
          name: "status/warning",
          shorthand: "status/warning",
          variations: [
            { name: "primary", shorthand: "primary", target: 7.0 },
            { name: "secondary", shorthand: "secondary", target: 4.5 },
            { name: "tertiary", shorthand: "tertiary", target: 3 },
            { name: "quaternary", shorthand: "quaternary", target: 2 },
          ],
          description: "Warning / attention semantic hierarchy · 4 rendering tiers",
        },
      ],

      themes: [
        { name: "Light", bg: "F2F2F7" },
        { name: "Dark", bg: "000000" },
      ],
    },
  },
];

export default presets;
