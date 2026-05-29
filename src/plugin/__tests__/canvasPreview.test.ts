import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCanvasPreview } from '../canvasPreview';

// ── FIGMA API MOCKS ──────────────────────────────────────────────────────────

interface MockNode {
  id: string;
  type: string;
  name: string;
  children: MockNode[];
  parent: MockNode | null;
  fills: any[];
  strokes: any[];
  strokeWeight: number;
  x: number;
  y: number;
  layoutMode: string;
  pluginData: Map<string, string>;
  getPluginData: (key: string) => string;
  setPluginData: (key: string, value: string) => void;
  appendChild: (child: MockNode) => void;
  remove: () => void;
  resize: (w: number, h: number) => void;
  setExplicitVariableModeForCollection: (collection: any, modeId: string) => void;
  findOne: (callback: (node: MockNode) => boolean) => MockNode | null;
  [key: string]: any;
}

let nodeIdCounter = 0;
function createBaseMockNode(type: string): MockNode {
  const id = `node-${nodeIdCounter++}`;
  const pluginData = new Map<string, string>();
  const children: MockNode[] = [];
  
  const node: MockNode = {
    id,
    type,
    name: '',
    children,
    parent: null,
    fills: [],
    strokes: [],
    strokeWeight: 0,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    layoutMode: 'NONE',
    pluginData,
    getPluginData: (k) => pluginData.get(k) || '',
    setPluginData: (k, v) => { pluginData.set(k, v); },
    appendChild: (child) => {
      child.parent = node;
      children.push(child);
    },
    remove: vi.fn(function(this: MockNode) {
      if (node.parent) {
        node.parent.children = node.parent.children.filter((c) => c.id !== node.id);
      }
    }),
    resize: vi.fn(function(this: MockNode, w: number, h: number) {
      this.width = w;
      this.height = h;
    }),
    setExplicitVariableModeForCollection: vi.fn(),
    findOne: vi.fn(function(this: MockNode, callback: (node: MockNode) => boolean): MockNode | null {
      const dfs = (n: MockNode): MockNode | null => {
        for (const child of n.children) {
          if (callback(child)) {
            return child;
          }
          const found = dfs(child);
          if (found) return found;
        }
        return null;
      };
      return dfs(this);
    }),
  };

  return node;
}

const mockRoot = createBaseMockNode('DOCUMENT');
let mockCurrentPage = createBaseMockNode('PAGE');
mockCurrentPage.name = 'Page 1';
mockRoot.children.push(mockCurrentPage);

const figmaMock = {
  root: mockRoot,
  currentPage: mockCurrentPage,
  createPage: vi.fn(() => {
    const page = createBaseMockNode('PAGE');
    mockRoot.children.push(page);
    return page as any;
  }),
  setCurrentPageAsync: vi.fn((page) => {
    figmaMock.currentPage = page;
    return Promise.resolve();
  }),
  loadFontAsync: vi.fn(() => Promise.resolve()),
  createFrame: vi.fn(() => createBaseMockNode('FRAME') as any),
  createSection: vi.fn(() => createBaseMockNode('SECTION') as any),
  createComponent: vi.fn(() => {
    const comp = createBaseMockNode('COMPONENT');
    (comp as any).createInstance = vi.fn(() => {
      const inst = createBaseMockNode('INSTANCE');
      inst.name = comp.name + ' Instance';
      
      const cloneChildren = (source: MockNode, target: MockNode) => {
        for (const child of source.children) {
          const childClone = createBaseMockNode(child.type);
          childClone.name = child.name;
          childClone.x = child.x;
          childClone.y = child.y;
          childClone.layoutMode = child.layoutMode;
          childClone.characters = child.characters;
          childClone.fills = [...child.fills];
          childClone.strokes = [...child.strokes];
          childClone.strokeWeight = child.strokeWeight;
          for (const [k, v] of (child as any).pluginData.entries()) {
            childClone.setPluginData(k, v);
          }
          target.appendChild(childClone);
          cloneChildren(child, childClone);
        }
      };
      cloneChildren(comp, inst);
      return inst as any;
    });
    return comp as any;
  }),
  createText: vi.fn(() => createBaseMockNode('TEXT') as any),
  createRectangle: vi.fn(() => createBaseMockNode('RECTANGLE') as any),
  createEllipse: vi.fn(() => createBaseMockNode('ELLIPSE') as any),
  createPolygon: vi.fn(() => {
    const poly = createBaseMockNode('POLYGON');
    (poly as any).pointCount = 3;
    return poly as any;
  }),
  createStar: vi.fn(() => createBaseMockNode('STAR') as any),
  createVector: vi.fn(() => {
    const vec = createBaseMockNode('VECTOR');
    (vec as any).vectorNetwork = {};
    (vec as any).setVectorNetworkAsync = vi.fn((network) => {
      (vec as any).vectorNetwork = network;
      return Promise.resolve();
    });
    return vec as any;
  }),
  variables: {
    getLocalVariableCollectionsAsync: vi.fn(() => Promise.resolve([])),
    getLocalVariablesAsync: vi.fn(() => Promise.resolve([])),
    setBoundVariableForPaint: vi.fn((paint, field, variable) => ({
      ...paint,
      boundVariables: { [field]: { id: variable.id } },
    })),
  },
};

