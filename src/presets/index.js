/**
 * PRESETS global assembler.
 * Concatenates all per-system preset arrays into the single PRESETS global
 * consumed by themeShop.js.
 *
 * To add a new design system:
 *   1. Create src/presets/<system>.js  (exports a const <SYSTEM>_PRESETS array)
 *   2. Add a <script src="..."> for it in ui.html before this file
 *   3. Spread it into PRESETS below
 *
 * Order determines display order in the theme shop.
 * Token Wand presets are always first — they are the defaults and the showcase.
 */
const PRESETS = [
  ...TW_PRESETS,
  ...MATERIAL_PRESETS,
  ...ATLASSIAN_PRESETS,
  ...RADIX_PRESETS,
  ...APPLE_PRESETS,
  ...TAILWIND_PRESETS,
  ...CARBON_PRESETS,
  ...POLARIS_PRESETS,
  ...BLANK_PRESETS,
];
