// Validates and auto-fixes a Preset's config before it's compiled into presets.json.
// Rules are declared as data (RULES below) so new checks are additions, not edits
// to branching logic. Each rule is scoped to when it actually applies:
//   "always"          — applies regardless of pluginMode
//   "scaleModeOnly"    — only checked when the preset's effective pluginMode is "scale"
//   "directModeOnly"   — only checked when the preset's effective pluginMode is "direct"

import { normalizeHex, validHex } from "../clrUtils";
import type { Color, PluginMode, Role, ScaleAlgorithm, SolverMode, Theme, Variation } from "../types";
import type { Preset } from "./themeShop";

const SCALE_ALGORITHMS: ScaleAlgorithm[] = ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear", "Fidelity"];
const SOLVER_MODES: SolverMode[] = ["natural", "constant-chroma", "symmetric", "hue-locked", "max-chroma"];
const PLUGIN_MODES: PluginMode[] = ["scale", "direct"];
const ALGORITHM_SCOPE_LEVELS = ["color", "role"];
const TOKEN_NAME_SEGMENTS = ["color", "role", "variation"];
const MAX_CONTRAST = 21;
const DEFAULT_VARIATION_TARGET = 4.5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PresetConfig = Record<string, any>;

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  errors: ValidationIssue[];
  fixed: string[];
}

interface RuleContext {
  errors: ValidationIssue[];
  fixed: string[];
}

type RuleScope = "always" | "scaleModeOnly" | "directModeOnly";

interface Rule {
  id: string;
  scope: RuleScope;
  appliesTo: (config: PresetConfig) => boolean;
  check: (config: PresetConfig, ctx: RuleContext) => void;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) dupes.add(v);
    seen.add(v);
  }
  return [...dupes];
}

// Normalizes a hex field in place: errors if unparsable, else normalizes to
// "#" + uppercase 6-digit form, recording a fix if it changed.
function fixHexField<K extends string>(obj: { [P in K]: unknown }, field: K, path: string, ctx: RuleContext): void {
  const raw = obj[field];
  if (!isNonEmptyString(raw)) {
    ctx.errors.push({ path, message: `must be a non-empty hex string, got ${JSON.stringify(raw)}` });
    return;
  }
  if (!validHex(raw)) {
    ctx.errors.push({ path, message: `invalid hex color "${raw}"` });
    return;
  }
  const normalized = normalizeHex(raw) as string; // "#XXXXXX" for valid input
  if (normalized !== raw) {
    obj[field] = normalized;
    ctx.fixed.push(`${path}: normalized "${raw}" → "${normalized}"`);
  }
}

function checkVariationsArray(variations: unknown, pathPrefix: string, ctx: RuleContext): void {
  if (!Array.isArray(variations)) return;
  const shorthands: string[] = [];
  variations.forEach((v: Variation, i: number) => {
    const path = `${pathPrefix}[${i}]`;
    if (!isNonEmptyString(v?.name)) ctx.errors.push({ path: `${path}.name`, message: "required non-empty string" });
    if (!isNonEmptyString(v?.shorthand)) ctx.errors.push({ path: `${path}.shorthand`, message: "required non-empty string" });
    if (isNonEmptyString(v?.shorthand)) shorthands.push(v.shorthand);

    if (v?.target == null) {
      v.target = DEFAULT_VARIATION_TARGET;
      ctx.fixed.push(`${path}.target: defaulted to ${DEFAULT_VARIATION_TARGET}`);
    } else if (typeof v.target !== "number" || !(v.target > 0) || v.target > MAX_CONTRAST) {
      ctx.errors.push({ path: `${path}.target`, message: `must be a number > 0 and ≤ ${MAX_CONTRAST}, got ${JSON.stringify(v.target)}` });
    }
  });
  for (const dupe of findDuplicates(shorthands)) {
    ctx.errors.push({ path: pathPrefix, message: `duplicate shorthand "${dupe}"` });
  }
}

// ── Rule registry ────────────────────────────────────────────────────────────

