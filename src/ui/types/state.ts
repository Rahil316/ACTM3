export type { PluginMode, AlgorithmScopeLevel, TokenNameSegment, ScaleAlgorithm, SolverMode, Variation, ScaleStep, Color, RoleLocalBgKind, RoleLocalBg, Role, Theme, VariableScope, ScaleStepToken } from "../../shared/types";
export type { EngineResult, TokenEntry, EngineInput } from "../../shared/clrEngine";
export type { ContrastRating } from "../../shared/clrUtils";
export { ratingFromRatio } from "../../shared/clrUtils";
export type { Preset } from "../../shared/presets/themeShop";
export { PRESETS } from "../../shared/presets/themeShop";

// ── Root app state ───────────────────────────────────────────────────────────

import type { PluginMode, ScaleAlgorithm, SolverMode, AlgorithmScopeLevel, TokenNameSegment, ScaleStep, Variation, Color, Role, Theme } from "../../shared/types";

export type ProjectStoreSnapshot = Omit<ProjectStore, "versions">;

export interface Version {
  _id: string;
  name: string;
  description: string;
  createdAt: number;
  state: ProjectStoreSnapshot;
}

export interface ProjectStore {
  // Project Indentity
  name: string;
  description: string;
  versions: Version[];

  // Engine Settings
  pluginMode: PluginMode;
  scaleAlgorithm: ScaleAlgorithm;
  scaleLength: number;
  useUniformAlgorithm: boolean;
  algorithmScopeLevel: AlgorithmScopeLevel;
  solverMode: SolverMode;

  // Token Naming Settings
  tokenNameSegments: TokenNameSegment[];
  useShorthandColors: boolean;
  useShorthandRoles: boolean;
  useShorthandVariations: boolean;
  useShorthandSteps: boolean;

  // Extra Token Options
  includeSourceColors: boolean;
  sourceCollectionName: string;
  alphaValues: number[];
  includeColorScalesCollection: boolean;
  includeDescriptions: boolean;
  scaleCollectionName: string;
  tokenCollectionName: string;

  scaleSteps: ScaleStep[] | null;
  variations: Variation[] | null;
  canEditRoleVariants: boolean;

  colors: Color[];
  roles: Role[];
  themes: Theme[];

}

// ── UI preferences ───────────────────────────────────────────────────────────

export type UiTheme = "figma" | "dark" | "light";
export type UiLanguage = "en" | "es" | "hi";

export interface UiPrefs {
  scale: number;
  theme: UiTheme;
  language: UiLanguage;
}

// ── UI routing ───────────────────────────────────────────────────────────────

export type SidebarTab = "color-groups" | "roles" | "project" | "versions";
export type ActiveOverlay = null | "settings" | "preview" | "run-dialog" | "save-version" | "quick-start" | "design-lab" | "export-sheet" | "theme-shop" | "canvas-preview-dev";
export type SettingsTab = "tokens" | "roles" | "plugin";

// ── Validation ───────────────────────────────────────────────────────────────

export type ValidationIssues = string[] | null;
