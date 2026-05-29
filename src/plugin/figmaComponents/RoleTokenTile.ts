// Role Token Preview tile
// Structure (mirrors z-lib/RoleTokenFigmaComponenet.md — "Card" section):
//   Component "Role Token Preview" (400w FIXED, HORIZONTAL, 4px padding, 8px gap)
//     Frame "Swatch" (192×108, VERTICAL, 8px radius, primaryAxisAlignItems MAX)
//       ← frame fill = the token variable colour
//       Frame "Swatch Footer" (HORIZONTAL, STRETCH, FIXED primary, bottom-aligned)
//         Badge → Text "Hex Code"              (11px)
//         Frame "Contrast Wrapper" (HORIZONTAL, 4px gap, no fill)
//           Badge → Text "Contrast vs Theme BG" (11px, "12:1 AAA")
//     Frame "Token Info" (VERTICAL, layoutGrow, 8px gap)
//       Frame "Color samples on text" (HORIZONTAL, BASELINE, 8px padding, STRETCH, FIXED primary)
//         Text "Aa Bold"    28px   ← variable colour fill
//         Text "Aa Medium"  19px   ← variable colour fill
//         Text "Aa Regular" 12px   ← variable colour fill
//       Frame "Info" (VERTICAL, 4px gap, STRETCH)
//         Badge → Text "Role Token Name"       (11px)
//         Frame "Scale Step Reference" (HORIZONTAL, hidden when no step connected)
//           Text "Referee Scale Step"          (11px)

import { makeBadge } from "./helpers";

