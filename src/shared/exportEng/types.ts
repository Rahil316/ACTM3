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
  // These three were previously absent from ExportConfig, so bundler.ts/
  // formatters could only ever infer scale presence from EngineResult data —
  // meaning includeColorScalesCollection had no effect on exports even when
  // the user turned it off in Scale mode. Now explicit, and driven by either
  // the main project settings or the Export Settings tab's custom override
  // (see index.ts's applyExportOverrides).
  includeColorScalesCollection?: boolean;
  includeSourceColors?: boolean;
  sourceCollectionName?: string;
  alphaValues?: number[];
}

export interface ExportFile {
  path: string;
  content: string;
  // Stable identity for this file within its format — "scale", "source",
  // "tokens", "index", or a theme name (lowercased). Lets a caller (the CLI's
  // config-driven filename overrides, see cli/src/build.ts) rename a specific
  // generated file without needing to know the format's exact default naming
  // scheme. Not read anywhere in the plugin's own export UI — additive only.
  role?: string;
}
