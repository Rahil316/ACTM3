// Scale Step Preview tile
// Structure (mirrors z-lib/Figma Componenets.md):
//   Component "Scale Step Preview" (300w FIXED, HORIZONTAL, 4px padding, 8px gap)
//     Rectangle "Swatch" (STRETCH, lockAspectRatio)
//     Frame "Info" (VERTICAL, 4px gap, no fill)
//       Badge → Text "Hex Code"    (11px)
//       Badge → Text "Step Name"   (11px)
//       Frame "Contrast Badges" (HORIZONTAL, 4px gap)
//         Badge → Text "Contrast <ThemeName>"  (8px, one per theme)

import { makeBadge } from "./helpers";

// themes: array of { name: string, bg: string } — one contrast badge per theme
export function buildScaleStepMaster(themes: { name: string }[]): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Scale Step Preview";
  comp.layoutMode = "HORIZONTAL";
  comp.paddingLeft = 4;
  comp.paddingRight = 4;
  comp.paddingTop = 4;
  comp.paddingBottom = 4;
  comp.itemSpacing = 8;
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(300, 76);
  comp.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

  const swatch = figma.createRectangle();
  swatch.name = "Swatch";
  swatch.cornerRadius = 8;
  swatch.lockAspectRatio();
  swatch.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
  comp.appendChild(swatch);
  swatch.layoutAlign = "STRETCH";

  const infoCol = figma.createFrame();
  infoCol.name = "Info";
  infoCol.layoutMode = "VERTICAL";
  infoCol.itemSpacing = 4;
  infoCol.primaryAxisSizingMode = "AUTO";
  infoCol.counterAxisSizingMode = "AUTO";
  infoCol.fills = [];
  comp.appendChild(infoCol);

  const hexLabel = makeBadge(infoCol, "Hex Code", 11);
  hexLabel.name = "Hex Code";

  const stepLabel = makeBadge(infoCol, "Step Name", 11);
  stepLabel.name = "Step Name";

  const contrastRow = figma.createFrame();
  contrastRow.name = "Contrast Badges";
  contrastRow.layoutMode = "HORIZONTAL";
  contrastRow.itemSpacing = 4;
  contrastRow.primaryAxisSizingMode = "AUTO";
  contrastRow.counterAxisSizingMode = "AUTO";
  contrastRow.fills = [];
  infoCol.appendChild(contrastRow);

  // One badge per theme: "Contrast <ThemeName>" — matched by name in canvasPreview.ts
  for (const theme of themes) {
    const badge = makeBadge(contrastRow, `Contrast ${theme.name}`, 8);
    badge.name = `Contrast ${theme.name}`;
  }

  return comp;
}
