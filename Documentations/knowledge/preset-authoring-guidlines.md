# Preset Authoring Guidelines — The Complete Reference

This is the single canonical reference for authoring a Token Wand preset
(`src/shared/presets/raw/*.ts`): the design-system philosophy and color-science
wisdom that should shape a preset's *architecture*, merged with the complete,
code-verified schema, validation rules, and cross-field dependencies that govern
whether that architecture actually works. Where `color-system-guidelines.md` and
`cheatsheet.md` give the reasoning and the numbers, and the `preset-author`/
`color-master` Claude Code skills give the workflow, this document is the ground truth
both are built on — every claim here is verified against actual source, cited by
file:line.

Read this before designing a new preset. It supersedes skimming individual preset
files for "how things are usually done" — most existing presets use only a fraction of
what the schema actually supports (see §5 onward).

---

## Part 1 — Design-system philosophy and color-science wisdom

### Philosophy

A color system is a **constraint structure**, not a color library. Its job is to make
the right color easy to pick and the wrong color hard to reach. Every decision —
scale length, role names, variation targets, theme count — is a constraint. Design
those constraints first, then let the engine solve the actual colors.

Start with the minimum viable palette:

- 1 neutral (gray, slate, stone — desaturated, used for text, borders, surfaces)
- 1 brand color (the primary action color)
- Status colors: error, success, warning (3 seeds)

This gives 5 seed colors and covers the full semantic range. Add secondary brand
colors only when there's a genuine design-language reason — not because "it might be
useful." Three to six seed colors is ideal; eight or more make the system hard to
reason about and produce combinatorial explosion in token counts.

### Role naming philosophy

Name roles by semantic intent, not by visual description.

| Tier | Examples | Rationale |
| --- | --- | --- |
| Semantic | `Text`, `Background`, `Border`, `Fill`, `Surface` | Purpose is unambiguous regardless of theme |
| Descriptive | `Text/Muted`, `Fill/Strong`, `Surface/Raised` | Adds precision while keeping semantic grounding |
| Decorative | `Canvas`, `Glow`, `Edge`, `Ink` | Acceptable for brand-forward systems; avoid in enterprise |

Avoid role names that encode color (`Blue/Fill`) or theme (`Light/Background`). Both
collapse when the system gains new colors or themes. Twelve to sixteen roles is a
practical maximum for product systems — merge roles with similar contrast targets
rather than splitting them.

### WCAG contrast targets by use case

| Use case | Min ratio | Notes |
| --- | --- | --- |
| Page background wash | 1.0–1.5 | Barely perceptible tint |
| Section / card surface | 1.5–2.5 | Visible separation without drawing attention |
| UI borders, dividers | 1.5–3.0 | Non-interactive outlines |
| Form field borders | 3.0–4.5 | Interactive — WCAG AA large-text requirement |
| Icons, decorative fills | 3.0–4.5 | WCAG AA for non-text |
| Solid interactive fills | 4.0–7.0 | Buttons, active state indicators |
| Body text (AA) | 4.5+ | WCAG AA minimum for normal text |
| Placeholder / muted text | 4.5–7.0 | Meet AA even for secondary text |
| Headings, labels (AAA) | 7.0+ | WCAG AAA normal text |
| Maximum legibility | 13.0–21.0 | Near-black/near-white — use sparingly |

These are minimum targets — setting a target higher is always safe, and the engine
guarantees the output meets or exceeds it (Scale mode: best-effort, flags
`isAdjusted` if unreachable; Direct mode: exact, see Part 2). **A role spanning both
the background range (1.0–2.5) and the text range (4.5–21) in its own variation
targets is conflating two different semantic purposes** — split it.

WCAG quick reference: **1.0:1** identical to background (invisible) · **1.5:1**
barely visible tint · **3.0:1** AA for large text (≥18pt regular or ≥14pt bold) and
icons · **4.5:1** AA for normal text · **7.0:1** AAA for normal text · **21.0:1**
maximum possible (pure black on pure white — also the engine's hard `MAX_CONTRAST`
ceiling, see §6).

### How many variations

| Count | Appropriate for |
| --- | --- |
| 3 | Simple product systems, landing pages |
| 5 | Standard product design systems |
| 7–8 | Design systems with fine-grained interaction states |
| 10+ | Utility CSS libraries (Tailwind, Radix) |

Three is the minimum for a useful semantic system (subtle/default/strong). Five is
the sweet spot for most product teams. Beyond 10 makes sense only for a library
consumed by other teams who need every possible step.

**Standard variation sets to copy rather than invent:**

*Semantic Intensity (5-level, recommended default)*: Subtle 1.1 · Soft 1.4 ·
Default 2.5 · Strong 5.0 · Bold 9.0.

*Interaction States (4-level)*: Rest 4.5 · Hover 5.5 · Pressed 7.0 · Disabled 2.0.

*Interaction States (5-level, Polaris-style)*: Default 4.5 · Hover 5.5 · Pressed 6.5 ·
Selected 7.0 · Disabled 2.0.

*Emphasis Hierarchy (4-level, Apple/Material-style)*: High 7.0 · Medium 4.5 ·
Low 3.0 · Disabled 2.0.

*Utility Scale (11-level, Tailwind-style)*: 50→1.0 · 100→1.1 · 200→1.3 · 300→1.6 ·
400→2.5 · 500→4.0 (mid-point, brand territory) · 600→5.5 · 700→7.5 (AA text) ·
800→11.0 · 900→16.0 · 950→20.0 (near-black).

**Caveat — low targets are hue-sensitive in Scale mode**: the low end of any of these
scales (targets 1.0–1.6) assumes a hue-neutral ramp. `Natural`, `Uniform`,
`Expressive`, `Symmetric` binary-search HSL lightness against a target that isn't
actually hue-uniform (§3) — a yellow/lime/warm-green seed hits these low-contrast
steps at a very different, more washed-out HSL lightness than a blue/violet seed, so
the identical numeric target looks meaningfully different across seed colors. Prefer
`OKLCH`, `Material`, or `Fidelity` for warm seeds.

