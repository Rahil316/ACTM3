// ── PRESETS ──────────────────────────────────────────────────────────────────
// PRESETS global is assembled by src/ui/screens/presets/index.js.
// To add a design system: create presets/<system>.js, add a script tag in
// ui.html before presets/index.js, and spread it in index.js.

const _UNUSED_LEGACY_PRESETS = [
  // ── 1. CTM Regular ────────────────────────────────────────────────────────
  {
    id: "ctm-regular",
    name: "CTM Regular",
    badge: "CTM",
    description: "Clean professional system. Semantic roles, tonal scale, Light & Dark. Swap the seed colors and ship.",
    tags: ["Professional", "Tonal", "Light+Dark"],
    config: {
      name: "CTM Regular",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      includeAlphaTints: false,
      includeTonalCollection: true,
      includeDescriptions: false,
      tonalScaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      globalColorsCollectionName: "global",
      alphaValues: "10, 25, 50, 75, 90",
      colors: [
        { name: "Brand/Primary", shorthand: "bp", value: "0066FF", description: "Primary brand color" },
        { name: "Brand/Neutral", shorthand: "bn", value: "6B7280", description: "Neutral gray" },
        { name: "Brand/Accent",  shorthand: "ba", value: "8B5CF6", description: "Accent color" },
      ],
      variations: [
        { name: "Subtle",  shorthand: "1" },
        { name: "Soft",    shorthand: "2" },
        { name: "Default", shorthand: "3" },
        { name: "Strong",  shorthand: "4" },
        { name: "Bold",    shorthand: "5" },
      ],
      roles: [
        { name: "Background",     shorthand: "bg",  spread: 1, minContrast: 1.1, baseIndex: 2,  variationTargets: [2,  3,  4,  5,  6  ] },
        { name: "Background/Subtle", shorthand: "bs", spread: 1, minContrast: 1.2, baseIndex: 4,  variationTargets: [3,  4,  5,  6,  7  ] },
        { name: "Surface",        shorthand: "sf",  spread: 1, minContrast: 1.3, baseIndex: 6,  variationTargets: [4,  5,  6,  7,  8  ] },
        { name: "Surface/Raised", shorthand: "sr",  spread: 1, minContrast: 1.5, baseIndex: 8,  variationTargets: [5,  6,  7,  8,  9  ] },
        { name: "Border",         shorthand: "bd",  spread: 1, minContrast: 2.0, baseIndex: 11, variationTargets: [9,  10, 11, 12, 13 ] },
        { name: "Border/Strong",  shorthand: "bs2", spread: 1, minContrast: 3.0, baseIndex: 13, variationTargets: [11, 12, 13, 14, 15 ] },
        { name: "Fill",           shorthand: "fi",  spread: 2, minContrast: 3.0, baseIndex: 10, variationTargets: [6,  8,  10, 12, 14 ] },
        { name: "Fill/Strong",    shorthand: "fs",  spread: 2, minContrast: 4.5, baseIndex: 14, variationTargets: [10, 12, 14, 16, 18 ] },
        { name: "Text/Muted",     shorthand: "tm",  spread: 1, minContrast: 3.0, baseIndex: 16, variationTargets: [14, 15, 16, 17, 18 ] },
        { name: "Text",           shorthand: "tx",  spread: 2, minContrast: 4.5, baseIndex: 18, variationTargets: [14, 16, 18, 20, 22 ] },
        { name: "Text/Strong",    shorthand: "ts",  spread: 1, minContrast: 7.0, baseIndex: 20, variationTargets: [18, 19, 20, 21, 22 ] },
        { name: "Text/Inverse",   shorthand: "ti",  spread: 1, minContrast: 4.5, baseIndex: 4,  variationTargets: [2,  3,  4,  5,  6  ] },
      ],
      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "0F0F0F" },
      ],
    },
  },

  // ── 2. CTM Pro ────────────────────────────────────────────────────────────
  {
    id: "ctm-pro",
    name: "CTM Pro",
    badge: "CTM",
    description: "Full system. Every output channel: adaptive roles, global brand constants, alpha tints, 3 themes.",
    tags: ["Comprehensive", "Adaptive", "Multi-theme"],
    config: {
      name: "CTM Pro",
      pluginMode: "adaptiveEngine",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: true,
      globalColorsCollectionName: "brand",
      includeAlphaTints: true,
      alphaValues: "10, 20, 40, 60, 80, 90",
      includeTonalCollection: false,
      includeDescriptions: true,
      tonalScaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      colors: [
        { name: "Brand/Primary",   shorthand: "bp", value: "0055E5", description: "Primary brand color" },
        { name: "Brand/Secondary", shorthand: "bs", value: "7C3AED", description: "Secondary brand color" },
        { name: "Brand/Neutral",   shorthand: "bn", value: "64748B", description: "Neutral / gray" },
        { name: "Status/Error",    shorthand: "er", value: "DC2626", description: "Danger and error states" },
      ],
      variations: [
        { name: "Subtle",  shorthand: "1" },
        { name: "Soft",    shorthand: "2" },
        { name: "Default", shorthand: "3" },
        { name: "Strong",  shorthand: "4" },
        { name: "Bold",    shorthand: "5" },
      ],
      roles: [
        { name: "Primary",               shorthand: "pr",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [1.5, 2.5, 4.5, 7.0, 12.0] },
        { name: "Primary/Container",     shorthand: "prc", spread: 1, minContrast: 1.5,  baseContrast: 1.8,  baseIndex: 6,  variationTargets: [1.1, 1.4, 1.8, 2.5, 3.5 ] },
        { name: "On/Primary",            shorthand: "op",  spread: 1, minContrast: 7.0,  baseContrast: 7.0,  baseIndex: 20, variationTargets: [4.5, 5.5, 7.0, 9.0, 12.0] },
        { name: "On/Primary/Container",  shorthand: "opc", spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 16, variationTargets: [3.0, 4.0, 4.5, 6.0, 7.0 ] },

        { name: "Secondary",             shorthand: "sc",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [1.5, 2.5, 4.5, 7.0, 12.0] },
        { name: "Secondary/Container",   shorthand: "scc", spread: 1, minContrast: 1.5,  baseContrast: 1.8,  baseIndex: 6,  variationTargets: [1.1, 1.4, 1.8, 2.5, 3.5 ] },
        { name: "On/Secondary",          shorthand: "os",  spread: 1, minContrast: 7.0,  baseContrast: 7.0,  baseIndex: 20, variationTargets: [4.5, 5.5, 7.0, 9.0, 12.0] },
        { name: "On/Secondary/Container",shorthand: "osc", spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 16, variationTargets: [3.0, 4.0, 4.5, 6.0, 7.0 ] },

        { name: "Surface",               shorthand: "sf",  spread: 1, minContrast: 1.05, baseContrast: 1.05, baseIndex: 1,  variationTargets: [1.0, 1.1, 1.2, 1.4, 1.6 ] },
        { name: "Surface/Dim",           shorthand: "sfd", spread: 1, minContrast: 1.2,  baseContrast: 1.3,  baseIndex: 3,  variationTargets: [1.1, 1.2, 1.3, 1.5, 1.8 ] },
        { name: "Surface/Bright",        shorthand: "sfb", spread: 1, minContrast: 1.0,  baseContrast: 1.05, baseIndex: 0,  variationTargets: [1.0, 1.0, 1.0, 1.1, 1.2 ] },
        { name: "Surface/Container",     shorthand: "sfc", spread: 1, minContrast: 1.4,  baseContrast: 1.5,  baseIndex: 5,  variationTargets: [1.2, 1.3, 1.5, 1.7, 2.0 ] },
        { name: "Surface/Container/Low", shorthand: "scl", spread: 1, minContrast: 1.2,  baseContrast: 1.3,  baseIndex: 3,  variationTargets: [1.1, 1.2, 1.3, 1.5, 1.7 ] },
        { name: "Surface/Container/High",shorthand: "sch", spread: 1, minContrast: 1.6,  baseContrast: 1.8,  baseIndex: 7,  variationTargets: [1.3, 1.5, 1.8, 2.2, 2.8 ] },

        { name: "On/Surface",            shorthand: "ons", spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 16, variationTargets: [3.0, 4.0, 4.5, 6.0, 7.0 ] },
        { name: "On/Surface/Variant",    shorthand: "osv", spread: 1, minContrast: 3.0,  baseContrast: 3.0,  baseIndex: 14, variationTargets: [2.0, 2.5, 3.0, 4.5, 6.0 ] },

        { name: "Outline",               shorthand: "ol",  spread: 1, minContrast: 2.5,  baseContrast: 2.5,  baseIndex: 12, variationTargets: [1.5, 2.0, 2.5, 3.5, 4.5 ] },
        { name: "Outline/Variant",       shorthand: "olv", spread: 1, minContrast: 1.8,  baseContrast: 1.8,  baseIndex: 9,  variationTargets: [1.3, 1.5, 1.8, 2.5, 3.0 ] },

        { name: "Inverse/Surface",       shorthand: "is",  spread: 1, minContrast: 12.0, baseContrast: 12.0, baseIndex: 22, variationTargets: [7.0, 9.0, 12.0, 15.0, 18.0] },
        { name: "Inverse/On/Surface",    shorthand: "ios", spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 4,  variationTargets: [3.0, 4.0, 4.5, 6.0, 7.0 ] },

        { name: "Status/Error",          shorthand: "se",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [1.5, 2.5, 4.5, 7.0, 12.0] },
        { name: "Status/Error/Container",shorthand: "sec", spread: 1, minContrast: 1.5,  baseContrast: 1.8,  baseIndex: 5,  variationTargets: [1.1, 1.4, 1.8, 2.5, 3.5 ] },
        { name: "On/Status/Error",       shorthand: "ose", spread: 1, minContrast: 7.0,  baseContrast: 7.0,  baseIndex: 20, variationTargets: [4.5, 5.5, 7.0, 9.0, 12.0] },

        { name: "Action/Primary",        shorthand: "ap",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [2.5, 3.5, 4.5, 6.0, 7.0 ] },
        { name: "Action/Hover",          shorthand: "ah",  spread: 1, minContrast: 5.5,  baseContrast: 6.0,  baseIndex: 16, variationTargets: [3.5, 4.5, 6.0, 7.0, 9.0 ] },
        { name: "Action/Disabled",       shorthand: "ad",  spread: 1, minContrast: 1.5,  baseContrast: 2.0,  baseIndex: 7,  variationTargets: [1.2, 1.5, 2.0, 2.5, 3.0 ] },

        { name: "Text/Primary",          shorthand: "tp",  spread: 1, minContrast: 7.0,  baseContrast: 7.0,  baseIndex: 20, variationTargets: [4.5, 6.0, 7.0, 9.0, 12.0] },
        { name: "Text/Secondary",        shorthand: "ts",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 16, variationTargets: [3.0, 4.0, 4.5, 6.0, 7.0 ] },
        { name: "Text/Tertiary",         shorthand: "tt",  spread: 1, minContrast: 3.0,  baseContrast: 3.0,  baseIndex: 13, variationTargets: [2.0, 2.5, 3.0, 4.5, 6.0 ] },
        { name: "Text/Disabled",         shorthand: "td",  spread: 1, minContrast: 1.5,  baseContrast: 2.0,  baseIndex: 8,  variationTargets: [1.2, 1.5, 2.0, 2.5, 3.0 ] },
      ],
      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "111827" },
        { name: "Brand", bg: "0A1628" },
      ],
    },
  },

  // ── 3. CTM Funk ───────────────────────────────────────────────────────────
  {
    id: "ctm-funk",
    name: "CTM Funk",
    badge: "CTM",
    description: "High energy. Vivid saturated palette, chroma-maximized solver. Built for bold creative products.",
    tags: ["Bold", "Vivid", "Adaptive"],
    config: {
      name: "CTM Funk",
      pluginMode: "adaptiveEngine",
      scaleAlgorithm: "Expressive",
      scaleLength: 25,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "chroma-maximized",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: true,
      globalColorsCollectionName: "electric",
      includeAlphaTints: false,
      includeTonalCollection: false,
      includeDescriptions: false,
      tonalScaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      alphaValues: "10, 25, 50, 75, 90",
      colors: [
        { name: "Electric/Blue", shorthand: "eb", value: "0EA5E9", description: "Sky blue — high chroma" },
        { name: "Electric/Pink", shorthand: "ep", value: "EC4899", description: "Hot pink" },
        { name: "Electric/Lime", shorthand: "el", value: "84CC16", description: "Lime green" },
      ],
      variations: [
        { name: "Ghost",   shorthand: "1" },
        { name: "Whisper", shorthand: "2" },
        { name: "Core",    shorthand: "3" },
        { name: "Loud",    shorthand: "4" },
        { name: "Max",     shorthand: "5" },
      ],
      roles: [
        { name: "Canvas",           shorthand: "ca",  spread: 1, minContrast: 1.05, baseContrast: 1.1,  baseIndex: 1,  variationTargets: [1.0, 1.1, 1.2, 1.4, 1.6 ] },
        { name: "Canvas/Raised",    shorthand: "cr",  spread: 1, minContrast: 1.3,  baseContrast: 1.4,  baseIndex: 4,  variationTargets: [1.1, 1.2, 1.4, 1.7, 2.0 ] },
        { name: "Glow",             shorthand: "gl",  spread: 1, minContrast: 1.8,  baseContrast: 2.0,  baseIndex: 8,  variationTargets: [1.3, 1.6, 2.0, 2.8, 3.5 ] },
        { name: "Glow/Strong",      shorthand: "gs",  spread: 1, minContrast: 3.0,  baseContrast: 3.5,  baseIndex: 12, variationTargets: [2.0, 2.5, 3.5, 5.0, 6.0 ] },
        { name: "Edge",             shorthand: "eg",  spread: 1, minContrast: 2.0,  baseContrast: 2.5,  baseIndex: 10, variationTargets: [1.5, 2.0, 2.5, 3.5, 4.5 ] },
        { name: "Fill/Soft",        shorthand: "fs",  spread: 1, minContrast: 2.5,  baseContrast: 3.0,  baseIndex: 11, variationTargets: [1.8, 2.2, 3.0, 4.0, 5.0 ] },
        { name: "Fill/Core",        shorthand: "fc",  spread: 1, minContrast: 4.0,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [2.5, 3.5, 4.5, 6.0, 7.0 ] },
        { name: "Fill/Pop",         shorthand: "fp",  spread: 1, minContrast: 6.5,  baseContrast: 7.0,  baseIndex: 18, variationTargets: [4.5, 5.5, 7.0, 9.0, 12.0] },
        { name: "Ink/Dim",          shorthand: "id",  spread: 1, minContrast: 2.5,  baseContrast: 3.0,  baseIndex: 12, variationTargets: [2.0, 2.5, 3.0, 4.0, 5.0 ] },
        { name: "Ink",              shorthand: "ik",  spread: 1, minContrast: 4.0,  baseContrast: 4.5,  baseIndex: 16, variationTargets: [3.0, 4.0, 4.5, 6.0, 7.0 ] },
        { name: "Ink/Loud",         shorthand: "il",  spread: 1, minContrast: 6.5,  baseContrast: 7.0,  baseIndex: 19, variationTargets: [4.5, 5.5, 7.0, 9.0, 11.0] },
        { name: "Ink/Max",          shorthand: "im",  spread: 1, minContrast: 11.0, baseContrast: 12.0, baseIndex: 22, variationTargets: [7.0, 9.0, 12.0, 15.0, 18.0] },
        { name: "Highlight",        shorthand: "hl",  spread: 1, minContrast: 2.5,  baseContrast: 3.0,  baseIndex: 11, variationTargets: [1.8, 2.2, 3.0, 4.0, 5.0 ] },
        { name: "Highlight/Strong", shorthand: "hls", spread: 1, minContrast: 4.5,  baseContrast: 5.0,  baseIndex: 15, variationTargets: [3.0, 4.0, 5.0, 6.5, 8.0 ] },
      ],
      themes: [
        { name: "Light", bg: "FAFAFA" },
        { name: "Dark",  bg: "09090B" },
        { name: "Vivid", bg: "1A0533" },
      ],
    },
  },

  // ── 4. Material Design 3 ──────────────────────────────────────────────────
  {
    id: "material-3",
    name: "Material Design 3",
    badge: "Google",
    description: "M3 color system. HCT tonal palette, Primary/Secondary/Tertiary axes, On/Container role pattern.",
    tags: ["Reference", "Material", "Tonal"],
    config: {
      name: "Material 3",
      pluginMode: "scale",
      scaleAlgorithm: "Material",
      scaleLength: 25,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      includeAlphaTints: false,
      includeTonalCollection: true,
      includeDescriptions: true,
      tonalScaleCollectionName: "ref/palette",
      tokenCollectionName: "sys/color",
      alphaValues: "10, 25, 50, 75, 90",
      globalColorsCollectionName: "global",
      colors: [
        { name: "Color/Primary",   shorthand: "cp", value: "6750A4", description: "M3 primary seed" },
        { name: "Color/Secondary", shorthand: "cs", value: "625B71", description: "M3 secondary seed" },
        { name: "Color/Tertiary",  shorthand: "ct", value: "7D5260", description: "M3 tertiary seed" },
        { name: "Color/Error",     shorthand: "ce", value: "B3261E", description: "M3 error seed" },
        { name: "Color/Neutral",   shorthand: "cn", value: "605D62", description: "M3 neutral (surface) seed" },
      ],
      variations: [
        { name: "Subtle",  shorthand: "1" },
        { name: "Soft",    shorthand: "2" },
        { name: "Default", shorthand: "3" },
        { name: "Strong",  shorthand: "4" },
        { name: "Bold",    shorthand: "5" },
      ],
      roles: [
        { name: "Primary",               shorthand: "pr",  spread: 1, minContrast: 4.5, baseIndex: 14, variationTargets: [6,  9,  14, 18, 22] },
        { name: "Primary/Container",     shorthand: "prc", spread: 1, minContrast: 1.5, baseIndex: 6,  variationTargets: [3,  5,  6,  8,  10] },
        { name: "On/Primary",            shorthand: "op",  spread: 1, minContrast: 7.0, baseIndex: 21, variationTargets: [18, 19, 21, 22, 23] },
        { name: "On/Primary/Container",  shorthand: "opc", spread: 1, minContrast: 4.5, baseIndex: 16, variationTargets: [13, 14, 16, 18, 20] },
        { name: "Secondary",             shorthand: "sc",  spread: 1, minContrast: 4.5, baseIndex: 14, variationTargets: [6,  9,  14, 18, 22] },
        { name: "Secondary/Container",   shorthand: "scc", spread: 1, minContrast: 1.5, baseIndex: 6,  variationTargets: [3,  5,  6,  8,  10] },
        { name: "On/Secondary",          shorthand: "os",  spread: 1, minContrast: 7.0, baseIndex: 21, variationTargets: [18, 19, 21, 22, 23] },
        { name: "On/Secondary/Container",shorthand: "osc", spread: 1, minContrast: 4.5, baseIndex: 16, variationTargets: [13, 14, 16, 18, 20] },
        { name: "Tertiary",              shorthand: "te",  spread: 1, minContrast: 4.5, baseIndex: 14, variationTargets: [6,  9,  14, 18, 22] },
        { name: "Tertiary/Container",    shorthand: "tec", spread: 1, minContrast: 1.5, baseIndex: 6,  variationTargets: [3,  5,  6,  8,  10] },
        { name: "On/Tertiary",           shorthand: "ot",  spread: 1, minContrast: 7.0, baseIndex: 21, variationTargets: [18, 19, 21, 22, 23] },
        { name: "Surface",               shorthand: "sf",  spread: 1, minContrast: 1.1, baseIndex: 2,  variationTargets: [0,  1,  2,  4,  6 ] },
        { name: "Surface/Variant",       shorthand: "sfv", spread: 1, minContrast: 1.3, baseIndex: 5,  variationTargets: [2,  3,  5,  7,  9 ] },
        { name: "Surface/Container/Low", shorthand: "scl", spread: 1, minContrast: 1.2, baseIndex: 3,  variationTargets: [1,  2,  3,  5,  7 ] },
        { name: "Surface/Container",     shorthand: "sfc", spread: 1, minContrast: 1.4, baseIndex: 6,  variationTargets: [3,  5,  6,  8,  10] },
        { name: "Surface/Container/High",shorthand: "sch", spread: 1, minContrast: 1.6, baseIndex: 8,  variationTargets: [5,  6,  8,  10, 12] },
        { name: "On/Surface",            shorthand: "ons", spread: 1, minContrast: 4.5, baseIndex: 16, variationTargets: [12, 14, 16, 18, 20] },
        { name: "On/Surface/Variant",    shorthand: "osv", spread: 1, minContrast: 3.0, baseIndex: 14, variationTargets: [10, 12, 14, 16, 18] },
        { name: "Outline",               shorthand: "ol",  spread: 1, minContrast: 2.5, baseIndex: 12, variationTargets: [9,  11, 12, 14, 16] },
        { name: "Outline/Variant",       shorthand: "olv", spread: 1, minContrast: 1.8, baseIndex: 9,  variationTargets: [6,  8,  9,  11, 13] },
        { name: "Error",                 shorthand: "er",  spread: 1, minContrast: 4.5, baseIndex: 14, variationTargets: [6,  9,  14, 18, 22] },
        { name: "Error/Container",       shorthand: "erc", spread: 1, minContrast: 1.5, baseIndex: 6,  variationTargets: [3,  5,  6,  8,  10] },
        { name: "Inverse/Surface",       shorthand: "is",  spread: 1, minContrast: 1.1, baseIndex: 21, variationTargets: [19, 20, 21, 22, 23] },
        { name: "Scrim",                 shorthand: "sc2", spread: 1, minContrast: 7.0, baseIndex: 21, variationTargets: [18, 19, 21, 22, 24] },
      ],
      themes: [
        { name: "Light", bg: "FFFBFE" },
        { name: "Dark",  bg: "1C1B1F" },
      ],
    },
  },

  // ── 5. Radix UI ───────────────────────────────────────────────────────────
  {
    id: "radix-ui",
    name: "Radix UI",
    badge: "Radix",
    description: "12-step OKLCH perceptual scale. Gray + accent pattern. Accessible by construction.",
    tags: ["Reference", "OKLCH", "12-step"],
    config: {
      name: "Radix UI",
      pluginMode: "scale",
      scaleAlgorithm: "OKLCH",
      scaleLength: 12,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: true,
      useShorthandRoles: false,
      useShorthandVariations: true,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      includeAlphaTints: true,
      alphaValues: "6, 12, 25, 40, 50, 75, 90",
      includeTonalCollection: true,
      includeDescriptions: false,
      tonalScaleCollectionName: "palette",
      tokenCollectionName: "tokens",
      globalColorsCollectionName: "global",
      colors: [
        { name: "Blue",  shorthand: "bl", value: "0091FF", description: "" },
        { name: "Mauve", shorthand: "mv", value: "8E8096", description: "Gray with purple undertone" },
      ],
      variations: [
        { name: "1",  shorthand: "1" },
        { name: "2",  shorthand: "2" },
        { name: "3",  shorthand: "3" },
        { name: "4",  shorthand: "4" },
        { name: "5",  shorthand: "5" },
        { name: "6",  shorthand: "6" },
        { name: "7",  shorthand: "7" },
        { name: "8",  shorthand: "8" },
        { name: "9",  shorthand: "9" },
        { name: "10", shorthand: "10" },
        { name: "11", shorthand: "11" },
        { name: "12", shorthand: "12" },
      ],
      roles: [
        { name: "App BG",        shorthand: "bg1",  spread: 1, minContrast: 1.0, baseIndex: 0,  variationTargets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { name: "Subtle BG",     shorthand: "bg2",  spread: 1, minContrast: 1.1, baseIndex: 1,  variationTargets: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        { name: "UI Element BG", shorthand: "ui1",  spread: 1, minContrast: 1.2, baseIndex: 2,  variationTargets: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
        { name: "Hovered UI",    shorthand: "ui2",  spread: 1, minContrast: 1.3, baseIndex: 3,  variationTargets: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] },
        { name: "Active UI",     shorthand: "ui3",  spread: 1, minContrast: 1.5, baseIndex: 4,  variationTargets: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4] },
        { name: "Subtle Border", shorthand: "br1",  spread: 1, minContrast: 1.8, baseIndex: 5,  variationTargets: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
        { name: "UI Border",     shorthand: "br2",  spread: 1, minContrast: 2.5, baseIndex: 6,  variationTargets: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6] },
        { name: "Hovered Border",shorthand: "br3",  spread: 1, minContrast: 3.0, baseIndex: 7,  variationTargets: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7] },
        { name: "Solid BG",      shorthand: "so",   spread: 1, minContrast: 3.5, baseIndex: 8,  variationTargets: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8] },
        { name: "Hovered Solid", shorthand: "soh",  spread: 1, minContrast: 4.0, baseIndex: 9,  variationTargets: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9] },
        { name: "Low Contrast",  shorthand: "tx1",  spread: 1, minContrast: 3.0, baseIndex: 10, variationTargets: [10,10,10,10,10,10,10,10,10,10,10,10] },
        { name: "High Contrast", shorthand: "tx2",  spread: 1, minContrast: 7.0, baseIndex: 11, variationTargets: [11,11,11,11,11,11,11,11,11,11,11,11] },
      ],
      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "111113" },
      ],
    },
  },

  // ── 6. Apple HIG ─────────────────────────────────────────────────────────
  {
    id: "apple-hig",
    name: "Apple HIG",
    badge: "Apple",
    description: "iOS/macOS semantic system. Label, Fill, Background, Separator hierarchies. Brand constants + alpha.",
    tags: ["Reference", "Adaptive", "Semantic"],
    config: {
      name: "Apple HIG",
      pluginMode: "adaptiveEngine",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: true,
      globalColorsCollectionName: "system",
      includeAlphaTints: true,
      alphaValues: "8, 16, 32, 50, 70, 85",
      includeTonalCollection: false,
      includeDescriptions: true,
      tonalScaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      colors: [
        { name: "System/Blue",   shorthand: "sb", value: "007AFF", description: "systemBlue" },
        { name: "System/Red",    shorthand: "sr", value: "FF3B30", description: "systemRed" },
        { name: "System/Green",  shorthand: "sg", value: "34C759", description: "systemGreen" },
        { name: "System/Orange", shorthand: "so", value: "FF9500", description: "systemOrange" },
        { name: "System/Gray",   shorthand: "sy", value: "8E8E93", description: "systemGray" },
      ],
      variations: [
        { name: "Primary",     shorthand: "1" },
        { name: "Secondary",   shorthand: "2" },
        { name: "Tertiary",    shorthand: "3" },
        { name: "Quaternary",  shorthand: "4" },
        { name: "Placeholder", shorthand: "5" },
      ],
      roles: [
        { name: "Label/Primary",     shorthand: "lp",  spread: 1, minContrast: 7.0,  baseContrast: 7.0,  baseIndex: 20, variationTargets: [12.0, 7.0, 4.5, 3.0, 2.0] },
        { name: "Label/Secondary",   shorthand: "ls",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 16, variationTargets: [7.0,  4.5, 3.0, 2.0, 1.5] },
        { name: "Label/Tertiary",    shorthand: "lt",  spread: 1, minContrast: 3.0,  baseContrast: 3.0,  baseIndex: 13, variationTargets: [4.5,  3.0, 2.0, 1.5, 1.3] },
        { name: "Label/Quaternary",  shorthand: "lq",  spread: 1, minContrast: 1.8,  baseContrast: 2.0,  baseIndex: 9,  variationTargets: [3.0,  2.0, 1.5, 1.3, 1.1] },
        { name: "Fill/System",       shorthand: "fs",  spread: 1, minContrast: 1.3,  baseContrast: 1.5,  baseIndex: 5,  variationTargets: [2.0,  1.5, 1.3, 1.2, 1.1] },
        { name: "Fill/Secondary",    shorthand: "fs2", spread: 1, minContrast: 1.2,  baseContrast: 1.3,  baseIndex: 4,  variationTargets: [1.5,  1.3, 1.2, 1.1, 1.0] },
        { name: "Fill/Tertiary",     shorthand: "ft",  spread: 1, minContrast: 1.1,  baseContrast: 1.2,  baseIndex: 3,  variationTargets: [1.3,  1.2, 1.1, 1.0, 1.0] },
        { name: "Fill/Quaternary",   shorthand: "fq",  spread: 1, minContrast: 1.05, baseContrast: 1.1,  baseIndex: 2,  variationTargets: [1.2,  1.1, 1.0, 1.0, 1.0] },
        { name: "BG/Primary",        shorthand: "bp",  spread: 1, minContrast: 1.0,  baseContrast: 1.0,  baseIndex: 0,  variationTargets: [1.0,  1.0, 1.0, 1.1, 1.2] },
        { name: "BG/Secondary",      shorthand: "bs",  spread: 1, minContrast: 1.1,  baseContrast: 1.1,  baseIndex: 2,  variationTargets: [1.0,  1.1, 1.2, 1.3, 1.4] },
        { name: "BG/Tertiary",       shorthand: "bt",  spread: 1, minContrast: 1.2,  baseContrast: 1.2,  baseIndex: 4,  variationTargets: [1.1,  1.2, 1.3, 1.5, 1.7] },
        { name: "BG/Grouped",        shorthand: "bg2", spread: 1, minContrast: 1.1,  baseContrast: 1.15, baseIndex: 3,  variationTargets: [1.0,  1.1, 1.2, 1.3, 1.5] },
        { name: "Separator",         shorthand: "sep", spread: 1, minContrast: 1.5,  baseContrast: 1.8,  baseIndex: 7,  variationTargets: [1.3,  1.5, 1.8, 2.2, 2.8] },
        { name: "Separator/Opaque",  shorthand: "seo", spread: 1, minContrast: 2.0,  baseContrast: 2.5,  baseIndex: 10, variationTargets: [1.8,  2.0, 2.5, 3.0, 3.5] },
      ],
      themes: [
        { name: "Light", bg: "F2F2F7" },
        { name: "Dark",  bg: "000000" },
      ],
    },
  },

  // ── 7. Tailwind CSS ───────────────────────────────────────────────────────
  {
    id: "tailwind",
    name: "Tailwind CSS",
    badge: "Tailwind",
    description: "11-step utility palette. Slate gray + customisable accent. Step-named variations (50–950).",
    tags: ["Reference", "Utility", "11-step"],
    config: {
      name: "Tailwind CSS",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 11,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      includeAlphaTints: false,
      includeTonalCollection: true,
      includeDescriptions: false,
      tonalScaleCollectionName: "palette",
      tokenCollectionName: "tokens",
      alphaValues: "10, 25, 50, 75, 90",
      globalColorsCollectionName: "global",
      colors: [
        { name: "Slate",  shorthand: "sl", value: "64748B", description: "Tailwind Slate gray" },
        { name: "Blue",   shorthand: "bl", value: "3B82F6", description: "Tailwind Blue 500" },
        { name: "Violet", shorthand: "vi", value: "8B5CF6", description: "Tailwind Violet 500" },
        { name: "Rose",   shorthand: "ro", value: "F43F5E", description: "Tailwind Rose 500" },
      ],
      variations: [
        { name: "50",  shorthand: "50"  },
        { name: "100", shorthand: "100" },
        { name: "200", shorthand: "200" },
        { name: "300", shorthand: "300" },
        { name: "400", shorthand: "400" },
        { name: "500", shorthand: "500" },
        { name: "600", shorthand: "600" },
        { name: "700", shorthand: "700" },
        { name: "800", shorthand: "800" },
        { name: "900", shorthand: "900" },
        { name: "950", shorthand: "950" },
      ],
      roles: [
        { name: "Background",  shorthand: "bg", spread: 1, minContrast: 1.0, baseIndex: 0,  variationTargets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { name: "Surface",     shorthand: "sf", spread: 1, minContrast: 1.1, baseIndex: 1,  variationTargets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { name: "Border",      shorthand: "bd", spread: 1, minContrast: 2.0, baseIndex: 4,  variationTargets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { name: "Text",        shorthand: "tx", spread: 1, minContrast: 4.5, baseIndex: 8,  variationTargets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { name: "Text/Muted",  shorthand: "tm", spread: 1, minContrast: 3.0, baseIndex: 6,  variationTargets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      ],
      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "0F172A" },
      ],
    },
  },

  // ── 8. IBM Carbon ────────────────────────────────────────────────────────
  {
    id: "ibm-carbon",
    name: "IBM Carbon",
    badge: "IBM",
    description: "Enterprise layering system. Interactive, UI Layer, Text, and Field token groups. 4 themes.",
    tags: ["Reference", "Enterprise", "Layered"],
    config: {
      name: "IBM Carbon",
      pluginMode: "scale",
      scaleAlgorithm: "Uniform",
      scaleLength: 10,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      includeAlphaTints: false,
      includeTonalCollection: true,
      includeDescriptions: true,
      tonalScaleCollectionName: "ibm/palette",
      tokenCollectionName: "ibm/tokens",
      alphaValues: "10, 25, 50, 75, 90",
      globalColorsCollectionName: "global",
      colors: [
        { name: "Interactive/Blue", shorthand: "ib", value: "0F62FE", description: "IBM Blue 60" },
        { name: "Neutral/Gray",     shorthand: "ng", value: "8D8D8D", description: "IBM Gray 50" },
        { name: "Support/Error",    shorthand: "se", value: "DA1E28", description: "IBM Red 60" },
        { name: "Support/Warning",  shorthand: "sw", value: "F1C21B", description: "IBM Yellow 30" },
        { name: "Support/Success",  shorthand: "ss", value: "198038", description: "IBM Green 60" },
      ],
      variations: [
        { name: "10",  shorthand: "10" },
        { name: "20",  shorthand: "20" },
        { name: "30",  shorthand: "30" },
        { name: "40",  shorthand: "40" },
        { name: "50",  shorthand: "50" },
        { name: "60",  shorthand: "60" },
        { name: "70",  shorthand: "70" },
        { name: "80",  shorthand: "80" },
        { name: "90",  shorthand: "90" },
        { name: "100", shorthand: "100" },
      ],
      roles: [
        { name: "Interactive/Primary",   shorthand: "i1", spread: 1, minContrast: 4.5, baseIndex: 5,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Interactive/Secondary", shorthand: "i2", spread: 1, minContrast: 3.0, baseIndex: 4,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Interactive/Tertiary",  shorthand: "i3", spread: 1, minContrast: 4.5, baseIndex: 5,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Layer/01",              shorthand: "l1", spread: 1, minContrast: 1.1, baseIndex: 1,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Layer/02",              shorthand: "l2", spread: 1, minContrast: 1.2, baseIndex: 2,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Layer/03",              shorthand: "l3", spread: 1, minContrast: 1.4, baseIndex: 3,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Field/01",              shorthand: "f1", spread: 1, minContrast: 1.1, baseIndex: 1,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Field/02",              shorthand: "f2", spread: 1, minContrast: 1.2, baseIndex: 2,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Text/Primary",          shorthand: "t1", spread: 1, minContrast: 7.0, baseIndex: 8,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Text/Secondary",        shorthand: "t2", spread: 1, minContrast: 4.5, baseIndex: 6,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Text/Placeholder",      shorthand: "t3", spread: 1, minContrast: 3.0, baseIndex: 5,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Text/On-Color",         shorthand: "t4", spread: 1, minContrast: 4.5, baseIndex: 0,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Border/Subtle",         shorthand: "b1", spread: 1, minContrast: 1.5, baseIndex: 3,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Border/Strong",         shorthand: "b2", spread: 1, minContrast: 3.0, baseIndex: 5,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Support/Error",         shorthand: "se", spread: 1, minContrast: 4.5, baseIndex: 6,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Support/Warning",       shorthand: "sw", spread: 1, minContrast: 3.0, baseIndex: 3,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Support/Success",       shorthand: "ss", spread: 1, minContrast: 4.5, baseIndex: 5,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
        { name: "Highlight",             shorthand: "hi", spread: 1, minContrast: 1.3, baseIndex: 2,  variationTargets: [0,1,2,3,4,5,6,7,8,9] },
      ],
      themes: [
        { name: "White",   bg: "FFFFFF" },
        { name: "Gray 10", bg: "F4F4F4" },
        { name: "Gray 90", bg: "262626" },
        { name: "Gray 100",bg: "161616" },
      ],
    },
  },

  // ── 9. Shopify Polaris ────────────────────────────────────────────────────
  {
    id: "shopify-polaris",
    name: "Shopify Polaris",
    badge: "Shopify",
    description: "Commerce-focused semantic roles. Brand, Info, Success, Caution, Critical, Magic, and more.",
    tags: ["Reference", "Adaptive", "Commerce"],
    config: {
      name: "Shopify Polaris",
      pluginMode: "adaptiveEngine",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      includeAlphaTints: false,
      includeTonalCollection: false,
      includeDescriptions: true,
      tonalScaleCollectionName: "_scale",
      tokenCollectionName: "polaris",
      alphaValues: "10, 25, 50, 75, 90",
      globalColorsCollectionName: "global",
      colors: [
        { name: "Color/Brand",    shorthand: "cb", value: "303ADE", description: "Shopify brand blue" },
        { name: "Color/Neutral",  shorthand: "cn", value: "8C9196", description: "Neutral gray" },
        { name: "Color/Success",  shorthand: "cs", value: "007B5E", description: "Success green" },
        { name: "Color/Caution",  shorthand: "cc", value: "916A00", description: "Caution amber" },
        { name: "Color/Critical", shorthand: "ck", value: "CC1515", description: "Critical red" },
        { name: "Color/Magic",    shorthand: "cm", value: "7B2EA8", description: "AI / magic purple" },
      ],
      variations: [
        { name: "Default",  shorthand: "1" },
        { name: "Hover",    shorthand: "2" },
        { name: "Active",   shorthand: "3" },
        { name: "Selected", shorthand: "4" },
        { name: "Disabled", shorthand: "5" },
      ],
      roles: [
        { name: "BG/Default",           shorthand: "bgd",  spread: 1, minContrast: 1.0,  baseContrast: 1.0,  baseIndex: 0,  variationTargets: [1.0,  1.1,  1.2,  1.3,  1.1 ] },
        { name: "BG/Subdued",           shorthand: "bgs",  spread: 1, minContrast: 1.1,  baseContrast: 1.1,  baseIndex: 2,  variationTargets: [1.1,  1.2,  1.3,  1.4,  1.0 ] },
        { name: "Action/Primary",       shorthand: "ap",   spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [4.5,  5.5,  6.5,  7.0,  2.0 ] },
        { name: "Action/Secondary",     shorthand: "as",   spread: 1, minContrast: 3.0,  baseContrast: 3.0,  baseIndex: 12, variationTargets: [3.0,  4.0,  5.0,  5.5,  1.5 ] },
        { name: "Action/Destructive",   shorthand: "ade",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [4.5,  5.5,  6.5,  7.0,  2.0 ] },
        { name: "Text/Default",         shorthand: "txd",  spread: 1, minContrast: 7.0,  baseContrast: 7.0,  baseIndex: 20, variationTargets: [7.0,  7.0,  7.0,  7.0,  2.5 ] },
        { name: "Text/Subdued",         shorthand: "txs",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 16, variationTargets: [4.5,  4.5,  4.5,  4.5,  2.0 ] },
        { name: "Text/On-Color",        shorthand: "txoc", spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 3,  variationTargets: [4.5,  5.5,  6.5,  7.0,  2.0 ] },
        { name: "Icon/Default",         shorthand: "icd",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 16, variationTargets: [4.5,  5.5,  6.0,  7.0,  2.0 ] },
        { name: "Border/Default",       shorthand: "brd",  spread: 1, minContrast: 2.0,  baseContrast: 2.0,  baseIndex: 10, variationTargets: [2.0,  2.5,  3.0,  3.5,  1.3 ] },
        { name: "Feedback/Info",        shorthand: "fbi",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [1.3,  2.0,  4.5,  7.0,  1.3 ] },
        { name: "Feedback/Success",     shorthand: "fbs",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [1.3,  2.0,  4.5,  7.0,  1.3 ] },
        { name: "Feedback/Caution",     shorthand: "fbc",  spread: 1, minContrast: 3.0,  baseContrast: 3.0,  baseIndex: 12, variationTargets: [1.3,  2.0,  3.0,  5.0,  1.3 ] },
        { name: "Feedback/Critical",    shorthand: "fbk",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [1.3,  2.0,  4.5,  7.0,  1.3 ] },
        { name: "Feedback/Magic",       shorthand: "fbm",  spread: 1, minContrast: 4.5,  baseContrast: 4.5,  baseIndex: 14, variationTargets: [1.3,  2.0,  4.5,  7.0,  1.3 ] },
        { name: "Overlay",              shorthand: "ovl",  spread: 1, minContrast: 7.0,  baseContrast: 9.0,  baseIndex: 21, variationTargets: [5.0,  7.0,  9.0,  12.0, 2.0 ] },
      ],
      themes: [
        { name: "Light",   bg: "FAFBFB" },
        { name: "Dark",    bg: "1A1A1A" },
        { name: "Inverse", bg: "1A1F36" },
      ],
    },
  },

  // ── 10. Blank Slate ───────────────────────────────────────────────────────
  {
    id: "blank-slate",
    name: "Blank Slate",
    badge: "Starter",
    description: "Minimal starting point. 2 colors, 3 roles, Light & Dark. Fastest path to a working system.",
    tags: ["Minimal", "Starter"],
    config: {
      name: "My Design System",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      includeAlphaTints: false,
      includeTonalCollection: true,
      includeDescriptions: false,
      tonalScaleCollectionName: "_scale",
      tokenCollectionName: "tokens",
      alphaValues: "10, 25, 50, 75, 90",
      globalColorsCollectionName: "global",
      colors: [
        { name: "Primary", shorthand: "pr", value: "0066FF", description: "" },
        { name: "Gray",    shorthand: "gr", value: "6B7280", description: "" },
      ],
      variations: [
        { name: "Subtle",  shorthand: "1" },
        { name: "Soft",    shorthand: "2" },
        { name: "Default", shorthand: "3" },
        { name: "Strong",  shorthand: "4" },
        { name: "Bold",    shorthand: "5" },
      ],
      roles: [
        { name: "Background", shorthand: "bg", spread: 1, minContrast: 1.1, baseIndex: 3,  variationTargets: [2,  3,  4,  5,  6 ] },
        { name: "Text",       shorthand: "tx", spread: 2, minContrast: 4.5, baseIndex: 18, variationTargets: [14, 16, 18, 20, 22] },
        { name: "Border",     shorthand: "bd", spread: 1, minContrast: 2.0, baseIndex: 10, variationTargets: [8,  9,  10, 11, 12] },
      ],
      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "0F0F0F" },
      ],
    },
  },
];

// ── RENDERER ─────────────────────────────────────────────────────────────────

function renderThemeShop() {
  const overlay = document.getElementById("theme-shop-overlay");
  if (!overlay) return;
  overlay.innerHTML = "";

  // Header
  overlay.appendChild(
    el("div", { class: "flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0" }, [
      el("div", {}, [
        el("h2", { class: "text-[15px] font-semibold text-[var(--text-primary)]" }, ["Design System Presets"]),
        el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, ["Load a preset and start using it — everything is editable after loading."]),
      ]),
      el("button", {
        onclick: () => overlay.classList.add("hidden"),
        class: "w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors text-[18px] leading-none",
        title: "Close",
      }, ["×"]),
    ])
  );

  // Grid
  const grid = el("div", { class: "p-4 grid grid-cols-2 gap-3 overflow-y-auto flex-1" });
  PRESETS.forEach((preset) => grid.appendChild(_presetCard(preset)));
  overlay.appendChild(grid);

  // Keyboard close
  const onKey = (e) => {
    if (e.key === "Escape") { overlay.classList.add("hidden"); document.removeEventListener("keydown", onKey); }
  };
  document.addEventListener("keydown", onKey);
}

