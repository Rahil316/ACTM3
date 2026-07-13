// ── TOKEN WAND PRESETS ────────────────────────────────────────────────────────
// Three house presets: Regular (professional scale), Pro (direct, all channels),
// Funk (chroma-maximized, bold creative).
// WCAG contrast ratios (1.0 – 21.0).

import type { Preset } from "../../themeShop";

const presets: Preset[] = [
  // ── TW Regular ──────────────────────────────────────────────────────────────
  // Tonal, Natural algo, 25-step scale. Semantic layer stack.
  // Swap the 3 seed colors and ship. Default preset on first launch.
  {
    id: "regular-wand",
    name: "Regular Wand",
    badge: "TW",
    description: "Clean professional system. Full semantic layer stack — backgrounds, surfaces, borders, fills, text. Swap the seed colors and ship.",
    tags: ["Professional", "Tonal", "Light+Dark"],
    config: {
      name: "Regular Wand",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      useUniformAlgorithm: true,
      solverMode: "natural",
      tokenNameSegments: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      includeSourceColors: true,
      sourceCollectionName: "global",
      alphaValues: [10, 25, 50, 75, 90],
      includeColorScalesCollection: true,
      includeDescriptions: false,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      canEditRoleVariants: false,

      // Global variations — 5 semantic intensity levels used by all 12 roles.
      variations: [
        { name: "Subtle", shorthand: "1", target: 1 },
        { name: "Soft", shorthand: "2", target: 1 },
        { name: "Default", shorthand: "3", target: 1 },
        { name: "Strong", shorthand: "4", target: 1 },
        { name: "Bold", shorthand: "5", target: 1 },
      ],
      colors: [
        {
          name: "Brand/Primary",
          shorthand: "bp",
          value: "0066FF",
          description: "Primary brand color — vivid blue",
        },
        {
          name: "Brand/Neutral",
          shorthand: "bn",
          value: "6B7280",
          description: "Neutral gray for surfaces and text",
        },
        {
          name: "Brand/Accent",
          shorthand: "ba",
          value: "8B5CF6",
          description: "Accent — violet for highlights and CTAs",
        },
      ],

      roles: [
        // Backgrounds — lightest wash of the scale. Page and off-white variants.
        {
          name: "Background",
          shorthand: "bg",
          variations: [
            { name: "Subtle", shorthand: "1", target: 1.0 },
            { name: "Soft", shorthand: "2", target: 1.05 },
            { name: "Default", shorthand: "3", target: 1.1 },
            { name: "Strong", shorthand: "4", target: 1.2 },
            { name: "Bold", shorthand: "5", target: 1.35 },
          ],
        },
        {
          name: "Background/Subtle",
          shorthand: "bgs",
          variations: [
            { name: "Subtle", shorthand: "1", target: 1.1 },
            { name: "Soft", shorthand: "2", target: 1.2 },
            { name: "Default", shorthand: "3", target: 1.35 },
            { name: "Strong", shorthand: "4", target: 1.5 },
            { name: "Bold", shorthand: "5", target: 1.8 },
          ],
        },
        // Surfaces — card and raised element backgrounds.
        {
          name: "Surface",
          shorthand: "sf",
          variations: [
            { name: "Subtle", shorthand: "1", target: 1.35 },
            { name: "Soft", shorthand: "2", target: 1.5 },
            { name: "Default", shorthand: "3", target: 1.8 },
            { name: "Strong", shorthand: "4", target: 2.2 },
            { name: "Bold", shorthand: "5", target: 2.7 },
          ],
        },
        {
          name: "Surface/Raised",
          shorthand: "sfr",
          variations: [
            { name: "Subtle", shorthand: "1", target: 1.8 },
            { name: "Soft", shorthand: "2", target: 2.2 },
            { name: "Default", shorthand: "3", target: 2.7 },
            { name: "Strong", shorthand: "4", target: 3.2 },
            { name: "Bold", shorthand: "5", target: 4.0 },
          ],
        },
        // Borders — subtle to strong outlines.
        {
          name: "Border",
          shorthand: "bd",
          variations: [
            { name: "Subtle", shorthand: "1", target: 2.7 },
            { name: "Soft", shorthand: "2", target: 3.2 },
            { name: "Default", shorthand: "3", target: 4.0 },
            { name: "Strong", shorthand: "4", target: 4.8 },
            { name: "Bold", shorthand: "5", target: 5.8 },
          ],
        },
        {
          name: "Border/Strong",
          shorthand: "bds",
          variations: [
            { name: "Subtle", shorthand: "1", target: 4.0 },
            { name: "Soft", shorthand: "2", target: 4.8 },
            { name: "Default", shorthand: "3", target: 5.8 },
            { name: "Strong", shorthand: "4", target: 7.0 },
            { name: "Bold", shorthand: "5", target: 8.5 },
          ],
        },
        // Fills — interactive component fills and solid CTAs.
        {
          name: "Fill",
          shorthand: "fi",
          variations: [
            { name: "Subtle", shorthand: "1", target: 2.7 },
            { name: "Soft", shorthand: "2", target: 4.0 },
            { name: "Default", shorthand: "3", target: 5.8 },
            { name: "Strong", shorthand: "4", target: 8.5 },
            { name: "Bold", shorthand: "5", target: 11.5 },
          ],
        },
        {
          name: "Fill/Strong",
          shorthand: "fis",
          variations: [
            { name: "Subtle", shorthand: "1", target: 4.0 },
            { name: "Soft", shorthand: "2", target: 5.8 },
            { name: "Default", shorthand: "3", target: 8.5 },
            { name: "Strong", shorthand: "4", target: 11.5 },
            { name: "Bold", shorthand: "5", target: 14.5 },
          ],
        },
        // Text — from placeholder/muted through to AAA headings.
        {
          name: "Text/Muted",
          shorthand: "txm",
          variations: [
            { name: "Subtle", shorthand: "1", target: 7.0 },
            { name: "Soft", shorthand: "2", target: 8.5 },
            { name: "Default", shorthand: "3", target: 10.0 },
            { name: "Strong", shorthand: "4", target: 11.5 },
            { name: "Bold", shorthand: "5", target: 13.0 },
          ],
        },
        {
          name: "Text",
          shorthand: "tx",
          variations: [
            { name: "Subtle", shorthand: "1", target: 10.0 },
            { name: "Soft", shorthand: "2", target: 11.5 },
            { name: "Default", shorthand: "3", target: 13.0 },
            { name: "Strong", shorthand: "4", target: 14.5 },
            { name: "Bold", shorthand: "5", target: 16.0 },
          ],
        },
        {
          name: "Text/Strong",
          shorthand: "txs",
          variations: [
            { name: "Subtle", shorthand: "1", target: 13.0 },
            { name: "Soft", shorthand: "2", target: 14.5 },
            { name: "Default", shorthand: "3", target: 16.0 },
            { name: "Strong", shorthand: "4", target: 17.5 },
            { name: "Bold", shorthand: "5", target: 19.0 },
          ],
        },
        // Inverse — text or fill used against a dark/colored background.
        {
          name: "Text/Inverse",
          shorthand: "txi",
          variations: [
            { name: "Subtle", shorthand: "1", target: 1.1 },
            { name: "Soft", shorthand: "2", target: 1.2 },
            { name: "Default", shorthand: "3", target: 1.35 },
            { name: "Strong", shorthand: "4", target: 1.5 },
            { name: "Bold", shorthand: "5", target: 1.8 },
          ],
        },
      ],
      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark", bg: "0F0F0F" },
      ],
    },
  },

  // ── TW Pro ───────────────────────────────────────────────────────────────────
  // Direct mode, natural solver. Every output channel enabled.
  // Per-role variation overrides with "/" semantic names produce deeply-nested
  // Figma variable folder groups: Brand/Primary → Surface → Layer/01, etc.
  {
    id: "tw-pro",
    name: "TW Pro",
    badge: "TW",
    description: "Full system. Direct mode, global brand constants + alpha tints, 3 themes. Per-role semantic variation groups for Surface, Text, Status, Outline, and Inverse.",
    tags: ["Comprehensive", "Adaptive", "Multi-theme"],
    config: {
      name: "TW Pro",
      pluginMode: "direct",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      useUniformAlgorithm: true,
      solverMode: "natural",
      tokenNameSegments: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      includeSourceColors: true,
      sourceCollectionName: "brand",
      alphaValues: [10, 20, 40, 60, 80, 90],
      includeColorScalesCollection: false,
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      canEditRoleVariants: true,
      // Global variations — interaction states. Used by Primary, Secondary, and Action roles.
      variations: [
        { name: "State/Rest", shorthand: "r", target: 4.5 },
        { name: "State/Hover", shorthand: "h", target: 6.0 },
        { name: "State/Pressed", shorthand: "p", target: 7.0 },
        { name: "State/Disabled", shorthand: "d", target: 2.0 },
      ],
      colors: [
        {
          name: "Brand/Primary",
          shorthand: "bp",
          value: "0055E5",
          description: "Primary brand — deep vivid blue",
        },
        {
          name: "Brand/Secondary",
          shorthand: "bs",
          value: "7C3AED",
          description: "Secondary brand — violet",
        },
        {
          name: "Brand/Neutral",
          shorthand: "bn",
          value: "64748B",
          description: "Neutral slate — surfaces and text",
        },
        {
          name: "Status/Error",
          shorthand: "er",
          value: "DC2626",
          description: "Error and danger states",
        },
      ],
      roles: [
        // Primary / Secondary — interactive accent colors, 4-state global variations.
        {
          name: "Primary",
          shorthand: "pr",
          variations: [
            { name: "State/Rest", shorthand: "r", target: 4.5 },
            { name: "State/Hover", shorthand: "h", target: 6.0 },
            { name: "State/Pressed", shorthand: "p", target: 7.0 },
            { name: "State/Disabled", shorthand: "d", target: 2.0 },
          ],
        },
        {
          name: "Primary/Container",
          shorthand: "prc",
          variations: [
            { name: "Layer/01", shorthand: "l1", target: 1.05 },
            { name: "Layer/02", shorthand: "l2", target: 1.2 },
            { name: "Layer/03", shorthand: "l3", target: 1.4 },
            { name: "Layer/04", shorthand: "l4", target: 1.7 },
            { name: "Layer/Scrim", shorthand: "ls", target: 2.5 },
          ],
        },
        {
          name: "On/Primary",
          shorthand: "op",
          variations: [
            { name: "State/Rest", shorthand: "r", target: 4.5 },
            { name: "State/Hover", shorthand: "h", target: 6.0 },
            { name: "State/Pressed", shorthand: "p", target: 7.0 },
            { name: "State/Disabled", shorthand: "d", target: 2.0 },
          ],
        },
        {
          name: "Secondary",
          shorthand: "sc",
          variations: [
            { name: "State/Rest", shorthand: "r", target: 4.5 },
            { name: "State/Hover", shorthand: "h", target: 6.0 },
            { name: "State/Pressed", shorthand: "p", target: 7.0 },
            { name: "State/Disabled", shorthand: "d", target: 2.0 },
          ],
        },
        {
          name: "On/Secondary",
          shorthand: "os",
          variations: [
            { name: "State/Rest", shorthand: "r", target: 4.5 },
            { name: "State/Hover", shorthand: "h", target: 6.0 },
            { name: "State/Pressed", shorthand: "p", target: 7.0 },
            { name: "State/Disabled", shorthand: "d", target: 2.0 },
          ],
        },

        // Surface family — 5-layer depth model with "/" naming → nested Figma folders.
        // Layer/01 = page bg (barely-there), Layer/Scrim = modal overlay.
        {
          name: "Surface",
          shorthand: "sf",
          variations: [
            { name: "Layer/01", shorthand: "l1", target: 1.05 },
            { name: "Layer/02", shorthand: "l2", target: 1.2 },
            { name: "Layer/03", shorthand: "l3", target: 1.4 },
            { name: "Layer/04", shorthand: "l4", target: 1.7 },
            { name: "Layer/Scrim", shorthand: "ls", target: 2.5 },
          ],
        },

        // Text family — Emphasis hierarchy from accessible body copy to disabled.
        {
          name: "On/Surface",
          shorthand: "ons",
          variations: [
            { name: "Emphasis/High", shorthand: "eh", target: 7.0 },
            { name: "Emphasis/Medium", shorthand: "em", target: 4.5 },
            { name: "Emphasis/Low", shorthand: "el", target: 3.0 },
            { name: "Emphasis/Disabled", shorthand: "ed", target: 2.0 },
          ],
        },

        // Outline — three weights of border/separator.
        {
          name: "Outline",
          shorthand: "ol",
          variations: [
            { name: "Weight/Subtle", shorthand: "ws", target: 1.8 },
            { name: "Weight/Default", shorthand: "wd", target: 2.5 },
            { name: "Weight/Strong", shorthand: "wst", target: 3.5 },
          ],
        },

        // Action roles — 4 interaction states via global variations.
        {
          name: "Action/Primary",
          shorthand: "ap",
          variations: [
            { name: "State/Rest", shorthand: "r", target: 4.5 },
            { name: "State/Hover", shorthand: "h", target: 6.0 },
            { name: "State/Pressed", shorthand: "p", target: 7.0 },
            { name: "State/Disabled", shorthand: "d", target: 2.0 },
          ],
        },
        {
          name: "Action/Secondary",
          shorthand: "as",
          variations: [
            { name: "State/Rest", shorthand: "r", target: 3.0 },
            { name: "State/Hover", shorthand: "h", target: 4.5 },
            { name: "State/Pressed", shorthand: "p", target: 6.0 },
            { name: "State/Disabled", shorthand: "d", target: 2.0 },
          ],
        },
        {
          name: "Action/Destructive",
          shorthand: "ade",
          variations: [
            { name: "State/Rest", shorthand: "r", target: 4.5 },
            { name: "State/Hover", shorthand: "h", target: 6.0 },
            { name: "State/Pressed", shorthand: "p", target: 7.0 },
            { name: "State/Disabled", shorthand: "d", target: 2.0 },
          ],
        },

        // Status / Error — 4 semantic token slots per status color.
        // BG/Subtle = tinted bg, BG/Default = stronger bg, FG/Default = foreground text, Border = outline.
        {
          name: "Status/Error",
          shorthand: "se",
          variations: [
            { name: "BG/Subtle", shorthand: "bgs", target: 1.3 },
            { name: "BG/Default", shorthand: "bgd", target: 1.8 },
            { name: "FG/Default", shorthand: "fgd", target: 4.5 },
            { name: "Border", shorthand: "bor", target: 2.5 },
          ],
        },

        // Inverse — near-max contrast pair for high-contrast surfaces or dark tooltips.
        {
          name: "Inverse/Surface",
          shorthand: "is",
          variations: [
            { name: "Default", shorthand: "df", target: 12.0 },
            { name: "Muted", shorthand: "mu", target: 4.5 },
          ],
        },
        {
          name: "Inverse/On/Surface",
          shorthand: "ios",
          variations: [
            { name: "State/Rest", shorthand: "r", target: 4.5 },
            { name: "State/Hover", shorthand: "h", target: 6.0 },
            { name: "State/Pressed", shorthand: "p", target: 7.0 },
            { name: "State/Disabled", shorthand: "d", target: 2.0 },
          ],
        },
      ],
      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark", bg: "111827" },
        { name: "Brand", bg: "0A1628" },
      ],
    },
  },

  // ── TW Funk ──────────────────────────────────────────────────────────────────
  // Direct mode, chroma-maximized solver. Maximum saturation at every contrast target.
  // Built for bold creative, gaming, or marketing products.
  // Flat variation names are the brand language — no overrides needed.
  {
    id: "tw-funk",
    name: "TW Funk",
    badge: "TW",
    description: "Maximum chroma at every contrast level. High-energy variation names, 3 vivid themes. Built for bold creative products.",
    tags: ["Bold", "Vivid", "Adaptive"],
    config: {
      name: "TW Funk",
      pluginMode: "direct",
      scaleAlgorithm: "Expressive",
      scaleLength: 25,
      useUniformAlgorithm: true,
      solverMode: "max-chroma",
      tokenNameSegments: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      includeSourceColors: true,
      sourceCollectionName: "electric",
      alphaValues: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],

      includeColorScalesCollection: false,
      includeDescriptions: false,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      canEditRoleVariants: false,
      // Ghost=barely visible tint, Whisper=hover, Core=primary, Loud=bold, Max=near-black.
      // Contrast targets: 1.5 / 2.5 / 4.5 / 7.0 / 12.0
      variations: [
        { name: "Ghost", shorthand: "1", target: 1.5 },
        { name: "Whisper", shorthand: "2", target: 2.5 },
        { name: "Core", shorthand: "3", target: 4.5 },
        { name: "Loud", shorthand: "4", target: 7.0 },
        { name: "Max", shorthand: "5", target: 12.0 },
      ],
      colors: [
        {
          name: "Electric/Blue",
          shorthand: "eb",
          value: "0EA5E9",
          description: "Sky blue — high chroma",
        },
        {
          name: "Electric/Pink",
          shorthand: "ep",
          value: "EC4899",
          description: "Hot pink",
        },
        {
          name: "Electric/Lime",
          shorthand: "el",
          value: "84CC16",
          description: "Lime green",
        },
      ],
      roles: [
        // Canvas — the base surface. Ghost=invisible, Max=heavy scrim.
        {
          name: "Canvas",
          shorthand: "ca",
          variations: [
            { name: "Ghost", shorthand: "1", target: 1.05 },
            { name: "Whisper", shorthand: "2", target: 1.2 },
            { name: "Core", shorthand: "3", target: 1.5 },
            { name: "Loud", shorthand: "4", target: 2.0 },
            { name: "Max", shorthand: "5", target: 3.0 },
          ],
        },
        {
          name: "Canvas/Raised",
          shorthand: "cr",
          variations: [
            { name: "Ghost", shorthand: "1", target: 1.1 },
            { name: "Whisper", shorthand: "2", target: 1.3 },
            { name: "Core", shorthand: "3", target: 1.6 },
            { name: "Loud", shorthand: "4", target: 2.5 },
            { name: "Max", shorthand: "5", target: 4.0 },
          ],
        },
        // Glow — color-tinted fills, from subtle aura to heavy overlay.
        {
          name: "Glow",
          shorthand: "gl",
          variations: [
            { name: "Ghost", shorthand: "1", target: 1.5 },
            { name: "Whisper", shorthand: "2", target: 2.0 },
            { name: "Core", shorthand: "3", target: 3.0 },
            { name: "Loud", shorthand: "4", target: 4.5 },
            { name: "Max", shorthand: "5", target: 7.0 },
          ],
        },
        {
          name: "Glow/Strong",
          shorthand: "gls",
          variations: [
            { name: "Ghost", shorthand: "1", target: 2.0 },
            { name: "Whisper", shorthand: "2", target: 2.5 },
            { name: "Core", shorthand: "3", target: 3.5 },
            { name: "Loud", shorthand: "4", target: 5.5 },
            { name: "Max", shorthand: "5", target: 9.0 },
          ],
        },
        // Edge — borders and outlines.
        {
          name: "Edge",
          shorthand: "eg",
          variations: [
            { name: "Ghost", shorthand: "1", target: 1.5 },
            { name: "Whisper", shorthand: "2", target: 2.0 },
            { name: "Core", shorthand: "3", target: 2.5 },
            { name: "Loud", shorthand: "4", target: 3.5 },
            { name: "Max", shorthand: "5", target: 5.0 },
          ],
        },
        // Fill — interactive component fills.
        {
          name: "Fill/Soft",
          shorthand: "fs",
          variations: [
            { name: "Ghost", shorthand: "1", target: 1.8 },
            { name: "Whisper", shorthand: "2", target: 2.2 },
            { name: "Core", shorthand: "3", target: 3.0 },
            { name: "Loud", shorthand: "4", target: 4.5 },
            { name: "Max", shorthand: "5", target: 6.0 },
          ],
        },
        {
          name: "Fill/Core",
          shorthand: "fc",
          variations: [
            { name: "Ghost", shorthand: "1", target: 2.5 },
            { name: "Whisper", shorthand: "2", target: 3.5 },
            { name: "Core", shorthand: "3", target: 4.5 },
            { name: "Loud", shorthand: "4", target: 6.5 },
            { name: "Max", shorthand: "5", target: 9.0 },
          ],
        },
        {
          name: "Fill/Pop",
          shorthand: "fp",
          variations: [
            { name: "Ghost", shorthand: "1", target: 4.5 },
            { name: "Whisper", shorthand: "2", target: 5.5 },
            { name: "Core", shorthand: "3", target: 7.0 },
            { name: "Loud", shorthand: "4", target: 10.0 },
            { name: "Max", shorthand: "5", target: 14.0 },
          ],
        },
        // Ink — text from dim to maximum.
        {
          name: "Ink/Dim",
          shorthand: "id",
          variations: [
            { name: "Ghost", shorthand: "1", target: 1.5 },
            { name: "Whisper", shorthand: "2", target: 2.5 },
            { name: "Core", shorthand: "3", target: 3.0 },
            { name: "Loud", shorthand: "4", target: 4.5 },
            { name: "Max", shorthand: "5", target: 6.0 },
          ],
        },
        {
          name: "Ink",
          shorthand: "ik",
          variations: [
            { name: "Ghost", shorthand: "1", target: 2.5 },
            { name: "Whisper", shorthand: "2", target: 3.5 },
            { name: "Core", shorthand: "3", target: 4.5 },
            { name: "Loud", shorthand: "4", target: 7.0 },
            { name: "Max", shorthand: "5", target: 10.0 },
          ],
        },
        {
          name: "Ink/Loud",
          shorthand: "il",
          variations: [
            { name: "Ghost", shorthand: "1", target: 4.5 },
            { name: "Whisper", shorthand: "2", target: 5.5 },
            { name: "Core", shorthand: "3", target: 7.0 },
            { name: "Loud", shorthand: "4", target: 10.0 },
            { name: "Max", shorthand: "5", target: 14.0 },
          ],
        },
        {
          name: "Ink/Max",
          shorthand: "im",
          variations: [
            { name: "Ghost", shorthand: "1", target: 7.0 },
            { name: "Whisper", shorthand: "2", target: 10.0 },
            { name: "Core", shorthand: "3", target: 14.0 },
            { name: "Loud", shorthand: "4", target: 18.0 },
            { name: "Max", shorthand: "5", target: 21.0 },
          ],
        },
        // Highlight — decorative accent washes and pops.
        {
          name: "Highlight",
          shorthand: "hl",
          variations: [
            { name: "Ghost", shorthand: "1", target: 1.5 },
            { name: "Whisper", shorthand: "2", target: 2.0 },
            { name: "Core", shorthand: "3", target: 3.0 },
            { name: "Loud", shorthand: "4", target: 4.5 },
            { name: "Max", shorthand: "5", target: 7.0 },
          ],
        },
        {
          name: "Highlight/Strong",
          shorthand: "hls",
          variations: [
            { name: "Ghost", shorthand: "1", target: 3.0 },
            { name: "Whisper", shorthand: "2", target: 4.0 },
            { name: "Core", shorthand: "3", target: 5.0 },
            { name: "Loud", shorthand: "4", target: 7.0 },
            { name: "Max", shorthand: "5", target: 10.0 },
          ],
        },
      ],
      themes: [
        { name: "Light", bg: "FAFAFA" },
        { name: "Dark", bg: "09090B" },
        { name: "Vivid", bg: "1A0533" },
      ],
    },
  },

  // ── TW Native ────────────────────────────────────────────────────────────────
  // The original idea behind Token Wand:
  // Palettes are raw color families. Roles are what colors DO in UI.
  // Variations are the states within each role.
  // Path = Palette/Role/Variation → e.g. Brand/button/hover, Neutral/text/muted
  {
    id: "tw-native",
    name: "TW Native",
    badge: "TW",
    description: "Token Wand's native system. Palette (7 colors) → Role (what the color does) → Variation (state within that role). Path: Brand/button/hover, Neutral/text/base, Danger/fill/disabled.",
    tags: ["Native", "Semantic", "Light+Dark", "Starter"],
    swatches: ["0066FF", "7C3AED", "6B7280", "16A34A", "D97706", "DC2626", "0284C7"],
    config: {
      name: "TW Native",
      pluginMode: "scale",
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
      sourceCollectionName: "palette/source",
      alphaValues: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
      includeColorScalesCollection: true,
      includeDescriptions: true,
      scaleCollectionName: "palette",
      tokenCollectionName: "tokens",

      scaleSteps: null,
      canEditRoleVariants: true,

      // Global variations — not used directly (every role defines its own).
      variations: [{ name: "default", shorthand: "default", target: 1 }],

      // ── 7 palette colors ─────────────────────────────────────────────────────
      colors: [
        {
          name: "Brand",
          shorthand: "Brand",
          value: "0066FF",
          description: "Primary brand color",
        },
        {
          name: "Accent",
          shorthand: "Accent",
          value: "7C3AED",
          description: "Secondary accent — violet",
        },
        {
          name: "Neutral",
          shorthand: "Neutral",
          value: "6B7280",
          description: "Neutral gray — surfaces, borders, text",
        },
        {
          name: "Success",
          shorthand: "Success",
          value: "16A34A",
          description: "Positive / confirm",
        },
        {
          name: "Warning",
          shorthand: "Warning",
          value: "D97706",
          description: "Caution / attention",
        },
        {
          name: "Danger",
          shorthand: "Danger",
          value: "DC2626",
          description: "Error / destructive",
        },
        {
          name: "Info",
          shorthand: "Info",
          value: "0284C7",
          description: "Informational",
        },
      ],

      roles: [
        // ── BG ────────────────────────────────────────────────────────────────
        // Background fills. 3 steps: barely-there → light → section.
        // Neutral drives page bg. Brand/status colors drive tinted section bgs.
        {
          name: "bg",
          shorthand: "bg",
          variations: [
            { name: "subtle", shorthand: "subtle", target: 1.05 }, // barely-there page wash
            { name: "default", shorthand: "default", target: 1.15 }, // light section background
            { name: "strong", shorthand: "strong", target: 1.3 }, // stronger section divider
          ],
          description: "Background fills · subtle wash · default section · strong divider",
        },

        // ── SURFACE ───────────────────────────────────────────────────────────
        // Card, popover, modal surfaces. 4 elevation steps.
        // Neutral drives all surface elevation; brand colors tint cards.
        {
          name: "surface",
          shorthand: "surface",
          variations: [
            { name: "sunken", shorthand: "sunken", target: 1.05 }, // recessed well / inset area
            { name: "default", shorthand: "default", target: 1.0 }, // card / panel canvas
            { name: "raised", shorthand: "raised", target: 1.08 }, // elevated card / popover
            { name: "overlay", shorthand: "overlay", target: 1.15 }, // modal / sheet / drawer
          ],
          description: "Surface elevation · sunken · card · raised · modal overlay",
        },

        // ── FILL ──────────────────────────────────────────────────────────────
        // Solid color fills for badges, chips, tags. 3 states.
        // Not a button (no full 5-state model) — use for decorative filled elements.
        {
          name: "fill",
          shorthand: "fill",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // AA solid fill
            { name: "hover", shorthand: "hover", target: 5.5 }, // hover — one step darker
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // clearly inactive
          ],
          description: "Solid fills · badge · chip · tag · 3 states",
        },

        // ── TEXT ──────────────────────────────────────────────────────────────
        // All readable copy. 4 contrast tiers: AAA body → disabled placeholder.
        {
          name: "text",
          shorthand: "text",
          variations: [
            { name: "base", shorthand: "base", target: 7.0 }, // AAA body copy
            { name: "subtle", shorthand: "subtle", target: 4.5 }, // AA secondary text
            { name: "muted", shorthand: "muted", target: 3.0 }, // AA-large placeholder/hint
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // disabled label
          ],
          description: "Text hierarchy · base (AAA) · subtle (AA) · muted (AA-large) · disabled",
        },

        // ── STROKE ────────────────────────────────────────────────────────────
        // Borders, outlines, separators. 3 weights.
        {
          name: "stroke",
          shorthand: "stroke",
          variations: [
            { name: "subtle", shorthand: "subtle", target: 1.5 }, // decorative separator / hairline
            { name: "default", shorthand: "default", target: 2.5 }, // standard UI border
            { name: "strong", shorthand: "strong", target: 4.0 }, // focus ring / emphasis outline
          ],
          description: "Borders and dividers · subtle hairline · UI border · focus ring",
        },

        // ── ICON ──────────────────────────────────────────────────────────────
        // Icon fills. 3 tiers mirroring text hierarchy.
        {
          name: "icon",
          shorthand: "icon",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // AA standard icon
            { name: "subtle", shorthand: "subtle", target: 3.0 }, // AA-large secondary icon
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // disabled icon
          ],
          description: "Icon fills · default (AA) · subtle (AA-large) · disabled",
        },

        // ── BUTTON ────────────────────────────────────────────────────────────
        // Full 5-state interactive CTA model. The primary use of brand/accent colors.
        {
          name: "button",
          shorthand: "button",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // AA resting fill
            { name: "hover", shorthand: "hover", target: 5.5 }, // hover — one step darker
            { name: "active", shorthand: "active", target: 6.5 }, // pressed / mouse-down
            { name: "selected", shorthand: "selected", target: 7.0 }, // toggled / checked
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // below action threshold
          ],
          description: "Button fills · 5 interaction states · default → hover → active → selected → disabled",
        },

        // ── LINK ──────────────────────────────────────────────────────────────
        // Inline text links. 3 states.
        {
          name: "link",
          shorthand: "link",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // AA resting link
            { name: "hover", shorthand: "hover", target: 5.5 }, // hover emphasis
            { name: "visited", shorthand: "visited", target: 3.5 }, // de-emphasized visited
          ],
          description: "Inline links · default · hover · visited",
        },

        // ── OVERLAY ───────────────────────────────────────────────────────────
        // Modal scrim / backdrop. Single slot, near-max contrast (darkest achievable).
        {
          name: "overlay",
          shorthand: "overlay",
          variations: [{ name: "default", shorthand: "default", target: 14.0 }],
          description: "Modal scrim · darkest achievable from palette hue",
        },
      ],

      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark", bg: "0F172A" },
      ],
    },
  },

  // ── TW Native Direct ─────────────────────────────────────────────────────────
  // Same palette, roles, and variations as TW Native but in direct mode.
  // Direct mode skips the tonal scale — each token is solved straight from the
  // seed color against the theme background. No intermediate ramp collection.
  // Result: richer, more saturated tokens that stay true to the seed hue.
  // Best for brand-forward products where you want vivid fills and clear colors
  // rather than the muted tints a tonal ramp produces.
  {
    id: "tw-native-direct",
    name: "TW Native Direct",
    badge: "TW",
    description: "TW Native in direct mode. Same palette → role → variation architecture but tokens are solved straight from the seed color — richer, more saturated. No tonal ramp collection.",
    tags: ["Native", "Direct", "Vivid", "Light+Dark"],
    swatches: ["0066FF", "7C3AED", "6B7280", "16A34A", "D97706", "DC2626", "0284C7"],
    config: {
      name: "TW Native Direct",
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
      sourceCollectionName: "palette/source",
      alphaValues: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
      includeColorScalesCollection: false,
      includeDescriptions: true,
      scaleCollectionName: "palette",
      tokenCollectionName: "tokens",
      scaleSteps: null,
      canEditRoleVariants: true,

      // Global variations — not used directly (every role defines its own).
      variations: [{ name: "default", shorthand: "default", target: 1 }],

      // ── 7 palette colors ─────────────────────────────────────────────────────
      colors: [
        {
          name: "Brand",
          shorthand: "Brand",
          value: "0066FF",
          description: "Primary brand color",
        },
        {
          name: "Accent",
          shorthand: "Accent",
          value: "7C3AED",
          description: "Secondary accent — violet",
        },
        {
          name: "Neutral",
          shorthand: "Neutral",
          value: "6B7280",
          description: "Neutral gray — surfaces, borders, text",
        },
        {
          name: "Success",
          shorthand: "Success",
          value: "16A34A",
          description: "Positive / confirm",
        },
        {
          name: "Warning",
          shorthand: "Warning",
          value: "D97706",
          description: "Caution / attention",
        },
        {
          name: "Danger",
          shorthand: "Danger",
          value: "DC2626",
          description: "Error / destructive",
        },
        {
          name: "Info",
          shorthand: "Info",
          value: "0284C7",
          description: "Informational",
        },
      ],

      roles: [
        // ── BG ────────────────────────────────────────────────────────────────
        // Background fills. 3 steps: barely-there → light → section.
        // Neutral drives page bg. Brand/status colors drive tinted section bgs.
        {
          name: "bg",
          shorthand: "bg",
          variations: [
            { name: "subtle", shorthand: "subtle", target: 1.05 }, // barely-there page wash
            { name: "default", shorthand: "default", target: 1.15 }, // light section background
            { name: "strong", shorthand: "strong", target: 1.3 }, // stronger section divider
          ],
          description: "Background fills · subtle wash · default section · strong divider",
        },

        // ── SURFACE ───────────────────────────────────────────────────────────
        // Card, popover, modal surfaces. 4 elevation steps.
        // Neutral drives all surface elevation; brand colors tint cards.
        {
          name: "surface",
          shorthand: "surface",
          variations: [
            { name: "sunken", shorthand: "sunken", target: 1.05 }, // recessed well / inset area
            { name: "default", shorthand: "default", target: 1.0 }, // card / panel canvas
            { name: "raised", shorthand: "raised", target: 1.08 }, // elevated card / popover
            { name: "overlay", shorthand: "overlay", target: 1.15 }, // modal / sheet / drawer
          ],
          description: "Surface elevation · sunken · card · raised · modal overlay",
        },

        // ── FILL ──────────────────────────────────────────────────────────────
        // Solid color fills for badges, chips, tags. 3 states.
        // Not a button (no full 5-state model) — use for decorative filled elements.
        {
          name: "fill",
          shorthand: "fill",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // AA solid fill
            { name: "hover", shorthand: "hover", target: 5.5 }, // hover — one step darker
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // clearly inactive
          ],
          description: "Solid fills · badge · chip · tag · 3 states",
        },

        // ── TEXT ──────────────────────────────────────────────────────────────
        // All readable copy. 4 contrast tiers: AAA body → disabled placeholder.
        {
          name: "text",
          shorthand: "text",
          variations: [
            { name: "base", shorthand: "base", target: 7.0 }, // AAA body copy
            { name: "subtle", shorthand: "subtle", target: 4.5 }, // AA secondary text
            { name: "muted", shorthand: "muted", target: 3.0 }, // AA-large placeholder/hint
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // disabled label
          ],
          description: "Text hierarchy · base (AAA) · subtle (AA) · muted (AA-large) · disabled",
        },

        // ── STROKE ────────────────────────────────────────────────────────────
        // Borders, outlines, separators. 3 weights.
        {
          name: "stroke",
          shorthand: "stroke",
          variations: [
            { name: "subtle", shorthand: "subtle", target: 1.5 }, // decorative separator / hairline
            { name: "default", shorthand: "default", target: 2.5 }, // standard UI border
            { name: "strong", shorthand: "strong", target: 4.0 }, // focus ring / emphasis outline
          ],
          description: "Borders and dividers · subtle hairline · UI border · focus ring",
        },

        // ── ICON ──────────────────────────────────────────────────────────────
        // Icon fills. 3 tiers mirroring text hierarchy.
        {
          name: "icon",
          shorthand: "icon",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // AA standard icon
            { name: "subtle", shorthand: "subtle", target: 3.0 }, // AA-large secondary icon
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // disabled icon
          ],
          description: "Icon fills · default (AA) · subtle (AA-large) · disabled",
        },

        // ── BUTTON ────────────────────────────────────────────────────────────
        // Full 5-state interactive CTA model. The primary use of brand/accent colors.
        {
          name: "button",
          shorthand: "button",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // AA resting fill
            { name: "hover", shorthand: "hover", target: 5.5 }, // hover — one step darker
            { name: "active", shorthand: "active", target: 6.5 }, // pressed / mouse-down
            { name: "selected", shorthand: "selected", target: 7.0 }, // toggled / checked
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // below action threshold
          ],
          description: "Button fills · 5 interaction states · default → hover → active → selected → disabled",
        },

        // ── LINK ──────────────────────────────────────────────────────────────
        // Inline text links. 3 states.
        {
          name: "link",
          shorthand: "link",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // AA resting link
            { name: "hover", shorthand: "hover", target: 5.5 }, // hover emphasis
            { name: "visited", shorthand: "visited", target: 3.5 }, // de-emphasized visited
          ],
          description: "Inline links · default · hover · visited",
        },

        // ── OVERLAY ───────────────────────────────────────────────────────────
        // Modal scrim / backdrop. Single slot, near-max contrast (darkest achievable).
        {
          name: "overlay",
          shorthand: "overlay",
          variations: [{ name: "default", shorthand: "default", target: 14.0 }],
          description: "Modal scrim · darkest achievable from palette hue",
        },
      ],

      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark", bg: "0F172A" },
      ],
    },
  },
];

export default presets;