### Standard roles with recommended contrast targets

Suggested per-variation `target` values for a 3-variation model (Subtle/Default/Strong)
— there is no role-level `variationTargets` array; each variation in `role.variations`
(or the global list) carries its own `target` (see §5's `Variation` shape).

| Role | Purpose | Subtle | Default | Strong |
| --- | --- | --- | --- | --- |
| `Background` | Page wash | 1.0 | 1.05 | 1.2 |
| `Background/Subtle` | Off-white section backgrounds | 1.1 | 1.35 | 1.8 |
| `Surface` | Card / panel backgrounds | 1.35 | 1.8 | 2.7 |
| `Surface/Raised` | Elevated cards, popovers | 1.8 | 2.7 | 4.0 |
| `Border` | General UI dividers | 2.7 | 4.0 | 5.8 |
| `Border/Strong` | Form field borders, active outlines | 4.0 | 5.8 | 8.5 |
| `Fill` | Interactive component fills | 2.7 | 5.8 | 11.5 |
| `Fill/Strong` | CTA buttons, primary actions | 4.0 | 8.5 | 14.5 |
| `Text/Muted` | Placeholder, caption, helper text | 7.0 | 10.0 | 13.0 |
| `Text` | Body copy (AA) | 10.0 | 13.0 | 16.0 |
| `Text/Strong` | Headings, labels (AAA) | 13.0 | 16.0 | 19.0 |
| `Text/Inverse` | Text on colored backgrounds | 4.5 | 7.0 | 10.0 |

**Status role slots** (per-role override, 4 fixed variations — see §8 for
`scopedColorIds`): `BG/Subtle` 1.3 (tinted alert bg) · `BG/Default` 1.8 (solid alert
bg) · `FG/Default` 4.5 (status text/icon) · `Border` 2.5 (status outline).

**Action role slots** (4-state interaction): `Action/Primary` — Rest 4.5, Hover 6.0,
Pressed 7.0, Disabled 2.0. `Action/Secondary` — Rest 3.0, Hover 4.5, Pressed 6.0,
Disabled 2.0.

**Inverse role slots**: `Inverse/Surface` — Default 12.0, Muted 14.0. `On/Primary` —
Default 4.5 (AA), Strong 7.0 (AAA).

### Common mistakes to avoid

- **Too many seed colors** — three to six is ideal.
- **Too many roles** — twelve to sixteen is a practical maximum.
- **Overlapping contrast targets** — variation targets within a role should be
  distinct enough to produce different scale steps or solver outputs; two adjacent
  variations mapping to the same step means one is redundant (this is never validated
  automatically — see §6's "Monotonicity is checked, but never blocks anything").
- **Forgetting inverse/on-color roles** — any colored surface (a primary button, an
  alert banner) needs a matching foreground role for text/icons on it. `On/Primary`,
  `Status/FG`, `Text/Inverse` are common names.
- **Using the same contrast targets for backgrounds and text** — backgrounds live in
  1.0–2.5, text lives in 4.5–21.

### Multi-theme design

Plan Light and Dark as a minimum. Consider a Brand theme (colored background) and an
Inverse theme (black, near-maximum contrast) for marketing pages or high-contrast
mode. Each theme is just a name + background hex; the engine evaluates all contrast
ratios against that background independently — a color that passes AA on white may
not pass AA on a dark blue background.

When adding a third theme, check that every role's variation targets still produce
usable colors against the new background. Very low targets (1.05, 1.1) may produce
invisible colors on colored or mid-tone backgrounds — raise those targets for
non-white themes, or use a per-role override.

### Folder structure in Figma

Use `/` in color, role, and variation names to build a hierarchy in the Figma
variable panel: `Brand/Primary`, `Brand/Neutral`, `Status/Error` group seeds under
folders; `Surface/Raised`, `Border/Strong` nest sub-roles; `State/Hover`,
`State/Pressed` nest variation names under a folder per token.

### Token naming strategy

**Color/Role/Variation** (default) — `Primary/Background/Subtle` — best for product
design systems; every token is locatable by scanning the color or the role.

**Color/Variation** (no role) — `Blue/500`, `Slate/200` — best for utility CSS
libraries and raw palette exports. Set `tokenNameSegments: ["color", "variation"]`
and enable shorthand for compact names (used by the Tailwind preset). **See §6's
"Token-path collisions" before omitting a segment** — this is exactly the pattern
that can silently collide two structurally distinct tokens onto the same Figma
variable name.

**Role/Color/Variation** — `Background/Primary/Subtle` — best when the system is
organized role-first in Figma and designers navigate by role rather than color.

### Source colors (global colors)

Enable `includeSourceColors` to write raw seed hex values into a separate Figma
collection (default `_constants`, configurable via `sourceCollectionName`). One mode
only, never changes per theme, not aliased into the token collection. Use when
developers need raw brand hex as code constants, the system needs a "brand
primitives" collection separate from semantic tokens, or you're handing off to a team
that consumes hex values directly (brand guidelines, marketing).

---

## Part 2 — The complete, code-verified schema and rulebook

### 2. Scale mode vs. Direct mode

**Use Scale mode when**: you want a consistent, harmonious palette where every color
shares the same ramp structure; designers need to browse available steps and pick
manually (the `_scale` Figma collection is visible); the system will be used as a
palette reference in addition to semantic tokens; you're following a documented
tonal system (Material You, IBM Carbon, Radix).

**Use Direct mode when**: precise, guaranteed WCAG compliance per token is the
primary goal; you're iterating fast without thinking about scale-step indices; each
role's variation needs to hit an exact target, not "the closest scale step"; you
want a smaller Figma file (no `_scale` collection).

Direct mode gives each variation an exact WCAG guarantee. Scale mode gives palette
harmony with best-effort contrast (flags `isAdjusted: true` when no step meets the
target).

### 3. Choose the algorithm/solver

Full formulas, empirical stress-test numbers, and selection guidance live in the
**color-master** skill and in `color-algorithm-roadmap.md` — algorithm/solver
*choice* is a structural decision made here; understanding exactly *why* one performs
better is that skill's deeper reference. Three load-bearing gotchas that are easy to
get wrong:

- **Four of the eight scale algorithms — `Natural`, `Uniform`, `Expressive`,
  `Symmetric` — are hue-biased.** They binary-search HSL lightness against raw WCAG
  luminance, which weights green ~10x more than blue. A yellow/lime/warm-green seed
  crushes to muddy-dark by step 4–5 while a blue seed at the same step index still
  has clear light-to-mid steps left. **For warm seeds, use `OKLCH`, `Material`, or
  `Fidelity` instead.**
- **`hue-locked` no longer exists as a solver mode** (removed entirely as of
  2026-07-15 — it was a no-op alias for `natural`, hardcoding the same `natural`-taper
  chroma curve regardless of its name or Settings UI copy, numerically confirmed
  byte-identical aggregate output to `natural` across a full stress-test run before
  removal). There is no successor value; use `gamut-cusp` if you want a mode that
  actually maximizes chroma relative to the seed's own gamut envelope.
- **Per-role scale-algorithm scoping does nothing in Scale mode.** `algorithmScopeLevel:
  "role"` only affects Direct mode's solver (`role.solverMode`). In Scale mode, only
  `color.scaleAlgorithm` is ever read (`_generateScales`,
  `src/shared/engine/clrEngine.ts:313`) — a role-level algorithm override is silently
  ignored even though the UI exposes one.

Algorithm selection guide (Scale mode):

| Algorithm | Character | Best for |
| --- | --- | --- |
| Natural | Perceptually uniform + chroma taper near white/black | Most products — the default |
| Uniform | Even relative-luminance steps, constant saturation | Technical/data products, IBM Carbon-style |
| Expressive | Natural + subtle hue rotation (warm at light, cool at dark) | Brand-forward, editorial, lifestyle |
| Symmetric | Log-luminance anchored to source color as midpoint | When the seed must sit near the ramp's center |
| OKLCH | Perceptually uniform in OKLCH space, preserves source H/C | Maximum perceptual accuracy, wide-gamut displays |
| Material | HCT-based (CAM16 hue + CIE L* tone) | Android, Wear OS, Material You compliance |
| Linear | Even HSL lightness steps | Quick prototypes; not perceptually uniform |
| Fidelity | OKLCH-based; chroma held as a fraction of the seed hue's real gamut envelope; seed's exact hex always appears in the ramp | Brand colors where the seed's own vividness must carry through, especially unusual/highly saturated hues |

Solver mode guide (Direct mode):

| Mode | Effect | Best for |
| --- | --- | --- |
| `natural` | Chroma tapers as L moves away from mid | Balanced, general purpose |
| `constant-chroma` | Chroma held fixed at seed value throughout | Vivid palettes, max color retention |
| `symmetric` | Chroma follows a bell curve peaking at mid-L | Calm, harmonically symmetric systems |
| `max-chroma` | Chroma maximized in-gamut at every candidate L | Maximum energy, bold creative products |
| `gamut-cusp` | Chroma held as a constant fraction of the seed's own gamut envelope | Vivid, gamut-honest color without `max-chroma`'s uniform saturation |
| `apca-natural` | Same gamut-relative chroma as `gamut-cusp`, searches an APCA Lc target instead of WCAG | Perceptual/polarity-aware contrast; experimental — its WCAG→Lc conversion is a 5-point hand-fit anchor table, not a reference APCA implementation |

Default to `Natural` (scale) / `natural` (solver) unless the guidance above points
elsewhere for your specific case.

### 4. Per-role variation override, when to use it

The global `variations[]` list works for most roles. Use a per-role override (set
`useSharedRoleVariants: false` project-wide, then give the role its own
`variations[]`) when:

- The role represents a fundamentally different semantic model — status colors have
  four fixed slots (`BG/Subtle`, `BG/Default`, `FG/Default`, `Border`) that don't
  correspond to an intensity scale.
- The role needs a different variation *count* than the global list.
- The role's variations need semantic names tied to its own purpose (`Layer/01`…
  `Layer/04`, `Emphasis/High`…`Emphasis/Disabled`).
- A component-specific role needs interaction states while other roles use intensity
  levels.

### 5. The `Preset` shape, complete

```ts
// src/shared/presets/themeShop.ts
export interface Preset {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  badge?: string;
  swatches?: string[];         // hex strings shown on the Theme Shop card
  config: Partial<ProjectStoreSnapshot>;
}
```

`config` is a **partial** snapshot of the actual engine/UI state — omit any field you
don't need to override; `makeBootstrapState()` (`src/ui/store/projectStore.ts:273`)
supplies defaults for everything else, and `ensureIds()` auto-generates missing `_id`s
on load. Every top-level `config` field, verified against `makeBootstrapState()`'s
literal defaults:

```ts
pluginMode: "scale" | "direct";                       // default "scale"
scaleAlgorithm: ScaleAlgorithm;                        // default "Natural"
                                                        // "Natural" | "Uniform" | "Expressive" | "Symmetric"
                                                        // | "OKLCH" | "Material" | "Linear" | "Fidelity"
scaleLength: number;                                   // default 25 — scale mode only
solverMode: SolverMode;                                // default "natural"
                                                        // "natural" | "constant-chroma" | "symmetric"
                                                        // | "max-chroma" | "gamut-cusp" | "apca-natural"
useUniformAlgorithm: boolean;                          // default true — one algorithm/solver for all colors
algorithmScopeLevel: "color" | "role";                 // default "color" — only matters when
                                                        // useUniformAlgorithm: false, and only affects Direct mode

tokenNameSegments: TokenNameSegment[];                 // default ["color", "role", "variation"]
                                                        // any permutation, or a 2-element array to omit one segment
useShorthandColors: boolean;                           // default false
useShorthandRoles: boolean;                            // default false
useShorthandVariations: boolean;                       // default false
useShorthandSteps: boolean;                            // default false

includeSourceColors: boolean;                          // default false — writes raw seed hexes to a separate collection
sourceCollectionName: string;                          // default "_constants"
alphaValues: number[];                                 // default [] — whole-number percentages, e.g. [10, 25, 50]; needs includeSourceColors: true
includeColorScalesCollection: boolean;                 // default true — false ⇒ tokens get raw hex, same as Direct mode
includeDescriptions: boolean;                          // default false
scaleCollectionName: string;                           // default "_scale"
tokenCollectionName: string;                           // default "color tokens"

scaleSteps: ScaleStep[] | string[] | null;             // default null — see §11, genuinely underused
useSharedRoleVariants: boolean;                        // default true — roles use the global `variations` list

name: string;                                          // project display name (not the Preset's own id/name)
description: string;

colors: Color[];
roles: Role[];
variations: Variation[];       // global list — used whenever a role's own `variations` is null/omitted
themes: Theme[];
```

Entity shapes, complete (`src/shared/types.ts`):

```ts
interface Variation {
  _id?: string;
  name: string;
  shorthand: string;
  target?: number;              // WCAG contrast ratio; omit ⇒ defaults to 4.5 at validation
}

interface Color {
  _id?: string;
  name: string;
  shorthand: string;
  value: string;                 // hex
  description?: string;
  scaleAlgorithm?: ScaleAlgorithm; // per-color override — only read when useUniformAlgorithm: false
  solverMode?: SolverMode;         // per-color override — only read when algorithmScopeLevel !== "role"
}

interface Role {
  _id?: string;
  name: string;
  shorthand: string;
  variations?: Variation[] | null;  // null ⇒ defer to global `variations` list
  scaleAlgorithm?: ScaleAlgorithm;   // per-role override — DEAD in Scale mode, see §3 and §6
  solverMode?: SolverMode;           // per-role override — works in Direct mode when algorithmScopeLevel: "role"
  description?: string;
  scopedColorIds?: string[] | null;  // restrict this role to specific colors (by _id or name) — see §8
  localBg?: RoleLocalBg | null;       // contrast-chain against something other than the theme bg — see §9
  scopes?: VariableScope[];           // Figma variable-consumption scoping — see §10, unused by every shipped preset
}

interface Theme {
  _id?: string;
  name: string;
  bg: string;                    // hex background this theme's contrast is evaluated against
  description?: string;
}

type ScaleAlgorithm = "Natural" | "Uniform" | "Expressive" | "Symmetric" | "OKLCH" | "Material" | "Linear" | "Fidelity";
type SolverMode = "natural" | "constant-chroma" | "symmetric" | "max-chroma" | "gamut-cusp" | "apca-natural";
type TokenNameSegment = "color" | "role" | "variation";
type VariableScope = "FRAME_FILL" | "SHAPE_FILL" | "TEXT_FILL" | "STROKE_COLOR" | "EFFECT_COLOR" | "ALL_SCOPES";
```

### 6. The complete validation and dependency matrix

There are **three separate, non-overlapping validation layers**, and none of them
catches everything the others miss. Know all three, and know exactly what falls
through the cracks of all three combined — that's where a preset silently misbehaves
instead of erroring.

#### Layer 1 — build-time (`validatePreset.ts`, runs in `npm run build`/`watch`)

The complete rule set, verified against the actual `RULES` array
(`src/shared/presets/validatePreset.ts:103-302`) — **this is the only layer that can
block a build**:

| Rule | Scope | Checks | Auto-fixes | Errors on |
| --- | --- | --- | --- | --- |
| `plugin-mode-enum` | always | `pluginMode` is `"scale"` \| `"direct"` | — | invalid value |
| `scale-algorithm-enum` | always | `scaleAlgorithm` is one of the 8 valid strings | — | invalid value |
| `solver-mode-enum` | always | `solverMode` is one of the 7 valid strings | — | invalid value |
| `scale-length-positive-int` | scale mode only | `scaleLength` is a positive integer | — | zero, negative, non-integer, or missing-and-required |
| `algorithm-scope-level-enum` | always | `algorithmScopeLevel` is `"color"` \| `"role"` | — | invalid value |
| `token-name-segments-enum` | always (if array) | every entry is `"color"`\|`"role"`\|`"variation"` | — | invalid entry |
| `color-hex-format` | always | `color.value` parses as hex | normalizes to `#RRGGBB` | unparsable/empty |
| `theme-hex-format` | always | `theme.bg` parses as hex | normalizes to `#RRGGBB` | unparsable/empty |
| `color-required-fields` | always | `color.name`/`.shorthand` non-empty | — | empty |
| `color-shorthand-unique` | always | no two colors share a `shorthand` | — | duplicate |
| `role-required-fields` | always | `role.name`/`.shorthand` non-empty | — | empty |
| `role-shorthand-unique` | always | no two roles share a `shorthand` | — | duplicate |
| `role-scoped-color-ids-exist` | always (if any role has `scopedColorIds`) | every id/name in the array matches a real color's `_id` or `name` | — | dangling reference |
| `global-variations` / `role-variations` | always (if array present) | each variation's `name`/`.shorthand` non-empty, `target` is a number in `(0, 21]`, no duplicate shorthand within the array | missing `target` → defaults to **4.5** | out-of-range/non-number target, duplicate shorthand |
| `scale-step-required-fields` | scale mode only (if `scaleSteps` present) | each step's `name`/`.shorthand` non-empty | — | empty |
| `theme-required-fields` | always | `theme.name` non-empty | — | empty |
| `theme-name-unique` | always | no two themes share a `name` | — | duplicate |

`MAX_CONTRAST = 21`, `DEFAULT_VARIATION_TARGET = 4.5` are the only two magic numbers
this layer enforces.

**Confirmed NOT checked by this layer** (verified by reading every rule — there is no
rule for any of these): `role.localBg` shape or whether its token references resolve
to anything real; `role.scopes` contents beyond basic array shape; whether
`scaleCollectionName`/`tokenCollectionName`/`sourceCollectionName` collide with each
other; whether `scaleSteps.length` matches `scaleLength`; whether variation `target`s
within a role are monotonically ordered; whether the final, joined Figma token *path*
(after applying `tokenNameSegments` + shorthand flags) is unique across the whole
project — only per-entity name/shorthand uniqueness is checked, never the combined
path. Every one of these is a real, reachable silent-failure mode — see below.

#### Layer 2 — runtime, pre-sync (`validateProjectStore()`, fires when a user clicks Run)

**A separate, differently-scoped validator** — `src/ui/store/projectStore.ts:380-428`
— that only ever runs inside the live plugin (RunDialog's "validation-warning"
phase), never during `npm run build`. A preset can pass Layer 1 cleanly and still
trip this the first time someone runs it. It requires at least one color and one
role to exist at all, then checks:

- No color/role/variation has an empty `name` (redundant with Layer 1 for
  colors/roles, but Layer 1 never checks variation names — this is the only layer
  that does).
- **Segment-depth matching**: a `shorthand` must have the same number of
  `/`-separated segments as its `name`. `name: "Brand/Primary"` (2 segments)
  requires a 2-segment shorthand like `"br/pr"` — a flat `"bp"` fails this check.
  Checked for colors, roles, the global `variations` list, and every role's own
  `variations` list independently. **Layer 1 never checks this at all** — a preset
  file with mismatched segment depths builds cleanly and only surfaces this warning
  inside the live plugin.
- **Resolved-label uniqueness**: after applying `useShorthandColors`/
  `useShorthandRoles`/`useShorthandVariations`, do any two colors/roles/variations
  (each axis checked independently) resolve to the *same displayed label*? This
  catches "two colors whose full names differ but whose shorthands collide."
- Plain duplicate-name and duplicate-shorthand checks for colors and roles
  (case-insensitive), independent of the segment/label checks above.

**Still not checked by Layer 1 or 2 combined**: the *joined, cross-entity* token
path. Both layers check "are all color labels unique among colors" and "are all role
labels unique among roles" separately — neither checks whether a specific (color,
role, variation) triple, once assembled via `tokenNameSegments` into a final path,
collides with a *different* triple's assembled path. See "Token-path collisions"
below.

