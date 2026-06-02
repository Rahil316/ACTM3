import type { Color, Variation, Role } from '../../shared/types';

export type { Color, Variation, Role };

export interface ScaleEntry {
  value: string;
  description?: string;
}

export interface TokenEntry {
  value: string;
  tokenRef?: string | null;
  isAdjusted?: boolean;
}

export interface EngineErrors {
  critical: unknown[];
  warnings: { color: string; role: string; variation: string; theme: string; warning: string }[];
  notices: { color: string; role: string; variation: string; theme: string; notice: string }[];
}

export interface EngineResult {
  scales: Record<string, Record<string, ScaleEntry>>;
  tokens: Record<string, Record<string, Record<string | number, Record<string | number, TokenEntry>>>>;
  errors?: EngineErrors | string[];
}

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
