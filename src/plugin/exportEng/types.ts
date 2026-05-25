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

export interface ColorDef {
  name: string;
  shorthand?: string;
}

export interface RoleDef {
  name: string;
  shorthand?: string;
  customVariationList?: boolean;
  customVariations?: VarDef[];
}

export interface VarDef {
  name: string;
  shorthand?: string;
}

export interface ExportConfig {
  name?: string;
  colors?: ColorDef[];
  roles?: Record<string, RoleDef>;
  variations?: VarDef[];
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
