# Token Wand — Command Reference

All commands are run from the project root via `npm run <command>`.

---

## Build

| Command | What it does |
|---|---|
| `build` | typecheck → lint → theme CSS → presets (with dev presets) → UI bundle via Vite → figma bundle via esbuild → `dist/` |
| `build:release` | Same pipeline, release mode: dev presets excluded, `__RELEASE__=true` strips dev overlay + console.logs, writes `manifest.json` → `dist-release/` |

---

## Dev

| Command | What it does |
|---|---|
| `dev` | Vite dev server on `localhost:3000` with HMR. Figma sandbox code not watched — use `watch` for full live reload. |
| `watch` | typecheck → lint → then watches both `src/figma/**` and `src/ui/**` in a single coordinated process; both must finish before Figma reloads — one reload per save → `dist/` |
| `watch:release` | Same as `watch` but targets `dist-release/` with release flags — manifest updated on each rebuild |

---

## Theme

| Command | What it does |
|---|---|
| `theme:gen` | No-op (prints a message). Theme 2.0 uses hand-authored CSS files in `src/ui/theme/theme2.0/` — no generation step needed. |

---

## QA

| Command | What it does |
|---|---|
| `typecheck` | `tsc --noEmit` only — no output files written |
| `lint` | ESLint across the whole project |
| `lint:fix` | ESLint with auto-fix |
| `check` | `typecheck` + `lint` in sequence — run before committing |

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
| `scripts/plugin.js` | `build`, `build:release` — one-shot esbuild bundle of `src/figma/index.ts` |
| `scripts/watch.js` | `watch`, `watch:release` — unified watcher: coordinates esbuild + vite so Figma reloads once per save |
| `scripts/build-presets.ts` | `build`, `build:release` — compiles preset TS files → `src/shared/presets/presets.json` |
| ~~`scripts/generate-theme-css.ts`~~ | Deleted. Theme 2.0 uses static CSS files; no generation script. |
