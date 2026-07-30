# fmt-lang

A standalone, general-purpose text-generation engine for Token Wand's
resolved color/token data. It is the implementation behind the `token-wand`
CLI's `"custom"` export format: given a `.wand` project's resolved tokens,
scale steps, and source colors, a user writes a small JSON5 document
describing what they want and gets back arbitrary text — CSS, a JS object
literal, a markdown report, anything — with no engine code required for a
new format, only configuration.

This document covers the full document schema (what you can actually write
today), the six-stage rendering pipeline, the public TypeScript API, and how
this package fits into the rest of the repo. For the design rationale behind
*why* the engine is shaped this way, see `Custom Export Format Engine —
Feature Requirements` and the architecture plan referenced in the repo's own
history — this README is deliberately the user-facing reference, not the
design discussion.

## Table of contents

- [Boundary with the rest of the repo](#boundary-with-the-rest-of-the-repo)
- [Using it from the CLI](#using-it-from-the-cli)
- [Quick start](#quick-start)
- [The data model](#the-data-model) — the four shapes every document works with
- [Document structure](#document-structure) — `$schema`, `defs`, `files[]`
- [Precedence: document defs vs. inline settings](#precedence-document-defs-vs-inline-settings)
- [Named-def references](#named-def-references) — bare name vs. dotted form
- [The expert path: select → sort → arrange → naming → valueFormat → entryFormat](#the-expert-path)
  - [`select`](#select)
  - [`sort`](#sort)
  - [`arrange`](#arrange)
  - [`naming`](#naming)
  - [`valueFormat`](#valueformat)
  - [`entryFormat`](#entryformat)
- [The easy path: `content` and B.8 blocks](#the-easy-path-content-and-b8-blocks)
- [Static content (`defs.static`)](#static-content-defsstatic)
- [Multi-file documents and cross-file references](#multi-file-documents-and-cross-file-references)
- [Escaping (`outputKind`)](#escaping-outputkind)
- [Validation and diagnostics](#validation-and-diagnostics)
- [The rendering pipeline, stage by stage](#the-rendering-pipeline-stage-by-stage)
- [Public API (`src/index.ts`)](#public-api-srcindexts)
- [Known limitations](#known-limitations)
- [Package structure](#package-structure)
- [Developing this package](#developing-this-package)

## Boundary with the rest of the repo

This package is a **read-only consumer** of `src/shared/exportEng/`. The
**only** file in this package that imports from outside `fmt-lang/` is
`src/data/adapter.ts`, which calls the already-pure `resolveExport()` /
`resolveScaleSteps()` (from `src/shared/exportEng/resolve.ts`) and
`_eachSourceColor()` (from `src/shared/exportEng/helpers.ts`). Nothing in
`src/shared/exportEng/` should ever need to change to support this package.

The one deliberate exception is a small, additive bridge in
`cli/src/loadConfig.ts` and `cli/src/build.ts` (a `"custom"` format literal,
two optional `ExportTarget` fields, one new branch in the CLI's per-format
loop). Nothing else outside this folder needs to change because of this
package, and the CLI's 8 built-in formats (`css`, `scss`, `tailwind`,
`dtcg`, `style-dictionary`, `ios-swift`, `android`, `react-native`) are
verified byte-for-byte unaffected by this bridge.

## Using it from the CLI

In `wand.config.json`, add a target with `"format": "custom"` and either
`custom` (the document inline, as text) or `customFile` (a path to a
standalone document file, resolved relative to the config file):

```json5
{
  "targets": [
    {
      "format": "custom",
      "outDir": "src/tokens",
      "customFile": "./templates/tokens.fmtlang.json5"
    }
  ]
}
```

Everything below this point describes what goes inside that document —
whether it's inline `custom` text or the contents of `customFile`.

## Quick start

The smallest possible document — every token, default formatting, zero
config:

```json5
{
  "files": [
    { "role": "tokens", "shape": "token", "path": "tokens.css" }
  ]
}
```

This produces one file, `tokens.css`, with one line per token:

```css
  --primary-bg-dim: #000B08;
  --primary-bg-subtle: #001310;
  --primary-bg-default: #001916;
  ...
```

A more realistic one, using the easy-path blocks (see below) to hand-write
the surrounding structure while getting every token pre-formatted:

```json5
{
  "files": [
    {
      "role": "tokens",
      "shape": "token",
      "path": "tokens.css",
      "content": ":root {\n${tokens.theme.light}\n}\n\n[data-theme=\"dark\"] {\n${tokens.theme.dark}\n}\n"
    }
  ]
}
```

## The data model

Every document works with exactly four record **shapes**, never conflated —
applying a naming/valueFormat/select meant for one shape to another is
caught as a semantic error before anything renders, not silently ignored.

| Shape | One entry per | Key fields |
|---|---|---|
| `token` | (color, role, variation, theme) | `theme`, `color`, `role`, `variation`, `segs`, `value`, `tokenRef`, `isAdjusted`, `contrast` |
| `scaleStep` | (color, step), Scale mode only | `color`, `stepKey`, `value`, `description` |
| `sourceColor` | one per declared brand color | `color`, `hex`, `description` |
| `sourceAlpha` | one per brand color's opacity variant | `color`, `opacity`, `description`, `rgba` |

`color`/`role`/`variation` are never a single flattened string — each is an
**identity** carrying both forms at once:

```ts
{ name: string; shorthand: string | null; segments: string[] }
```

`name` is the raw, as-authored display name. `shorthand` is the project's
declared shorthand, if any (`null` otherwise). `segments` is `name` split on
`"/"` — mirroring how Figma itself treats `/` as a folder separator in a
variable's name (e.g. a color literally named `"Interactive/Blue"` splits
into `["Interactive", "Blue"]`). A `naming` def (below) decides which form
to actually use.

A `token`'s `contrast` field is `{ ratio: number | null; rating: "Fail" |
"AA-" | "AA" | "AAA" | null }`. Comparisons against a `null` value (e.g.
`contrast.ratio > 4.5` when `ratio` is `null`) always evaluate to `false`,
never throw.

## Document structure

```json5
{
  "$schema": "fmt-lang/v1",           // optional; an unrecognized version is a clear error, never silently misread
  "outputKind": "none",               // optional document-level default — "none" | "json" | "xml"
  "defs": {
    "naming":      { "<name>": { /* NamingDef */ } },
    "valueFormat": { "<name>": { /* ValueFormatDef */ } },
    "entryFormat": { "<name>": { "template": "...", "preset": "..." } },
    "arrange":     { "<name>": { /* ArrangeDef */ } },
    "select":      { "<name>": { /* SelectDef */ } },
    "sort":        { "<name>": { /* SortDef */ } },
    "static":      { "<name>": { "text": "..." } | { "file": "..." } }
  },
  "files": [
    { "role": "...", "shape": "token" | "scaleStep" | "sourceColor" | "sourceAlpha", "path": "...", /* ... */ }
  ]
}
```

`defs` is optional and entirely for **reuse** — anything you can write
inline on a `files[]` entry, you can instead define once under `defs` and
reference by name from as many entries as you like. There is no
document-level `targets[]`/nested-outputs concept: **one fmt-lang document
produces one logical output** (one file, or a themed set of files that are
really the same output repeated — see `repeatFor` below). A second, unrelated
output is a second document, wired as a second CLI target.

Every `files[]` entry needs `role` (a stable identity, used for cross-file
references), `shape` (which of the four record shapes this entry reads),
and `path` (the output file's path — itself a template, see `repeatFor`).
Everything else is either the **expert path** (`select`/`sort`/`arrange`/
`naming`/`valueFormat`/`entryFormat`, explicit and fully controllable) or
the **easy path** (`content`, a whole-file template using pre-formatted
blocks) — never both on the same entry.

## Precedence: document defs vs. inline settings

Every def kind can be set two ways: once under `defs` (reusable across every
`files[]` entry that references it by name), or inline directly on one
`files[]` entry (applies to that entry alone). Inline always wins — a
`files[]` entry that sets `naming` directly overrides whatever `defs.naming`
entry it might otherwise have referenced, and a document with no `defs` at
all simply falls through to each field's own built-in default (see each
section below).

`outputKind` follows the same rule at one more level: a document-level
`outputKind` is the fallback every `files[]` entry inherits; a `files[]`
entry's own `outputKind` overrides it for that file alone.

## Named-def references

Anywhere a def can be referenced by name (`select`, `naming`, `valueFormat`,
`arrange`, `sort`, `entryFormat`, `before`/`after` for `defs.static`), two
equivalent forms work:

```json5
"naming": "camelCase"                    // bare name
"naming": "defs.naming.camelCase"        // dotted form — resolves identically
```

Both look up the same `defs.<kind>.<name>` entry. Use whichever reads better
in context; the dotted form is a little more self-documenting in a large
document with many `defs`.

## The expert path

Every stage below is independently optional — a `files[]` entry can set
any subset, and everything it doesn't set falls back to a sensible default.

### `select`

```json5
"select": { "shape": "token", "where": "theme == 'light'" }
```

`shape` is required and must match the `files[]` entry's own declared
`shape` (a mismatch here — e.g. a `token`-shaped select field referenced
against a `scaleStep`-shaped entry — is a semantic error, caught before any
rendering). `where` is optional; omitting it selects every record of that
shape. `where` is an expression (see [the embedded expression
language](#the-embedded-expression-language) below) evaluated once per
record — a record passes when it evaluates truthy.

A `files[]` entry can also **narrow a named select further inline**,
without editing the original def, via a sibling `where`:

```json5
{
  "defs": { "select": { "allTokens": { "shape": "token" } } },
  "files": [
    { "role": "dark", "shape": "token", "path": "dark.css",
      "select": "allTokens", "where": "theme == 'dark'" }
  ]
}
```

The named select runs first; the entry's own `where` is ANDed onto its
result, never replacing it.

If `select` is omitted entirely, the entry gets every record of its
declared `shape`.

### `sort`

```json5
"sort": { "keys": [
  { "by": "theme", "order": "declared" },
  { "by": "color.name", "order": "alpha", "direction": "desc" }
]}
```

Each key: `by` (a dot-path field name — checked against the shape's real
field schema, so a token-only field referenced against a `scaleStep` sort is
a semantic error), `order` (`"alpha"` | `"numeric"` | `"manual"` |
`"declared"`), and `direction` (`"asc"` default, or `"desc"`). `"manual"`
needs a `values` array (an explicit priority list — anything not listed
sorts after everything that is, in encounter order, never dropped).
`"declared"` needs a `declaredOrder` array to sort against; without one it
falls back to alphabetical rather than erroring.

Multiple keys apply in order — the second key only breaks ties left by the
first. Sorting is entirely optional: if a `files[]` entry sets no `sort` at
all, records render in the Dataset's own canonical deterministic order
(declared project order, then name) — never left to incidental array/object
iteration order.

### `arrange`

```json5
"arrange": { "kind": "flat", "join": "\n" }
```
```json5
"arrange": {
  "kind": "nested",
  "groupBy": ["color.name"],
  "indent": 2,
  "groupHeaderTemplate": "/* ${group} */",
  "groupFooterTemplate": ""
}
```

`kind: "flat"` (the default) is a plain sequential list, joined by `join`
(default `"\n"`). `kind: "nested"` groups by one or more raw dot-path fields
in `groupBy`, nesting one level per entry in the array. `groupBy` can also
be the literal string `"$segments"` — this resolves against the real
project's own declared token-segment order (color/role/variation, in
whatever order the project declares) instead of hand-listing it again.

`groupHeaderTemplate`/`groupFooterTemplate` insert text once per group,
before/after that group's own entries — an expression-interpolated template
(same `${...}` mechanism as `entryFormat.template` below) with an implicit
`group` variable holding that group's own raw key:

```json5
"groupHeaderTemplate": "// ${group}"
```
produces, for a `nested` arrangement grouped by `color.name` — one comment
line per color, immediately before that color's own entries:
```
// Primary
  --primary-bg-dim: #E4FFFA;
  --primary-bg-subtle: #C8FFF5;
  ...
// Secondary
  --secondary-bg-dim: #F8F9FE;
  ...
```

### `naming`

```json5
"naming": {
  "appliesTo": "token",
  "segments": ["color", "role", "variation"],
  "case": "kebab",
  "separator": "-",
  "expandSlashSegments": false,
  "guardLeadingDigit": true,
  "preferShorthand": false,
  "rewrite": { "role:primary": "brand" }
}
```

- **`appliesTo`** (required) — one shape or an array of shapes this def is
  valid for; a mismatch against the entry's actual shape is a semantic
  error.
- **`segments`** — an ordered list (`"color"` | `"role"` | `"variation"` |
  `"step"`), or the literal string `"$segments"` to track the real
  project's own declared segment order automatically.
- **`case`** — `"kebab"` | `"snake"` | `"camel"` | `"pascal"` |
  `"screaming"` | `"custom"`.
- **`separator`** — only meaningful for `case: "custom"` with no `join` —
  a fixed string joining every segment.
- **`join`** — only meaningful for `case: "custom"`; overrides `separator`
  when set. An expression, evaluated once **per gap** between two adjacent
  segments (not once for the whole name — the expression language has no
  array methods/lambdas by design), with an implicit `index` variable (the
  0-based position of that gap):
  ```json5
  "join": "index == 0 ? '' : '__'"
  ```
  joins the first two segments directly and every later pair with `__` —
  e.g. segments `"text"` + `"primary"` + `"default"` → `"textprimary__default"`.
  Note `case: "custom"` (with either `separator` or `join`) does **not**
  apply any casing transform the way `"kebab"`/`"camel"`/etc. do — each
  segment's raw display string (whatever case the project itself used)
  passes through unchanged, only the joining logic is customized.
- **`expandSlashSegments`** — when `true`, a segment whose raw name
  contains `/` is spliced into multiple segments in place (mirroring
  Figma's own `/`-nesting), instead of staying one atomic string. Default
  `false` (today's flattening behavior).
- **`guardLeadingDigit`** — default `true`. A name that would start with a
  digit (e.g. a color literally named `"100% Black"`) gets a `_` prefix
  (`_100-black`) — safe as a bare JS/TS identifier in every context. Set
  `false` if you only target a format (like plain CSS) where a leading
  digit is fine.
- **`preferShorthand`** — use each segment's declared shorthand instead of
  its raw name, falling back to the raw name when the project set none.
- **`rewrite`** — an exact-match override table, keyed `"<kind>:<rawName>"`
  → literal replacement string, applied before casing.

Omitting `naming` entirely on a `files[]` entry uses the built-in default:
`kebab-case`, `["color", "role", "variation"]`, leading-digit guard on.

### `valueFormat`

```json5
"valueFormat": { "appliesTo": ["token", "scaleStep", "sourceColor"], "kind": "hex" }
```

`kind`: `"hex"` (`#RRGGBB`), `"hexa"` (`#RRGGBBAA`, alpha **last** — CSS
Color Module 4's convention), `"argbHex"` (`#AARRGGBB`, alpha **first** —
Android's convention; deliberately distinct byte order from `hexa`),
`"rgba"`, or `"hsla"`. Omitting `valueFormat` defaults to `"hex"`.

A `sourceColor`'s base value is always literal hex regardless of
`valueFormat`, matching every real built-in formatter's own convention —
only alpha variants and tokens go through the selected `kind`.

**Reference vs. literal values.** A `token` that's an alias into a scale
step (its `tokenRef` field is set) still renders its literal resolved value
by default. Set `referenceStyle` on the `valueFormat` to render it as a
reference expression instead:

```json5
"valueFormat": {
  "appliesTo": "token", "kind": "hex",
  "referenceStyle": { "kind": "reference", "template": "scale.${refColor}.${refStep}" }
}
```

```
No referenceStyle:    --primary-text-default: #0f998a;
With referenceStyle:  --primary-text-default: scale.Primary.500;
```

`${refColor}`/`${refStep}` inside the template are substituted from the
token's own `tokenRef` (Token Wand's internal `"{colorName}-{stepName}"`
format), not the general expression language. A token with no `tokenRef`
always renders literally, regardless of whether `referenceStyle` is set.

### `entryFormat`

Either a named/dotted reference, or inline:

```json5
"entryFormat": { "preset": "cssKeyValue" }
```
```json5
"entryFormat": { "template": "  ${name}: ${value};${isAdjusted ? ' /* adjusted */' : ''}" }
```

**Presets** (`preset`, one of the eight below) cover the common shapes —
each takes the already-formatted `{name, value, description?, isAdjusted?}`
view and produces one line. An absent/empty `description` is always
omitted, never emitted as a blank string.

| Preset | Produces |
|---|---|
| `cssKeyValue` | `  --name: value;` |
| `scssMapEntry` | `  "name": value,` |
| `jsonKeyValue` | `"name": { "value": "...", "description": "..." }` |
| `jsonKeyValueFlat` | `  "name": "value",` |
| `jsObjectProperty` | `  name: "value",` |
| `xmlElement` | `<color name="name">value</color>` |
| `xmlAttribute` | `<color name="name" value="value" description="..."/>` |
| `swiftStaticLet` | `  static let name = value` |
| `kotlinAndroidResource` | `    <color name="name">value</color>` |
| `markdownTableRow` | `| name | value | description |` |

**`template`** is a fully custom, user-authored entry line — literal text
with `${...}` spans interpolated against that entry's own already-formatted
fields: `${name}`, `${value}`, `${description}`, `${isAdjusted}`. `template`
wins over `preset` if both are set on the same spec. Omitting `entryFormat`
entirely defaults to `cssKeyValue`.

## The easy path: `content` and B.8 blocks

For "give me every token, already formatted, so I can wrap my own
surrounding text around it" — the common case — a `files[]` entry can set
`content` instead of `select`/`sort`/`arrange`/`entryFormat` entirely:

```json5
{
  "role": "tokens", "shape": "token", "path": "tokens.js",
  "content": "export const tokens = {\n${tokensJs.theme.light}\n};\n"
}
```

`content` is a whole-file literal template. Inside it, five block
identifiers are available, each pre-formatted with its own stdlib naming +
entry-format defaults:

| Block | Naming default | Entry format default |
|---|---|---|
| `tokens` | kebab-case | `  --name: value;` |
| `tokensJs` / `tokensTs` | camelCase | `  name: "value",` |
| `tokensCss` | kebab-case | `  --name: value;` |
| `tokensJson` | camelCase | `  "name": "value",` |

Each block supports:

```json5
"${tokens}"                                          // every token, every theme
"${tokens.theme.light}"                               // every light-theme token
"${tokens.scale}"                                     // every scale step
"${tokens.source}"                                     // every source color (+ alpha variants)
"${tokens.theme.light.getEntriesByColor('primary')}"   // narrow to one color
"${tokens.theme.light.getEntriesByRole('text')}"       // narrow to one role
"${tokens.theme.light.getEntriesByVariation('default')}"
"${tokens.getEntriesByTheme('dark')}"                  // re-scope from the top level
```

`getEntriesBy*` calls **chain** — `tokens.theme.light.getEntriesByColor('primary').getEntriesByRole('text')`
narrows twice. The string argument matches either the record's raw name or
its declared shorthand interchangeably (`getEntriesByColor('Primary')` and
`getEntriesByColor('pr')` both work if that's the project's real name/
shorthand pair).

Two situations are **runtime errors**, never silent empty output:

- Referencing `.scale` on a project that has no scale collection at all
  (Direct mode, not Scale mode) — an empty scale collection (Scale mode,
  zero steps) is legitimate and renders as empty text; a *structurally
  absent* collection is an error.
- A `getEntriesBy*` call that matches nothing (the given name/shorthand
  doesn't exist in this project).

Both surface as a `runtime`-category diagnostic with a clear message — the
document still fails to generate, but with an actionable error, not a
silently-wrong file.

`content` is mutually exclusive with `select`/`sort`/`arrange`/
`entryFormat` on the same entry — when `content` is set, those fields are
simply ignored, never partially applied.

## Static content (`defs.static`)

A license header, a "do not edit" comment, any fixed boilerplate — declare
it once, attach it via `before`/`after` on any entry (expert-path or
`content`-mode alike), resolved once per generation run, never once per
record:

```json5
{
  "defs": {
    "static": {
      "doNotEdit": { "text": "// Auto-generated. Do not edit." },
      "license": { "file": "./LICENSE-HEADER.txt" }
    }
  },
  "files": [
    { "role": "t", "shape": "token", "path": "tokens.css",
      "before": "license", "content": "${tokensCss.theme.light}" }
  ]
}
```

`file` paths resolve relative to the document's own base directory (the
CLI passes the directory containing `wand.config.json`/the `customFile`
document). A `before`/`after` string that **isn't** a known `defs.static`
name is simply treated as literal text — so most everyday `before`/`after`
usage (a plain comment, an import line) needs no `defs.static` entry at
all; the static-def mechanism only kicks in for names you've actually
declared.

## Multi-file documents and cross-file references

One `files[]` entry with `repeatFor` produces one file **per theme**,
automatically, without hand-authoring each repetition. The loop variable
(named by `as`) is available as a real expression inside `path` and
`content` alike, alongside `<as>Index` — its 0-based position among the
project's declared themes:

```json5
{
  "role": "theme-file",
  "repeatFor": { "over": "themes", "as": "theme" },
  "path": "tokens/${theme}.css",
  "content": "${tokens.getEntriesByTheme(theme)}"
}
```

`path` goes through the exact same expression-interpolation engine as
`content`/`before`/`after`/`entryFormat.template` — not just a literal
`${theme}` substitution — so conditional path logic is expressible
directly. For example, Android's real resource-qualifier convention (the
first declared theme gets no suffix at all, `"dark"` gets `values-night`,
anything else gets `values-<name>`) is one `path` expression:

```json5
{
  "role": "res",
  "repeatFor": { "over": "themes", "as": "theme" },
  "path": "res/${theme == 'dark' ? 'values-night' : (themeIndex == 0 ? 'values' : 'values-' + theme)}/colors.xml",
  "content": "${tokensCss.getEntriesByTheme(theme)}"
}
```

A separate, non-repeated entry can reference another entry's real, finally
resolved output by role, using `{{files.<role>.*}}`:

```json5
{
  "role": "index",
  "path": "tokens/index.css",
  "content": "{{files.theme-file.each}}@import './{{item.name}}';\n{{/files.theme-file.each}}"
}
```

- `{{files.<role>.content}}` / `{{files.<role>.name}}` — a single,
  non-repeated earlier entry's final rendered content / output path.
- `{{files.<role>.each}}...{{/files.<role>.each}}` — once per instance of a
  `repeatFor` entry, with `{{item.theme}}`, `{{item.name}}`, and
  `{{item.content}}` available inside the loop body.

The engine resolves generation order automatically from these references —
you never need to declare entries in dependency order. A genuine reference
cycle (A references B which references A) is a caught error naming the
exact cycle path, never infinite recursion or silently-incomplete output. A
forward reference (an entry referencing a role declared *later* in the
document) or a self-reference is also caught, at parse time, before any
rendering.

## Escaping (`outputKind`)

```json5
"outputKind": "json"    // or "xml", or "none" (default)
```

Settable at document level (the fallback) or per-`files[]`-entry
(overriding the document default for that file alone). When set, every
value interpolated via `entryFormat.template`'s `${name}`/`${value}`/
`${description}` (and `content`-mode's block interpolation) is
automatically escaped for that structure — a value containing a quote,
backslash, or `<`/`&`/`>` never silently produces invalid JSON/XML.

## Validation and diagnostics

Every problem is reported as a `Diagnostic`:

```ts
interface Diagnostic {
  category: "syntax" | "semantic" | "runtime" | "warning";
  severity: "error" | "warning";
  message: string;
  loc?: string;   // a field path, when available
  code: string;   // stable, for tooling
}
```

- **`syntax`** — malformed JSON5, an invalid expression inside a `where`/
  `join`/template `${...}` span. Caught immediately, before anything else
  runs.
- **`semantic`** — internally inconsistent configuration, detectable
  without any real project data: a shape mismatch (a token-only field used
  against a `scaleStep` select/sort), an unknown `$schema` version, a
  cross-file forward/self-reference, a `defs.static` `file` that fails to
  read.
- **`runtime`** — valid configuration that fails against the *real* project
  data: a genuine cross-file cycle, a B.8 block referencing a
  structurally-absent shape, an unmatched `getEntriesBy*` query.
- **`warning`** — non-fatal (an unused def, a naming scheme that collides
  two distinct colors into the same output name) — never blocks
  generation.

`parseFmtLangDocument()` returns `{ doc: undefined, diagnostics }` on any
error — never a partial or silently-wrong document.

## The rendering pipeline, stage by stage

Every expert-path `files[]` entry goes through this fixed order, always:

1. **SELECT** — `select` (+ any chained `where`) against raw Dataset
   records.
2. **SORT** — `sort`, on raw fields (Dataset's canonical order if unset).
3. **ARRANGE** — `arrange` groups/nests the sorted, still-raw records.
4. **FORMAT** — per record: `naming` + `valueFormat` → `{name, value, ...}`.
5. **COMPOSE-ENTRY** — `entryFormat` (+ `outputKind` escaping) per record.
6. **COMPOSE-BLOCK** — assemble per the ARRANGE structure, attach
   `before`/`after`, apply group headers/footers, indent.

The rule this order encodes: **structural decisions (select/sort/arrange)
always see raw data; textual decisions (entry templates, group headers) always
see already-formatted strings** — naming/value formatting has already run by
the time any template text is evaluated.

`content`-mode entries skip this pipeline entirely for their own top-level
template, but every block (`tokens.*` etc.) they interpolate internally
still goes through the exact same six stages under the hood.

## The embedded expression language

Used in `where`, `join`, `sort`'s `by` (a bare dot-path, not a full
expression), and every `${...}` template span. Deliberately small — no
array methods, no lambdas, no general iteration — by design: it's meant to
be staticly analyzable and trustable in a config file handed from a
designer to a developer, not a general scripting language.

Supported: field access (`color.name`, `contrast.ratio`, bare identifiers
resolving against the current record), string/number/boolean literals,
comparisons (`== != < <= > >=`), boolean operators (`&& ||`), unary `!`, a
ternary (`cond ? a : b`), string concatenation (`+`), and method calls on
resolvable values (B.8's `getEntriesByColor('x')`-style chaining). Built-in
functions: `upper()`, `lower()`, `slug()`.

Comparisons against `null`/`undefined` never throw — they evaluate to
`false` (except `==`/`!=` against `null` itself, which behave normally), and
field access on a `null` intermediate propagates `null` rather than
throwing, all the way up the chain.

## Public API (`src/index.ts`)

All named exports — no default export, so internal relocations never force
import-site rewrites.

```ts
import {
  buildDataset, buildDatasetWithWarnings, type Dataset,
  parseFmtLangDocument,
  generate, type GeneratedFile, type GenerateResult, type ParsedDocument,
  write, type WriteOptions, type WriteResultEntry, type FileWriteStatus,
  type Diagnostic, type DiagnosticCategory, type DiagnosticSeverity,
} from "@rahil316/fmt-lang";
```

```ts
// 1. Build a Dataset from your project's already-resolved engine output.
const dataset = buildDataset(engineResult, exportConfig);

// 2. Parse a document (baseDir is only needed if you use defs.static's `file` form).
const { doc, diagnostics } = parseFmtLangDocument(documentSource, baseDir);
if (!doc) {
  // diagnostics describes exactly what's wrong — never a silent failure
}

// 3. Generate — pure, no filesystem access.
const { files, diagnostics: genDiagnostics } = generate(doc, dataset);

// 4. Write to disk — the only fs-touching function. Byte-identical files
//    are classified "unchanged" and never rewritten; dry-run computes the
//    same classification without writing anything.
const results = write(files, { outDir: "src/tokens", dryRun: false });
```

`GeneratedFile` (`{ path, content, role? }`) deliberately mirrors the main
plugin's own `ExportFile` shape structurally (not by import), so the CLI
bridge stays a thin, obvious mapping.

## Known limitations

Honest, current gaps — small, and each either structurally moot today or a
documented scope boundary rather than a silently-broken promise:

- **`repeatFor` only supports `{ "over": "themes" }`.** There's no way to
  repeat a file once per an arbitrary named `select` result — themes are
  currently the only project-declared enumerable dimension the Dataset
  exposes, so this is moot in practice today.
- **Upstream `ResolveWarning`s (`empty-theme`, `role-no-variations`,
  `duplicate-token-name`) don't automatically reach `generate()`'s
  diagnostics.** They're available if you call `buildDatasetWithWarnings()`
  yourself instead of `buildDataset()`, but a document run through the
  normal `parseFmtLangDocument` → `generate` flow (including via the CLI)
  won't see them as `Diagnostic`s today.
- **No `arrange kind: "custom"`.** Only `"flat"` and `"nested"` (fixed
  field-list or `"$segments"` grouping) exist — no arbitrary recursive
  structural-composition expression for nesting shapes those two don't
  cover.
- **No "unused `defs.*` entry" or "select matches zero records" warnings.**
  Both would be non-fatal `warning`-category diagnostics; neither exists
  yet.
- **The expert path's `select`/`where` can't reference a `repeatFor` loop
  variable.** `path` and `content` both can (see
  [Multi-file documents](#multi-file-documents-and-cross-file-references)),
  but a `repeatFor` entry using `select`/`sort`/`arrange`/`entryFormat`
  instead of `content` has no way to write `"where": "theme == theme"` (or
  similar) referencing its own loop variable — only the `token` shape gets
  automatic per-theme scoping (via the entry's `shape` alone), and
  `scaleStep`/`sourceColor`/`sourceAlpha` don't have a theme dimension in
  the data model at all, so this is narrow in practice.

## Package structure

```
src/
  data/        adapter.ts (the one file reading src/shared/exportEng/),
               dataset.ts, shapes.ts — the four tagged record shapes
  lang/        document.ts (parses RawDoc), expr.ts (the expression language +
               ${...} interpolation), blocks.ts (B.8's easy-path blocks)
               defs/        naming, valueFormat, select, sort, arrange
               stdlib/      casing, colorValue, escaping, entryPresets
  pipeline/    the fixed 6-stage renderFile() (stages.ts) and its per-stage
               modules (formatValue, composeEntry, composeBlock, nestedTree, indent)
  xref/        cross-file dependency graph (graph.ts, resolveOrder.ts),
               render.ts (orchestrates all files in dependency order,
               resolves "$segments" and B.8 blocks against the real Dataset)
  validate/    diagnostics.ts + syntax/semantic/typecheck/runtime, one
               module per Diagnostic category
  exec/        generate.ts (pure) and write.ts (the only fs-touching module)
  index.ts     the public API surface above — everything else is internal
test/
  unit/         one file per module above
  acceptance/   byte-diff proofs against the 8 real built-in formatters
                (fmtCSS.ts, fmtSCSS.ts, fmtDTCG.ts, etc.) plus a non-token
                markdown-report proof and the full error-handling proof
```

## Developing this package

```
cd fmt-lang
npm install
npm run build      # tsc, then copies test/fixtures/*.{json,txt} into dist/
npm run typecheck  # tsc --noEmit, no build output
npm run lint        # this package's own eslint.config.mjs (scoped to its own tsconfig)
npm run lint:fix
npm test            # build, then node --test against dist/fmt-lang/test/{unit,acceptance}
```

This package has its own `eslint.config.mjs`, separate from the root
plugin's — ESLint's flat-config nested-discovery picks it up automatically
for anything under `fmt-lang/`, without needing an explicit `ignores` entry
in the root config.
