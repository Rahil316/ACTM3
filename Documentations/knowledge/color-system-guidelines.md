# Guidelines for Building a Good Color System with Token Wand

## Philosophy

A color system is a constraint structure, not a color library. Its job is to make the right color easy to pick and the wrong color hard to reach. Every decision in Token Wand — scale length, role names, variation targets, theme count — is a constraint. Design those constraints first, then let the engine solve the colors.

Start with the minimum viable palette:

- 1 neutral (gray, slate, stone — desaturated, used for text, borders, surfaces)
- 1 brand color (the primary action color)
- Status colors: error, success, warning (3 seeds)

This gives you 5 seed colors and covers the full semantic range. Add secondary brand colors only when there is a genuine design language reason — not because "it might be useful."

---

## Role Naming Philosophy

Name roles by semantic intent, not by visual description.

| Tier        | Examples                                          | Rationale                                                 |
| ----------- | ------------------------------------------------- | --------------------------------------------------------- |
| Semantic    | `Text`, `Background`, `Border`, `Fill`, `Surface` | Purpose is unambiguous regardless of theme                |
| Descriptive | `Text/Muted`, `Fill/Strong`, `Surface/Raised`     | Adds precision while keeping semantic grounding           |
| Decorative  | `Canvas`, `Glow`, `Edge`, `Ink`                   | Acceptable for brand-forward systems; avoid in enterprise |

Avoid role names that encode color (`Blue/Fill`) or theme (`Light/Background`). Both collapse when the system gains new colors or themes.

---

## WCAG Contrast Targets by Use Case

| Use case                 | Min ratio | Notes                                        |
| ------------------------ | --------- | -------------------------------------------- |
| Page background wash     | 1.0–1.5   | Barely perceptible tint                      |
| Section / card surface   | 1.5–2.5   | Visible separation without drawing attention |
| UI borders, dividers     | 1.5–3.0   | Non-interactive outlines                     |
| Form field borders       | 3.0–4.5   | Interactive — WCAG AA large-text requirement |
| Icons, decorative fills  | 3.0–4.5   | WCAG AA for non-text                         |
| Solid interactive fills  | 4.0–7.0   | Buttons, active state indicators             |
| Body text (AA)           | 4.5+      | WCAG AA minimum for normal text              |
| Placeholder / muted text | 4.5–7.0   | Meet AA even for secondary text              |
| Headings, labels (AAA)   | 7.0+      | WCAG AAA normal text                         |
| Maximum legibility       | 13.0–21.0 | Near-black/near-white — use sparingly        |

These are minimum contrast targets. Setting a target higher than the minimum is always safe. The engine guarantees the output meets or exceeds the target.

---

## How Many Variations

| Count | Appropriate for                                     |
| ----- | --------------------------------------------------- |
| 3     | Simple product systems, landing pages               |
| 5     | Standard product design systems                     |
| 7–8   | Design systems with fine-grained interaction states |
| 10+   | Utility CSS libraries (Tailwind, Radix)             |

Three is the minimum for a useful semantic system: one for backgrounds/subtle contexts, one for default/primary usage, one for text/strong. Five is the sweet spot for most product teams. Going beyond 10 makes sense only when building a library consumed by other teams who need every possible step.

---

## Scale Mode vs Direct Mode

### Use Scale mode when

- You want a consistent, harmonious palette — every color shares the same ramp structure.
- Designers need to browse available steps and pick manually (the `_scale` collection is visible in Figma).
- The system will be used as a reference for hand-picking colors in addition to semantic token consumption.
- You are following a documented tonal system (Material You, IBM Carbon, Radix).

### Use Direct mode when

- Precise, guaranteed WCAG compliance per token is the primary goal.
- You are iterating fast and do not want to think about scale step indices.
- Each role's variation needs to hit an exact contrast target, not "the closest scale step."
- You want a smaller Figma file (no `_scale` collection created).

Direct mode gives each variation an exact WCAG guarantee. Scale mode gives palette harmony with best-effort contrast (with a warning when no step meets the target).

---

## Algorithm Selection Guide (Scale Mode)

