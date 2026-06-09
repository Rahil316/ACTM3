// Scale Step Preview tile
// Structure (mirrors z-lib/Figma Componenets.md):
//   Component "Scale Step Preview" (300w FIXED, HORIZONTAL, 4px padding, 8px gap)
//     Rectangle "Swatch" (STRETCH, lockAspectRatio)
//     Frame "Info" (VERTICAL, 4px gap, no fill)
//       Badge → Text "Hex Code"    (11px)
//       Badge → Text "@ScaleStepName"   (11px)
//       Frame "Contrast Badges" (HORIZONTAL, 4px gap)
//         Badge → Text "Contrast <ThemeName>"  (8px, one per theme)

import { makeBadge } from "./helpers";

// themes: array of { name: string, bg: string } — one contrast badge per theme
export function buildScaleStepMaster(themes: { name: string }[]): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Scale Step Preview Card";
  comp.layoutMode = "HORIZONTAL";
  comp.paddingLeft = 4;
  comp.paddingRight = 4;
  comp.paddingTop = 4;
  comp.paddingBottom = 4;
  comp.itemSpacing = 8;
  comp.cornerRadius = 12;
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(300, 96);
  comp.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

  // Swatch Style
  const swatch = figma.createRectangle();
  swatch.name = "Swatch";
  swatch.cornerRadius = 8;
  swatch.lockAspectRatio();
  swatch.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
  comp.appendChild(swatch);
  swatch.layoutAlign = "STRETCH";

  // Info Container
  const infoCol = figma.createFrame();
  infoCol.name = "Info";
  infoCol.layoutMode = "VERTICAL";
  infoCol.itemSpacing = 4;
  infoCol.primaryAxisSizingMode = "AUTO";
  infoCol.counterAxisSizingMode = "AUTO";
  infoCol.fills = [];
  comp.appendChild(infoCol);
  infoCol.layoutGrow = 1;
  infoCol.layoutAlign = "STRETCH";

  const stepFullLabel = makeBadge({ parent: infoCol, textContent: "@ScaleStepFullName", fontSize: 11, type: "label" });
  stepFullLabel.name = "@ScaleStepFullName";
  const hexLabel = makeBadge({ parent: infoCol, textContent: "Hex Code", fontSize: 14 });
  hexLabel.name = "Hex Code";

  const contrastRow = figma.createFrame();
  contrastRow.name = "Contrast Badges";
  contrastRow.layoutMode = "VERTICAL";
  contrastRow.itemSpacing = 4;
  contrastRow.primaryAxisSizingMode = "AUTO";
  contrastRow.counterAxisSizingMode = "AUTO";
  contrastRow.fills = [];
  infoCol.appendChild(contrastRow);
  contrastRow.layoutAlign = "STRETCH";

  // One badge per theme: "Contrast <ThemeName>" — matched by name in canvasPreview.ts
  for (const theme of themes) {
    const badge = makeBadge({ parent: contrastRow, textContent: `Contrast ${theme.name}`, fontSize: 9, type: "label", px: 4, py: 4, radious: 9 });
    badge.name = `Contrast ${theme.name}`;
  }

  return comp;
}
