// Parses a raw fmt-lang document (JSON5 text, per B.1/B.2) into a
// ParsedDocument the exec/generate.ts orchestrator can run — resolving
// `defs.*` references on each files[] entry into real definition objects
// (B.2b's precedence: document-level defs are the fallback; a files[] entry
// that inlines its own naming/valueFormat/etc. overrides them for itself
// only). This is intentionally a thin mapping layer, not a new parser —
// the document's own shape is already plain JSON5 (validate/syntax.ts owns
// turning text into this raw object).
import { parseDocument as parseJson5, checkExpressionSyntax } from "../validate/syntax";
import { checkWhereFields, checkSortKeyField } from "../validate/typecheck";
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
import type { SortDef } from "./defs/sort";
import type { EntryFormatFn } from "../pipeline/composeEntry";
import { ENTRY_PRESETS, cssKeyValue, type EntryPresetName, type FormattedEntry } from "./stdlib/entryPresets";
import { interpolateTemplate, checkTemplateExpressionSyntax } from "./expr";
import type { ShapeTag } from "../data/shapes";
import type { OutputKind } from "./stdlib/escaping";
import { readFileSync } from "fs";
import { join } from "path";

export interface EntryFormatSpec {
  template?: string;
  preset?: EntryPresetName;
}

// B.10's static surrounding content — a license header, a static import
// line, wrapping boilerplate — attached via `before`/`after`, resolved ONCE
// per generation run (not once per entry, per the plan's explicit wording).
// Exactly one of `text`/`file` is meaningful; `file` is read synchronously
// at parse time (relative to the document's own base directory — see
// parseFmtLangDocument's `baseDir` param), same timing as every other
// parse-time resolution (naming/select/etc.) — a real gap: this concept
// never existed in RawDoc at all before.
export interface StaticSpec {
  text?: string;
  file?: string;
}

export interface RawDoc {
  $schema?: string;
  // §3's Escaping requirement: declared once at document level (the
  // fallback every file inherits), a file can still override it locally —
  // the same broadest-to-narrowest cascade every other def kind already
  // follows (B.2b). Default "none" (today's behavior) when neither level
  // sets it.
  outputKind?: OutputKind;
  defs?: {
    naming?: Record<string, NamingDef>;
    valueFormat?: Record<string, ValueFormatDef>;
    entryFormat?: Record<string, EntryFormatSpec>;
    arrange?: Record<string, ArrangeDef>;
    select?: Record<string, SelectDef>;
    sort?: Record<string, SortDef>;
    static?: Record<string, StaticSpec>;
  };
  files: Array<{
    role: string;
    shape: ShapeTag;
    path: string;
    repeatFor?: { over: "themes"; as: string };
    // B.8's easy path — a whole-file literal template, with `${tokens.*}`/
    // `${tokensJs.*}`/`${tokensCss.*}`/`${tokensJson.*}` block interpolation
    // (each already pre-formatted with that flavor's own stdlib naming/
    // entry-format defaults — see lang/blocks.ts) available inside it,
    // alongside the same plain expression interpolation entryFormat.template
    // already supports. Mutually exclusive with select/sort/arrange/
    // entryFormat below (the expert path) — when `content` is set, this
    // entry's ENTIRE output is this template, and select/sort/arrange/
    // entryFormat are ignored for it.
    content?: string;
    select?: SelectDef | string;
    // B.9's chaining: narrow a named select further, inline, at THIS
    // entry's point of use, without editing the original def — ANDed onto
    // whatever `select` (named or inline) already resolves to, never a
    // replacement of it. Only meaningful alongside `select`.
    where?: string;
    naming?: NamingDef | string;
    valueFormat?: ValueFormatDef | string;
    arrange?: ArrangeDef | string;
    sort?: SortDef | string;
    // Either a named reference into defs.entryFormat (bare name or the
    // plan's "defs.entryFormat.name" dotted form), or an inline
    // {template} | {preset} object. `template` is a B.5 custom entry
    // template — literal text with `${name}`/`${value}`/`${description}`/
    // `${isAdjusted}` expression spans interpolated against the entry's own
    // already-formatted fields (see pipeline/formatValue.ts's
    // FormattedEntry) — the "fully user-authorable" entry format the plan
    // requires, not just the 8 fixed stdlib presets. `preset` selects one of
    // those 8 by name. Exactly one of the two is meaningful when given
    // inline; `template` wins if somehow both are set (a template is always
    // more specific than a preset name).
    entryFormat?: EntryFormatSpec | string;
    outputKind?: OutputKind;
    // B.10: either literal text, OR a reference into defs.static (bare name
    // or the "defs.static.name" dotted form — resolveStatic() checks
    // defs.static FIRST and only falls back to treating the string as
    // literal text if no such name is declared, since a literal `before`
    // string is exactly as likely to look like a plain word as a real
    // static-def name is).
    before?: string;
    after?: string;
  }>;
}