| Algorithm  | Character                                                       | Best for                                                 |
| ---------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| Natural    | Perceptually uniform + chroma taper near white/black            | Most products — the default                              |
| Uniform    | Even relative-luminance steps, constant saturation              | Technical/data products, IBM Carbon-style systems        |
| Expressive | Natural + subtle hue rotation (warm at light end, cool at dark) | Brand-forward, editorial, lifestyle                      |
| Symmetric  | Log-luminance anchored to source color as midpoint              | When the seed color must sit near the center of the ramp |
| OKLCH      | Perceptually uniform in OKLCH space, preserves source H/C       | Maximum perceptual accuracy, wide-gamut displays         |
| Material   | HCT-based (CAM16 hue + CIE L\* tone)                            | Android, Wear OS, Material You compliance                |
| Linear     | Even HSL lightness steps                                        | Quick prototypes; not perceptually uniform               |
| Fidelity   | OKLCH-based; chroma held as a fraction of the seed hue's real gamut envelope (not a fixed value or a guessed curve); seed's exact hex always appears in the ramp | Brand colors where the seed's own vividness character should carry through the whole scale, especially unusual/highly saturated hues |

When in doubt, use Natural. It produces the most believable results across the widest range of brand colors. Reach for Fidelity when the seed color itself must be reproducible in the palette and its particular vividness — not a generic taper — is the point.

**Caveat for yellow/lime/warm-green seeds:** Natural, Uniform, Expressive, and Symmetric all binary-search HSL lightness against raw WCAG relative luminance (`0.2126·R + 0.7152·G + 0.0722·B`) to place each step — a formula that isn't hue-uniform, since it weights green far more than blue. Measured effect on a 9-step Natural scale: a blue seed and a yellow seed hit the *same* HSL lightness gap of ~30 points by step 2 (yellow already at ~45 vs. blue at ~73), and the yellow ramp collapses to near-black-olive by step 4–5 while blue still has clear light-to-mid steps left — front-loading yellow's usable contrast into the first 2–3 steps. OKLCH, Material, and Fidelity search in genuinely perceptual coordinates (OKLCH L, HCT tone) instead and don't have this problem; Linear is already disclosed above as not perceptually uniform. **For yellow, lime, and warm-green seeds specifically, prefer OKLCH, Material, or Fidelity over Natural/Uniform/Expressive/Symmetric.**

---

## Solver Mode Guide (Direct Mode)

| Mode               | Effect                                                          | Best for                               |
| ------------------ | --------------------------------------------------------------- | -------------------------------------- |
| `natural`          | C tapers as L moves away from mid                               | Balanced, general purpose              |
| `constant-chroma`  | C held fixed at seed value throughout                           | Vivid palettes, max color retention    |
| `symmetric`        | C follows a bell curve peaking at mid-L, collapsing at extremes | Calm, harmonically symmetric systems   |
| `hue-locked`       | H fixed, chroma follows the same taper curve as `natural`, clamped to gamut | Strict brand hue fidelity (see note)   |
| `max-chroma`       | H fixed, C maximized in-gamut at every candidate L during the search | Maximum energy, bold creative products |
| `gamut-cusp`       | C held as a constant fraction of the seed's own gamut envelope, scaled per-L | Vivid, gamut-honest color without `max-chroma`'s uniform saturation |
| `apca-natural`     | Same gamut-relative chroma as `gamut-cusp`, but searches for an APCA Lc target instead of WCAG | Perceptual/polarity-aware contrast; experimental (see note) |

`natural` is the correct choice for most product design systems. Use `max-chroma` when the goal is maximum saturation at every contrast level.

**Note on `hue-locked`:** as currently implemented (`src/shared/engine/solverEngine.ts:233-243`), this mode does not actually push chroma to the gamut maximum — it computes chroma via the exact same `natural`-taper formula as the `natural` solver (`_targetChroma(..., "natural")`, hardcoded regardless of the mode passed in), then clamps to the gamut boundary. In practice its output is currently identical to `natural` mode's chroma curve; the only distinct thing about it is a slightly different `chromaReduced` flagging threshold. If you need visibly different output from `hue-locked` vs `natural`, `gamut-cusp` (below) is the mode that actually does what `hue-locked`'s description promises.

