// ── Core primitive types ─────────────────────────────────────────────────────

export type PluginMode = "scale" | "direct";
export type AlgorithmScopeLevel = "color" | "role";
export type TokenNameSegment = "color" | "role" | "variation";

export type VariableScope = "FRAME_FILL" | "SHAPE_FILL" | "TEXT_FILL" | "STROKE_COLOR" | "EFFECT_COLOR" | "ALL_SCOPES";

export type ScaleAlgorithm = "Natural" | "Uniform" | "Expressive" | "Symmetric" | "OKLCH" | "Material" | "Linear" | "Fidelity";

export type SolverMode = "natural" | "constant-chroma" | "symmetric" | "max-chroma" | "gamut-cusp" | "apca-natural";

// ── Entity shapes ────────────────────────────────────────────────────────────

export interface Variation {
  _id?: string;
  name: string;
  shorthand: string;
  target?: number;
}

// User-configured label for a scale step position
export interface ScaleStep {
  _id: string;
  name: string;
  shorthand: string;
}

// Engine-generated output for a scale step — hex value + contrast data
export interface ScaleStepToken {
  value: string;
  stepName: string;
  shorthand: string;
  description: string;
  contrast: Record<string, { ratio: number | null; rating: "Fail" | "AA-" | "AA" | "AAA" | null }>;
}

export interface Color {
  _id?: string;
  name: string;
  shorthand: string;
  value: string;
  description?: string;
  scaleAlgorithm?: ScaleAlgorithm;
  solverMode?: SolverMode;
}

export type RoleLocalBgKind = "theme" | "token-static" | "token-dynamic" | "color" | "hex";

export interface RoleLocalBg {
  kind: RoleLocalBgKind;
  // token-static/token-dynamic/color: value is a string (token ref or color name)
  // hex: value is Record<themeName, hexString>
  // theme: no value needed (use global theme bg)
  value?: string | Record<string, string>;
}

export interface Role {
  _id?: string;
  name: string;
  shorthand: string;
  variations?: Variation[] | null; //Use common/default/global Variations if null
  scaleAlgorithm?: ScaleAlgorithm;
  solverMode?: SolverMode;
  description?: string;
  scopedColorIds?: string[] | null;
  localBg?: RoleLocalBg | null;
  scopes?: VariableScope[];
  // Engine-runtime fields — set by translateLocalBg() + resolveTokenRefBgs(), never persisted
  localBgResolved?: Record<string, string> | null;
  localBgTokenRef?: string | null;
  localBgDynamicRef?: string | null;
  localBgPerColor?: Record<string, Record<string, string>> | null;
}

export interface Theme {
  _id?: string;
  name: string;
  bg: string;
  description?: string;
}