const RULES: Rule[] = [
  {
    id: "preset-id-name",
    scope: "always",
    appliesTo: () => true,
    check: (_config, ctx) => {
      // Preset id/name are validated by the caller (it has the Preset, not just config);
      // kept as a no-op placeholder here so the registry documents the rule's existence.
      void ctx;
    },
  },
  {
    id: "plugin-mode-enum",
    scope: "always",
    appliesTo: (c) => c.pluginMode !== undefined,
    check: (c, ctx) => {
      if (!PLUGIN_MODES.includes(c.pluginMode)) {
        ctx.errors.push({ path: "pluginMode", message: `must be one of ${PLUGIN_MODES.join(", ")}, got ${JSON.stringify(c.pluginMode)}` });
      }
    },
  },
  {
    id: "scale-algorithm-enum",
    scope: "always",
    appliesTo: (c) => c.scaleAlgorithm !== undefined,
    check: (c, ctx) => {
      if (!SCALE_ALGORITHMS.includes(c.scaleAlgorithm)) {
        ctx.errors.push({ path: "scaleAlgorithm", message: `must be one of ${SCALE_ALGORITHMS.join(", ")}, got ${JSON.stringify(c.scaleAlgorithm)}` });
      }
    },
  },
  {
    id: "solver-mode-enum",
    scope: "always",
    appliesTo: (c) => c.solverMode !== undefined,
    check: (c, ctx) => {
      if (!SOLVER_MODES.includes(c.solverMode)) {
        ctx.errors.push({ path: "solverMode", message: `must be one of ${SOLVER_MODES.join(", ")}, got ${JSON.stringify(c.solverMode)}` });
      }
    },
  },
  {
    id: "scale-length-positive-int",
    scope: "scaleModeOnly",
    appliesTo: (c) => c.scaleLength !== undefined,
    check: (c, ctx) => {
      if (typeof c.scaleLength !== "number" || !Number.isInteger(c.scaleLength) || c.scaleLength <= 0) {
        ctx.errors.push({ path: "scaleLength", message: `must be a positive integer, got ${JSON.stringify(c.scaleLength)}` });
      }
    },
  },
  {
    id: "algorithm-scope-level-enum",
    scope: "always",
    appliesTo: (c) => c.algorithmScopeLevel !== undefined,
    check: (c, ctx) => {
      if (!ALGORITHM_SCOPE_LEVELS.includes(c.algorithmScopeLevel)) {
        ctx.errors.push({ path: "algorithmScopeLevel", message: `must be one of ${ALGORITHM_SCOPE_LEVELS.join(", ")}, got ${JSON.stringify(c.algorithmScopeLevel)}` });
      }
    },
  },
  {
    id: "token-name-segments-enum",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.tokenNameSegments),
    check: (c, ctx) => {
      c.tokenNameSegments.forEach((seg: unknown, i: number) => {
        if (!TOKEN_NAME_SEGMENTS.includes(seg as string)) {
          ctx.errors.push({ path: `tokenNameSegments[${i}]`, message: `must be one of ${TOKEN_NAME_SEGMENTS.join(", ")}, got ${JSON.stringify(seg)}` });
        }
      });
    },
  },
  {
    id: "color-hex-format",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.colors),
    check: (c, ctx) => {
      c.colors.forEach((color: Color, i: number) => fixHexField(color, "value", `colors[${i}].value`, ctx));
    },
  },
  {
    id: "theme-hex-format",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.themes),
    check: (c, ctx) => {
      c.themes.forEach((theme: Theme, i: number) => fixHexField(theme, "bg", `themes[${i}].bg`, ctx));
    },
  },
  {
    id: "color-required-fields",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.colors),
    check: (c, ctx) => {
      c.colors.forEach((color: Color, i: number) => {
        if (!isNonEmptyString(color?.name)) ctx.errors.push({ path: `colors[${i}].name`, message: "required non-empty string" });
        if (!isNonEmptyString(color?.shorthand)) ctx.errors.push({ path: `colors[${i}].shorthand`, message: "required non-empty string" });
      });
    },
  },
  {
    id: "color-shorthand-unique",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.colors),
    check: (c, ctx) => {
      const shorthands = c.colors.map((color: Color) => color?.shorthand).filter(isNonEmptyString);
      for (const dupe of findDuplicates(shorthands)) {
        ctx.errors.push({ path: "colors", message: `duplicate shorthand "${dupe}"` });
      }
    },
  },
  {
    id: "role-required-fields",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.roles),
    check: (c, ctx) => {
      c.roles.forEach((role: Role, i: number) => {
        if (!isNonEmptyString(role?.name)) ctx.errors.push({ path: `roles[${i}].name`, message: "required non-empty string" });
        if (!isNonEmptyString(role?.shorthand)) ctx.errors.push({ path: `roles[${i}].shorthand`, message: "required non-empty string" });
      });
    },
  },
  {
    id: "role-shorthand-unique",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.roles),
    check: (c, ctx) => {
      const shorthands = c.roles.map((role: Role) => role?.shorthand).filter(isNonEmptyString);
      for (const dupe of findDuplicates(shorthands)) {
        ctx.errors.push({ path: "roles", message: `duplicate shorthand "${dupe}"` });
      }
    },
  },
  {
    id: "role-scoped-color-ids-exist",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.roles) && c.roles.some((r: Role) => r?.scopedColorIds != null),
    check: (c, ctx) => {
      // Mirrors the engine's own matching (clrEngine.ts): a color is matched by
      // its _id when present, falling back to its name.
      const colorRefs = new Set((c.colors ?? []).flatMap((color: Color) => [color?._id, color?.name].filter(isNonEmptyString)));
      c.roles.forEach((role: Role, i: number) => {
        if (role?.scopedColorIds == null) return;
        for (const ref of role.scopedColorIds) {
          if (!colorRefs.has(ref)) {
            ctx.errors.push({ path: `roles[${i}].scopedColorIds`, message: `references color "${ref}" which does not match any color's _id or name` });
          }
        }
      });
    },
  },
  {
    id: "global-variations",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.variations),
    check: (c, ctx) => checkVariationsArray(c.variations, "variations", ctx),
  },
  {
    id: "role-variations",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.roles) && c.roles.some((r: Role) => Array.isArray(r?.variations)),
    check: (c, ctx) => {
      c.roles.forEach((role: Role, i: number) => {
        if (Array.isArray(role?.variations)) checkVariationsArray(role.variations, `roles[${i}].variations`, ctx);
      });
    },
  },
  {
    id: "scale-step-required-fields",
    scope: "scaleModeOnly",
    appliesTo: (c) => Array.isArray(c.scaleSteps),
    check: (c, ctx) => {
      c.scaleSteps.forEach((step: { name?: string; shorthand?: string }, i: number) => {
        if (!isNonEmptyString(step?.name)) ctx.errors.push({ path: `scaleSteps[${i}].name`, message: "required non-empty string" });
        if (!isNonEmptyString(step?.shorthand)) ctx.errors.push({ path: `scaleSteps[${i}].shorthand`, message: "required non-empty string" });
      });
    },
  },
  {
    id: "theme-required-fields",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.themes),
    check: (c, ctx) => {
      c.themes.forEach((theme: Theme, i: number) => {
        if (!isNonEmptyString(theme?.name)) ctx.errors.push({ path: `themes[${i}].name`, message: "required non-empty string" });
      });
    },
  },
  {
    id: "theme-name-unique",
    scope: "always",
    appliesTo: (c) => Array.isArray(c.themes),
    check: (c, ctx) => {
      const names = c.themes.map((theme: Theme) => theme?.name).filter(isNonEmptyString);
      for (const dupe of findDuplicates(names)) {
        ctx.errors.push({ path: "themes", message: `duplicate name "${dupe}"` });
      }
    },
  },
];

export function validateAndFixPreset(preset: Preset): ValidationResult {
  const ctx: RuleContext = { errors: [], fixed: [] };

  if (!isNonEmptyString(preset.id)) ctx.errors.push({ path: "id", message: "required non-empty string" });
  if (!isNonEmptyString(preset.name)) ctx.errors.push({ path: "name", message: "required non-empty string" });

  const config: PresetConfig = preset.config ?? {};
  const effectiveMode: PluginMode = PLUGIN_MODES.includes(config.pluginMode) ? config.pluginMode : "scale";

  for (const rule of RULES) {
    if (rule.scope === "scaleModeOnly" && effectiveMode !== "scale") continue;
    if (rule.scope === "directModeOnly" && effectiveMode !== "direct") continue;
    if (!rule.appliesTo(config)) continue;
    rule.check(config, ctx);
  }

  return ctx;
}
