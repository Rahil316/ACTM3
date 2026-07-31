# token-wand

Generate design token files (CSS, SCSS, Android, React Native, and more)
from a Token Wand `.wand` file — directly in your code repo, no Figma needed.

A `.wand` file is a project export from the [Token Wand Figma plugin](../).
A designer exports one and hands it to you; this CLI turns it into real
files in your codebase, and you can re-run it any time the `.wand` file
changes (e.g. after a re-export).

## Setup

1. Put a `.wand` file somewhere in your repo (e.g. `./design/project.wand`).
2. Create `wand.config.json` in your project root. Either build it up entirely
   from the command line (no hand-editing at all):

   ```
   npx token-wand wandFile ./design/project.wand
   npx token-wand add css --out ./src/styles/tokens
   npx token-wand add react-native --out ./mobile/src/tokens
   npx token-wand add android --out ./android/app/src/main/res
   ```

   or write it by hand — `npx token-wand init` seeds a starter, or:

   ```json
   {
     "wandFile": "./design/project.wand",
     "exports": [
       { "format": "css", "outDir": "./src/styles/tokens" },
       { "format": "react-native", "outDir": "./mobile/src/tokens" },
       { "format": "android", "outDir": "./android/app/src/main/res" }
     ]
   }
   ```

   `exports` is a flat list — add more than one entry for the same `format`
   if you need the same output in multiple places (e.g. `css` for both a web
   app and a docs site).

   `outDir` on an export is optional — an export that omits it falls back to
   the project-wide default (set with `npx token-wand outDir <path>`, or the
   top-level `"outDir"` field), and if that's unset too, to `wand-exports/`.

   Supported `format` values (either the full name or its short alias):
   `css`, `scss`, `tailwind` (`tw`), `dtcg`, `style-dictionary` (`sd`),
   `ios-swift` (`swift`), `android`, `react-native` (`rn`), and `script` — a
   plain `.ts`/`.js` file you write yourself, see `npx token-wand script-help`
   (or the "Commands" section below).

3. Run it:

   ```
   npx token-wand build
   ```

   This writes every configured format to its `outDir`, creating folders as
   needed. Existing files with the same name are overwritten; nothing else
   in `outDir` is touched or deleted. Output is reported per file as
   `created` (path didn't exist), `updated` (existed with different
   content), or `unchanged` (existed, identical content — not rewritten).

   The first real (non-`--dry-run`) build also adds a `fileNames` entry to
   `wand.config.json` for every file it generated, using today's
   default names — see "Renaming output files" below. This is the only way
   the CLI writes to its own config file; it never happens under `--dry-run`.

## Renaming output files

Every format produces more than one file (one per theme, plus scale/source
companions), so there's no single "output filename" to set — instead, each
export can carry a `fileNames` map keyed by that file's **role**:

```json
{
  "format": "css",
  "outDir": "./src/styles/tokens",
  "fileNames": {
    "scale": "_scale-vars.css",
    "light": "theme-light.css",
    "dark": "theme-dark.css"
  }
}
```

You don't need to write this by hand: the first build auto-populates it with
the default names (`scale.css`, `light.css`, `dark.css`, ...) so you can see
exactly which roles exist and rename whichever ones you want — edit the
values, leave the keys alone. If a later build introduces a new role (e.g. a
new theme was added upstream), the CLI appends just that one entry with a
default name and prints a `+ added fileNames[...]` notice; it never
overwrites an entry you've already set.

Values are filenames only (e.g. `"theme-light.css"`), not paths — `outDir`
still controls the directory. The one exception is Android: its
`res/{qualifier}/colors.xml` structure is fixed by platform convention, so
`fileNames` there renames the qualifier directory (the role), not
`colors.xml` itself.

Common roles by format:

| Format | Roles |
|---|---|
| `css`, `dtcg` | `scale` (if enabled), `source` (if enabled), plus one per theme name |
| `tailwind` | `config` (always), `scale` (if enabled), `source` (if enabled), plus one per theme name |
| `style-dictionary` | `global` (if `scale` or `source` would otherwise apply — holds both combined, not two separate roles), plus one per theme name |
| `scss` | `scale` (if enabled), `source` (if enabled), `tokens`, `index` |
| `ios-swift`, `android` | one per theme name — NO fixed roles at all |
| `react-native` | `index`, plus one per theme name |
| `script` | `output` for a single-file script, or each returned file's own basename for a multi-file script |

