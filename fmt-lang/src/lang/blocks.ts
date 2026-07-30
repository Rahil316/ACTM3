// B.8's out-of-the-box named blocks — the easy path, zero `defs` required.
// Each block (`tokens`, `tokensJs`/`tokensTs`, `tokensCss`, `tokensJson`) is
// a chainable, directly-interpolatable object: `${tokens.theme.light}`
// renders every light-theme token, already formatted with that block's own
// stdlib-default naming + entry format (B.8's table). `getEntriesByColor/
// Role/Variation/Theme()` narrow the scope further, matching either a
// record's raw name or its shorthand interchangeably (Dataset.matchesIdentity).
//
// Implemented as sugar over the SAME select+arrange+entryFormat+renderFile
// pipeline every expert-path files[] entry already goes through (B.8's own
// "not a separate, weaker system" requirement) — a Block never bypasses
// Part C's 6-stage order.
import type { Dataset } from "../data/dataset";
import type { AnyRecord } from "../data/shapes";
import type { NamingDef } from "./defs/naming";
import { DEFAULT_NAMING } from "./defs/naming";
import type { EntryFormatFn } from "../pipeline/composeEntry";
import { cssKeyValue, jsObjectProperty, jsonKeyValueFlat } from "./stdlib/entryPresets";
import { renderFile } from "../pipeline/stages";
import { Dataset as DatasetClass } from "../data/dataset";

// A block-level runtime error (B.8: "referencing a shape that doesn't
// exist" / "an unmatched getEntriesBy* query") — thrown during template
// interpolation (lang/expr.ts's interpolateTemplate), caught and converted
// to a proper `runtime`-category Diagnostic by exec/generate.ts, exactly
// like every other runtime error category (never left as an uncaught
// exception, never silently empty output).
export class BlockRuntimeError extends Error {}

type Shape = "token" | "scaleStep" | "sourceColor" | "sourceAlpha";

interface BlockFlavor {
  naming: NamingDef;
  entryFormat: EntryFormatFn;
}

const GENERIC_FLAVOR: BlockFlavor = { naming: DEFAULT_NAMING, entryFormat: cssKeyValue };
const JS_FLAVOR: BlockFlavor = { naming: { ...DEFAULT_NAMING, case: "camel" }, entryFormat: jsObjectProperty };
const CSS_FLAVOR: BlockFlavor = { naming: DEFAULT_NAMING, entryFormat: cssKeyValue };
const JSON_FLAVOR: BlockFlavor = { naming: { ...DEFAULT_NAMING, case: "camel" }, entryFormat: jsonKeyValueFlat };

// Every shape carries a `color` identity; only `token` additionally carries
// `role`/`variation`/`theme` (Part A's "four shapes, don't conflate" rule —
// getEntriesByRole/Variation/Theme() are only ever meaningful against
// token-shaped scopes, which is the only shape B.8's own worked examples
// apply them to).
function matchesEitherForm(record: AnyRecord, kind: "color" | "role" | "variation" | "theme", query: string): boolean {
  if (kind === "color") return DatasetClass.matchesIdentity(record.data.color, query);
  if (record.__shape !== "token") return false;
  if (kind === "role") return DatasetClass.matchesIdentity(record.data.role, query);
  if (kind === "variation") return DatasetClass.matchesIdentity(record.data.variation, query);
  return record.data.theme === query;
}

// One immutable, chainable scope: a shape + an accumulated set of raw-field
// filters (color/role/variation/theme), rendered on demand (toString()) —
// never eagerly, since a Block may be narrowed further before it's ever
// actually interpolated.
class Block {
  constructor(
    private readonly dataset: Dataset,
    private readonly flavor: BlockFlavor,
    private readonly shape: Shape,
    private readonly filters: { kind: "color" | "role" | "variation" | "theme"; query: string }[] = []
  ) {}

  private withFilter(kind: "color" | "role" | "variation" | "theme", query: string): Block {
    return new Block(this.dataset, this.flavor, this.shape, [...this.filters, { kind, query }]);
  }

  getEntriesByColor(query: string): Block { return this.withFilter("color", query); }
  getEntriesByRole(query: string): Block { return this.withFilter("role", query); }
  getEntriesByVariation(query: string): Block { return this.withFilter("variation", query); }
  getEntriesByTheme(query: string): Block { return this.withFilter("theme", query); }

  private baseRecords(): readonly AnyRecord[] {
    switch (this.shape) {
      case "token": return this.dataset.tokens;
      case "scaleStep":
        if (!this.dataset.hasScaleCollection) {
          throw new BlockRuntimeError(`"tokens.scale" was referenced, but this project has no scale collection (it's using Direct mode, not Scale mode). Remove this reference, or point this target at a Scale-mode project.`);
        }
        return this.dataset.scaleSteps;
      case "sourceColor": return this.dataset.sourceColors;
      case "sourceAlpha": return this.dataset.sourceAlphas;
    }
  }

