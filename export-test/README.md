# export-test

Standalone harness that generates every export format (CSS, SCSS, Tailwind,
DTCG, Style Dictionary, iOS Swift, Android, React Native, CSV, JSON, .wand)
against a curated set of `ProjectStore` configuration permutations — Scale vs
Direct mode, scale-collection on/off, source colors + alpha tints, shorthand
naming, token-segment ordering, description inclusion, single vs multi-theme,
non-standard theme names.

Not covered by `npm run check`/`build` and excluded from ESLint, same as
`test-data/` and `preset-data/` — see CLAUDE.md.

## Run

```
npx tsx export-test/run.ts                    # every fixture, all formats
npx tsx export-test/run.ts scale-basic         # just one fixture
npx tsx export-test/run.ts direct-basic direct-with-source
```

Output goes to `export-test/results/<fixture-id>/<format>/...` (mirrors the
real file layout `buildExportBundle` produces), plus a `results/summary.json`
with per-fixture file counts and any critical engine errors.

## What it actually exercises

Each fixture is small on purpose (2 colors × 2 roles × 2 variations × ≤2
themes) — enough depth to hit every formatter code path without hundreds of
tokens cluttering the diff. See `scripts/fixtures.ts` for the full list and
what each one is specifically checking, e.g.:

- `scale-no-scale-collection` / `direct-basic` — confirms `includeColorScalesCollection`
  and Direct mode actually suppress scale files in every format (this was a
  real bug: `bundler.ts` used to infer scale presence purely from engine
  output, so the setting had no effect on exports even though it worked for
  Figma sync).
- `source-and-alpha` / `source-no-alpha` / `direct-with-source` — the source-color
  and alpha-tint export sections (previously missing from every formatter).
- `shorthand-everything` — all `useShorthand*` flags + a non-default
  `tokenNameSegments` order, together.
- `single-theme` / `non-standard-theme-name` — Android's resource-qualifier
  logic (`values`/`values-night` vs. a commented custom-qualifier fallback).

## How it's wired

`scripts/run-export-test.ts` reimplements the two small private helpers from
`src/figma/index.ts` (`toExportConfig`, `applyExportOverrides`) locally, since
`index.ts` is Figma-sandbox code (references the `figma` global) and can't be
imported into a plain Node/tsx script. If those two functions change shape in
`index.ts`, update the copies here to match — that's the whole point of this
harness: catching drift between what Figma sync would produce and what
exports actually produce.
