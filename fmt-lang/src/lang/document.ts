// Parses a raw fmt-lang document (JSON5 text, per B.1/B.2) into a
// ParsedDocument the exec/generate.ts orchestrator can run — resolving
// `defs.*` references on each files[] entry into real definition objects
// (B.2b's precedence: document-level defs are the fallback; a files[] entry
// that inlines its own naming/valueFormat/etc. overrides them for itself
// only). This is intentionally a thin mapping layer, not a new parser —
// the document's own shape is already plain JSON5 (validate/syntax.ts owns
// turning text into this raw object).
import { parseDocument as parseJson5, checkExpressionSyntax } from "../validate/syntax";
import { checkWhereFields } from "../validate/typecheck";
import { validateFileEntries, type FileEntryLike } from "../validate/semantic";
import type { Diagnostic } from "../validate/diagnostics";
import { diagnostic } from "../validate/diagnostics";
import type { FileEntry } from "../xref/fileEntry";
import type { NamingDef } from "./defs/naming";
import { DEFAULT_NAMING } from "./defs/naming";
import type { ValueFormatDef } from "./defs/valueFormat";
import { DEFAULT_VALUE_FORMAT } from "./defs/valueFormat";
import type { ArrangeDef } from "./defs/arrange";
import { DEFAULT_ARRANGE } from "./defs/arrange";
import type { SelectDef } from "./defs/select";
import type { EntryFormatFn } from "../pipeline/composeEntry";
import { ENTRY_PRESETS, cssKeyValue, type EntryPresetName } from "./stdlib/entryPresets";
import type { ShapeTag } from "../data/shapes";

export interface RawDoc {
  $schema?: string;
  defs?: {
    naming?: Record<string, NamingDef>;
    valueFormat?: Record<string, ValueFormatDef>;
    entryFormat?: Record<string, { template?: string; preset?: EntryPresetName }>;
    arrange?: Record<string, ArrangeDef>;
    select?: Record<string, SelectDef>;
  };
  files: Array<{
    role: string;
    shape: ShapeTag;
    path: string;
    repeatFor?: { over: "themes"; as: string };
    select?: SelectDef | string;
    naming?: NamingDef | string;
    valueFormat?: ValueFormatDef | string;
    arrange?: ArrangeDef | string;
    entryFormatPreset?: EntryPresetName;
    before?: string;
    after?: string;
  }>;
}

const SUPPORTED_SCHEMA_VERSIONS = new Set(["fmt-lang/v1"]);

function resolveNaming(value: NamingDef | string | undefined, named: Record<string, NamingDef>): NamingDef {
  if (value === undefined) return DEFAULT_NAMING;
  if (typeof value === "string") return named[value] ?? DEFAULT_NAMING;
  return value;
}

function resolveValueFormat(value: ValueFormatDef | string | undefined, named: Record<string, ValueFormatDef>): ValueFormatDef {
  if (value === undefined) return DEFAULT_VALUE_FORMAT;
  if (typeof value === "string") return named[value] ?? DEFAULT_VALUE_FORMAT;
  return value;
}

function resolveArrange(value: ArrangeDef | string | undefined, named: Record<string, ArrangeDef>): ArrangeDef {
  if (value === undefined) return DEFAULT_ARRANGE;
  if (typeof value === "string") return named[value] ?? DEFAULT_ARRANGE;
  return value;
}

function resolveSelect(value: SelectDef | string | undefined, named: Record<string, SelectDef>, shape: ShapeTag): SelectDef {
  if (value === undefined) return { shape };
  if (typeof value === "string") return named[value] ?? { shape };
  return value;
}

function resolveEntryFormat(preset: EntryPresetName | undefined): EntryFormatFn {
  if (!preset) return cssKeyValue;
  return ENTRY_PRESETS[preset] ?? cssKeyValue;
}

export function parseFmtLangDocument(src: string): { doc?: { files: FileEntry[] }; diagnostics: Diagnostic[] } {
  const { value, diagnostics: parseDiagnostics } = parseJson5(src);
  if (parseDiagnostics.length > 0) return { diagnostics: parseDiagnostics };

  const raw = value as RawDoc;
  const diagnostics: Diagnostic[] = [];

  if (raw.$schema && !SUPPORTED_SCHEMA_VERSIONS.has(raw.$schema)) {
    diagnostics.push(diagnostic("semantic", "error", "unsupported-schema-version", `Unsupported $schema version "${raw.$schema}" — supported: ${[...SUPPORTED_SCHEMA_VERSIONS].join(", ")}.`));
    return { diagnostics };
  }

  diagnostics.push(...checkExpressionSyntax(raw));
  if (diagnostics.some((d) => d.severity === "error")) return { diagnostics };

  const namedNaming = raw.defs?.naming ?? {};
  const namedValueFormat = raw.defs?.valueFormat ?? {};
  const namedArrange = raw.defs?.arrange ?? {};
  const namedSelect = raw.defs?.select ?? {};

  if (!Array.isArray(raw.files) || raw.files.length === 0) {
    diagnostics.push(diagnostic("semantic", "error", "no-files", `Document must have a non-empty "files" array.`));
    return { diagnostics };
  }

  // Cross-file reference validation (role uniqueness, no forward/self-refs,
  // .each vs .content/.name matching perTheme-ness) — needs each entry's
  // OWN template text (before/after), not the already-resolved FileEntry
  // shape, so it runs here against the raw document, before mapping.
  const fileEntryLikes: FileEntryLike[] = raw.files.map((f) => ({
    role: f.role,
    repeatFor: f.repeatFor,
    path: f.path,
    templateText: `${f.before ?? ""}\n${f.after ?? ""}`,
  }));
  diagnostics.push(...validateFileEntries(fileEntryLikes));

  const files: FileEntry[] = raw.files.map((f) => {
    const select = resolveSelect(f.select, namedSelect, f.shape);
    // §1's core enforcement point: a where clause referencing a field that
    // doesn't exist on this entry's declared shape (e.g. a token-only field
    // like contrast.ratio applied to a scaleStep select) is a semantic
    // error here, caught BEFORE any rendering — never a silent empty-set
    // result at runtime (confirmed as a real gap: an earlier version of
    // this parser resolved `select` but never actually called
    // checkWhereFields against it, so this exact mismatch silently
    // produced empty output instead of an error).
    if (select.where) {
      diagnostics.push(...checkWhereFields(select.where, f.shape, `files[].select.where (role "${f.role}")`));
    }

    return {
      role: f.role,
      repeatFor: f.repeatFor,
      path: f.path,
      shape: f.shape,
      render: {
        select,
        arrange: resolveArrange(f.arrange, namedArrange),
        compose: {
          namingDef: resolveNaming(f.naming, namedNaming),
          valueFormatDef: resolveValueFormat(f.valueFormat, namedValueFormat),
          resolveSegments: (def) => (Array.isArray(def.segments) ? def.segments : ["color", "role", "variation"]),
          entryFormat: resolveEntryFormat(f.entryFormatPreset),
        },
        before: f.before,
        after: f.after,
      },
    };
  });

  if (diagnostics.some((d) => d.severity === "error")) return { diagnostics };

  return { doc: { files }, diagnostics };
}
