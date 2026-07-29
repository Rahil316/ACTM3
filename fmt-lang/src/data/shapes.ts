// fmt-lang's own internal record types — tagged by shape, per the plan's
// Part A. This is the type-level enforcement of the requirements doc's §1:
// a token-shaped operation must never be silently applicable to scale-step
// data (or vice versa) — every record here carries its shape as a
// discriminant (`__shape`), and every consumer downstream (naming, value
// formatting, selection, etc.) is written to check it.

export type ShapeTag = "token" | "scaleStep" | "sourceColor" | "sourceAlpha";

export interface TaggedRecord<S extends ShapeTag, T> {
  readonly __shape: S;
  readonly data: T;
}

// Every identity-bearing field (color, role, variation) carries BOTH the raw
// display name and the project's shorthand (if any), kept separate rather
// than collapsed to one string early — see the plan's Part A, "Identity
// preservation." `segments` is `name` split on "/", mirroring how Figma
// itself parses a variable name's "/" as a folder separator — length 1
// (just `[name]`) when there's no "/" in the name at all.
export interface IdentityLabel {
  name: string;
  shorthand: string | null;
  segments: string[];
}

export interface ContrastInfo {
  ratio: number | null;
  rating: "Fail" | "AA-" | "AA" | "AAA" | null;
}

export interface TokenData {
  theme: string;
  color: IdentityLabel;
  role: IdentityLabel;
  variation: IdentityLabel;
  // Ordered, tokenNameSegments-driven segment list — same order/omission
  // resolveExport()'s own `segs` field already produces, just carrying the
  // full IdentityLabel per segment instead of one flattened label string.
  segs: { type: "color" | "role" | "variation"; identity: IdentityLabel }[];
  value: string;
  tokenRef: string | null;
  isAdjusted: boolean;
  contrast: ContrastInfo;
}

export interface ScaleStepData {
  color: IdentityLabel;
  stepKey: string;
  value: string;
  description: string;
}

export interface SourceColorData {
  color: IdentityLabel;
  hex: string;
  description: string;
}

export interface SourceAlphaData {
  color: IdentityLabel;
  opacity: number;
  description: string;
  rgba: { r: number; g: number; b: number; a: number };
}

export type TokenRecord = TaggedRecord<"token", TokenData>;
export type ScaleStepRecord = TaggedRecord<"scaleStep", ScaleStepData>;
export type SourceColorRecord = TaggedRecord<"sourceColor", SourceColorData>;
export type SourceAlphaRecord = TaggedRecord<"sourceAlpha", SourceAlphaData>;

export type AnyRecord = TokenRecord | ScaleStepRecord | SourceColorRecord | SourceAlphaRecord;

export function tagRecord<S extends ShapeTag, T>(shape: S, data: T): TaggedRecord<S, T> {
  return { __shape: shape, data };
}