#### Layer 3 — silent runtime fallbacks (the engine itself, no warning ever shown)

Below Layers 1 and 2, the engine has its own defense-in-depth fallbacks for
malformed data that reaches it anyway (e.g. hand-edited live plugin state, not a
build-validated preset file). These **never produce an error or a visible warning**
— know them so you don't mistake "the engine didn't crash" for "the configuration is
correct":

- **Empty `role.shorthand`/`color.shorthand`** → the Figma-sync layer derives a
  2-character fallback from the name (`role.name.substring(0, 2).toLowerCase()`,
  `src/figma/config.ts:133`) rather than crashing. Unreachable via a
  Layer-1-validated preset (which requires non-empty shorthand), but real if the
  plugin's own UI ever produces one.
- **Duplicate theme names** reaching the Figma-sync layer get auto-suffixed
  (`"Light"`, `"Light 2"`, `"Light 3"`, …) rather than erroring
  (`_deduplicateThemeNames`, `src/figma/config.ts:100-116`). Also unreachable via a
  Layer-1-validated preset (`theme-name-unique` already blocks this at build time).
- **Invalid `theme.bg`** falls back to `"#FFFFFF"` at this same layer.
- **Invalid `solverMode`/`algorithmScopeLevel` strings** reaching the engine
  silently fall back to `"natural"`/`"color"` respectively — Layer 1 already rejects
  these as build errors, so this only matters for hand-edited state.

