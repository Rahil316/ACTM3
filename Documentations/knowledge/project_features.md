---
name: Feature registry
description: Full inventory of plugin features — implemented, needs work, and not yet started
type: project
---

Last updated: 2026-05-22

---

## ✅ Implemented — fully working

### Core engine

- Tonal scale generation — 8 algorithms (Natural, Uniform, Expressive, Symmetric, OKLCH, Material, Linear, Fidelity)
- Direct mode — solves role colors directly to target WCAG contrast ratios via OKLCH binary-search solver (5 modes: natural, constant-chroma, symmetric, hue-locked, max-chroma)
- WCAG contrast calculation (hex↔RGB↔HSL↔OKLCH↔HCT)
- Multi-theme output — light and dark modes with configurable background colors
- Semantic role mapping — roles mapped to tonal steps by contrast or by index
- Variation levels — shared global variation list (name + shorthand) per slot
- Per-role variation override — `customVariationList: true` on a role substitutes `customVariations[]` for the global list
- `scaleStepNames` — list of `{name, shorthand}` entries; `src/figma/config.ts` parses and passes to engine for step naming
- `alphaValues` CSV — parsed to int array; `src/figma/figmaVars.ts` uses for alpha tint generation
- Algorithm scoping — `useUniformAlgorithm` (one algo for all colors) + `algorithmScopeLevel` (`"color"` / `"role"`) — both are wired through `src/figma/config.ts` and read by `src/shared/clrEngine.ts`

### Figma variable output

- Palette collection (`_scale`) — full tonal ramp per color as Figma variables
- `includeColorScalesCollection` toggle — gates whether `_scale` collection is written; wired in `src/figma/config.ts` and checked in `src/figma/figmaVars.ts` ✅ verified
- Token collection — contextual role variables referencing palette steps (aliases) or embedded hex
- `resolveTokensDirectly` — writes hex values instead of Figma aliases; suppresses `_scale` creation
- Source colors collection (`_constants`) — raw brand hex values, no theme processing; enabled by `includeSourceColors`
- Alpha tint variables under `colorName/Opacities/` — enabled by `includeAlphaTints`
- Variable descriptions — contrast metadata written into Figma variable descriptions; enabled by `includeDescriptions`
- Stable `_id` rename detection — reorder/rename colors or roles without duplicate variable creation
- `savedState` snapshot — detects renames correctly within a session

### Exports

- CSS custom properties export
- SCSS variable maps + mixin export
- CSV audit sheet
- JSON config export (full reimportable state)
- JSON import — restores full plugin state from exported file

### UI

- `el()` DOM factory — all UI built without innerHTML
- `inputsUI` primitives: `input`, `colorInput`, `toggle`, `row`, `sectionLabel`, `iconButton`, `actionButton`, `btn()` (all variants)
- `Components` card system: `ColorGroupCard`, `RoleGroupCard`
- Drag-to-reorder on color and role cards
- `debounce` + `withPreservedFocus` — no focus loss on re-render
- In-place color sync on hex/picker input — no re-render on color value change
- `BannerManager` — toast + expandable detail banners (defined in `notifications.js`)
- `ToastManager` — lightweight stacking toast system (defined in `notifications.js`)
- Preview panel (`preview.js`) — live token preview before syncing to Figma; "Solved Colors" label in Direct mode
- Run dialog — shows existing collections, rename summary before sync
- Full-screen settings panel with 3 tabs: **Tokens**, **Labels**, and **Plugin**
- Settings Cancel/Done — snapshot taken on open; Cancel reverts and clears the snapshot, Done clears the snapshot and force-saves; autosave is paused entirely while the snapshot is active, so closing the plugin mid-edit (without Cancel/Done) discards changes same as Cancel
- UI Scale + Theme preference (persisted in Figma clientStorage)
- Figma theme detection (MutationObserver on html/body + matchMedia)
- Config persistence in `figma.root.setPluginData("tw_state")`
- One-time migration from old STRING variable storage to setPluginData

### Role card controls

- Role name + shorthand (always visible)
- Mapping method: Contrast (walk scale for first step meeting WCAG target) or Index (pin to explicit step)
- Per-role variation override — `customVariationList: true` substitutes `customVariations[]` for the global list
- `solverMode` per color — "natural" | "constant-chroma" | "symmetric" | "hue-locked" | "max-chroma" (shown when `useUniformAlgorithm: false`)
- Per-color `scaleAlgorithm` — shown when `useUniformAlgorithm: false` and `pluginMode === "scale"`

### Build

- `npm run build` — typecheck + lint + theme CSS + presets + Vite UI bundle + esbuild figma bundle → `dist/scripts.js` + `dist/ui.html`
- `npm run build:release` — same, release mode: dev presets excluded, console.logs stripped, manifest written → `dist-release/`
- Tailwind CSS inlined at build — no CDN dependency at runtime

---

## 🔧 Implemented but needs verification / polish

- **Alpha tints in preview** — `includeAlphaTints` flag works in Figma output; `preview.js` does not show alpha tokens visually
- **Role variation override end-to-end** — `customVariationList` + `customVariations` exist in state and UI; full manual test across both plugin modes not completed
- **Rename detection for per-role variations** — `buildVariableRenameMap` handles shared variations only; per-role custom variation renames silently create new variables instead of renaming (documented as a known limitation)
- **`preview.js` rendering** — some innerHTML string concatenation remains; inconsistent with `el()`-based codebase
- **Input validation feedback** — errors shown in full overlay; no inline feedback per field

---

## ⚠️ UI state with no engine effect

| Field            | Notes                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| (none confirmed) | All previously suspected dead keys are now verified wired. No confirmed dead toggles as of 2026-05-22. |

---

## 🚧 Designed but not yet implemented

- **Project Name field** — `projectStore.name` is read in `translateConfig`; verify it drives export filenames and success messages end-to-end
- **Saved States** — versioned snapshots with timestamp, View / Restore / Delete. Placeholder visible in UI, non-functional
- **Role Labels CSV** — bulk-rename all variation levels via comma-separated string (seen in settings PDF mockup; not in current UI)
- **Language selector** — UI placeholder only, no i18n infrastructure
- **Beta Features section** — enrollment toggle + placeholder feature flags
- **About Token Wand section** — feedback link + learn more link
- **`tokenGrouping` UI control** — `projectStore.tokenGrouping` (`"color"` / `"role"`) is wired in engine but no settings UI control renders it

---

## ❌ Not started — future roadmap

- **Pro mode** — concept exists (`ProModeBeta` branch); feature set undefined, no implementation
- **Saved States backend** — requires new `figma.root.setPluginData` key + UI
- **Undo/redo** — noted gap, no plans
- **Inline validation feedback** — per-field error display instead of full overlay
- **Token preview for alpha tints** — preview panel alpha section
- **Design Lab** — `betaLab.js` exists with `LAB_ENABLED = false`; button in more-sheet shows alert placeholder
