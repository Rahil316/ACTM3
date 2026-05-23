// @ts-expect-error — plain JS module, no type declarations
export { variableMaker } from './clrEngine.js';
// @ts-expect-error — plain JS module, no type declarations
export { contrastRating, contrastRatio } from './clrUtils.js';

// ── Engine types ─────────────────────────────────────────────────────────────

export interface EngineConfig {
  colors: Array<{
    name: string;
    value: string;
    shorthand: string;
    description?: string;
    scaleAlgorithm?: string;
    solverMode?: string;
  }>;
  themes: Array<{ name: string; bg: string }>;
  scaleLength: number;
  scaleStepNames?: string[] | null;
  scaleAlgorithm: string;
  pluginMode: 'scale' | 'direct';
  roles: Array<{
    name: string;
    shorthand: string;
    mappingMethod: 'contrast' | 'index';
    minContrast: number;
    variationTargets: number[];
    customVariationList: boolean;
    customVariations?: Array<{ name: string; shorthand: string }>;
    solverMode?: string;
    description?: string;
  }>;
  variations: Array<{ name: string; shorthand: string }>;
  useUniformAlgorithm: boolean;
  algorithmScopeLevel?: 'color' | 'role';
  solverMode: string;
}

export interface ContrastEntry {
  ratio: number;
  rating: 'AAA' | 'AA' | 'AA Large' | 'Fail';
}

export interface ScaleStep {
  value: string;
  stepName: string;
  shorthand: string;
  description: string;
  contrast: Record<string, ContrastEntry>;
}

export interface TokenEntry {
  tokenName: string;
  color: string;
  role: string;
  variation: string;
  value: string;
  contrast: { ratio: number; rating: string };
  contrastTarget: number;
}

export interface EngineResult {
  scales: Record<string, Record<string, ScaleStep>>;
  tokens: Record<string, Record<string, Record<number, Record<string, TokenEntry>>>>;
  errors: { critical: unknown[]; warnings: unknown[]; notices: unknown[] };
}

declare function variableMaker(config: EngineConfig): EngineResult;