#### Field-level valid ranges and defaults, precise

| Field | Type/range | Default | Notes |
| --- | --- | --- | --- |
| `variation.target` | number, `(0, 21]` | `4.5` (Layer 1 auto-fix) | `21` is the mathematical WCAG contrast ceiling (pure black on pure white) |
| `alphaValues[]` | integers `0-100` | `[]` | **Whole-number percentages, not fractions** — `alpha = value / 100` (`figmaVars.ts:292`). Passing `0.5` intending "half" produces a ~0.5% (nearly invisible) alpha, not 50%; use `50`. Out-of-range values are silently dropped when the string-input parser runs (`ensureVariations()`), not when passed as a real preset array — a preset's raw `.ts` array is not re-clamped, so double-check values are in range yourself |
| `scaleLength` | positive integer | `25` | No explicit maximum anywhere; the log-luminance step math (`scaleMaker`) stays numerically stable across any practical N (verified N=1 through N=500 by direct calculation) — there's no engine-side reason to avoid a large value, only Figma-side practicality (that many scale variables). `0` or negative is a hard build-time error (Layer 1) because the math produces `NaN`/`-Infinity` if it ever reached the engine ungated |
| `scaleSteps` length vs `scaleLength` | should match | `null` (falls back to bare `"1".."N"`) | **Silently tolerated if they don't match** — extra `scaleSteps` entries beyond `scaleLength` are simply never consulted; if `scaleSteps` is shorter than `scaleLength`, the missing trailing steps just use their bare numeric name with no shorthand. Not an error at any layer — verify by counting yourself |
| `sourceCollectionName`/`scaleCollectionName`/`tokenCollectionName` | any string | `"_constants"` / `"_scale"` / `"color tokens"` | **Not validated for collisions against each other, at any layer.** Figma collections are matched purely by name (`getOrCreateCollection`, `figmaVars.ts:249-255`) — if two of these three fields share a literal string, both feature areas write into the *same* Figma collection, since Figma has no separate namespacing beyond name. Always pick three distinct names |
| `localBg: { kind: "hex", value: {...} }` keys | must be **lowercase theme name** | — | The engine looks up `role.localBgResolved[mode.name.toLowerCase()]` (`clrEngine.ts:358`) — a theme named `"Light"` needs the record key `"light"`, not `"Light"`. Get this wrong and it silently falls through to the theme's own background, no warning |

