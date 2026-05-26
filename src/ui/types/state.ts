// ── Core entity types ────────────────────────────────────────────────────────

export type PluginMode = 'scale' | 'direct';
export type MappingMethod = 'contrast' | 'index';
export type AlgorithmScopeLevel = 'color' | 'role';
export type TokenGrouping = 'color' | 'role';
export type TokenNameSegment = 'color' | 'role' | 'variation';

export type ScaleAlgorithm =
  | 'Natural'
  | 'Uniform'
  | 'Expressive'
  | 'Symmetric'
  | 'OKLCH'
  | 'Material'
  | 'Linear';

export type SolverMode =
  | 'natural'
  | 'saturated'
  | 'luminance'
  | 'hue-locked'
  | 'chroma-maximized';

// ── Entity shapes ────────────────────────────────────────────────────────────

export interface Variation {
  _id: string;
  name: string;
  shorthand: string;
  description?: string;
}

export interface ScaleStepName {
  _id: string;
  name: string;
  shorthand: string;
}

export interface Color {
  _id: string;
  name: string;
  shorthand: string;
  value: string;
  description: string;
  scaleAlgorithm?: ScaleAlgorithm;
  solverMode?: SolverMode;
}

export interface Role {
  _id: string;
  name: string;
  shorthand: string;
  minContrast: number;
  mappingMethod: MappingMethod;
  variationTargets: number[];
  customVariationList: boolean;
  customVariations: Variation[];
  scaleAlgorithm?: ScaleAlgorithm;
  solverMode?: SolverMode;
  description?: string;
  scopedColorIds?: string[] | null;
}

export interface Theme {
  _id: string;
  name: string;
  bg: string;
}

export interface Version {
  _id: string;
  name: string;
  description: string;
  createdAt: number;
  state: Omit<AppState, 'versions'>;
}

// ── Root app state ───────────────────────────────────────────────────────────

export interface AppState {
  name: string;
  description: string;
  versions: Version[];

  pluginMode: PluginMode;
  scaleAlgorithm: ScaleAlgorithm;
  scaleLength: number;
  useUniformAlgorithm: boolean;
  algorithmScopeLevel: AlgorithmScopeLevel;
  solverMode: SolverMode;

  tokenNameSegments: TokenNameSegment[];
  useShorthandColors: boolean;
  useShorthandRoles: boolean;
  useShorthandVariations: boolean;
  useShorthandSteps: boolean;

  resolveTokensDirectly: boolean;
  includeSourceColors: boolean;
  sourceCollectionName: string;
  includeAlphaTints: boolean;
  alphaValues: string;
  tokenGrouping: TokenGrouping;
  includeColorScalesCollection: boolean;
  includeDescriptions: boolean;
  scaleCollectionName: string;
  tokenCollectionName: string;

  scaleStepNames: ScaleStepName[] | null;
  variations: Variation[] | null;
  perRoleVariationOverride: boolean;

  colors: Color[];
  roles: Role[];
  themes: Theme[];

  _presetId?: string;
}

// ── UI preferences ───────────────────────────────────────────────────────────

export type UiTheme = 'figma' | 'dark' | 'light';
export type UiLanguage = 'en' | 'es' | 'hi';

export interface UiPrefs {
  scale: number;
  theme: UiTheme;
  language: UiLanguage;
}

// ── UI routing ───────────────────────────────────────────────────────────────

export type SidebarTab = 'color-groups' | 'roles' | 'project' | 'themes' | 'saved-states';
export type ActiveOverlay =
  | null
  | 'settings'
  | 'preview'
  | 'run-dialog'
  | 'save-version'
  | 'quick-start'
  | 'design-lab'
  | 'export-sheet'
  | 'theme-shop';
export type SettingsTab = 'tokens' | 'roles' | 'plugin';

// ── Validation ───────────────────────────────────────────────────────────────

export type ValidationIssues = string[] | null;
