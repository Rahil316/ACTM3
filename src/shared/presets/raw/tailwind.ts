/**
 * Tailwind CSS preset.
 *
 * Role = semantic color category. Variations = the named slots within that category.
 *
 * Tailwind's color scale uses 11 named stops: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950.
 * The palette is purely numeric — there is no semantic role layer in core Tailwind.
 * This preset adds a semantic layer on top so the palette maps cleanly to component use cases.
 *
 * Collection names mirror Tailwind's convention:
 *   scaleCollectionName: "palette"    → the raw 11-stop tonal ramps
 *   tokenCollectionName: "tokens"     → semantic component tokens
 *
 * Role/variation architecture (role = use case, variation = state/intensity within that role):
 *   background/     subtle · default · raised
 *   border/         subtle · default · strong
 *   fill/           muted · default · strong
 *   text/           muted · default · strong · inverse
 *   status/success/ bg · border · text
 *   status/warning/ bg · border · text
 *   status/error/   bg · border · text
 *
 * Variable path examples:
 *   Slate/background/subtle    Blue/fill/default    Rose/text/strong
 *
 * Contrast targets per slot (solved against theme bg #FFFFFF light / #0F172A dark):
 *   background/subtle     1.05  off-white tint (≈ Tailwind 50)
 *   background/default    1.15  light surface (≈ Tailwind 100)
 *   background/raised     1.3   raised card   (≈ Tailwind 200)
 *   border/subtle         1.6   separator     (≈ Tailwind 300)
 *   border/default        2.5   UI border     (≈ Tailwind 400)
 *   border/strong         3.5   strong outline
 *   fill/muted            2.5   muted fill    (≈ Tailwind 400)
 *   fill/default          4.5   AA fill       (≈ Tailwind 500)
 *   fill/strong           7.0   strong fill   (≈ Tailwind 700)
 *   text/muted            3.0   helper text   (AA-large, ≈ Tailwind 500)
 *   text/default          4.5   body text     (AA, ≈ Tailwind 600–700)
 *   text/strong           7.0   heading text  (AAA, ≈ Tailwind 800–900)
 *   text/inverse          1.1   text on colored fill
 *   status/[channel]/bg      1.15  tinted status background
 *   status/[channel]/border  2.5   status border
 *   status/[channel]/text    4.5   status text / icon
 */

import type { Preset } from "../themeShop";

