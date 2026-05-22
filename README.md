# Token Wand — The magic wand for Figma design tokens.

A Figma plugin that generates multi-theme design token systems from brand colors and semantic role definitions.

---

## What it does

- **Scale mode** — generates a full tonal scale per color (7 algorithms, configurable step count), then maps semantic roles onto scale steps by WCAG contrast target or explicit step index
- **Direct mode** — solves role colors directly to target contrast ratios without an intermediate scale; 5 solver modes (natural, saturated, luminance, hue-locked, chroma-maximized)
- **Multi-theme** — unlimited themes, each with a configurable background color
- **Rename-safe sync** — stable `_id` tracking means reordering or renaming colors/roles updates existing Figma variables in place
- **Presets** — 9 built-in design system presets: TW Regular, TW Pro, TW Funk, Apple HIG, IBM Carbon, Material Design 3, Shopify Polaris, Tailwind CSS, Radix UI
- **Exports** — Figma variables, CSS custom properties, SCSS (maps + mixin), CSV audit sheet, JSON

---

## Quick start

```bash
npm install
npm run build      # produces dist/scripts.js + dist/ui.html
npm run watch      # rebuilds on file change
```

Load in Figma Desktop → Plugins → Development → Import plugin from manifest → select `manifest.json`.

> `dist/` is generated — never edit it directly.

---

## Releasing

```bash
npm run release -- v3.1          # build → package → prompt for release note
npm run release:patch -- v3.1    # re-package existing version → prompt for patch note
npm run release:flag -- v3.1     # build → package → note → git annotated tag
```

Each command produces `release/<version>/` with `manifest.json`, `scripts.js`, and `ui.html` — everything needed to submit to Figma. A running changelog is maintained at `release/changelog.md`.

- **release** — builds fresh from source, asks before overwriting an existing version slot.
- **release:patch** — requires the version slot to already exist; silently overwrites it, prompts for a patch note.
- **release:flag** — same as `release`, then creates a git annotated tag so the exact code state is permanently reachable. Run `git push origin <version>` afterwards to publish the tag.

> `release/` is gitignored — only the tag and changelog entry survive in version control.

---

## Testing

`src/tests.js` runs automatically on plugin load when `TESTS_ENABLED = true`. Output appears in Figma's DevTools console (Plugins → Development → Open Console).

Covers: color math (`clrUtils`), all 7 scale algorithms, all 5 solver modes, full `variableMaker` pipeline in both Scale and Direct modes, and `translateConfig`.

Set `TESTS_ENABLED = false` before shipping a build.

---

## Knowledge base

Detailed documentation lives in [`lib/knowledge/`](lib/knowledge/):

| File                                                                   | Contents                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [how-it-works.md](lib/knowledge/how-it-works.md)                       | Engine pipeline, two-thread model, token naming, Figma alias chain |
| [how-to-use.md](lib/knowledge/how-to-use.md)                           | Step-by-step usage guide from install to export                    |
| [color-system-guidelines.md](lib/knowledge/color-system-guidelines.md) | How to design a good color system using this tool                  |
| [cheatsheet.md](lib/knowledge/cheatsheet.md)                           | Role names, variation sets, and contrast targets at a glance       |
| [features-and-tricks.md](lib/knowledge/features-and-tricks.md)         | Full feature list, tips, preset reference                          |