#### Dead-in-a-mode fields, consolidated

| Field | Dead in | Why |
| --- | --- | --- |
| `role.scaleAlgorithm` | Scale mode (always) | `_generateScales` only ever reads `color.scaleAlgorithm`, never `role.scaleAlgorithm`, regardless of `algorithmScopeLevel` |
| `color.scaleAlgorithm` | Direct mode | `variableMaker` never calls `_generateScales` at all when `pluginMode === "direct"` (`clrEngine.ts:294`) — there's no scale to apply an algorithm to |
| `color.solverMode` | whenever `useUniformAlgorithm !== false` (i.e. the default) | `_getSolverMode` returns `config.solverMode` unconditionally in this case (`clrEngine.ts:346`) |
| `role.solverMode` | whenever `useUniformAlgorithm !== false`, OR `algorithmScopeLevel !== "role"` | same function, second/third branch |
| `includeColorScalesCollection` | has no effect when `pluginMode === "direct"` | Direct mode already never computes or syncs a scale; this flag only matters in Scale mode |

**Subtle, verified distinction**: `pluginMode: "scale"` + `includeColorScalesCollection:
false` is **not** identical to `pluginMode: "direct"`, even though both produce
raw-hex tokens with no `_scale` collection. In the former, the engine still fully
**computes** the tonal scale for every color (`_generateScales` runs, since
`config.pluginMode !== "direct"` is true) — it's simply never synced to Figma
(`figmaVars.ts`'s `skipScales` flag discards it at the sync layer, one level higher
than the engine). In true Direct mode, the scale is never computed at all. No
functional difference in the final Figma output, but real (if usually negligible)
wasted computation in the former.

