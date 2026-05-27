import type {
  PluginMode,
  ScaleAlgorithm,
  SolverMode,
  AlgorithmScopeLevel,
  TokenGrouping,
  TokenNameSegment,
  MappingMethod,
  RoleLocalBg,
} from '../../types/state';

// ── Preset entity sub-types ───────────────────────────────────────────────────

export interface PresetVariation {
  _id?: string;
  name: string;
  shorthand: string;
}

export interface PresetRole {
  _id?: string;
  name: string;
  shorthand: string;
  minContrast: number;
  mappingMethod?: MappingMethod;
  variationTargets: number[];
  customVariationList?: boolean;
  customVariations?: PresetVariation[];
  solverMode?: SolverMode;
  description?: string;
  scopedColorIds?: string[] | null;
  localBg?: RoleLocalBg | null;
}

export interface PresetColor {
  _id?: string;
  name: string;
  shorthand: string;
  value: string;
  description?: string;
  scaleAlgorithm?: ScaleAlgorithm;
  solverMode?: SolverMode;
}

export interface PresetTheme {
  _id?: string;
  name: string;
  bg: string;
}

export interface PresetScaleStepName {
  name: string;
  shorthand: string;
}

// ── Preset config — mirrors AppState but all fields optional ─────────────────

export interface PresetConfig {
  name?: string;

  pluginMode?: PluginMode;
  scaleAlgorithm?: ScaleAlgorithm;
  scaleLength?: number;
  useUniformAlgorithm?: boolean;
  algorithmScopeLevel?: AlgorithmScopeLevel;
  solverMode?: SolverMode;

  tokenNameSegments?: TokenNameSegment[];
  tokenGrouping?: TokenGrouping;
  useShorthandColors?: boolean;
  useShorthandRoles?: boolean;
  useShorthandVariations?: boolean;
  useShorthandSteps?: boolean;

  resolveTokensDirectly?: boolean;
  includeSourceColors?: boolean;
  sourceCollectionName?: string;
  includeAlphaTints?: boolean;
  alphaValues?: string;
  includeColorScalesCollection?: boolean;
  includeDescriptions?: boolean;
  scaleCollectionName?: string;
  tokenCollectionName?: string;

  scaleStepNames?: PresetScaleStepName[] | null;
  perRoleVariationOverride?: boolean;
  variations?: PresetVariation[];
  colors?: PresetColor[];
  roles?: PresetRole[];
  themes?: PresetTheme[];
}

// ── Top-level preset shape ────────────────────────────────────────────────────

export interface Preset {
  id: string;
  name: string;
  badge?: string;
  description?: string;
  tags?: string[];
  /** Hex swatches for Theme Shop preview card (no leading #) */
  swatches?: string[];
  config: PresetConfig;
}