**Two more solver modes exist beyond the five above: `gamut-cusp` and `apca-natural`.** Both hold chroma as a constant *fraction* of the seed's own gamut envelope rather than a taper curve or a raw value — the same idea `Fidelity` uses for Scale mode, applied here to Direct mode's per-color solve. `gamut-cusp` searches for a WCAG contrast target exactly like the other modes; `apca-natural` searches for an APCA Lc target instead (converted from the WCAG-ratio target you enter, via a hand-fit anchor table — not a first-class APCA contrast picker). Use `gamut-cusp` when you want vivid, gamut-honest color at every contrast level without `max-chroma`'s "always maximally saturated" look. `apca-natural` is worth trying if you specifically care about perceptual/polarity-aware contrast, but treat it as experimental — it's a WCAG-target-to-Lc conversion layered on top of the existing WCAG-oriented pipeline, not a from-scratch APCA implementation.

---

## Common Mistakes to Avoid

**Too many seed colors.** Three to six is ideal. Eight or more seeds make the system hard to reason about and produce combinatorial explosion in token counts.

**Too many roles.** Twelve to sixteen is a practical maximum for product systems. Merge roles with similar contrast targets rather than splitting them.

**Overlapping contrast targets.** Variation targets within a role should be distinct enough to produce different scale steps or solver outputs. If two adjacent variations map to the same step, one is redundant.

**Forgetting the inverse/on-color roles.** Any time a colored surface exists (a primary button, an alert banner), there must be a matching foreground role for text and icons on that surface. `On/Primary`, `Status/FG`, `Text/Inverse` are common names.

**Using the same contrast targets for backgrounds and text.** Backgrounds live in the 1.0–2.5 range. Text lives in the 4.5–21 range. A role with targets spanning both is probably conflating two different semantic purposes.

---

## Multi-Theme Design

Plan Light and Dark as a minimum. Consider a Brand theme (colored background) and an Inverse theme (black, near-maximum contrast) for marketing pages or high-contrast mode.

Each theme is a background hex value. The engine evaluates all contrast ratios against that background. A color that passes AA on white may not pass AA on a dark blue background — each theme is evaluated independently.

When adding a third theme, check that every role's variation targets still produce usable colors against the new background. Very low targets (1.05, 1.1) may produce invisible colors on colored or mid-tone backgrounds — raise those targets for non-white themes or use per-role override.

---

## Folder Structure in Figma

Use `/` in color, role, and variation names to build a hierarchy in the Figma variable panel.

Examples:

- `Brand/Primary`, `Brand/Neutral`, `Status/Error` — groups seeds under Brand and Status folders.
- `Surface/Raised`, `Border/Strong`, `Fill/CTA` — sub-roles nest under the parent.
- `State/Hover`, `State/Pressed` — variation names with `/` nest under a State folder per token.

---

## When to Use Per-Role Variation Override

The global variation list works for the majority of roles. Use a per-role override (set `useSharedRoleVariants: false` project-wide, then give the role its own `variations` list) when:

- A role represents a fundamentally different semantic model. Status colors have four fixed slots (`BG/Subtle`, `BG/Default`, `FG/Default`, `Border`) that do not correspond to an intensity scale.
- A role needs a different number of variations than the global list.
- A role's variations need semantic names tied to that role's purpose (`Layer/01`…`Layer/04`, `Emphasis/High`…`Emphasis/Disabled`).
- A component-specific role needs to express interaction states while other roles use intensity levels.

---

## Token Naming Strategy

### Color/Role/Variation (default)

```
Primary/Background/Subtle
Primary/Text/Default
Neutral/Border/Strong
```

Best for product design systems. Every token is locatable by scanning the color or the role.

### Color/Variation (no role)

```
Blue/500
Blue/700
Slate/200
```

Best for utility CSS libraries and raw palette exports. Set `tokenNameSegments: ["color", "variation"]` and enable shorthand for compact names. Used by the Tailwind preset.

### Role/Color/Variation

```
Background/Primary/Subtle
Text/Neutral/Default
```

Best when the system is organized role-first in Figma and designers navigate by role rather than color.

---

## Source Colors (Global Colors)

Enable `includeSourceColors` to write the raw seed hex values into a separate Figma collection (default name: `_constants`, configurable via `sourceCollectionName`). This collection has one mode only, never changes per theme, and is not aliased into the token collection.

Use this when:

- Developers need the raw brand hex values as constants in code.
- The design system requires a "brand primitives" collection separate from the semantic token layer.
- Handing off to a team that will use the hex values directly (brand guidelines, marketing).
