# fmt-lang

A standalone, general-purpose text-generation engine for Token Wand's
resolved color/token data. It is the implementation behind the `token-wand`
CLI's `"custom"` export format — see `cli/README.md` for the user-facing
`custom`/`customFile` config fields, and
`Custom Export Format Engine — Feature Requirements` (the requirements
document this package is built against) for what it must be capable of.

## Boundary with the rest of the repo — read this before touching imports

This package is a **read-only consumer** of `src/shared/exportEng/`. The
**only** file in this package that imports from outside `fmt-lang/` is
`src/data/adapter.ts`, which calls the already-pure `resolveExport()` /
`resolveScaleSteps()` (from `src/shared/exportEng/resolve.ts`) and
`_eachSourceColor()` (from `src/shared/exportEng/helpers.ts`). Nothing in
`src/shared/exportEng/` (or anywhere else in the repo) should ever need to
change to support this package — if you find yourself wanting to edit a
file outside `fmt-lang/`, stop and reconsider the design first.

The one deliberate exception is `cli/src/loadConfig.ts` and
`cli/src/build.ts`, which gained a small, additive bridge to this package —
see the plan document's "Part G" for the exact, minimal scope of that
change. Nothing else outside this folder should ever need to change because
of this package.

## Structure

- `src/data/` — the data layer. Turns a `.wand` file's resolved
  `EngineResult`/`ExportConfig` into this package's own `Dataset`: tagged,
  shape-safe records (`token`, `scaleStep`, `sourceColor`, `sourceAlpha`)
  with both raw and shorthand identity preserved (never pre-flattened).
- `src/lang/` — the JSON5-based document language: lexer, parser, AST, the
  five reusable definition kinds (`naming`, `valueFormat`, `entryFormat`,
  `sort`, `arrange`, `select`, `conditional`), a growable `stdlib/` of
  common presets, and the out-of-the-box named blocks (`tokens.*`,
  `tokensJs.*`, `tokensCss.*`, `tokensJson.*`).
- `src/pipeline/` — the fixed 6-stage execution order (select → sort →
  arrange → format → compose-entry → compose-block) every file definition
  goes through.
- `src/xref/` — cross-file reference resolution: dependency graph,
  topological generation order, cycle detection.
- `src/validate/` — the four diagnostic categories (syntax, semantic,
  runtime, warnings), each with its own module.
- `src/exec/` — `generate()` (pure) and `write()` (the only module that
  touches the filesystem).

See the plan document for the full design rationale behind every piece
above — this file is deliberately just the map, not the reasoning.

## Developing this package

```
cd fmt-lang
npm install
npm run build      # compiles fmt-lang/src (and the src/shared tree it
                    # depends on transitively) to fmt-lang/dist/
npm run typecheck  # tsc --noEmit, no build output
```
