// Source + Opacity Preview tile
// Structure (mirrors z-lib/Souce&Alpha Figma Componenet.md):
//   Component "Source + Opacity Preview" (600w FIXED, VERTICAL, 2px padding, 2px gap)
//     Frame "SwatchFrame" (VERTICAL, layoutGrow, STRETCH)
//       Rectangle "Swatch" (layoutGrow, STRETCH) ← source color fill
//       Frame "Overlay" (ABSOLUTE, top-right, VERTICAL, 6px gap, no fill)
//         Badge → Text "Color Name"   (11px)
//         Frame "Contrast Badges" (HORIZONTAL, 4px gap)
//           Badge → Text "Contrast <ThemeName>"  (8px, one per theme)
//     Frame "AlphaStrip" (HORIZONTAL, FIXED, STRETCH, 2px gap)
//       N× Rectangle "Swatch" (layoutGrow, h56)

import { makeBadge } from "./helpers";

// themes: array of { name: string, bg: string } — one contrast badge per theme
export function buildSourceAlphaMaster(alphaCount: number, themes: { name: string }[]): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Source + Opacity Preview";
  comp.layoutMode = "VERTICAL";
  comp.paddingLeft = 2;
  comp.paddingRight = 2;
  comp.paddingTop = 2;
  comp.paddingBottom = 2;
  comp.itemSpacing = 2;
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";
  comp.resize(600, 174);
  comp.cornerRadius = 24;

  comp.fills = [];

  // ── SwatchFrame ─────────────────────────────────────────────────────────────
  const swatchFrame = figma.createFrame();
  swatchFrame.name = "SwatchFrame";
  swatchFrame.layoutMode = "VERTICAL";
  swatchFrame.itemSpacing = 8;
  swatchFrame.primaryAxisSizingMode = "AUTO";
  swatchFrame.counterAxisSizingMode = "FIXED";
  swatchFrame.fills = [];
  comp.appendChild(swatchFrame);
  swatchFrame.layoutAlign = "STRETCH";
  swatchFrame.layoutGrow = 1;

  const mainSwatch = figma.createRectangle();
  mainSwatch.name = "Swatch";
  mainSwatch.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
  swatchFrame.appendChild(mainSwatch);
  mainSwatch.layoutGrow = 1;
  mainSwatch.layoutAlign = "STRETCH";

  // Overlay (absolute, top-right corner)
  const overlay = figma.createFrame();
  overlay.name = "Overlay";
  overlay.layoutMode = "VERTICAL";
  overlay.counterAxisAlignItems = "MAX";
  overlay.itemSpacing = 6;
  overlay.primaryAxisSizingMode = "AUTO";
  overlay.counterAxisSizingMode = "AUTO";
  overlay.fills = [];
  overlay.constraints = { horizontal: "MAX", vertical: "MIN" };
  swatchFrame.appendChild(overlay);
  overlay.layoutPositioning = "ABSOLUTE";
  overlay.x = swatchFrame.width - 134;
  overlay.y = 8;

  const colorNameLabel = makeBadge({ parent: overlay, textContent: "Color Name", fontSize: 11 });
  colorNameLabel.name = "Color Name";

  const contrastRow = figma.createFrame();
  contrastRow.name = "Contrast Badges";
  contrastRow.layoutMode = "HORIZONTAL";
  contrastRow.itemSpacing = 4;
  contrastRow.primaryAxisSizingMode = "AUTO";
  contrastRow.counterAxisSizingMode = "AUTO";
  contrastRow.fills = [];
  overlay.appendChild(contrastRow);

  // One badge per theme: "Contrast <ThemeName>" — matched by name in canvasPreview.ts
  for (const theme of themes) {
    const badge = makeBadge({ parent: contrastRow, textContent: `Contrast ${theme.name}`, fontSize: 8 });
    badge.name = `Contrast ${theme.name}`;
  }

  // ── AlphaStrip ───────────────────────────────────────────────────────────────
  const alphaStrip = figma.createFrame();
  alphaStrip.name = "AlphaStrip";
  alphaStrip.layoutMode = "HORIZONTAL";
  alphaStrip.itemSpacing = 2;
  alphaStrip.primaryAxisSizingMode = "FIXED";
  alphaStrip.counterAxisSizingMode = "AUTO";
  alphaStrip.fills = [];
  comp.appendChild(alphaStrip);
  alphaStrip.layoutAlign = "STRETCH";

  const count = Math.max(1, alphaCount);
  for (let i = 0; i < count; i++) {
    const r = figma.createRectangle();
    r.name = "Swatch";
    r.resize(Math.floor(596 / count), 56);
    r.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
    alphaStrip.appendChild(r);
    r.layoutGrow = 1;
  }

  return comp;
}
