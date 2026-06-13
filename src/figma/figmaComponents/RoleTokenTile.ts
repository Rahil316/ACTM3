// Role Token Preview tile — structure matches the Figma-generated component:
//
//   Component "Role Token Preview"  (300w AUTO, VERTICAL, 4px padding, white fill, 12px radius)
//     Frame "ColorDisplay"          (HORIZONTAL, STRETCH, AUTO height)
//       Frame "@ColorSwatch"        (96×96, VERTICAL, 8px radius)  ← fill = token colour
//         Frame "Badge" → Text "@HexValue"      (11px)
//         Frame "Badge" → Text "@ContrastInfo"  (11px)
//       Frame "@TextSamplesBox"     (VERTICAL, layoutGrow)
//         Text "@TextSample_lg"     (28px Bold)   ← fill = token colour
//         Text "@TextSample_md"     (19px Medium) ← fill = token colour
//         Text "@TextSample_sm"     (12px Regular)← fill = token colour
//     Frame "Token Info"            (VERTICAL, STRETCH, 8px padding)
//       Text "@TokenFullName"       (11px Bold)
//       Text "@ScaleRef"            (11px Regular, hidden when no scale ref)

import { hexToFigmaRgb, makeBadge } from "./helpers";

export function buildRoleTokenMaster(bg: string): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Role Token Preview";
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.paddingLeft = 4;
  comp.paddingRight = 4;
  comp.paddingTop = 4;
  comp.paddingBottom = 4;
  comp.primaryAxisAlignItems = "CENTER";
  comp.cornerRadius = 12;
  comp.fills = [{ type: "SOLID", color: hexToFigmaRgb(bg) }];
  comp.resize(300, 150);

  // ── ColorDisplay row ──────────────────────────────────────────────────────
  const colorDisplay = figma.createFrame();
  colorDisplay.name = "ColorDisplay";
  colorDisplay.layoutMode = "HORIZONTAL";
  colorDisplay.primaryAxisSizingMode = "FIXED";
  colorDisplay.counterAxisSizingMode = "AUTO";
  colorDisplay.counterAxisAlignItems = "CENTER";
  colorDisplay.itemSpacing = 8;
  colorDisplay.fills = [];
  colorDisplay.clipsContent = false;
  colorDisplay.layoutAlign = "STRETCH";
  comp.appendChild(colorDisplay);

  // ── @ColorSwatch ──────────────────────────────────────────────────────────
  const swatchFrame = figma.createFrame();
  swatchFrame.name = "@ColorSwatch";
  swatchFrame.layoutMode = "VERTICAL";
  swatchFrame.primaryAxisSizingMode = "FIXED";
  swatchFrame.counterAxisSizingMode = "FIXED";
  swatchFrame.layoutGrow = 0;
  swatchFrame.layoutAlign = "STRETCH";
  swatchFrame.primaryAxisAlignItems = "CENTER";
  swatchFrame.counterAxisAlignItems = "CENTER";
  swatchFrame.itemSpacing = 8;
  swatchFrame.cornerRadius = 8;
  swatchFrame.clipsContent = true;
  swatchFrame.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
  swatchFrame.resize(96, 96);
  colorDisplay.appendChild(swatchFrame);

  const hexLabel = makeBadge({ parent: swatchFrame, textContent: "Hex Code", fontSize: 11 });
  hexLabel.name = "@HexValue";

  const contrastLabel = makeBadge({ parent: swatchFrame, textContent: "12:1 AAA", fontSize: 11 });
  contrastLabel.name = "@ContrastInfo";

  // ── @TextSamplesBox ───────────────────────────────────────────────────────
  const textSamplesBox = figma.createFrame();
  textSamplesBox.name = "@TextSamplesBox";
  textSamplesBox.layoutMode = "VERTICAL";
  textSamplesBox.primaryAxisSizingMode = "FIXED";
  textSamplesBox.counterAxisSizingMode = "AUTO";
  textSamplesBox.primaryAxisAlignItems = "CENTER";
  textSamplesBox.itemSpacing = 8;
  textSamplesBox.paddingLeft = 8;
  textSamplesBox.paddingRight = 8;
  textSamplesBox.fills = [];
  textSamplesBox.layoutGrow = 1;
  textSamplesBox.layoutAlign = "STRETCH";
  colorDisplay.appendChild(textSamplesBox);

  const samples: Array<{ name: string; style: string; size: number }> = [
    { name: "@TextSample_lg", style: "Bold", size: 28 },
    { name: "@TextSample_md", style: "Medium", size: 19 },
    { name: "@TextSample_sm", style: "Regular", size: 12 },
  ];
  for (const { name, style, size } of samples) {
    const t = figma.createText();
    t.name = name;
    t.fontName = { family: "Inter", style };
    t.fontSize = size;
    t.characters = "Abcdefg";
    t.lineHeight = { unit: "PERCENT", value: 100 };
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
    t.autoRename = false;
    textSamplesBox.appendChild(t);
  }

  // ── Token Info ────────────────────────────────────────────────────────────
  const tokenInfo = figma.createFrame();
  tokenInfo.name = "Token Info";
  tokenInfo.layoutMode = "VERTICAL";
  tokenInfo.primaryAxisSizingMode = "AUTO";
  tokenInfo.counterAxisSizingMode = "AUTO";
  tokenInfo.itemSpacing = 4;
  tokenInfo.paddingLeft = 8;
  tokenInfo.paddingRight = 8;
  tokenInfo.paddingTop = 8;
  tokenInfo.paddingBottom = 8;
  tokenInfo.clipsContent = false;
  tokenInfo.fills = [];
  tokenInfo.layoutAlign = "STRETCH";
  comp.appendChild(tokenInfo);

  const tokenFullName = figma.createText();
  tokenFullName.name = "@TokenFullName";
  tokenFullName.fontName = { family: "Inter", style: "Bold" };
  tokenFullName.fontSize = 11;
  tokenFullName.characters = "Role Token Name";
  tokenFullName.textAutoResize = "WIDTH_AND_HEIGHT";
  tokenFullName.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
  tokenFullName.autoRename = false;
  tokenInfo.appendChild(tokenFullName);

  const scaleRef = figma.createText();
  scaleRef.name = "@ScaleRef";
  scaleRef.fontName = { family: "Inter", style: "Regular" };
  scaleRef.fontSize = 11;
  scaleRef.characters = "ref: —";
  scaleRef.textAutoResize = "WIDTH_AND_HEIGHT";
  scaleRef.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
  scaleRef.autoRename = false;
  tokenInfo.appendChild(scaleRef);

  return comp;
}
