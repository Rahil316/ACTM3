# Tech Stack Recommendation — Token Wand React Migration

## Context constraints

Token Wand runs as a **Figma plugin UI** — a sandboxed `<iframe>` Figma controls.
That means:

- No server. No routing between pages. One single HTML file, inlined at build.
- No CDN at runtime — everything must be bundled/inlined.
- Two JS execution contexts: **UI thread** (this iframe, React lives here) and **Plugin thread** (`main.js`, stays vanilla — Figma's sandbox has no DOM).
- Bundle size matters. Figma imposes a 10 MB hard limit on plugin packages. Heavy deps show lag on plugin open.
- `figma.clientStorage` and `figma.root.setPluginData` are the only persistence APIs — no IndexedDB, no localStorage in production Figma.

---

## Recommended Stack

### Core UI — React 18 (no framework)

**Why not Next.js / Remix / Vite React app?**
Those are page-router or SSR frameworks. Token Wand has exactly one "page" rendered into one `<iframe>`. There is no routing between URLs, no server, no hydration story. A framework adds 40–100 KB of overhead solving problems that don't exist here.

**What to use instead:**

| Layer | Choice | Reason |
|-------|--------|--------|
| UI runtime | **React 18** | Declarative component model solves the manual `renderColorGroups()` / `renderRoles()` re-render problem directly |
| Build tool | **Vite** (plugin-figma template) | Fast HMR, produces a single inlined HTML+JS bundle, has a maintained `vite-plugin-singlefile` for Figma output |
| State | **Zustand** | ~3 KB, no boilerplate, supports direct mutation style familiar from current `appState`, easy snapshot/restore for Settings cancel |
| Styling | **Tailwind CSS v4** | Already in use; keep it — just switch to Vite's Tailwind integration |
| Drag-and-drop | **@dnd-kit/core** | ~15 KB, accessible, no DOM dependency, designed for lists — replaces current `bindDragDrop()` |
| i18n | **i18next + react-i18next** | Small, supports JSON files already in `src/ui/lang/`, finally wires the language selector |
| TypeScript | **Yes — JSDoc-typed JS first, then migrate** | The color engine and store are already well-named; add TS incrementally rather than converting everything at once |

### What stays vanilla (no React)

| File | Stays as-is | Reason |
|------|-------------|--------|
| `src/figma/main.js` | Yes | Figma plugin thread — no DOM, cannot use React |
| `src/figma/figmaVars.js` | Yes | Pure Figma API calls |
| `src/color/clrEngine.js` | Yes | Pure stateless functions — zero reason to change |
| `src/color/clrUtils.js` | Yes | Same |
| `src/shared/config.js` | Yes | Pure transformer |
| `src/shared/exportEng/` | Yes | Pure formatters |

The color engine is the most valuable code in the repo. **It does not change.**

---

## Bundle size budget

| Item | Approx gzipped |
|------|---------------|
| React 18 + ReactDOM | ~45 KB |
| Zustand | ~3 KB |
| @dnd-kit/core + sortable | ~15 KB |
| i18next + react-i18next | ~12 KB |
| Tailwind (purged) | ~8 KB |
| Your app code | ~80–120 KB |
| **Total estimate** | **~180 KB** |

Current vanilla bundle is ~150 KB. The React version will be ~30 KB larger — comfortably inside Figma's limit.

---

## Why NOT alternatives

| Option | Rejected because |
|--------|-----------------|
| Vue 3 | No advantage over React here; would require relearning without ecosystem benefit for this use case |
| Svelte / SvelteKit | Compiler output is smaller but Svelte's reactivity model is less transferable to the existing mutation-heavy store pattern |
| Redux / MobX | Zustand is sufficient; Redux adds boilerplate for no gain at this app size |
| React Context for global state | Context re-renders whole subtrees on any state change — wrong for a plugin where a hex input changes on every keystroke |
| Preact | Saves ~40 KB but loses React DevTools and ecosystem compatibility; not worth it at this bundle size |

---

## Vite + Figma plugin setup

Use the community-maintained template:

```
npm create vite@latest token-wand-react -- --template react
npm install vite-plugin-singlefile
```

`vite.config.js` key settings:
```js
import { viteSingleFile } from 'vite-plugin-singlefile'

export default {
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'es2017',       // Figma's minimum supported JS level
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  }
}
```

Output: single `dist/ui.html` with all JS/CSS inlined — identical to what `build.js` produces today.