function _presetCard(preset) {
  const isCTM = preset.badge === "CTM";
  return el("div", { class: "settings-card flex flex-col gap-2.5 p-3" }, [
    // Badge + name row
    el("div", { class: "flex items-start justify-between gap-1" }, [
      el("div", {}, [
        el("div", { class: "flex items-center gap-1.5 mb-1" }, [
          isCTM
            ? el("span", { class: "text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[var(--accent)] text-white" }, [preset.badge])
            : el("span", { class: "text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[var(--bg-active)] text-[var(--text-muted)]" }, [preset.badge]),
        ]),
        el("p", { class: "text-[13px] font-semibold text-[var(--text-primary)] leading-tight" }, [preset.name]),
      ]),
    ]),

    // Swatch strip
    _swatchStrip(preset.config.colors),

    // Description
    el("p", { class: "text-[11px] text-[var(--text-muted)] leading-relaxed" }, [preset.description]),

    // Tags
    el("div", { class: "flex flex-wrap gap-1" },
      preset.tags.map((tag) =>
        el("span", { class: "text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]" }, [tag])
      )
    ),

    // Stats row
    el("div", { class: "flex gap-3 text-[10px] text-[var(--text-dim)]" }, [
      el("span", {}, [`${preset.config.colors.length} colors`]),
      el("span", {}, [`${preset.config.roles.length} roles`]),
      el("span", {}, [`${preset.config.themes.length} themes`]),
    ]),

    // Load button
    el("button", {
      onclick: () => _loadPreset(preset),
      class: `w-full h-[30px] rounded-[7px] text-[12px] font-semibold transition-colors ${
        isCTM
          ? "bg-[var(--accent)] hover:opacity-90 text-white"
          : "bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)]"
      }`,
    }, [`Load ${preset.name}`]),
  ]);
}

function _swatchStrip(colors) {
  return el("div", { class: "flex gap-1 h-[18px]" },
    colors.map((c) =>
      el("div", {
        class: "flex-1 rounded-[4px]",
        style: `background:#${c.value.replace(/^#/, "")}`,
        title: c.name,
      })
    )
  );
}

function _loadPreset(preset) {
  loadState(preset.config);
  document.getElementById("theme-shop-overlay").classList.add("hidden");

  // Re-render all active screens
  if (typeof renderColorGroups === "function")    renderColorGroups();
  if (typeof renderRoles === "function")           renderRoles();
  if (typeof renderSidebarProject === "function") renderSidebarProject();
  if (typeof syncInputsFromState === "function")  syncInputsFromState();

  // Switch to project tab so the user sees the loaded preset name and themes
  if (typeof switchSidebarTab === "function") switchSidebarTab("project");
}