const SUPPORTED_SCHEMA_VERSIONS = new Set(["fmt-lang/v1"]);

// A named-def reference accepts either the plan's own documented dotted form
// ("defs.select.primaryTokens" — see B.2b/B.9's worked examples) or a bare
// name ("primaryTokens"). Both resolve to the same lookup key — this was a
// real gap: earlier code only ever matched the bare form, silently failing
// (falling through to the shape's default) on every dotted reference the
// plan itself shows as the canonical syntax.
function defKey(value: string, kind: string): string {
  const prefix = `defs.${kind}.`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function resolveNaming(value: NamingDef | string | undefined, named: Record<string, NamingDef>): NamingDef {
  if (value === undefined) return DEFAULT_NAMING;
  if (typeof value === "string") return named[defKey(value, "naming")] ?? DEFAULT_NAMING;
  return value;
}

function resolveValueFormat(value: ValueFormatDef | string | undefined, named: Record<string, ValueFormatDef>): ValueFormatDef {
  if (value === undefined) return DEFAULT_VALUE_FORMAT;
  if (typeof value === "string") return named[defKey(value, "valueFormat")] ?? DEFAULT_VALUE_FORMAT;
  return value;
}

function resolveArrange(value: ArrangeDef | string | undefined, named: Record<string, ArrangeDef>): ArrangeDef {
  if (value === undefined) return DEFAULT_ARRANGE;
  if (typeof value === "string") return named[defKey(value, "arrange")] ?? DEFAULT_ARRANGE;
  return value;
}

function resolveSelect(value: SelectDef | string | undefined, named: Record<string, SelectDef>, shape: ShapeTag): SelectDef {
  if (value === undefined) return { shape };
  if (typeof value === "string") return named[defKey(value, "select")] ?? { shape };
  return value;
}

// Absent -> undefined, NOT a default SortDef — renderFile()/stages.ts already
// treats "no sort def" as "use the Dataset's own canonical order" (the
// Determinism guarantee, Part C), so there is no meaningful "default sort"
// to substitute here the way naming/valueFormat/arrange have one.
function resolveSort(value: SortDef | string | undefined, named: Record<string, SortDef>): SortDef | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return named[defKey(value, "sort")];
  return value;
}

// Turns a resolved EntryFormatSpec into the actual (entry) => string
// function composeEntry() calls (Part C stage 5). `template` takes priority
// over `preset` when both are set — a template is always more specific.
function entryFormatFromSpec(spec: EntryFormatSpec): EntryFormatFn {
  if (spec.template) {
    const tpl = spec.template;
    return (entry: FormattedEntry) => interpolateTemplate(tpl, { record: entry });
  }
  if (spec.preset) return ENTRY_PRESETS[spec.preset] ?? cssKeyValue;
  return cssKeyValue;
}