export function buildRoleTokenMaster(): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Role Token Preview";
  comp.layoutMode = "HORIZONTAL";
  comp.paddingLeft = 4;
  comp.paddingRight = 4;
  comp.paddingTop = 4;
  comp.paddingBottom = 4;
  comp.itemSpacing = 8;
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(400, 116);
  comp.fills = [];

  // ── Left: Swatch frame (fill = token colour) ─────────────────────────────────
  const swatchFrame = figma.createFrame();
  swatchFrame.name = "Swatch";
  swatchFrame.layoutMode = "VERTICAL";
  swatchFrame.primaryAxisSizingMode = "FIXED";
  swatchFrame.primaryAxisAlignItems = "MAX";
  swatchFrame.counterAxisAlignItems = "CENTER";
  swatchFrame.itemSpacing = 8;
  swatchFrame.paddingLeft = 4;
  swatchFrame.paddingRight = 4;
  swatchFrame.paddingTop = 4;
  swatchFrame.paddingBottom = 4;
  swatchFrame.cornerRadius = 8;
  swatchFrame.clipsContent = false;
  swatchFrame.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
  swatchFrame.resize(224, 120);
  comp.appendChild(swatchFrame);
  swatchFrame.layoutAlign = "STRETCH";

  // Bottom row inside swatch: hex + contrast
  const swatchFooter = figma.createFrame();
  swatchFooter.name = "Swatch Footer";
  swatchFooter.layoutMode = "HORIZONTAL";
  swatchFooter.primaryAxisSizingMode = "FIXED";
  swatchFooter.counterAxisSizingMode = "AUTO";
  swatchFooter.counterAxisAlignItems = "CENTER";
  swatchFooter.itemSpacing = 8;
  swatchFooter.fills = [];
  swatchFooter.clipsContent = false;
  swatchFrame.appendChild(swatchFooter);
  swatchFooter.layoutAlign = "STRETCH";

  const hexLabel = makeBadge(swatchFooter, "Hex Code", 11);
  hexLabel.name = "Hex Code";

  const contrastWrapper = figma.createFrame();
  contrastWrapper.name = "Contrast Wrapper";
  contrastWrapper.layoutMode = "HORIZONTAL";
  contrastWrapper.primaryAxisSizingMode = "AUTO";
  contrastWrapper.counterAxisSizingMode = "AUTO";
  contrastWrapper.itemSpacing = 4;
  contrastWrapper.fills = [];
  swatchFooter.appendChild(contrastWrapper);

  const contrastLabel = makeBadge(contrastWrapper, "12:1 AAA", 11);
  contrastLabel.name = "Contrast vs Theme BG";

  // ── Right: Token Info (type previews + info) ─────────────────────────────────
  const tokenInfo = figma.createFrame();
  tokenInfo.name = "Token Info";
  tokenInfo.layoutMode = "VERTICAL";
  tokenInfo.primaryAxisSizingMode = "AUTO";
  tokenInfo.itemSpacing = 8;
  tokenInfo.fills = [];
  tokenInfo.clipsContent = false;
  comp.appendChild(tokenInfo);
  tokenInfo.layoutGrow = 1;

  // "Aa" colour samples — text colour = variable colour
  const colorSamplesFrame = figma.createFrame();
  colorSamplesFrame.name = "Color samples on text";
  colorSamplesFrame.layoutMode = "HORIZONTAL";
  colorSamplesFrame.primaryAxisSizingMode = "FIXED";
  colorSamplesFrame.counterAxisSizingMode = "AUTO";
  colorSamplesFrame.counterAxisAlignItems = "BASELINE";
  colorSamplesFrame.itemSpacing = 8;
  colorSamplesFrame.paddingLeft = 8;
  colorSamplesFrame.paddingRight = 8;
  colorSamplesFrame.paddingTop = 8;
  colorSamplesFrame.paddingBottom = 8;
  colorSamplesFrame.cornerRadius = 8;
  colorSamplesFrame.fills = [];
  tokenInfo.appendChild(colorSamplesFrame);
  colorSamplesFrame.layoutAlign = "STRETCH";

  const aaSamples: Array<{ name: string; style: string; size: number }> = [
    { name: "Aa Bold", style: "Bold", size: 28 },
    { name: "Aa Medium", style: "Medium", size: 19 },
    { name: "Aa Regular", style: "Regular", size: 12 },
  ];
  for (const { name, style, size } of aaSamples) {
    const t = figma.createText();
    t.name = name;
    t.fontName = { family: "Inter", style };
    t.fontSize = size;
    t.characters = "Aa";
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
    t.autoRename = false;
    colorSamplesFrame.appendChild(t);
  }

  // Info badges
  const infoFrame = figma.createFrame();
  infoFrame.name = "Info";
  infoFrame.layoutMode = "VERTICAL";
  infoFrame.primaryAxisSizingMode = "AUTO";
  infoFrame.itemSpacing = 4;
  infoFrame.fills = [];
  tokenInfo.appendChild(infoFrame);
  infoFrame.layoutAlign = "STRETCH";

  const roleLabel = makeBadge(infoFrame, "Role Token Name", 11);
  roleLabel.name = "Role Token Name";

  // Referee scale step — optionally hidden when no step is connected
  const refContainer = figma.createFrame();
  refContainer.name = "Scale Step Reference";
  refContainer.layoutMode = "HORIZONTAL";
  refContainer.primaryAxisSizingMode = "AUTO";
  refContainer.counterAxisSizingMode = "AUTO";
  refContainer.primaryAxisAlignItems = "CENTER";
  refContainer.counterAxisAlignItems = "CENTER";
  refContainer.paddingLeft = 8;
  refContainer.paddingRight = 8;
  refContainer.paddingTop = 4;
  refContainer.paddingBottom = 4;
  refContainer.cornerRadius = 8;
  refContainer.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.3, blendMode: "NORMAL", visible: true } as SolidPaint];
  infoFrame.appendChild(refContainer);

  const refText = figma.createText();
  refText.name = "Referee Scale Step";
  refText.fontName = { family: "Inter", style: "Medium" };
  refText.fontSize = 11;
  refText.characters = "Referee Scale Step";
  refText.textAutoResize = "WIDTH_AND_HEIGHT";
  refText.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
  refText.autoRename = false;
  refContainer.appendChild(refText);

  return comp;
}
