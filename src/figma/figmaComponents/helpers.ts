export function hexToFigmaRgb(hex: string): RGB {
  const clean = hex.replace(/^#/, "").padEnd(6, "0").slice(0, 6);
  const n = parseInt(clean, 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

export function isColorDark(hex: string): boolean {
  const rgb = hexToFigmaRgb(hex);
  const yiq = (rgb.r * 255 * 299 + rgb.g * 255 * 587 + rgb.b * 255 * 114) / 1000;
  return yiq < 128;
}

export function bindFill(node: MinimalFillsMixin, variable: Variable): void {
  node.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", variable)];
}

// Every instance of a component is a structural clone of its master (same
// child order at every level), so a named node's position can be resolved
// ONCE against the master and then reused via plain child-index lookups —
// instead of calling instance.findOne(...) (a tree search) on every single
// instance. Built for canvas-preview sections with hundreds of instances per
// master, where per-instance findOne calls were the dominant render cost.
export type NodePath = number[];

function findNodePath(root: SceneNode, predicate: (n: SceneNode) => boolean, path: NodePath = []): NodePath | null {
  if (predicate(root)) return path;
  if ("children" in root) {
    for (let i = 0; i < root.children.length; i++) {
      const found = findNodePath(root.children[i], predicate, [...path, i]);
      if (found) return found;
    }
  }
  return null;
}

// Resolves each name's path against the master ONCE. Call this right after
// building/reusing a master, then use getByPath on every instance — never
// findOne per-instance.
export function resolveNodePaths(master: SceneNode, names: string[]): Record<string, NodePath | null> {
  const paths: Record<string, NodePath | null> = {};
  for (const name of names) {
    paths[name] = findNodePath(master, (n) => n.name === name);
  }
  return paths;
}

export function getByPath(instance: SceneNode, path: NodePath | null | undefined): SceneNode | null {
  if (!path) return null;
  let node: SceneNode = instance;
  for (const idx of path) {
    if (!("children" in node) || !node.children[idx]) return null;
    node = node.children[idx];
  }
  return node;
}
interface BadgeProps {
  parent: FrameNode;
  textContent: string;
  fontSize: number;
  type?: "pill" | "label";
  px?: number;
  py?: number;
  radius?: number;
}
export function makeBadge(props: BadgeProps): TextNode {
  const { parent, textContent, fontSize, type, px, py, radius } = props;
  //Get Label
  if (type === "label") {
    const txt = figma.createText();
    txt.fontName = { family: "Inter", style: "Medium" };
    txt.fontSize = fontSize;
    txt.characters = textContent;
    txt.textAutoResize = "WIDTH_AND_HEIGHT";
    parent.appendChild(txt);
    return txt;
  }

  const badge = figma.createFrame();
  badge.layoutMode = "HORIZONTAL";
  badge.primaryAxisAlignItems = "CENTER";
  badge.counterAxisAlignItems = "CENTER";
  badge.primaryAxisSizingMode = "AUTO";
  badge.counterAxisSizingMode = "AUTO";
  badge.paddingLeft = px || 4;
  badge.paddingRight = px || 4;
  badge.paddingTop = py || 4;
  badge.paddingBottom = py || 4;
  badge.cornerRadius = radius || 8;
  badge.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.3, blendMode: "NORMAL", visible: true } as SolidPaint];
  badge.strokeWeight = 1;
  parent.appendChild(badge);

  //Get pill
  const txt = figma.createText();
  txt.fontName = { family: "Inter", style: "Medium" };
  txt.fontSize = fontSize;
  txt.characters = textContent;
  txt.textAutoResize = "WIDTH_AND_HEIGHT";
  badge.appendChild(txt);
  return txt;
}
