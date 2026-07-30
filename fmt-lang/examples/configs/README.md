# fmt-lang example templates

Five real, working fmt-lang documents, each demonstrating a genuinely
different capability, run against the checked-in `nmobile.wand` fixture
(a real Token Wand project — Direct mode, themes `dark`/`light`).

Try them:

```
cd fmt-lang/examples/configs
node ../../../cli/dist/cli/src/cli.js build --config wand.config.json --dry-run   # preview
node ../../../cli/dist/cli/src/cli.js build --config wand.config.json            # write to ./out/
```

(Requires `cli/` to be built first — `cd cli && npm run build`.)

## `templates/easy-css.fmtlang.json5` — the easy path

Zero `defs` needed. Every token, pre-formatted via the `tokensCss` block,
wrapped in a hand-written `:root { }` + `@media (prefers-color-scheme:
dark)` structure — the shape a real hand-written CSS tokens file takes.

Also demonstrates that `"format"` is optional on a target: this one has no
`format` key at all — just `customFile`. `format: "custom"` is inferred
automatically whenever `custom`/`customFile` is present and `format` is
omitted. A target using a stock format (`css`, `scss`, etc.) still needs
`format` set explicitly — the inference only ever fires for the two fields
that are only meaningful for a fmt-lang target in the first place.

## `templates/expert-js.fmtlang.json5` — the expert path

A camelCase JS object literal: `select` (light theme only), `sort`
(alphabetical by color), `arrange` (nested, grouped by color, with a
`// ColorName` comment header per group), custom `naming`, and the
`jsObjectProperty` entry preset — every stage of the 6-stage pipeline set
explicitly.

## `templates/multi-file.fmtlang.json5` — multi-file + cross-file references

`repeatFor` produces one CSS file per theme automatically; a second, plain
entry aggregates them into an `index.css` that `@import`s each theme file's
*real, resolved* path via `{{files.theme-file.each}}`. Also demonstrates
`defs.static` (a shared "do not edit" header, attached via `before`).

## `templates/report.fmtlang.json5` — a non-token output

A plain-language Markdown palette report — sorted by contrast ratio,
descending, using the `markdownTableRow` preset. Proves the engine has no
hidden assumption that output must look like a token/config file.

## `templates/android.fmtlang.json5` — conditional file-path routing

Reproduces Android's real resource-qualifier directory convention (the
first declared theme gets the default `values/` directory with no suffix,
`"dark"` gets `values-night`, anything else gets `values-<name>`) entirely
via a `path` expression — `${theme == 'dark' ? 'values-night' : (themeIndex
== 0 ? 'values' : 'values-' + theme)}` — proving `path` supports the same
full expression language as `content`/`before`/`after`, not just a literal
`${theme}` substitution.
