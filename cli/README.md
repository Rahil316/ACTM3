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
   in `outDir` is touched or deleted.

## Commands

### `token-wand build`

Reads `token-wand.config.json` (or the path given by `--config`), reads the
`.wand` file it points to, and writes every configured format to disk.

| Flag | Default | What it does |
|---|---|---|
| `--config <path>` | `token-wand.config.json` | Use a different config file. |
| `--dry-run` | off | Print what would be written without touching disk. Use this the first time you point the CLI at a new repo, to confirm `outDir` is correct before anything is overwritten. |

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
