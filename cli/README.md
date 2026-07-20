# token-wand

Generate design token files (CSS, SCSS, Android, React Native, and more)
from a Token Wand `.wand` file — directly in your code repo, no Figma needed.

A `.wand` file is a project export from the [Token Wand Figma plugin](../).
A designer exports one and hands it to you; this CLI turns it into real
files in your codebase, and you can re-run it any time the `.wand` file
changes (e.g. after a re-export).

## Setup

1. Put a `.wand` file somewhere in your repo (e.g. `./design/project.wand`).
2. Create `token-wand.config.json` in your project root:

   ```json
   {
     "wandFile": "./design/project.wand",
     "targets": [
       { "format": "css", "outDir": "./src/styles/tokens" },
       { "format": "rn-ts", "outDir": "./mobile/src/tokens" },
       { "format": "android", "outDir": "./android/app/src/main/res" }
     ]
   }
   ```

   `targets` is a flat list — add more than one entry for the same `format`
   if you need the same output in multiple places (e.g. `css` for both a web
   app and a docs site).

   Supported `format` values: `css`, `scss`, `tailwind`, `dtcg`,
   `style-dictionary`, `ios-swift`, `android`, `rn-ts`.

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
   `token-wand.config.json` for every file it generated, using today's
   default names — see "Renaming output files" below. This is the only way
   the CLI writes to its own config file; it never happens under `--dry-run`.

## Renaming output files

Every format produces more than one file (one per theme, plus scale/source
companions), so there's no single "output filename" to set — instead, each
target can carry a `fileNames` map keyed by that file's **role**:

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
| `css`, `tailwind`, `dtcg`, `style-dictionary` | `scale`, `source` (if enabled), plus one per theme name |
| `scss` | `scale`, `source` (if enabled), `tokens`, `index` |
| `ios-swift`, `android` | one per theme name |
| `rn-ts` | `index`, plus one per theme name |

(`tailwind` also has a `config` role for `tailwind.config.js`, which has no
sensible per-theme alternative and is rarely worth renaming.)

## Commands

### `token-wand build`

Reads `token-wand.config.json` (or the path given by `--config`), reads the
`.wand` file it points to, and writes every configured format to disk.

| Flag | Default | What it does |
|---|---|---|
| `--config <path>` | `token-wand.config.json` | Use a different config file. |
| `--dry-run` | off | Print what would be written without touching disk. Use this the first time you point the CLI at a new repo, to confirm `outDir` is correct before anything is overwritten. |
| `-h`, `--help` | off | Print usage and exit. |

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
one of its own. See the plan doc from when this was built for the reasoning,
if you're curious why it's set up this way.

## Not implemented (yet)

- `token-wand init` — scaffolding a starter config interactively.
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
