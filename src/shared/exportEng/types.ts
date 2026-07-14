import type { Color, Variation, Role } from '../../shared/types';
import type { TokenEntry, EngineErrors, EngineResult } from '../../shared/engine/clrEngine';

export type { Color, Variation, Role, TokenEntry, EngineErrors, EngineResult };

export interface ExportConfig {
  name?: string;
  colors?: Color[];
  roles?: Record<string, Role>;
  variations?: Variation[];
  useShorthandColors?: boolean;
  useShorthandRoles?: boolean;
  useShorthandVariations?: boolean;
  useShorthandSteps?: boolean;
  scaleStepShorthands?: Record<string, string>;
  tokenNameSegments?: string[];
  includeDescriptions?: boolean;
}

export interface ExportFile {
  path: string;
  content: string;
}
