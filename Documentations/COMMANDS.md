# Token Wand — Command Reference

All commands are run from the project root via `npm run <command>`.

---

## Build

| Command | What it does |
|---|---|
| `build` | typecheck → lint → theme CSS → presets (with dev presets) → UI bundle via Vite → figma bundle via esbuild → `dist/` |
| `build:release` | Same pipeline, release mode: dev presets excluded, `__RELEASE__=true` strips dev overlay + console.logs, writes `manifest.json` → `dist-release/` |
| `build:storybook` | Builds Storybook as a static site |

---

## Dev

| Command | What it does |
|---|---|
| `dev` | Vite dev server on `localhost:3000` with HMR. Figma sandbox code not watched — use `watch` for full live reload. |
| `watch` | typecheck → lint → then watches both `src/figma/**` and `src/ui/**`, rebuilds to `dist/` on save |
| `watch:release` | Same as `watch` but targets `dist-release/` with release flags — manifest updated on each rebuild |

---

## Theme

| Command | What it does |
|---|---|
| `theme:gen` | Regenerates `src/ui/theme/theme.generated.css` from `src/ui/theme/tokens.ts`. Use during `dev` sessions when only token values changed. |

---

## QA

| Command | What it does |
|---|---|
| `test` | Run all tests once via Vitest (unit + component projects) |
| `test:watch` | Run tests in watch mode — re-runs affected tests on save |
| `typecheck` | `tsc --noEmit` only — no output files written |
| `lint` | ESLint across the whole project |
| `lint:fix` | ESLint with auto-fix |
| `check` | `typecheck` + `lint` + `test` in sequence — run before committing |

---

## Storybook

| Command | What it does |
|---|---|
| `storybook` | Storybook dev server on port 6006 |
| `build:storybook` | Build static Storybook |

---

## Build outputs

| Command | Output dir | manifest.json | Dev presets | console.log |
|---|---|---|---|---|
| `build` | `dist/` | no | included | kept |
| `build:release` | `dist-release/` | yes | excluded | stripped |

---

## Script files

| File | Used by |
|---|---|
| `scripts/plugin.js` | `build`, `build:release`, `watch`, `watch:release` — bundles `src/figma/index.ts` via esbuild |
| `scripts/watch-ui.js` | `watch`, `watch:release` — spawns `vite build --watch` |
| `scripts/build-presets.ts` | `build`, `build:release`, `theme:gen` — compiles preset TS files → `src/ui/presets/presets.json` |
| `scripts/generateThemeCss.ts` | `build`, `build:release`, `theme:gen` — writes `src/ui/theme/theme.generated.css` from `tokens.ts` |
