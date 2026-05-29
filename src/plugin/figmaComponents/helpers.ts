export function hexToFigmaRgb(hex: string): RGB {
  const clean = hex.replace(/^#/, '').padEnd(6, '0').slice(0, 6);
  const n = parseInt(clean, 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

export function isColorDark(hex: string): boolean {
  const rgb = hexToFigmaRgb(hex);
  const yiq = (rgb.r * 255 * 299 + rgb.g * 255 * 587 + rgb.b * 255 * 114) / 1000;
  return yiq < 128;
}

export function bindFill(node: MinimalFillsMixin, variable: Variable): void {
  node.fills = [
    figma.variables.setBoundVariableForPaint(
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
      'color',
      variable
    ),
  ];
}

export function makeBadge(parent: FrameNode, textContent: string, fontSize: number): TextNode {
  const badge = figma.createFrame();
  badge.layoutMode = 'HORIZONTAL';
  badge.primaryAxisAlignItems = 'CENTER';
  badge.counterAxisAlignItems = 'CENTER';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.paddingLeft = 8;
  badge.paddingRight = 8;
  badge.paddingTop = 4;
  badge.paddingBottom = 4;
  badge.cornerRadius = 8;
  badge.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.3, blendMode: 'NORMAL', visible: true } as SolidPaint];
  badge.strokeWeight = 1;
  parent.appendChild(badge);

  const txt = figma.createText();
  txt.fontName = { family: 'Inter', style: 'Medium' };
  txt.fontSize = fontSize;
  txt.characters = textContent;
  txt.textAutoResize = 'WIDTH_AND_HEIGHT';
  badge.appendChild(txt);
  return txt;
}