function resolveEntryFormat(value: EntryFormatSpec | string | undefined, named: Record<string, EntryFormatSpec>): EntryFormatFn {
  if (value === undefined) return cssKeyValue;
  if (typeof value === "string") {
    const spec = named[defKey(value, "entryFormat")];
    return spec ? entryFormatFromSpec(spec) : cssKeyValue;
  }
  return entryFormatFromSpec(value);
}

// B.10: resolved ONCE per generation run (called once per files[] entry at
// parse time, not once per record) — `file` is read synchronously, relative
// to `baseDir` (the document's own directory, so a relative path in the
// document behaves the way a human author would expect regardless of where
// the CLI itself was invoked from). A read failure is a semantic diagnostic
// (a static-content file is config, not project data — Part E), never an
// uncaught exception.
function resolveStaticText(
  value: string | undefined,
  named: Record<string, StaticSpec>,
  baseDir: string,
  fieldPath: string,
  diagnostics: Diagnostic[]
): string | undefined {
  if (value === undefined) return undefined;
  const spec = named[defKey(value, "static")];
  if (!spec) return value; // not a known static-def name -> treat as literal text
  if (spec.text !== undefined) return spec.text;
  if (spec.file !== undefined) {
    try {
      return readFileSync(join(baseDir, spec.file), "utf-8");
    } catch (err) {
      diagnostics.push(diagnostic("semantic", "error", "static-file-read-failed", `${fieldPath}: could not read static content file "${spec.file}": ${(err as Error).message}`, fieldPath));
      return undefined;
    }
  }
  return undefined;
}

