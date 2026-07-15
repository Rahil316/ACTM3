# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Token Wand — a Figma plugin that generates color token systems (tonal scales + role/variation tokens) and writes them as Figma variables. React/TypeScript UI, esbuild-bundled Figma sandbox code, shared pure-function color engine.

## Commands

```
npm run build            # typecheck → lint → presets → vite (UI) → esbuild (sandbox) → dist/
npm run build:release     # same, release mode: no dev presets, strips console.log/dev overlay → dist-release/, writes manifest.json
npm run watch             # typecheck → lint → coordinated watcher for src/figma/** and src/ui/** → dist/ (one Figma reload per save)
npm run watch:release     # watch, targeting dist-release/
npm run dev                # Vite dev server on :3000 with HMR — UI only, standalone browser mode (no Figma sandbox)
npm run typecheck          # tsc --noEmit
npm run lint / lint:fix
npm run check              # typecheck + lint — run before committing
```

There is no test suite (`test`/`test:watch` are not wired up despite being mentioned in `Documentations/COMMANDS.md` — that doc is stale on this point).

To load the plugin in Figma: run `build` or `watch`, then import `manifest.json` via Figma Desktop → Plugins → Development → Import plugin from manifest.

## Architecture: two isolated threads

A Figma plugin has no shared memory between its two JS contexts — everything crosses via serialized `postMessage`.

- **UI thread** (`src/ui/`) — React app in an iframe, built by Vite → `dist/ui.html`. Owns all application state (Zustand stores), renders the interface, posts messages to the sandbox to trigger a sync/preview/export.
- **Figma sandbox thread** (`src/figma/`) — built by esbuild → `dist/scripts.js`. Entry point `src/figma/index.ts` is a message router (`figma.ui.onmessage`) over `msg.type`. Has Figma API access; the UI does not.
- **`src/shared/`** — pure, framework-agnostic color engine and export formatters used by both threads.

When running via `npm run dev`, there is no Figma sandbox — `src/ui/hooks/useFigmaBridge.ts` detects `window.parent === window` ("standalone mode") and mocks sandbox responses, persisting state to `localStorage` instead of `figma.clientStorage`/`figma.root.setPluginData`. Keep this mock in sync when adding new message types.

### The shared/ import boundary (enforced by ESLint)

UI code (`src/ui/**`, except `src/ui/types/**` and `src/ui/utils/**`) may **not** import from `src/shared/**` directly — see `eslint.config.mjs`. Import types via `src/ui/types/state.ts` or `src/ui/types/messages.ts` instead. This exists so the UI's type surface stays decoupled from the engine internals. The one sanctioned exception is the standalone-mode dynamic `import()` in `useFigmaBridge.ts`, which mimics what the sandbox does at runtime.

### Message protocol

- UI → sandbox: `parent.postMessage({ pluginMessage: { type, ... } }, "*")`, handled in the `switch` in `src/figma/index.ts`.
- Sandbox → UI: `figma.ui.postMessage({ type, ... })`, handled in the `switch` in `src/ui/hooks/useFigmaBridge.ts`'s `handleMessage`.
- Message shapes are typed in `src/ui/types/messages.ts` (`PluginToUiMessage` union, etc). Add new message types there first.

### Persistence

- `figma.root.setPluginData("tw_ui_state", ...)` — last auto-saved UI state (restored into the editor on next launch).
- `figma.root.setPluginData("tw_state", ...)` — last state that was actually synced to Figma variables; used as the rename-detection baseline.
- `figma.clientStorage` — UI window size/prefs (`uiPrefs`, `uiPrefsMeta`), not document-scoped.

## The color engine (`src/shared/clrEngine.ts`)

`variableMaker(config) → { scales, tokens, errors }` is pure and stateless — same input always produces the same output, no Figma calls. Two modes, selected by config, share the same output contract:

- **Scale mode**: `scaleMaker(hex, length, algo)` builds an N-step tonal scale per seed color. Roles/variations then map onto scale steps either by walking for the first step meeting a contrast target (`_mapByScaleContrast`, default) or by pinning to an explicit index (`_mapByIndex`).
- **Direct mode**: no tonal scale. `solveColorForContrast()` binary-searches OKLCH lightness per role/variation until it meets the target WCAG contrast against the theme background, per one of six chroma-shaping solver modes (`natural`, `constant-chroma`, `symmetric`, `max-chroma`, `gamut-cusp`, `apca-natural`).

Full pipeline detail, the alias-chain Figma writes (`_scale` collection → `color tokens` collection), the three-stage `VariableManager.sync()` write order, and the `_id`-based rename-safety system are documented in `Documentations/knowledge/how-it-works.md` — read it before touching `clrEngine.ts`, `figmaVars.ts`, or `variableTracker.ts`.

Color-space conversions live in `src/shared/colorMath/`: `oklch.ts` (used by Direct mode's solver) and `hct.ts`, which wraps the vendored Google Material `hct-vendor/` implementation (CAM16 + HCT solver, ported from the `material-color-utilities` reference source — treat `hct-vendor/*` as third-party and prefer changing `hct.ts`'s thin wrapper over editing it).

## Other repo-specific conventions

- **Rename safety**: every color/role/theme has a stable `_id` (`generateId()` in `src/ui/store/projectStore.ts`). Renames are tracked by `_id`, not array position or name, via `buildVariableRenameMap()` — don't reintroduce position-based diffing.
- **Presets**: authored as typed `.ts` files in `src/shared/presets/raw/*.ts`, compiled by `scripts/build-presets.ts` into the gitignored `src/shared/presets/presets.json`. Files under `raw/dev/` are picked up automatically and excluded from `--release` builds — no registration list to edit.
- **Dev-only code** gated by the `__RELEASE__` global (injected by `vite.config.ts`) is tree-shaken out of release builds; release builds also strip `console.log` (not `warn`/`error`) via a Rollup plugin.
- Project-specific design/domain knowledge (color role naming, contrast target conventions, algorithm selection guidance, feature status, outstanding todos) lives in `Documentations/knowledge/` — check `Documentations/knowledge/MEMORY.md` for the index before starting nontrivial feature or design work.
- **`test-data/`** — a standalone stress-test harness for the color engine (`scripts/generate-configs.ts`, `run-stress-test.ts`, `analyze-results.ts`, `build-report.ts`), separate from the plugin build; not covered by `npm run check` and excluded from ESLint.
- **`preset-data/`** — a sibling harness to `test-data/`, but for verifying real, hand-authored presets (`src/shared/presets/raw/**/*.ts`) instead of a synthetic seed/algorithm grid. Run `npx tsx preset-data/run.ts [preset-id ...]` (no args = every discovered preset) to run each preset's actual colors/roles/variations/`scopedColorIds`/`localBg` through `variableMaker()` and produce `preset-data/results/dashboard.html` — a self-contained, filterable dashboard (by preset/color/role/theme, plus adjusted-token and missed-target toggles), `anomaly-report.md`, and `anomalies.jsonl`. This is the only tool that catches preset-specific defects (e.g. a `localBg` chain demanding a target its fixed background can't reach — see the color-master skill's §8.1) rather than general algorithm/solver quality. Same exclusions as `test-data/`: not covered by `npm run check`, excluded from ESLint, results gitignored. `.want`-file import is a planned but not-yet-implemented extension point — no `.want` format exists anywhere in this codebase yet, so don't assume support for it.
