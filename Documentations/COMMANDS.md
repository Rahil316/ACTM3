# Token Wand — Command Reference

All commands are run from the project root via `npm run <command>`.

---

## Build

| Command | What it does |
|---|---|
| `build` | Full dev build → `dist/`. Generates theme CSS, compiles presets (with dev presets), bundles UI via Vite, compiles plugin via esbuild. |
| `build:release` | Full release build → `dist-release/`. Same pipeline but: dev presets excluded (`raw/dev/` skipped), `__RELEASE__=true` strips dev overlay + console.logs, writes `manifest.json`. |
| `build:plugin` | Plugin only (`src/plugin/index.ts` → `dist/scripts.js`). Skips UI. |
| `build:plugin:release` | Plugin only → `dist-release/scripts.js` + `manifest.json`. Release flags apply. |
| `build:storybook` | Builds Storybook static site. |

---

## Dev

| Command | What it does |
|---|---|
| `dev` | Vite dev server on `localhost:3000` with HMR. Plugin code not watched — use `watch` in parallel for full live reload. |
| `watch` | Watches both plugin (`src/plugin/**`) and UI (`src/ui/**`), rebuilds to `dist/` on save. Run alongside Figma desktop for live development. |
| `watch:release` | Same as `watch` but outputs to `dist-release/` with release flags (dev overlay stripped, manifest updated on each rebuild). |

---

## QA

| Command | What it does |
|---|---|
| `test` | Run all unit tests once via Vitest. |
| `test:watch` | Run tests in watch mode — re-runs affected tests on save. |
| `typecheck` | TypeScript type-check only (`tsc --noEmit`). No emit. |
| `lint` | ESLint across the whole project. |
| `lint:fix` | ESLint with auto-fix. |
| `check` | Runs `typecheck` + `lint` + `test` in sequence. Use before committing. |

---

## Theme

| Command | What it does |
|---|---|
| `theme:gen` | Regenerates `src/ui/theme/generated.css` from the theme definition source. Run when theme tokens change. |

---

## Release & Packaging

| Command | What it does |
|---|---|
| `release` | Bumps version (minor), tags, and packages `dist-release/` into a distributable zip. |
| `release:patch` | Same as `release` but bumps patch version. |
| `release:flag` | Marks the current build as a flagged/beta release without bumping the version. |

---

## Storybook

| Command | What it does |
|---|---|
| `storybook` | Starts Storybook dev server on port 6006. |
| `build:storybook` | Builds Storybook as a static site. |

---

## Notes

- `build:release` and `watch:release` automatically exclude:
  - Dev presets from `src/ui/lib/presets/raw/dev/`
  - `CanvasPreviewDevOverlay` and `CanvasPreviewDevTree` (tree-shaken via `__RELEASE__`)
  - `Alt+Shift+P` dev shortcut
  - All `console.log` calls (plugin via esbuild `pure`, UI via Rollup plugin)
  - `debugger` statements

- To add new dev/test presets: drop a `.ts` file in `src/ui/lib/presets/raw/dev/`. No script edits needed — `build-presets.ts` picks up all files in that folder dynamically.

- `dist/` is the dev output (used with Figma desktop during development).  
  `dist-release/` is the release output (what gets zipped and shipped).