#### Token-path collisions — the gap no validator catches

Both Layer 1 and Layer 2 check *per-axis* uniqueness (all color names distinct from
each other; all role names distinct from each other; all variation names distinct
from each other) — **neither ever checks the final, joined Figma variable path**
that `tokenNameSegments` assembles from a specific (color, role, variation) triple
(`figmaVars.ts:174`: `tokenNameOrder.map((s) => segParts[s] || s).join("/")`). This
matters most when `tokenNameSegments` **omits a segment**:

```
tokenNameSegments: ["role", "variation"]   // "color" segment dropped
```

If two different colors each have a role named `"Primary"` with a variation named
`"Default"`, **both produce the literal token path `"Primary/Default"`** — a genuine
collision no validator flags. At sync time, Figma variables are matched by name
(`upsertVariables`), so the second color's token silently overwrites the first's
variable on every sync, even though Token Wand's internal `tokenRef` (a separate,
always-3-part `color/role/variation` identity key used for rename tracking)
correctly still treats them as two distinct tokens. **When a preset uses a
`tokenNameSegments` array shorter than 3, manually verify — by reading the assembled
paths in the plugin's Preview screen, not by trusting a validator — that no two
(color, role, variation) triples can produce an identical joined string.** The
Tailwind-style `["color", "variation"]` pattern (role omitted) is safe specifically
because every role's variations are typically the same shared ladder and each color
still contributes a distinct first segment; the risk is concentrated in `["role",
"variation"]` (color omitted) or any custom subset that drops the one segment that
would have kept two otherwise-identical triples apart.

#### Monotonicity is checked, but never blocks anything

