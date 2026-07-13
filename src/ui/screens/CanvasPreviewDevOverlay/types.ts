// ── Detail panel payload ──────────────────────────────────────────────────────

export type SourceDetail = {
  kind: "source";
  colorName: string;
  colorId: string;
  hex: string;
  pluginDataRef: string; // tokenRef stored in Figma variable pluginData
  figmaCollection: string;
  contrastVsThemes: { theme: string; bg: string; ratio: string }[];
  alphaRefs: { opacity: number; pluginDataRef: string }[];
};

export type ScaleDetail = {
  kind: "scale";
  colorName: string;
  colorId: string;
  step: string;
  hex: string | null;
  pluginDataRef: string;
  figmaCollection: string;
  contrastVsThemes: { theme: string; ratio: string }[];
  // raw engine entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineEntry: any;
};

export type TokenDetail = {
  kind: "token";
  colorName: string;
  colorId: string;
  roleName: string;
  roleId: string;
  varName: string;
  varId: string;
  themeName: string;
  hex: string;
  pluginDataRef: string; // tokenRef stored in Figma variable pluginData
  figmaCollection: string;
  scaleStep: string | null;
  contrastRatio: string;
  contrastRating: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineToken: any;
};

export type DetailItem = SourceDetail | ScaleDetail | TokenDetail;

export type TreeViewMode = "flat" | "tree";