(A `script` export whose function returns MULTIPLE files sharing the same
basename skips `fileNames` handling entirely for that role — the script's
own returned `path` values are the real way to control those names.)

This table only gives you the *shape* — the actual file count for a given
export depends on your own `.wand` file (how many themes it declares,
whether `includeSourceColors` is on), so it can't be known from the config
alone. To see the REAL list before anything is written — every role, every
filename, for your actual `.wand` file — run:

```
npx token-wand build --dry-run --all
```

This prints exactly what `build` would write, one line per file, each
tagged with the role it maps to in `fileNames` — e.g.:

```
  unchanged  out/css/light.css (role: light)
  unchanged  out/css/dark.css (role: dark)
  unchanged  out/css/source.css (role: source)
```

— without touching disk. It's the authoritative way to answer "how many
files, named what, and which `fileNames` key controls each one" — more
reliable than counting themes yourself, especially once `includeSourceColors`
or a new theme changes the count. (Only formats that produce one file per
role show a `(role: ...)` tag — a multi-file `script` export with several
files sharing one role has no single role key to show, by design; see
"Renaming output files" above.)

## Commands

### `token-wand init`

Writes a starter `wand.config.json` in the current directory (or the path
given by `--config`) and refuses to overwrite an existing one. Edit
`wandFile` and `exports`, then run `token-wand build`.

### `token-wand add <format>`

Appends one export to `exports[]` — creates `wand.config.json` (with the
same placeholder `wandFile` `init` uses) if it doesn't exist yet, so this
can be your very first command instead of `init`.

```
npx token-wand add css                          # outDir falls back to the project default
npx token-wand add css --out ./src/tokens        # this export's own outDir
npx token-wand add script --script ./my-export.js
npx token-wand add script --script ./my-export.ts
```

| Flag | What it does |
|---|---|
| `--out <dir>` | This export's own `outDir`. Omit it to use the project-wide default (see `outDir` below). |
| `--script <file>` | Required when `<format>` is `script` — path to your export function file. Scaffolded automatically (same as `script-init`, including its `.ts`/`.js` extension-based style — see below) if the file doesn't exist yet. |

**The new export comes with `fileNames` pre-filled**, so you never have to
guess a role key before your first build:

- For a **built-in format**, every FIXED role (theme-independent — `scale`,
  `source`, `tokens`, `index`, `config`, `global`, depending on the format)
  gets a placeholder filename immediately, e.g.:

  ```json
  { "format": "scss", "outDir": "./out/scss", "fileNames": { "source": "_source.scss", "scale": "_scale.scss", "tokens": "_tokens.scss", "index": "_index.scss" } }
  ```

  Theme-named roles (one file per theme) can't be pre-filled this way — a
  theme's real name only exists once a `.wand` file is loaded — so those are
  still added by your first `build`, same as always (see "Renaming output
  files" above). `ios-swift` and `android` produce ONLY theme-named files, so
  `add` leaves their `fileNames` empty until then.

  `scale`/`source`/`global` are also only a GUESS at this point — they're
  only actually produced when your `.wand` file has a tonal scale and/or
  `includeSourceColors` turned on (also unknowable before a `.wand` file is
  loaded). An entry for a role your project doesn't actually produce is
  harmless — `build` only ever looks up a role it actually generated, so an
  unused `fileNames` key just sits there inert — but don't take every
  pre-filled key as a promise that file will exist.

- For **`script`**, if `--script` points at a file that **already exists**
  and it exports a `meta` object (see below), `add` copies its
  `outDir`/`fileNames` straight into the new export — the script's own
  declared shape, not a generic guess. If `--script` points at a file that
  DOESN'T exist yet, `add` scaffolds it (same as `script-init`) instead of
  reading `meta` from that brand-new file — the starter's own placeholder
  `meta` isn't your intent, so applying it and calling it "yours" would be
  actively misleading. Run `add` a second time (or `build`, which doesn't
  care either way) once you've written your own `meta`, and it'll pick it up.

#### A script prescribing its own config: `meta`

A script file can export metadata alongside its default function:

```js
module.exports = function (ctx) { /* ... */ };

module.exports.meta = {
  outDir: "./src/styles/tokens",       // this export's default outDir
  fileNames: { output: "tokens.css" }, // this export's default fileNames
};
```

(or `export const meta = {...}` if you compile from TS/ESM — same
dual-convention support as the default export itself.)

`npx token-wand add script --script <file>` reads this — from an EXISTING
file only, see above — and applies it to the new export automatically. So
someone adding an already-written `cyx.js` to their config with

```
npx token-wand add script --script ./cyx.js
```

gets exactly the `outDir`/`fileNames` `cyx.js` declares, with no manual
follow-up edit. An explicit `--out <dir>` still wins over `meta.outDir`;
`meta` is otherwise the only source for these fields until you edit them by
hand. Both fields are optional, and a script with no `meta` export at all
(the common case) behaves exactly as before. `script-init` scaffolds a
starter file (in either the `.ts` or `.js` style, matching the extension you
give it) that already demonstrates `meta` — see below.

### `token-wand outDir <path>`

Sets the project-wide default `outDir` — used by any export that doesn't
set its own. Creates the config if it doesn't exist yet. Without this (and
without a per-export `outDir`), output goes to `wand-exports/`.