// `baseDir` — the directory `defs.static`'s `file` paths resolve relative
// to. Defaults to the process's own cwd for callers (like most tests) that
// never use `file`-based static content and don't have a meaningful
// document directory of their own; a real CLI caller passes the actual
// document's directory (see cli/src/build.ts).
export function parseFmtLangDocument(src: string, baseDir: string = process.cwd()): { doc?: { files: FileEntry[] }; diagnostics: Diagnostic[] } {
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
  const namedSort = raw.defs?.sort ?? {};
  const namedEntryFormat = raw.defs?.entryFormat ?? {};
  const namedStatic = raw.defs?.static ?? {};

  if (!Array.isArray(raw.files) || raw.files.length === 0) {
    diagnostics.push(diagnostic("semantic", "error", "no-files", `Document must have a non-empty "files" array.`));
    return { diagnostics };
  }

  // checkExpressionSyntax only ever validates `where` fields (a template
  // string's surrounding literal text isn't itself an expression — see its
  // own comment) — entry `template` strings need the interpolation-aware
  // scan instead, checking only each `${...}` span's contents.
  for (const [name, spec] of Object.entries(namedEntryFormat)) {
    if (!spec.template) continue;
    for (const err of checkTemplateExpressionSyntax(spec.template)) {
      diagnostics.push(diagnostic("syntax", "error", "invalid-expression", `Invalid expression in defs.entryFormat.${name}.template: ${err.message}`, `defs.entryFormat.${name}.template`));
    }
  }
  for (const f of raw.files) {
    if (f.entryFormat && typeof f.entryFormat !== "string" && f.entryFormat.template) {
      for (const err of checkTemplateExpressionSyntax(f.entryFormat.template)) {
        diagnostics.push(diagnostic("syntax", "error", "invalid-expression", `Invalid expression in files[].entryFormat.template (role "${f.role}"): ${err.message}`, `files[].entryFormat.template (role "${f.role}")`));
      }
    }
    if (f.content !== undefined) {
      for (const err of checkTemplateExpressionSyntax(f.content)) {
        diagnostics.push(diagnostic("syntax", "error", "invalid-expression", `Invalid expression in files[].content (role "${f.role}"): ${err.message}`, `files[].content (role "${f.role}")`));
      }
    }
    if (f.arrange && typeof f.arrange !== "string") {
      for (const [field, tpl] of [["groupHeaderTemplate", f.arrange.groupHeaderTemplate], ["groupFooterTemplate", f.arrange.groupFooterTemplate]] as const) {
        if (!tpl) continue;
        for (const err of checkTemplateExpressionSyntax(tpl)) {
          diagnostics.push(diagnostic("syntax", "error", "invalid-expression", `Invalid expression in files[].arrange.${field} (role "${f.role}"): ${err.message}`, `files[].arrange.${field} (role "${f.role}")`));
        }
      }
    }
  }
  for (const [name, arr] of Object.entries(namedArrange)) {
    for (const [field, tpl] of [["groupHeaderTemplate", arr.groupHeaderTemplate], ["groupFooterTemplate", arr.groupFooterTemplate]] as const) {
      if (!tpl) continue;
      for (const err of checkTemplateExpressionSyntax(tpl)) {
        diagnostics.push(diagnostic("syntax", "error", "invalid-expression", `Invalid expression in defs.arrange.${name}.${field}: ${err.message}`, `defs.arrange.${name}.${field}`));
      }
    }
  }
  if (diagnostics.some((d) => d.severity === "error")) return { diagnostics };

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
    // B.8's easy path — a whole-file template — is mutually exclusive with
    // the expert path below; select/sort/arrange/entryFormat are simply not
    // meaningful when `content` is set, so none of their validation or
    // resolution runs for this entry at all.
    if (f.content !== undefined) {
      const beforeText = resolveStaticText(f.before, namedStatic, baseDir, `files[].before (role "${f.role}")`, diagnostics);
      const afterText = resolveStaticText(f.after, namedStatic, baseDir, `files[].after (role "${f.role}")`, diagnostics);
      const contentTemplate = [beforeText, f.content, afterText].filter((p): p is string => p !== undefined && p.length > 0).join("\n");
      return { role: f.role, repeatFor: f.repeatFor, path: f.path, shape: f.shape, contentTemplate };
    }

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
    if (f.where) {
      diagnostics.push(...checkWhereFields(f.where, f.shape, `files[].where (role "${f.role}")`));
    }

    const sortDef = resolveSort(f.sort, namedSort);
    if (sortDef) {
      for (const key of sortDef.keys) {
        diagnostics.push(...checkSortKeyField(key.by, f.shape, `files[].sort.keys[].by (role "${f.role}")`));
      }
    }

    return {
      role: f.role,
      repeatFor: f.repeatFor,
      path: f.path,
      shape: f.shape,
      render: {
        select,
        additionalWhere: f.where,
        sort: resolveSort(f.sort, namedSort),
        arrange: resolveArrange(f.arrange, namedArrange),
        compose: {
          namingDef: resolveNaming(f.naming, namedNaming),
          valueFormatDef: resolveValueFormat(f.valueFormat, namedValueFormat),
          // A placeholder — parse time has no real Dataset to resolve
          // "$segments" against (Part E: syntax/semantic validation is
          // deliberately Dataset-agnostic). xref/render.ts's
          // resolveDatasetSegments() unconditionally replaces this closure
          // with a Dataset-aware one immediately before rendering — this
          // fallback only matters if something ever calls renderFile()
          // directly without going through renderAllFiles() first.
          resolveSegments: (def) => (Array.isArray(def.segments) ? def.segments : ["color", "role", "variation"]),
          entryFormat: resolveEntryFormat(f.entryFormat, namedEntryFormat),
          outputKind: f.outputKind ?? raw.outputKind ?? "none",
        },
        before: resolveStaticText(f.before, namedStatic, baseDir, `files[].before (role "${f.role}")`, diagnostics),
        after: resolveStaticText(f.after, namedStatic, baseDir, `files[].after (role "${f.role}")`, diagnostics),
      },
    };
  });

  if (diagnostics.some((d) => d.severity === "error")) return { diagnostics };

  return { doc: { files }, diagnostics };
}
