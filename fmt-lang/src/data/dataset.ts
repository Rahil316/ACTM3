// The Dataset — fmt-lang's own resolved-data container, built once per
// generation run by data/adapter.ts. Owns: the four tagged record arrays in
// their canonical deterministic order (Part A/Part C's determinism
// guarantee), the field schema per shape (used by semantic validation —
// Part E — to catch a data-shape mismatch before any real data is touched),
// and simple by-identity indices so the easy-path blocks (B.8) and the
// expert-path `select` mechanism (B.9) don't each re-implement their own
// linear scan.
import type { AnyRecord, ScaleStepRecord, SourceAlphaRecord, SourceColorRecord, TokenRecord } from "./shapes";

export type FieldSchema = Readonly<Record<string, true>>;

// The declared field set per shape — checked by semantic validation (Part E)
// against every `where`/naming/sort-key expression that names a field, so a
// scale-step-shaped select referencing `contrast.ratio` (a token-only field)
// is caught as a semantic error rather than silently resolving to undefined.
export const TOKEN_FIELDS: FieldSchema = {
  theme: true, color: true, role: true, variation: true, segs: true,
  value: true, tokenRef: true, isAdjusted: true, contrast: true,
};
export const SCALE_STEP_FIELDS: FieldSchema = {
  color: true, stepKey: true, value: true, description: true,
};
export const SOURCE_COLOR_FIELDS: FieldSchema = {
  color: true, hex: true, description: true,
};
export const SOURCE_ALPHA_FIELDS: FieldSchema = {
  color: true, opacity: true, description: true, rgba: true,
};

export interface BuildDatasetInput {
  tokens: TokenRecord[];
  scaleSteps: ScaleStepRecord[];
  sourceColors: SourceColorRecord[];
  sourceAlphas: SourceAlphaRecord[];
  // The project's own declared tokenNameSegments order — carried as
  // first-class Dataset metadata (not just baked into each token's `segs`)
  // so arrangement/naming definitions can reference "$segments" generically
  // (B.3/B.7) instead of the template author hand-listing it.
  tokenNameSegments: string[];
  // Whether this project has a scale collection AT ALL (Scale mode) as
  // opposed to zero scale steps within an existing collection — the
  // distinction B.8's "referencing a shape that doesn't exist" runtime error
  // depends on: Direct mode (false) is a structural absence (error); Scale
  // mode with zero steps (true, empty array) is legitimate empty output.
  hasScaleCollection: boolean;
}

export class Dataset {
  readonly tokens: readonly TokenRecord[];
  readonly scaleSteps: readonly ScaleStepRecord[];
  readonly sourceColors: readonly SourceColorRecord[];
  readonly sourceAlphas: readonly SourceAlphaRecord[];
  readonly tokenNameSegments: readonly string[];
  readonly hasScaleCollection: boolean;

  // theme name -> its tokens, in the same canonical order as `tokens` overall.
  private readonly tokensByTheme: Map<string, TokenRecord[]>;
  // declared theme order (first-seen order in `tokens`, which is itself
  // already in the project's declared theme order — see buildDatasetFromRecords).
  readonly themeNames: readonly string[];

  private constructor(input: BuildDatasetInput) {
    this.tokens = input.tokens;
    this.scaleSteps = input.scaleSteps;
    this.sourceColors = input.sourceColors;
    this.sourceAlphas = input.sourceAlphas;
    this.tokenNameSegments = input.tokenNameSegments;
    this.hasScaleCollection = input.hasScaleCollection;

    const byTheme = new Map<string, TokenRecord[]>();
    const themeOrder: string[] = [];
    for (const t of input.tokens) {
      let bucket = byTheme.get(t.data.theme);
      if (!bucket) { bucket = []; byTheme.set(t.data.theme, bucket); themeOrder.push(t.data.theme); }
      bucket.push(t);
    }
    this.tokensByTheme = byTheme;
    this.themeNames = themeOrder;
  }

  static create(input: BuildDatasetInput): Dataset {
    return new Dataset(input);
  }

  tokensForTheme(themeName: string): TokenRecord[] {
    return this.tokensByTheme.get(themeName) ?? [];
  }

  // Interchangeable name-or-shorthand match — B.8's getEntriesBy* semantics
  // (a user thinks "the primary color," not "which form this project uses").
  static matchesIdentity(identity: { name: string; shorthand: string | null }, query: string): boolean {
    return identity.name === query || identity.shorthand === query;
  }
}

export function buildDatasetFromRecords(input: BuildDatasetInput): Dataset {
  return Dataset.create(input);
}

export function fieldSchemaFor(shape: AnyRecord["__shape"]): FieldSchema {
  switch (shape) {
    case "token": return TOKEN_FIELDS;
    case "scaleStep": return SCALE_STEP_FIELDS;
    case "sourceColor": return SOURCE_COLOR_FIELDS;
    case "sourceAlpha": return SOURCE_ALPHA_FIELDS;
  }
}