vi.stubGlobal('figma', figmaMock);

// ── TEST SUITE ────────────────────────────────────────────────────────────────

describe('generateCanvasPreview', () => {
  beforeEach(() => {
    nodeIdCounter = 0;
    mockRoot.children = [];
    mockCurrentPage = createBaseMockNode('PAGE');
    mockCurrentPage.name = 'Page 1';
    mockRoot.children.push(mockCurrentPage);
    figmaMock.currentPage = mockCurrentPage;
    
    vi.clearAllMocks();
  });

  const sampleState = {
    pluginMode: 'scale',
    scaleLength: 3,
    includeColorScalesCollection: true,
    scaleCollectionName: '_scale',
    tokenCollectionName: 'color tokens',
    colors: [
      { _id: 'color-primary', name: 'Primary', value: '#FF0000' },
      { _id: 'color-secondary', name: 'Secondary', value: '#00FF00' },
    ],
    roles: [
      { _id: 'role-bg', name: 'Background', scopes: ['FRAME_FILL'] },
      { _id: 'role-text', name: 'Text', scopes: ['TEXT_FILL'] },
      { _id: 'role-shape', name: 'Shape', scopes: ['SHAPE_FILL'] },
      { _id: 'role-stroke', name: 'Stroke', scopes: ['STROKE_COLOR'] },
    ],
    themes: [
      { _id: 'theme-light', name: 'Light', bg: 'FFFFFF' },
      { _id: 'theme-dark', name: 'Dark', bg: '000000' },
    ],
    scaleStepNames: [
      { _id: 'step-100', name: '100', shorthand: '100' },
      { _id: 'step-500', name: '500', shorthand: '500' },
    ],
    variations: [
      { _id: 'var-default', name: 'Default', shorthand: 'D' },
    ],
  };

  it('creates the Colors Preview page if it does not exist and switches to it', async () => {
    expect(mockRoot.children.length).toBe(1);

    await generateCanvasPreview(sampleState);

    expect(figmaMock.createPage).toHaveBeenCalled();
    const previewPage = mockRoot.children.find((c) => c.name === 'Colors Preview');
    expect(previewPage).toBeDefined();
    expect(figmaMock.currentPage).toBe(previewPage);
  });

  it('renders theme container frames and positions them horizontally', async () => {
    await generateCanvasPreview(sampleState);

    const previewPage = mockRoot.children.find((c) => c.name === 'Colors Preview')!;
    const themes = previewPage.children.filter((c) => c.type === 'SECTION' && c.name.includes('Theme'));
    
    expect(themes.length).toBe(2);
    expect(themes[0].name).toBe('Light Theme');
    expect(themes[0].x).toBe(0);
    expect(themes[1].name).toBe('Dark Theme');
    expect(themes[1].x).toBe(1600);
  });

  it('renders scales and token sections in-place when re-run', async () => {
    // Run 1: Create
    await generateCanvasPreview(sampleState);
    const previewPage = mockRoot.children.find((c) => c.name === 'Colors Preview')!;
    const initialThemeCount = previewPage.children.length;
    const firstThemeNodeId = previewPage.children[0].id;

    // Run 2: Update in-place
    await generateCanvasPreview(sampleState);
    
    expect(previewPage.children.length).toBe(initialThemeCount);
    expect(previewPage.children[0].id).toBe(firstThemeNodeId); // Reused same node ID!
  });

  it('removes obsolete themes and colors during garbage collection', async () => {
    // Run 1: with two colors
    await generateCanvasPreview(sampleState);
    const previewPage = mockRoot.children.find((c) => c.name === 'Colors Preview')!;
    const firstTheme = previewPage.children.find((t) => t.name === 'Light Theme')!;
    const tokensSection = firstTheme.children.find((c) => c.name === 'Color Tokens')!;
    const tilesGrid = tokensSection.children.find((c) => c.name === 'Tokens Grid')!;
    
    // tiles = colors × roles × variations = 2 × 4 × 1 = 8
    const rolesCount = sampleState.roles.length;
    const varsCount = sampleState.variations.length;
    expect(tilesGrid.children.length).toBe(2 * rolesCount * varsCount);

    // Run 2: with only Primary color remaining → 1 × 4 × 1 = 4 tiles
    const updatedState = {
      ...sampleState,
      colors: [sampleState.colors[0]],
    };
    await generateCanvasPreview(updatedState);

    expect(tilesGrid.children.length).toBe(1 * rolesCount * varsCount);
  });

  it('renders a Token Wand footer card at the end of each theme section', async () => {
    await generateCanvasPreview(sampleState);

    const previewPage = mockRoot.children.find((c) => c.name === 'Colors Preview')!;
    const lightTheme = previewPage.children.find((t) => t.name === 'Light Theme')!;
    const footerCard = lightTheme.children.find((c) => c.name === 'Made with love by Token Wand')!;
    
    expect(footerCard).toBeDefined();
    const footerText = footerCard.children[0];
    expect((footerText as any).characters).toBe('Made with ♥ by Token Wand');
  });
});