const presets: Preset[] = [
  {
    id: "tailwind-css",
    name: "Tailwind CSS",
    badge: "TW",
    description:
      "Tailwind's 11-stop palette with a semantic layer on top. Role = use case (background, border, fill, text, status). Variation = intensity/state within that role. Collection names match Tailwind conventions.",
    tags: ["tailwind", "utility", "11-step", "css", "react", "nextjs"],
    swatches: ["64748B", "3B82F6", "8B5CF6", "F43F5E"],
    config: {
      name: "Tailwind CSS",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 11,
      useUniformAlgorithm: true,
      algorithmScopeLevel: "color",
      solverMode: "natural",
      tokenNameSegments: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      includeSourceColors: false,
      sourceCollectionName: "global",
      alphaValues: [5, 10, 20, 25, 50, 75, 80, 90, 95],
      includeColorScalesCollection: true,
      includeDescriptions: true,
      scaleCollectionName: "palette",
      tokenCollectionName: "tokens",
      scaleSteps: null,
      canEditRoleVariants: true,

      // Global variations — not used directly (every role defines its own).
      variations: [{ name: "default", shorthand: "default", target: 1 }],

      colors: [
        { name: "Slate", shorthand: "Slate", value: "64748B", description: "Slate — blue-gray neutral" },
        { name: "Blue", shorthand: "Blue", value: "3B82F6", description: "Blue — primary interactive" },
        { name: "Violet", shorthand: "Violet", value: "8B5CF6", description: "Violet — accent" },
        { name: "Rose", shorthand: "Rose", value: "F43F5E", description: "Rose — error / destructive" },
      ],

      roles: [
        // ── BACKGROUND ──────────────────────────────────────────────────────────
        // Page canvas, surface, and raised card fills.
        {
          name: "background",
          shorthand: "background",
          variations: [
            { name: "subtle", shorthand: "subtle", target: 1.05 }, // ≈ TW 50  — off-white tint
            { name: "default", shorthand: "default", target: 1.15 }, // ≈ TW 100 — light surface
            { name: "raised", shorthand: "raised", target: 1.3 }, // ≈ TW 200 — raised card
          ],
          description: "Background fills · subtle tint · surface · raised card",
        },

        // ── BORDER ──────────────────────────────────────────────────────────────
        // Separators, UI borders, and strong outlines.
        {
          name: "border",
          shorthand: "border",
          variations: [
            { name: "subtle", shorthand: "subtle", target: 1.6 }, // ≈ TW 300 — decorative separator
            { name: "default", shorthand: "default", target: 2.5 }, // ≈ TW 400 — UI border
            { name: "strong", shorthand: "strong", target: 3.5 }, // ≈ TW 500 — strong outline / focus ring
          ],
          description: "Border strokes · subtle separator · UI border · strong outline",
        },

        // ── FILL ────────────────────────────────────────────────────────────────
        // Interactive component fills — muted, standard AA, and strong.
        {
          name: "fill",
          shorthand: "fill",
          variations: [
            { name: "muted", shorthand: "muted", target: 2.5 }, // ≈ TW 400 — icon / muted fill
            { name: "default", shorthand: "default", target: 4.5 }, // ≈ TW 500 — AA solid fill (button)
            { name: "strong", shorthand: "strong", target: 7.0 }, // ≈ TW 700 — high-emphasis fill
          ],
          description: "Solid fills · muted icon · AA button fill · strong emphasis",
        },

        // ── TEXT ────────────────────────────────────────────────────────────────
        // Body text hierarchy: muted helper through AAA heading.
        {
          name: "text",
          shorthand: "text",
          variations: [
            { name: "muted", shorthand: "muted", target: 3.0 }, // ≈ TW 500 — placeholder / hint text
            { name: "default", shorthand: "default", target: 4.5 }, // ≈ TW 600 — AA body text
            { name: "strong", shorthand: "strong", target: 7.0 }, // ≈ TW 800 — AAA heading
            { name: "inverse", shorthand: "inverse", target: 1.1 }, // ≈ TW 50  — text on colored fill
          ],
          description: "Text hierarchy · muted placeholder · AA body · AAA heading · inverse on fill",
        },

        // ── STATUS / SUCCESS ─────────────────────────────────────────────────────
        {
          name: "status/success",
          shorthand: "status/success",
          variations: [
            { name: "bg", shorthand: "bg", target: 1.15 }, // tinted success background
            { name: "border", shorthand: "border", target: 2.5 }, // success field border
            { name: "text", shorthand: "text", target: 4.5 }, // success text / icon
          ],
          description: "Success feedback · tinted bg · border · text",
        },

        // ── STATUS / WARNING ─────────────────────────────────────────────────────
        {
          name: "status/warning",
          shorthand: "status/warning",
          variations: [
            { name: "bg", shorthand: "bg", target: 1.15 },
            { name: "border", shorthand: "border", target: 2.5 },
            { name: "text", shorthand: "text", target: 4.5 },
          ],
          description: "Warning feedback · tinted bg · border · text",
        },

        // ── STATUS / ERROR ───────────────────────────────────────────────────────
        {
          name: "status/error",
          shorthand: "status/error",
          variations: [
            { name: "bg", shorthand: "bg", target: 1.15 },
            { name: "border", shorthand: "border", target: 2.5 },
            { name: "text", shorthand: "text", target: 4.5 },
          ],
          description: "Error feedback · tinted bg · border · text",
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