```
npx token-wand outDir ./generated/tokens
```

### `token-wand wandFile <path>`

Sets the `wandFile` field. Same create-if-missing behavior as `outDir`.

```
npx token-wand wandFile ./design/project.wand
```

### `token-wand list`

Prints every configured export — format, effective `outDir` (resolved the
same way a real build would), `scriptFile`, and any `fileNames` overrides —
without opening the file.

```
npx token-wand list
```

### `token-wand script-help`

Prints the `"script"` format's API reference — exactly what your export
function's `ctx` parameter contains (`tokens`, `scaleSteps`, `sourceColors`,
`config`), the two accepted return shapes, and a couple of worked examples.
Read this before writing a `script` export.

```
npx token-wand script-help
```

### `token-wand script-init <file>`

Writes a starter `"script"` format file at `<file>` (refuses to overwrite an
existing file) — a minimal, working script plus a starter `meta` export (see
"A script prescribing its own config" above) you can edit instead of writing
one from scratch. `add script --script <file>` runs this automatically when
`<file>` doesn't exist yet, so you rarely need to call it directly unless
you want the file without also registering it in `exports[]`.

The scaffold's content depends on `<file>`'s own extension — `.ts` gets real
`import type`/`export default`/`export const meta`; anything else
(`.js` included) gets the CommonJS + JSDoc form:

```
npx token-wand script-init ./tokens.script.js   # CommonJS + JSDoc
npx token-wand script-init ./tokens.script.ts   # import type / export default
```

#### Type-checked authoring

This package publishes real types for both `ctx` and `meta` under
`@rahil316/token-wand/script` — you get autocomplete and real type errors,
in either a `.ts` file or a plain `.js` file:

```ts
// TypeScript
import type { ScriptExportContext, ScriptMeta } from "@rahil316/token-wand/script";
export default function (ctx: ScriptExportContext): string { /* ... */ }
export const meta: ScriptMeta = { fileNames: { output: "tokens.css" } };
```

```js
// Plain JavaScript — a JSDoc annotation, no build step needed; your
// editor's TS language server still checks it
/** @param {import("@rahil316/token-wand/script").ScriptExportContext} ctx */
module.exports = function (ctx) { /* ... */ };
/** @type {import("@rahil316/token-wand/script").ScriptMeta} */
module.exports.meta = { fileNames: { output: "tokens.css" } };
```