  private matchedRecords(): AnyRecord[] {
    let records = this.baseRecords().slice();
    for (const filter of this.filters) {
      const before = records.length;
      records = records.filter((r) => matchesEitherForm(r, filter.kind, filter.query));
      if (before > 0 && records.length === 0) {
        throw new BlockRuntimeError(`getEntriesBy${filter.kind[0].toUpperCase()}${filter.kind.slice(1)}('${filter.query}') matched no records — "${filter.query}" is not a real ${filter.kind} in this project (checked both name and shorthand).`);
      }
    }
    return records;
  }

  toString(): string {
    const records = this.matchedRecords();
    return renderFile({
      records,
      select: { shape: this.shape },
      arrange: { kind: "flat", join: "\n" },
      compose: {
        namingDef: this.flavor.naming,
        valueFormatDef: { appliesTo: ["token", "scaleStep", "sourceColor", "sourceAlpha"], kind: "hex" },
        resolveSegments: (def) => (Array.isArray(def.segments) ? def.segments : (this.dataset.tokenNameSegments as ("color" | "role" | "variation" | "step")[])),
        entryFormat: this.flavor.entryFormat,
      },
    });
  }
}

// The `.theme.<name>` / `.theme[0]`-style scoping surface — a plain object
// whose OWN properties are theme names (so `tokens.theme.light` is real
// property access, not a method call), each already a themed Block.
//
// A real bug found running an actual template: `${tokens.theme.Light}`
// (wrong case — this project's real theme is "light", not "Light") rendered
// as silent EMPTY TEXT, not the runtime error B.8 explicitly requires ("an
// unmatched query is a runtime error, never silently empty"). Root cause:
// expr.ts's getField() is one shared function serving BOTH plain record
// field access (where B.1a's rule correctly wants silent null-propagation
// for a missing/optional field) and, incidentally, traversal into this very
// object — a missing theme name looked exactly like a missing optional
// field to that shared code path, so it silently propagated null instead of
// erroring. Wrapping this object in a Proxy (rather than touching
// getField()'s general B.1a semantics, which are correct for real record
// data) closes the gap at its actual source: only THIS object's own
// property access needs different behavior.
function themeScope(dataset: Dataset, flavor: BlockFlavor): Record<string, Block> {
  const out: Record<string, Block> = {};
  for (const themeName of dataset.themeNames) {
    out[themeName] = new Block(dataset, flavor, "token", [{ kind: "theme", query: themeName }]);
  }
  // expr.ts's getField() (the shared record-field accessor every `.`-chain
  // in the expression language goes through) checks `field in rec` BEFORE
  // ever reading `rec[field]` — so the `has` trap, not `get`, is the one
  // that actually determines the outcome for a call site shaped like
  // getField()'s. Throwing from `get` alone would never fire, since
  // getField() short-circuits to its own `null` return the moment `has`
  // says "no" without ever calling the property getter.
  return new Proxy(out, {
    has(target, prop) {
      if (typeof prop !== "string") return prop in target;
      if (prop in target) return true;
      if (prop === "data" || prop === "then") return false; // getField()'s own ".data" probe, and thenable-checks — never real theme names
      throw new BlockRuntimeError(`"tokens.theme.${prop}" was referenced, but "${prop}" is not a real theme in this project. Declared themes: ${dataset.themeNames.map((t) => `"${t}"`).join(", ")}.`);
    },
  });
}

// The top-level block object exposed to the expression language as a bare
// identifier (`tokens`, `tokensJs`, etc.) — itself a Block (unscoped = every
// token in every theme, B.8's own stated default), PLUS the `.theme`/
// `.scale`/`.source` scoping properties layered on top via Object.assign,
// since a plain Block instance can't also carry theme-keyed sub-properties.
function makeTopLevelBlock(dataset: Dataset, flavor: BlockFlavor): Block & { theme: Record<string, Block>; scale: Block; source: Block } {
  const base = new Block(dataset, flavor, "token");
  return Object.assign(base, {
    theme: themeScope(dataset, flavor),
    scale: new Block(dataset, flavor, "scaleStep"),
    source: new Block(dataset, flavor, "sourceColor"),
  });
}

export interface BlockSet {
  tokens: ReturnType<typeof makeTopLevelBlock>;
  tokensJs: ReturnType<typeof makeTopLevelBlock>;
  tokensTs: ReturnType<typeof makeTopLevelBlock>;
  tokensCss: ReturnType<typeof makeTopLevelBlock>;
  tokensJson: ReturnType<typeof makeTopLevelBlock>;
  // An index signature so a BlockSet can be passed directly as an
  // ExprContext.vars value (Record<string, unknown>) without a cast at
  // every call site — see xref/render.ts.
  [key: string]: unknown;
}

export function buildBlockSet(dataset: Dataset): BlockSet {
  return {
    tokens: makeTopLevelBlock(dataset, GENERIC_FLAVOR),
    tokensJs: makeTopLevelBlock(dataset, JS_FLAVOR),
    tokensTs: makeTopLevelBlock(dataset, JS_FLAVOR),
    tokensCss: makeTopLevelBlock(dataset, CSS_FLAVOR),
    tokensJson: makeTopLevelBlock(dataset, JSON_FLAVOR),
  };
}