A dedicated function for this exists — `validateVariationContrasts()`
(`src/shared/engine/clrEngine.ts:474-480`), which checks that a `target[]` array is
strictly increasing — but it has **zero call sites anywhere in the codebase**. It is
completely dead code. The actual, *working* monotonicity check lives entirely
separately, inside the plugin's own Health tab
(`src/ui/screens/run-dialog/tabs/health/useHealthReport.ts`'s "Inversions" metric) —
which detects non-monotonic variation targets **after** tokens are generated and
displays them as an informational metric a user can choose to ignore. **There is no
layer, at any point in the pipeline, that blocks a build or a sync because a role's
variation targets aren't in increasing order.** If a preset's variation ladder isn't
monotonic (e.g. targets `[4.5, 3.0, 7.0]` instead of `[3.0, 4.5, 7.0]`), it will
build, validate, and sync without complaint — only the live plugin's Health tab will
ever surface it, and only if someone looks.

### 7. Metadata quality: `id`/`name`/`description`/`tags`/`badge`/`swatches`

These aren't decoration — they're the entire Theme Shop / QuickStart browsing
experience:

- **`tags`** drive Theme Shop search (`ThemeShopOverlay.tsx` filters name,
  description, tags, and badge against the search query) — include the real-world
  system name, the mode (`"scale"`/`"direct"`), the primary algorithm/solver, and any
  distinguishing trait (`"enterprise"`, `"mobile"`, `"multi-theme"`).
- **`badge`** shows as a short tag on the QuickStart card — 1–2 words,
  brand-recognizable (`"Carbon"`, `"Apple"`).
- **`swatches`** is optional — if omitted, `ShopCard.tsx` auto-derives it from
  `config.colors`, stripping the `#`. Set it explicitly only when curating *which*
  colors show (e.g. a 14-color preset might want to show only its 5 brand/status
  colors, not the spare palette too).
- **`description`** should state the mode, theme count, and what makes this preset's
  architecture distinct in one sentence.

### 8. Per-role variation override and color scoping, in code

```ts
function statusRole(name: string, shorthand: string, colorId: string) {
  return {
    name, shorthand,
    solverMode: "max-chroma" as const,
    variations: [
      { name: "Bg", shorthand: "1", target: 1.15 },
      { name: "Tint", shorthand: "2", target: 1.8 },
      { name: "Fill", shorthand: "3", target: 4.5 },
      { name: "Text", shorthand: "4", target: 4.5 },
      { name: "Border", shorthand: "5", target: 3.0 },
    ],
    scopedColorIds: [colorId], // restricts this role to only this color
  };
}
```

`scopedColorIds` (array of `_id`s or names — the engine matches either, see
`validatePreset.ts`'s `role-scoped-color-ids-exist` rule) restricts a role to
specific colors instead of generating tokens for every color — use it for per-color
status roles so you don't get a `status/success` token rendered against the
error-red seed too. Every color not in the list is simply skipped for that role
(`_solveDirectMode` and `_processScaleMode` both check `role.scopedColorIds` first
thing and `continue` if the current color isn't in it).

### 9. `localBg`: five ways to chain contrast against something other than the theme

`role.localBg` lets a role's contrast be evaluated against something other than the
raw theme background — essential for text-on-fill, layered surfaces, or anything
that isn't sitting directly on the page. **Five kinds exist in the type
(`RoleLocalBgKind`), but every shipped and dev preset in this codebase uses only one
of them (`token-dynamic`).** Know all five:

```ts
type RoleLocalBgKind = "theme" | "token-static" | "token-dynamic" | "color" | "hex";
interface RoleLocalBg {
  kind: RoleLocalBgKind;
  value?: string | Record<string, string>;
}
```

| Kind | `value` | Resolves to | When to use |
| --- | --- | --- | --- |
| `theme` (default) | none | The theme's own `bg` — identical to omitting `localBg` entirely | Standard roles; you rarely need to set this explicitly |
| `hex` | `Record<themeName, hex>` — **keys must be lowercase** | A literal, hand-authored background per theme — no lookup at all | A role sits on a fixed decorative color that isn't itself a token or seed |
| `color` | a color's `name` | That color's raw seed hex, same value in every theme | A role always sits on one specific seed color's raw swatch, not a derived token |
| `token-static` | one fixed token reference string, e.g. `"Neutral/Surface/Default"` | That exact token's resolved hex, looked up from the engine's own first-pass output | A role sits on one specific, named token that's the same regardless of which color the role's *own* token belongs to |
| `token-dynamic` | a templated ref containing the literal `[color]` placeholder, e.g. `"[color]/fill/button/default"` | Per-color: `[color]` is substituted with each color's own name before lookup | A role sits on **that same color's own** other token |

```ts
// token-static — every role instance points at the SAME one token regardless of color
{
  name: "text/onNeutralSurface", shorthand: "t/ons", solverMode: "natural",
  variations: [ /* ... */ ],
  localBg: { kind: "token-static", value: "Neutral/Surface/Default" },
}

// token-dynamic — each color's role instance points at THAT COLOR's own other token
{
  name: "text/buttonLabel", shorthand: "t/btn", solverMode: "symmetric",
  variations: [ /* ... */ ],
  localBg: { kind: "token-dynamic", value: "[color]/fill/button/default" },
}

// color — pin directly to a seed's raw hex, bypassing tokens entirely
{
  name: "badge/onBrandSwatch", shorthand: "b/obs", solverMode: "natural",
  variations: [ /* ... */ ],
  localBg: { kind: "color", value: "Brand/Primary" },
}

// hex — a fixed, hand-authored background per theme, no lookup
{
  name: "overlay/onHero", shorthand: "ov/hero", solverMode: "natural",
  variations: [ /* ... */ ],
  localBg: { kind: "hex", value: { light: "#1A2B3C", dark: "#0A1520" } },
}
```

See `src/shared/presets/raw/dev/nclarity.ts` and `raw/dev/showcase.ts` in full for
`token-dynamic` used together with scoped status roles in a real preset.

**How resolution actually works (two-pass, with cycle protection)**: `localBg` in
preset source is a *config-time* shape; the engine translates it into three
runtime-only fields at load (`translateLocalBg()`,
`src/shared/engine/clrUtils.ts:250`) — `localBgResolved` (theme→hex map, ready
immediately for `hex`/`color` kinds), `localBgTokenRef` (`token-static`,
unresolved), and `localBgDynamicRef` (`token-dynamic`, unresolved, still containing
`[color]`). `token-static`/`token-dynamic` need an actual token value to look up,
which doesn't exist until the engine has already run once:

1. Run `variableMaker()` once, using theme backgrounds for any role with an
   unresolved token ref.
2. Call `resolveTokenRefBgs(config, result)` (`clrUtils.ts:25`) — scans the first
   pass's actual output tokens, matches each ref against a real token by slugified
   name, writes resolved hex(es) into `localBgResolved`/`localBgPerColor`. Returns
   `true` if anything was resolved.
3. If it returned `true`, **run `variableMaker()` again** — now every chained role
   solves against the real token value from pass one.

**Built-in cycle protection**: if Role A's `localBg` points at a token produced by
Role B, and Role B's `localBg` in turn points back at a token produced by Role A,
`A→B→A` would never converge. `resolveTokenRefBgs` detects this ("tainted" role
tracking, `clrUtils.ts:29,62`) and clears the ref for the second role in the cycle,
falling back silently to the theme background rather than looping forever or
crashing. Don't design a role architecture that relies on a genuine bg-dependency
cycle — it will resolve, but not the way you intended.

### 10. Figma variable scoping (`role.scopes`) — real, engine-supported, unused everywhere

`role.scopes: VariableScope[]` restricts which Figma property pickers a token
appears in — `"FRAME_FILL"`, `"SHAPE_FILL"`, `"TEXT_FILL"`, `"STROKE_COLOR"`,
`"EFFECT_COLOR"`, or `"ALL_SCOPES"` (the default when `scopes` is omitted or empty —
`figmaVars.ts:475,496`). **No shipped or dev preset in this codebase sets this
field.** Use it when a role is conceptually restricted to one kind of surface and you
want Figma's own UI to enforce that instead of relying on designer discipline:

```ts
{
  name: "text/body", shorthand: "t/bd",
  variations: [ /* ... */ ],
  scopes: ["TEXT_FILL"], // only ever offered when picking a text fill in Figma
}
```

A `border/*` role scoped to `["STROKE_COLOR"]`, a `text/*` role scoped to
`["TEXT_FILL"]`, and a `background/*`/`fill/*` role scoped to `["FRAME_FILL",
"SHAPE_FILL"]` prevents an entire category of "picked the wrong token for this
property" mistakes at the design tool level, for free.

### 11. Custom scale-step labels (`scaleSteps`) — also real, also unused everywhere

Every shipped preset — including Radix (whose real-world system uses named 1–12
steps) and Tailwind (50/100/.../950) — leaves `scaleSteps: null`. With `null`, Scale
mode's step names are just bare integers `1, 2, ..., N` (`seriesMaker()`,
`src/shared/engine/clrUtils.ts:231`) internally; any Tailwind-looking numbers in
token *names* come from `tokenNameSegments`/shorthand tricks on top of those bare
integers, not from labeled steps.

`scaleSteps` accepts either bare strings or `{name, shorthand}` objects, mapped
**1:1 by array index** onto scale steps `0..scaleLength-1`:

```ts
scaleLength: 11,
scaleSteps: [
  { name: "50", shorthand: "50" },   { name: "100", shorthand: "100" },
  { name: "200", shorthand: "200" }, { name: "300", shorthand: "300" },
  { name: "400", shorthand: "400" }, { name: "500", shorthand: "500" },
  { name: "600", shorthand: "600" }, { name: "700", shorthand: "700" },
  { name: "800", shorthand: "800" }, { name: "900", shorthand: "900" },
  { name: "950", shorthand: "950" },
],
```

Reach for this whenever a preset is explicitly modeling a named reference scale
(Tailwind's 50–950, Radix's 1–12, Material's 0/10/20/.../100) — the step's own
Figma variable name (in the `_scale` collection) and its internal key both use this
label, not just the token name that references it.

### 12. Reference presets to copy from

| If you're building... | Copy this preset |
| --- | --- |
| An empty scaffold — just the variation ladder, no colors/roles yet | `src/shared/presets/raw/dev/blank.ts` (Blank Slate) |
| A simple product system, brand-first, fully populated example | `src/shared/presets/raw/dev/wand.ts` (Regular Wand) |
| Enterprise / deep role hierarchy, multiple neutral themes | `src/shared/presets/raw/carbon.ts` (IBM Carbon) |
| iOS/macOS semantic label/fill hierarchy | `src/shared/presets/raw/apple.ts` |
| Utility/flat `Color/Step` naming (Tailwind-style) | `src/shared/presets/raw/tailwind.ts` |
| Status roles + per-color scoping + contrast chaining | `src/shared/presets/raw/dev/nclarity.ts` |
| HCT/Material You tonal palette | `src/shared/presets/raw/material.ts` |
| Every feature at once, for reference | `src/shared/presets/raw/dev/showcase.ts` |

See `features-and-tricks.md`'s "Preset Quick Reference" table for the full inventory
(mode, algorithm, color/role/theme counts). Even `showcase.ts` — the widest
feature-coverage dev preset — doesn't touch `role.scopes` or custom `scaleSteps`;
don't assume "the reference preset does it" is a ceiling on what's possible.

### 13. Writing and wiring the file

1. Create `src/shared/presets/raw/dev/<name>.ts` (dev-only — fast iteration, excluded
   from `--release` builds, **auto-discovered**, no registration needed) or
   `src/shared/presets/raw/<name>.ts` (shipped preset) modeled on `carbon.ts`'s
   structure: a top-of-file comment documenting the role/variation architecture and
   contrast targets, then `const presets: Preset[] = [{...}]; export default
   presets;`.
2. **If it's a shipped preset (not `raw/dev/`), you must manually wire it into
   `scripts/build-presets.ts`**: add an import line and add it to the `all = [...]`
   merge array and the summary-logging array. Dev presets under `raw/dev/` need none
   of this — every `.ts`/`.js` file there is picked up automatically.
3. Give every color/role/variation a stable `_id` if you want rename-safety from the
   start (required before this preset is used to sync a real Figma file that will
   later be edited — see the rename-safety system in `how-it-works.md`).
4. Run `npm run build` (or `npm run watch` while iterating) — runs
   `scripts/build-presets.ts`, which auto-formats the raw file with Prettier and runs
   `validateAndFixPreset()` against it (Layer 1, §6).
5. Fix everything the build reports. Remember Layer 1 does **not** check `localBg`'s
   token references, `scopes` contents, collection-name collisions, or token-path
   collisions — verify those in the plugin's Preview screen, not just via the build.
6. Load the plugin in Figma (`manifest.json` via Plugins → Development → Import),
   open Theme Shop, load the preset, and use the Preview tab to check every token's
   hex and contrast rating before running a real sync.

### 14. After the first draft

A preset that builds cleanly and looks right in Preview for one seed color is not
proven — the *structure* (roles, variations, targets, naming, contrast chaining,
scoping) may be right while the actual color *output* isn't harmonic, vivid, or
contrast-reliable across every seed color a real user will type in. That empirical
verification — using the engine's own stress-test harness and Preview, not
eyeballing swatches — is the **color-master** Claude Code skill's job. Invoke it once
the role/variation architecture here is settled, before calling the preset done.