Either form needs `"moduleResolution": "node16" | "nodenext" | "bundler"`
in your own `tsconfig.json` (or your editor's default) for the
`@rahil316/token-wand/script` subpath to resolve — the older `"node"`
resolver predates `package.json` `"exports"` support and can't see it.

### `token-wand build`

Reads `wand.config.json` (or the path given by `--config`, or the
`"token-wand": { "config": "..." }` field in your own `package.json`),
reads the `.wand` file it points to, and writes every configured format to
disk.

| Flag | Default | What it does |
|---|---|---|
| `--config <path>` | `wand.config.json` | Use a different config file. |
| `--dry-run` | off | Print what would be written without touching disk. Use this the first time you point the CLI at a new repo, to confirm `outDir` is correct before anything is overwritten. |
| `--all` | off | Build every configured export, skipping the picker below — for CI/scripting. |
| `--exports <list>` | — | Build only these exports by index (e.g. `--exports 0,2`) — the same 0-based numbers `list` prints. Skips the picker. |
| `-h`, `--help` | off | Print usage and exit. |

**Selecting which exports to build.** With a single export configured,
`build` just builds it — nothing to choose between. With 2+ exports and
neither `--all` nor `--exports` given, `build` shows an interactive
checkbox picker instead of building everything automatically:

```
Which exports do you want to build? (↑/↓ move, Space toggle, a = toggle all, Enter confirm, Esc cancel)

  > [ ] All
    [ ] [0] format=css, outDir="./src/styles/tokens"
    [ ] [1] format=react-native, outDir="./mobile/src/tokens"
    [ ] [2] format=android, outDir="./android/app/src/main/res"
```

Arrow keys move the highlight, Space toggles the highlighted row (or every
row, if "All" is highlighted), `a` toggles everything at once, Enter builds
whatever's checked (an Enter with nothing checked builds everything, same
as checking "All"), Esc/Ctrl+C cancels without building anything. Row
numbers match `list`'s own indices exactly, so `--exports 0,2` and checking
rows `[0]`/`[2]` in the picker always mean the same two exports.

A non-interactive terminal (piped input, most CI runners) can't support
this picker at all — `build` detects that and falls back to building
everything, same as `--all`, printing a note so it's clear that happened.

### Naming warnings

Before writing anything, the CLI checks the `.wand` file's resolved token
names for problems and prints a `⚠` line for each one it finds:

- Two different tokens resolve to the identical output name (usually because
  `tokenNameSegments` omits a segment, or two colors/roles/variations share a
  shorthand) — whichever format keys tokens by name (DTCG, Style Dictionary,
  React Native, Android, Swift) will silently let one overwrite the other.
- A role has an explicitly empty variation list.
- A theme resolved zero tokens.

These are warnings, not errors — the build still runs and writes files. If
you see one, it usually means the `.wand` file's Token Name Format setting
(or a preset's role/color scoping) needs adjusting in the Figma plugin so
every token gets a unique name.

## How this works

This CLI is a thin wrapper around the same color engine and export
formatters the Figma plugin itself uses (`src/shared/engine`,
`src/shared/exportEng`, `src/figma/config.ts`) — it does not reimplement any
color math or file formatting. Given the same `.wand` file and the same
formats, the CLI's output is byte-for-byte identical to what the plugin's
own Export sheet produces.

There's no separate published package for that shared code (`@token-wand/core`
or similar) — this CLI imports it directly from the main repo by relative
path, which is why this folder lives inside the plugin's repo rather than in
one of its own.

## Not implemented (yet)

- `--watch` — re-run automatically when the `.wand` file changes.
- CSV/JSON export formats (these need extra plugin-side glue not yet ported
  here — use the Figma plugin's Export sheet for those two formats today).
- A `.wand` schema/version field — right now the plugin is the only producer
  and this CLI is the only consumer of `.wand` files, so a mismatch between
  plugin version and CLI version isn't checked for. Keep both reasonably in
  sync for now.

## Developing this package

```
cd cli
npm install       # installs this package's own dependencies
npm run build     # compiles cli/src (and the plugin's src/shared, src/figma/config.ts
                   # it depends on) to cli/dist/
npm run typecheck # tsc --noEmit, no build output
```

The compiled entry point ends up at `dist/cli/src/cli.js` (not `dist/cli.js`)
because this package's `tsconfig.json` compiles its own `src/` together with
the plugin's `../src/shared` and `../src/figma/config.ts` from one shared
root — `bin/token-wand.js` already points at the right path, this is just
worth knowing if you're poking around inside `dist/`.
