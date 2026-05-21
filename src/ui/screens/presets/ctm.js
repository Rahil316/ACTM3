// ── CTM PRESETS ───────────────────────────────────────────────────────────────
// Three house presets: Regular (professional tonal), Pro (adaptive, all channels),
// Funk (chroma-maximized, bold creative).
// variationTargets in tonal mode = ramp step indices (0 to scaleLength-1).
// variationTargets in adaptive mode = WCAG contrast ratios (1.0 – 21.0).

const CTM_PRESETS = [

  // ── CTM Regular ─────────────────────────────────────────────────────────────
  // Tonal, Natural algo, 25-step scale. Semantic layer stack.
  // Swap the 3 seed colors and ship. Default preset on first launch.
  {
    id: "ctm-regular",
    name: "CTM Regular",
    badge: "CTM",
    description: "Clean professional system. Full semantic layer stack — backgrounds, surfaces, borders, fills, text. Swap the seed colors and ship.",
    tags: ["Professional", "Tonal", "Light+Dark"],
    config: {
      name: "CTM Regular",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      sourceCollectionName: "global",
      includeAlphaTints: false,
      alphaValues: "10, 25, 50, 75, 90",
      includeTonalCollection: true,
      includeDescriptions: false,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      // Global variations — 5 semantic intensity levels used by all 12 roles.
      // Flat names work universally across backgrounds, borders, fills, and text.
      variations: [
        { name: "Subtle",  shorthand: "1" },
        { name: "Soft",    shorthand: "2" },
        { name: "Default", shorthand: "3" },
        { name: "Strong",  shorthand: "4" },
        { name: "Bold",    shorthand: "5" },
      ],
      colors: [
        { name: "Brand/Primary", shorthand: "bp", value: "0066FF", description: "Primary brand color — vivid blue" },
        { name: "Brand/Neutral", shorthand: "bn", value: "6B7280", description: "Neutral gray for surfaces and text" },
        { name: "Brand/Accent",  shorthand: "ba", value: "8B5CF6", description: "Accent — violet for highlights and CTAs" },
      ],
      // variationTargets = ramp step indices (0–24) for 5 global variations.
      // Step reference for Natural algo, 25 steps:
      //   0–4   ≈ page wash  (1.0–1.5:1 on white)
      //   5–9   ≈ surface    (1.5–2.5:1)
      //  10–14  ≈ border/fill(2.5–5.5:1)
      //  15–19  ≈ text AA    (5.5–13:1)
      //  20–24  ≈ near-black (13–21:1)
      roles: [
        // Backgrounds — lightest wash of the scale. Page and off-white variants.
        { name: "Background",         shorthand: "bg",  minContrast: 1.05, variationTargets: [1.0, 1.05, 1.1, 1.2, 1.35] },
        { name: "Background/Subtle",  shorthand: "bgs", minContrast: 1.1,  variationTargets: [1.1, 1.2, 1.35, 1.5, 1.8] },
        // Surfaces — card and raised element backgrounds.
        { name: "Surface",            shorthand: "sf",  minContrast: 1.15, variationTargets: [1.35, 1.5, 1.8, 2.2, 2.7] },
        { name: "Surface/Raised",     shorthand: "sfr", minContrast: 1.25, variationTargets: [1.8, 2.2, 2.7, 3.2, 4.0] },
        // Borders — subtle to strong outlines.
        { name: "Border",             shorthand: "bd",  minContrast: 1.6,  variationTargets: [2.7, 3.2, 4.0, 4.8, 5.8] },
        { name: "Border/Strong",      shorthand: "bds", minContrast: 2.5,  variationTargets: [4.0, 4.8, 5.8, 7.0, 8.5] },
        // Fills — interactive component fills and solid CTAs.
        { name: "Fill",               shorthand: "fi",  minContrast: 3.0,  variationTargets: [2.7, 4.0, 5.8, 8.5, 11.5] },
        { name: "Fill/Strong",        shorthand: "fis", minContrast: 4.5,  variationTargets: [4.0, 5.8, 8.5, 11.5, 14.5] },
        // Text — from placeholder/muted through to AAA headings.
        { name: "Text/Muted",         shorthand: "txm", minContrast: 3.0,  variationTargets: [7.0, 8.5, 10.0, 11.5, 13.0] },
        { name: "Text",               shorthand: "tx",  minContrast: 4.5,  variationTargets: [10.0, 11.5, 13.0, 14.5, 16.0] },
        { name: "Text/Strong",        shorthand: "txs", minContrast: 7.0,  variationTargets: [13.0, 14.5, 16.0, 17.5, 19.0] },
        // Inverse — text or fill used against a dark/colored background.
        { name: "Text/Inverse",       shorthand: "txi", minContrast: 4.5,  variationTargets: [1.1, 1.2, 1.35, 1.5, 1.8] },
      ],
      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "0F0F0F" },
      ],
    },
  },

  // ── CTM Pro ──────────────────────────────────────────────────────────────────
  // Adaptive engine, natural solver. Every output channel enabled.
  // Per-role variation overrides with "/" semantic names produce deeply-nested
  // Figma variable folder groups: Brand/Primary → Surface → Layer/01, etc.
  {
    id: "ctm-pro",
    name: "CTM Pro",
    badge: "CTM",
    description: "Full system. Adaptive engine, global brand constants + alpha tints, 3 themes. Per-role semantic variation groups for Surface, Text, Status, Outline, and Inverse.",
    tags: ["Comprehensive", "Adaptive", "Multi-theme"],
    config: {
      name: "CTM Pro",
      pluginMode: "direct",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: true,
      sourceCollectionName: "brand",
      includeAlphaTints: true,
      alphaValues: "10, 20, 40, 60, 80, 90",
      includeTonalCollection: false,
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      // Global variations — interaction states. Used by Primary, Secondary, and Action roles.
      // variationTargets (adaptive) = WCAG contrast ratios.
      // Rest:4.5 Hover:6.0 Pressed:7.0 Disabled:2.0
      variations: [
        { name: "State/Rest",     shorthand: "r" },
        { name: "State/Hover",    shorthand: "h" },
        { name: "State/Pressed",  shorthand: "p" },
        { name: "State/Disabled", shorthand: "d" },
      ],
      colors: [
        { name: "Brand/Primary",   shorthand: "bp", value: "0055E5", description: "Primary brand — deep vivid blue" },
        { name: "Brand/Secondary", shorthand: "bs", value: "7C3AED", description: "Secondary brand — violet" },
        { name: "Brand/Neutral",   shorthand: "bn", value: "64748B", description: "Neutral slate — surfaces and text" },
        { name: "Status/Error",    shorthand: "er", value: "DC2626", description: "Error and danger states" },
      ],
      roles: [
        // Primary / Secondary — interactive accent colors, 4-state global variations.
        { name: "Primary",              shorthand: "pr",  minContrast: 4.5, variationTargets: [4.5, 6.0, 7.0, 2.0] },
        { name: "Primary/Container",    shorthand: "prc", minContrast: 1.5,
          variationOverride: true,
          roleVariations: [
            { name: "Layer/01", shorthand: "l1" },
            { name: "Layer/02", shorthand: "l2" },
            { name: "Layer/03", shorthand: "l3" },
            { name: "Layer/04", shorthand: "l4" },
            { name: "Layer/Scrim", shorthand: "ls" },
          ],
          variationTargets: [1.05, 1.2, 1.4, 1.7, 2.5],
        },
        { name: "On/Primary",           shorthand: "op",  minContrast: 7.0, variationTargets: [4.5, 6.0, 7.0, 2.0] },
        { name: "Secondary",            shorthand: "sc",  minContrast: 4.5, variationTargets: [4.5, 6.0, 7.0, 2.0] },
        { name: "On/Secondary",         shorthand: "os",  minContrast: 7.0, variationTargets: [4.5, 6.0, 7.0, 2.0] },

        // Surface family — 5-layer depth model with "/" naming → nested Figma folders.
        // Layer/01 = page bg (barely-there), Layer/Scrim = modal overlay.
        { name: "Surface",              shorthand: "sf",  minContrast: 1.05,
          variationOverride: true,
          roleVariations: [
            { name: "Layer/01",    shorthand: "l1" },
            { name: "Layer/02",    shorthand: "l2" },
            { name: "Layer/03",    shorthand: "l3" },
            { name: "Layer/04",    shorthand: "l4" },
            { name: "Layer/Scrim", shorthand: "ls" },
          ],
          variationTargets: [1.05, 1.2, 1.4, 1.7, 2.5],
        },

        // Text family — Emphasis hierarchy from accessible body copy to disabled.
        { name: "On/Surface",           shorthand: "ons", minContrast: 4.5,
          variationOverride: true,
          roleVariations: [
            { name: "Emphasis/High",     shorthand: "eh" },
            { name: "Emphasis/Medium",   shorthand: "em" },
            { name: "Emphasis/Low",      shorthand: "el" },
            { name: "Emphasis/Disabled", shorthand: "ed" },
          ],
          variationTargets: [7.0, 4.5, 3.0, 2.0],
        },

        // Outline — three weights of border/separator.
        { name: "Outline",              shorthand: "ol",  minContrast: 2.5,
          variationOverride: true,
          roleVariations: [
            { name: "Weight/Subtle",  shorthand: "ws" },
            { name: "Weight/Default", shorthand: "wd" },
            { name: "Weight/Strong",  shorthand: "wst" },
          ],
          variationTargets: [1.8, 2.5, 3.5],
        },

        // Action roles — 4 interaction states via global variations.
        { name: "Action/Primary",       shorthand: "ap",  minContrast: 4.5, variationTargets: [4.5, 6.0, 7.0, 2.0] },
        { name: "Action/Secondary",     shorthand: "as",  minContrast: 3.0, variationTargets: [3.0, 4.5, 6.0, 2.0] },
        { name: "Action/Destructive",   shorthand: "ade", minContrast: 4.5, variationTargets: [4.5, 6.0, 7.0, 2.0] },

        // Status / Error — 4 semantic token slots per status color.
        // BG/Subtle = tinted bg, BG/Default = stronger bg, FG/Default = foreground text, Border = outline.
        { name: "Status/Error",         shorthand: "se",  minContrast: 4.5,
          variationOverride: true,
          roleVariations: [
            { name: "BG/Subtle",  shorthand: "bgs" },
            { name: "BG/Default", shorthand: "bgd" },
            { name: "FG/Default", shorthand: "fgd" },
            { name: "Border",     shorthand: "bor" },
          ],
          variationTargets: [1.3, 1.8, 4.5, 2.5],
        },

        // Inverse — near-max contrast pair for high-contrast surfaces or dark tooltips.
        { name: "Inverse/Surface",      shorthand: "is",  minContrast: 12.0,
          variationOverride: true,
          roleVariations: [
            { name: "Default", shorthand: "df" },
            { name: "Muted",   shorthand: "mu" },
          ],
          variationTargets: [12.0, 4.5],
        },
        { name: "Inverse/On/Surface",   shorthand: "ios", minContrast: 4.5, variationTargets: [4.5, 6.0, 7.0, 2.0] },
      ],
      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "111827" },
        { name: "Brand", bg: "0A1628" },
      ],
    },
  },

  // ── CTM Funk ─────────────────────────────────────────────────────────────────
  // Adaptive, chroma-maximized solver. Maximum saturation at every contrast target.
  // Built for bold creative, gaming, or marketing products.
  // Flat variation names are the brand language — no overrides needed.
  {
    id: "ctm-funk",
    name: "CTM Funk",
    badge: "CTM",
    description: "Maximum chroma at every contrast level. High-energy variation names, 3 vivid themes. Built for bold creative products.",
    tags: ["Bold", "Vivid", "Adaptive"],
    config: {
      name: "CTM Funk",
      pluginMode: "direct",
      scaleAlgorithm: "Expressive",
      scaleLength: 25,
      useGlobalAlgo: true,
      solverMode: "chroma-maximized",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: true,
      sourceCollectionName: "electric",
      includeAlphaTints: false,
      alphaValues: "10, 25, 50, 75, 90",
      includeTonalCollection: false,
      includeDescriptions: false,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      // Ghost=barely visible tint, Whisper=hover, Core=primary, Loud=bold, Max=near-black.
      // Contrast targets: 1.5 / 2.5 / 4.5 / 7.0 / 12.0
      variations: [
        { name: "Ghost",   shorthand: "1" },
        { name: "Whisper", shorthand: "2" },
        { name: "Core",    shorthand: "3" },
        { name: "Loud",    shorthand: "4" },
        { name: "Max",     shorthand: "5" },
      ],
      colors: [
        { name: "Electric/Blue", shorthand: "eb", value: "0EA5E9", description: "Sky blue — high chroma" },
        { name: "Electric/Pink", shorthand: "ep", value: "EC4899", description: "Hot pink" },
        { name: "Electric/Lime", shorthand: "el", value: "84CC16", description: "Lime green" },
      ],
      roles: [
        // Canvas — the base surface. Ghost=invisible, Max=heavy scrim.
        { name: "Canvas",           shorthand: "ca",  minContrast: 1.05, variationTargets: [1.05, 1.2, 1.5, 2.0, 3.0 ] },
        { name: "Canvas/Raised",    shorthand: "cr",  minContrast: 1.2,  variationTargets: [1.1,  1.3, 1.6, 2.5, 4.0 ] },
        // Glow — color-tinted fills, from subtle aura to heavy overlay.
        { name: "Glow",             shorthand: "gl",  minContrast: 1.5,  variationTargets: [1.5,  2.0, 3.0, 4.5, 7.0 ] },
        { name: "Glow/Strong",      shorthand: "gls", minContrast: 3.0,  variationTargets: [2.0,  2.5, 3.5, 5.5, 9.0 ] },
        // Edge — borders and outlines.
        { name: "Edge",             shorthand: "eg",  minContrast: 2.0,  variationTargets: [1.5,  2.0, 2.5, 3.5, 5.0 ] },
        // Fill — interactive component fills.
        { name: "Fill/Soft",        shorthand: "fs",  minContrast: 2.5,  variationTargets: [1.8,  2.2, 3.0, 4.5, 6.0 ] },
        { name: "Fill/Core",        shorthand: "fc",  minContrast: 4.0,  variationTargets: [2.5,  3.5, 4.5, 6.5, 9.0 ] },
        { name: "Fill/Pop",         shorthand: "fp",  minContrast: 6.5,  variationTargets: [4.5,  5.5, 7.0, 10.0, 14.0] },
        // Ink — text from dim to maximum.
        { name: "Ink/Dim",          shorthand: "id",  minContrast: 2.5,  variationTargets: [1.5,  2.5, 3.0, 4.5, 6.0 ] },
        { name: "Ink",              shorthand: "ik",  minContrast: 4.0,  variationTargets: [2.5,  3.5, 4.5, 7.0, 10.0] },
        { name: "Ink/Loud",         shorthand: "il",  minContrast: 6.5,  variationTargets: [4.5,  5.5, 7.0, 10.0, 14.0] },
        { name: "Ink/Max",          shorthand: "im",  minContrast: 12.0, variationTargets: [7.0,  10.0, 14.0, 18.0, 21.0] },
        // Highlight — decorative accent washes and pops.
        { name: "Highlight",        shorthand: "hl",  minContrast: 2.5,  variationTargets: [1.5,  2.0, 3.0, 4.5, 7.0 ] },
        { name: "Highlight/Strong", shorthand: "hls", minContrast: 4.5,  variationTargets: [3.0,  4.0, 5.0, 7.0, 10.0] },
      ],
      themes: [
        { name: "Light", bg: "FAFAFA" },
        { name: "Dark",  bg: "09090B" },
        { name: "Vivid", bg: "1A0533" },
      ],
    },
  },
];
