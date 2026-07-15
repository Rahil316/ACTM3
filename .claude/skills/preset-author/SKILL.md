---
name: preset-author
description: Structure and architect a new Token Wand color preset (src/shared/presets/raw/*.ts) with full command of every capability the engine and Preset schema actually support — role/variation hierarchy, contrast-target architecture, scale vs. direct mode, five kinds of local-background contrast chaining, Figma variable scoping, custom scale-step labeling, multi-theme and token-naming design. This is the "preset author" role — structural/architectural design of the design system, not color tuning. Use when asked to build a new design-system preset, add a color token system for a named product/style (e.g. "build a Notion-style preset"), or restructure an existing preset's roles/variations/naming. Pair with the color-master skill for making the resulting palette harmonic and tool-verified.
---

# Preset Author — structuring a Token Wand color preset

You are acting as the **preset author**: the specialist in design-system *structure*
and *architecture* — role hierarchy, variation semantics, contrast-target design,
scale-vs-direct architecture, theme strategy, token naming, and every structural knob
the `Preset` schema exposes. You decide what the system *is made of*. You are not
responsible for making the resulting colors look harmonic or maximally vivid/consistent
— that is the **color-master** skill's job, and it does that job by running the
engine's own tools (the stress-test harness, Preview, contrast math), not by eyeballing
swatches. Hand off to color-master once the structure is in place (§12).

A preset is a **constraint structure**, not a color library. Its job is to make the
right token easy to reach and the wrong one hard to reach. Design the constraints
(roles, variations, contrast targets) first — the engine solves the actual colors.

**The goal of this skill is to make you use the full schema, not the 20% of it every
shipped preset happens to touch.** Every existing preset in this codebase (7 shipped +
~8 dev) uses only a subset of what `Role`, `Color`, `Variation`, and `Theme` actually
support — none of them use `role.scopes`, none use custom `scaleSteps` labels, and only
one `localBg` kind (`token-dynamic`) has ever been exercised even though the type
supports five. A "godly" preset is one that reaches for the right tool from the full
set below, not just the patterns you've seen copied elsewhere.

Full design philosophy, WCAG target tables, algorithm/solver selection guidance, and
common mistakes live in `Documentations/knowledge/color-system-guidelines.md` and
`Documentations/knowledge/cheatsheet.md` — **read both before designing a new preset**;
this file covers the complete schema and every structural mechanism, including several
not documented anywhere else.

---

## 1. Decide the shape before writing code

Answer these, in order, using `color-system-guidelines.md` for the reasoning:

1. **Seed colors** — 3–6 ideal (1 neutral + 1 brand + error/success/warning is the
   minimum viable set). 8+ seeds make the system hard to reason about.
2. **Scale mode or Direct mode?**
   - **Scale mode**: generates a full tonal ramp per color (`_scale` Figma collection),
     roles pick steps by contrast. Use for palette browsing, hand-picking, or matching
     a documented tonal system (Material, Carbon, Radix).
   - **Direct mode**: solves each role/variation straight to a contrast target, no ramp.
     Use when exact per-token WCAG guarantees matter more than palette harmony, or for
     fast iteration without thinking about scale-step indices.
3. **Roles** — semantic groups (`background`, `text`, `border`, `status/error`), named
   by intent not appearance. 12–16 is a practical ceiling.
4. **Variations per role** — 3 is the minimum useful set (subtle/default/strong), 5 is
   the sweet spot for most product teams. Decide whether all roles share one global
   variation list (`useSharedRoleVariants: true`) or whether specific roles need their
   own slots (status colors almost always do — see §6).
5. **Themes** — Light + Dark minimum. Each theme is just a name + background hex;
   contrast is evaluated against that background independently, so a target tuned for
   a white background may need raising for a colored or dark one.
6. **Contrast targets** — pull from `cheatsheet.md`'s standard variation sets and role
   tables rather than inventing numbers. Backgrounds live in 1.0–2.5, text lives in
   4.5–21 — a role spanning both ranges is conflating two semantic purposes.

## 2. Choose the algorithm/solver

Read `color-system-guidelines.md`'s "Algorithm Selection Guide" and "Solver Mode Guide"
tables in full before picking, and read the **color-master** skill for the exact
formula behind every algorithm/solver mode plus real empirical numbers from the
stress-test harness — algorithm/solver *choice* is a structural decision (it's yours),
but understanding *why* one performs better belongs to color-master's deeper reference.
Three load-bearing gotchas, easy to miss:

- **Four of the eight scale algorithms — `Natural`, `Uniform`, `Expressive`,
  `Symmetric` — are hue-biased.** They binary-search HSL lightness against raw WCAG
  luminance, which weights green ~10x more than blue. A yellow/lime/warm-green seed
  will crush to muddy-dark by step 4–5 while a blue seed at the same step index still
  has clear light-to-mid steps left. **For warm seeds, use `OKLCH`, `Material`, or
  `Fidelity` instead** — they search in genuinely perceptual coordinates (OKLCH L or
  HCT tone) and don't inherit the skew.
- **`hue-locked` solver mode is currently a no-op alias for `natural`.** Despite its
  name and despite Settings UI copy suggesting otherwise, it hardcodes the same
  `natural`-taper chroma curve — verified in `Documentations/knowledge/
  color-algorithm-roadmap.md`'s confirmed-issues section and numerically proven
  (byte-identical aggregate metrics) in the color-master skill. If you want a mode that
  actually maximizes chroma relative to the seed's own gamut envelope, use
  `gamut-cusp`, not `hue-locked`.
- **Per-role scale-algorithm scoping does nothing in Scale mode.** `algorithmScopeLevel:
  "role"` only affects Direct mode's solver (`role.solverMode`). In Scale mode, only
  `color.scaleAlgorithm` is ever read — a role-level algorithm override is silently
  ignored even though the UI lets you set one. Don't design a preset that depends on
  per-role scale algorithms; use `algorithmScopeLevel: "color"` (or leave
  `useUniformAlgorithm: true`) for Scale mode presets.

Default to `Natural` (scale) / `natural` (solver) unless the guidance tables above
point somewhere else for your specific case.

---

## 3. The `Preset` shape, complete

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
on load. Copy the shape of an existing preset rather than inventing field names — see
§10 for which one to copy. Every top-level `config` field, verified against
`makeBootstrapState()`'s literal defaults:

```ts
pluginMode: "scale" | "direct";                    // default "scale"
scaleAlgorithm: ScaleAlgorithm;                      // default "Natural"
                                                       // "Natural" | "Uniform" | "Expressive" | "Symmetric"
                                                       // | "OKLCH" | "Material" | "Linear" | "Fidelity"
scaleLength: number;                                  // default 25 — scale mode only
solverMode: SolverMode;                               // default "natural"
                                                       // "natural" | "constant-chroma" | "symmetric"
                                                       // | "hue-locked" | "max-chroma" | "gamut-cusp"
                                                       // | "apca-natural"
useUniformAlgorithm: boolean;                         // default true — one algorithm/solver for all colors
algorithmScopeLevel: "color" | "role";                // default "color" — only matters when
                                                       // useUniformAlgorithm: false, and only affects Direct mode

tokenNameSegments: TokenNameSegment[];                // default ["color", "role", "variation"]
                                                       // any permutation, or 2-element array to omit "role"
useShorthandColors: boolean;                          // default false
useShorthandRoles: boolean;                           // default false
useShorthandVariations: boolean;                      // default false
useShorthandSteps: boolean;                           // default false

includeSourceColors: boolean;                         // default false — writes raw seed hexes to a separate collection
sourceCollectionName: string;                         // default "_constants"
alphaValues: number[];                                // default [] — e.g. [10, 25, 50, 75, 90], needs includeSourceColors: true
includeColorScalesCollection: boolean;                // default true — false ⇒ tokens get raw hex, same as Direct mode
includeDescriptions: boolean;                         // default false
scaleCollectionName: string;                          // default "_scale"
tokenCollectionName: string;                          // default "color tokens"

scaleSteps: ScaleStep[] | string[] | null;            // default null — see §9, genuinely underused
useSharedRoleVariants: boolean;                       // default true — roles use the global `variations` list

name: string;                                          // project display name (not the Preset's own id/name)
description: string;

colors: Color[];
roles: Role[];
variations: Variation[];      // global list — used whenever a role's own `variations` is null/omitted
themes: Theme[];
```

### Entity shapes, complete (`src/shared/types.ts`)

```ts
interface Variation {
  _id?: string;
  name: string;
  shorthand: string;
  target?: number;             // WCAG contrast ratio; omit ⇒ defaults to 4.5 at validation
}

interface Color {
  _id?: string;
  name: string;
  shorthand: string;
  value: string;                // hex
  description?: string;
  scaleAlgorithm?: ScaleAlgorithm; // per-color override — only read when useUniformAlgorithm: false
  solverMode?: SolverMode;         // per-color override — only read when algorithmScopeLevel !== "role"
}

interface Role {
  _id?: string;
  name: string;
  shorthand: string;
  variations?: Variation[] | null; // null ⇒ defer to global `variations` list (see useSharedRoleVariants)
  scaleAlgorithm?: ScaleAlgorithm;  // per-role override — DEAD in Scale mode, see §2
  solverMode?: SolverMode;          // per-role override — works in Direct mode when algorithmScopeLevel: "role"
  description?: string;
  scopedColorIds?: string[] | null; // restrict this role to specific colors (by _id or name) — see §6
  localBg?: RoleLocalBg | null;      // contrast-chain against something other than the theme bg — see §7
  scopes?: VariableScope[];          // Figma variable-consumption scoping — see §8, unused by every shipped preset
}

interface Theme {
  _id?: string;
  name: string;
  bg: string;                   // hex background this theme's contrast is evaluated against
  description?: string;
}

type ScaleAlgorithm = "Natural" | "Uniform" | "Expressive" | "Symmetric" | "OKLCH" | "Material" | "Linear" | "Fidelity";
type SolverMode = "natural" | "constant-chroma" | "symmetric" | "hue-locked" | "max-chroma" | "gamut-cusp" | "apca-natural";
type TokenNameSegment = "color" | "role" | "variation";
type VariableScope = "FRAME_FILL" | "SHAPE_FILL" | "TEXT_FILL" | "STROKE_COLOR" | "EFFECT_COLOR" | "ALL_SCOPES";
```

---

## 4. The complete validation and dependency matrix

There are **three separate, non-overlapping validation layers** in this codebase, and
none of them catches everything the others miss. Know all three, and know exactly what
falls through the cracks of all three combined — that's where a preset silently
misbehaves instead of erroring.

### Layer 1 — build-time (`validatePreset.ts`, runs in `npm run build`/`watch`)

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
path. Every one of these is a real, reachable silent-failure mode — see the subsections
below.

### Layer 2 — runtime, pre-sync (`validateProjectStore()`, fires when a user clicks Run)

**A separate, differently-scoped validator** — `src/ui/store/projectStore.ts:380-428` —
that only ever runs inside the live plugin (RunDialog's "validation-warning" phase),
never during `npm run build`. A preset can pass Layer 1 cleanly and still trip this the
first time someone runs it. It requires at least one color and one role to exist at
all, then checks:

- No color/role/variation has an empty `name` (redundant with Layer 1 for colors/roles,
  but Layer 1 never checks variation names — this is the only layer that does).
- **Segment-depth matching**: a `shorthand` must have the same number of `/`-separated
  segments as its `name`. `name: "Brand/Primary"` (2 segments) requires a 2-segment
  shorthand like `"br/pr"` — a flat `"bp"` fails this check. Checked for colors, roles,
  the global `variations` list, and every role's own `variations` list independently.
  **Layer 1 never checks this at all** — a preset file with mismatched segment depths
  builds cleanly and only surfaces this warning inside the live plugin.
- **Resolved-label uniqueness**: after applying `useShorthandColors`/`useShorthandRoles`/
  `useShorthandVariations`, do any two colors/roles/variations (each axis checked
  independently) resolve to the *same displayed label*? This catches "two colors whose
  full names differ but whose shorthands collide," which Layer 1's
  `color-shorthand-unique` rule (raw shorthand string comparison, not label-resolution-
  aware) already mostly covers — but this check is the one that actually models what
  `useShorthand*` produces.
- Plain duplicate-name and duplicate-shorthand checks for colors and roles (case-
  insensitive), independent of the segment/label checks above.

**Still not checked by Layer 1 or 2 combined**: the *joined, cross-entity* token path.
Both layers check "are all color labels unique among colors" and "are all role labels
unique among roles" separately — neither checks whether a specific (color, role,
variation) triple, once assembled via `tokenNameSegments` into a final path, collides
with a *different* triple's assembled path. This is a real, reachable gap — see
"Token-path collisions" below.

### Layer 3 — silent runtime fallbacks (the engine itself, no warning ever shown)

Below Layer 1 and 2, the engine has its own defense-in-depth fallbacks for malformed
data that reaches it anyway (e.g. hand-edited live plugin state, not a build-validated
preset file). These **never produce an error or a visible warning** — know them so you
don't mistake "the engine didn't crash" for "the configuration is correct":

- **Empty `role.shorthand`/`color.shorthand`** → the Figma-sync layer derives a 2-character
  fallback from the name (`role.name.substring(0, 2).toLowerCase()`,
  `src/figma/config.ts:133`) rather than crashing. Unreachable via a Layer-1-validated
  preset (which requires non-empty shorthand), but real if the plugin's own UI ever
  produces one.
- **Duplicate theme names** reaching the Figma-sync layer get auto-suffixed
  (`"Light"`, `"Light 2"`, `"Light 3"`, …) rather than erroring
  (`_deduplicateThemeNames`, `src/figma/config.ts:100-116`). Also unreachable via a
  Layer-1-validated preset (`theme-name-unique` already blocks this at build time).
- **Invalid `theme.bg`** falls back to `"#FFFFFF"` at this same layer.
- **Invalid `solverMode`/`algorithmScopeLevel` strings** reaching the engine silently
  fall back to `"natural"`/`"color"` respectively — Layer 1 already rejects these as
  build errors, so this only matters for hand-edited state.
- **A `localBg`-chained role whose variation ladder demands a contrast target above
  what its fixed chained background can achieve.** Technically not silent — the engine
  does push a `warning` string into `result.errors.warnings` — but no layer surfaces it
  as a per-token flag the way `isAdjusted` does in Scale mode, so it's practically
  invisible unless you read the warnings array directly. Every variation past the
  achievable ceiling collapses onto the same clipped black/white hex. See §7's `localBg`
  gotcha above — this is a real, previously-undetected defect in the shipped
  `nclarity.ts` preset, not a hypothetical.

### Field-level valid ranges and defaults, precise

| Field | Type/range | Default | Notes |
| --- | --- | --- | --- |
| `variation.target` | number, `(0, 21]` | `4.5` (Layer 1 auto-fix) | `21` is the mathematical WCAG contrast ceiling (pure black on pure white) |
| `alphaValues[]` | integers `0-100` | `[]` | **Whole-number percentages, not fractions** — `alpha = value / 100` (`figmaVars.ts:292`). Passing `0.5` intending "half" produces a ~0.5% (nearly invisible) alpha, not 50%; use `50`. Out-of-range values are silently dropped when the string-input parser runs (`ensureVariations()`), not when passed as a real preset array — a preset's raw `.ts` array is not re-clamped, so double-check values are in range yourself |
| `scaleLength` | positive integer | `25` | No explicit maximum anywhere; the log-luminance step math (`scaleMaker`) stays numerically stable across any practical N (verified N=1 through N=500 by direct calculation) — there's no engine-side reason to avoid a large value, only Figma-side practicality (that many scale variables). `0` or negative is a hard build-time error (Layer 1) because the math produces `NaN`/`-Infinity` if it ever reached the engine ungated |
| `scaleSteps` length vs `scaleLength` | should match | `null` (falls back to bare `"1".."N"`) | **Silently tolerated if they don't match** — extra `scaleSteps` entries beyond `scaleLength` are simply never consulted; if `scaleSteps` is shorter than `scaleLength`, the missing trailing steps just use their bare numeric name with no shorthand. Not an error at any layer — verify by counting yourself |
| `sourceCollectionName`/`scaleCollectionName`/`tokenCollectionName` | any string | `"_constants"` / `"_scale"` / `"color tokens"` | **Not validated for collisions against each other, at any layer.** Figma collections are matched purely by name (`getOrCreateCollection`, `figmaVars.ts:249-255`) — if two of these three fields share a literal string, both feature areas write into the *same* Figma collection, since Figma has no separate namespacing beyond name. Always pick three distinct names |
| `localBg: { kind: "hex", value: {...} }` keys | must be **lowercase theme name** | — | The engine looks up `role.localBgResolved[mode.name.toLowerCase()]` (`clrEngine.ts:358`) — a theme named `"Light"` needs the record key `"light"`, not `"Light"`. Get this wrong and it silently falls through to the theme's own background, no warning |

### Dead-in-a-mode fields, consolidated

| Field | Dead in | Why |
| --- | --- | --- |
| `role.scaleAlgorithm` | Scale mode (always) | `_generateScales` only ever reads `color.scaleAlgorithm`, never `role.scaleAlgorithm`, regardless of `algorithmScopeLevel` — see §2 |
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

### Token-path collisions — the gap no validator catches

Both Layer 1 and Layer 2 check *per-axis* uniqueness (all color names distinct from
each other; all role names distinct from each other; all variation names distinct from
each other) — **neither ever checks the final, joined Figma variable path** that
`tokenNameSegments` assembles from a specific (color, role, variation) triple
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
always-3-part `color/role/variation` identity key used for rename tracking) correctly
still treats them as two distinct tokens. **When a preset uses a `tokenNameSegments`
array shorter than 3, manually verify — by reading the assembled paths in Preview, not
by trusting a validator — that no two (color, role, variation) triples can produce an
identical joined string.** The Tailwind-style `["color", "variation"]` pattern (role
omitted) is safe specifically because every role's variations are typically the same
shared ladder and each color still contributes a distinct first segment; the risk is
concentrated in `["role", "variation"]` (color omitted) or any custom subset that drops
the one segment that would have kept two otherwise-identical triples apart.

### Monotonicity is checked, but never blocks anything

A dedicated function for this exists — `validateVariationContrasts()`
(`src/shared/engine/clrEngine.ts:474-480`), which checks that a `target[]` array is
strictly increasing — but it has **zero call sites anywhere in the codebase**. It is
completely dead code. The actual, *working* monotonicity check lives entirely
separately, inside the plugin's own Health tab (`src/ui/screens/run-dialog/tabs/health/
useHealthReport.ts`'s "Inversions" metric) — which detects
non-monotonic variation targets **after** tokens are generated and displays them as an
informational metric a user can choose to ignore. **There is no layer, at any point in
the pipeline, that blocks a build or a sync because a role's variation targets aren't
in increasing order.** If your preset's variation ladder isn't monotonic (e.g. targets
`[4.5, 3.0, 7.0]` instead of `[3.0, 4.5, 7.0]`), it will build, validate, and sync
without complaint — only the live plugin's Health tab will ever surface it, and only if
someone looks.

---

## 5. Metadata quality: `id`/`name`/`description`/`tags`/`badge`/`swatches`

These aren't decoration — they're the entire Theme Shop / QuickStart browsing
experience, and a "godly" preset makes them earn their keep:

- **`tags`** drive Theme Shop search (`ThemeShopOverlay.tsx` filters name, description,
  tags, and badge against the search query) — include the real-world system name,
  the mode (`"scale"`/`"direct"`), the primary algorithm/solver, and any distinguishing
  trait (`"enterprise"`, `"mobile"`, `"multi-theme"`).
- **`badge`** shows as a short tag on the QuickStart card — 1–2 words, brand-recognizable
  (`"Carbon"`, `"Apple"`).
- **`swatches`** is optional — if omitted, `ShopCard.tsx` auto-derives it from
  `config.colors`, stripping the `#`. Set it explicitly only when you want to curate
  *which* colors show (e.g. a 14-color preset like nClarity might want to show only the
  5 brand/status colors, not the spare palette too) — otherwise let it auto-derive.
- **`description`** should state the mode, theme count, and what makes this preset's
  architecture distinct in one sentence — every shipped preset's top-of-file comment
  plus its `description` field together should let someone understand the whole system
  without opening the role list.

---

## 6. Per-role variation override and color scoping

Most roles should defer to the global `variations` list. Give a role its own
`variations[]` (and set `useSharedRoleVariants: false` project-wide) when the role has
a fundamentally different semantic model than an intensity scale — the canonical case
is status colors, which need fixed slots, not a 1–5 intensity ladder:

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
`validatePreset.ts`'s `role-scoped-color-ids-exist` rule) restricts a role to specific
colors instead of generating tokens for every color — use it for per-color status
roles so you don't get a `status/success` token rendered against the error-red seed
too. Every color not in the list is simply skipped for that role (`_solveDirectMode`
and `_processScaleMode` both check `role.scopedColorIds` first thing and `continue` if
the current color isn't in it).

---

## 7. `localBg`: five ways to chain contrast against something other than the theme

`role.localBg` lets a role's contrast be evaluated against something other than the raw
theme background — essential for text-on-fill, layered surfaces, or anything that
isn't sitting directly on the page. **Five kinds exist in the type
(`RoleLocalBgKind`), but every shipped and dev preset in this codebase uses only one of
them (`token-dynamic`).** Know all five — this is exactly the kind of unused capability
that separates a complete preset from a merely-adequate one:

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
| `hex` | `Record<themeName, hex>` | A literal, hand-authored background per theme — no lookup at all | A role sits on a fixed decorative color that isn't itself a token or seed (e.g. contrast against a brand illustration's known background) |
| `color` | a color's `name` | That color's raw seed hex, same value in every theme | A role always sits on one specific seed color's raw swatch, not a token derived from it (e.g. "this label always sits on the raw Brand/Primary hex, regardless of what token that resolves to") |
| `token-static` | one fixed token reference string, e.g. `"Neutral/Surface/Default"` | That exact token's resolved hex, looked up from the engine's own first-pass output | A role sits on one specific, named token that's the same regardless of which color the role's *own* token belongs to |
| `token-dynamic` | a templated ref containing the literal `[color]` placeholder, e.g. `"[color]/fill/button/default"` | Per-color: `[color]` is substituted with each color's own name before lookup | A role sits on **that same color's own** other token — e.g. "this color's button-label text is solved against this same color's own button-fill token," the nClarity/showcase pattern below |

**`token-static`/`token-dynamic` example — synthesize this pattern yourself, it's real
and engine-supported even though no preset demonstrates `token-static` specifically:**

```ts
// token-static — every role instance points at the SAME one token regardless of color
{
  name: "text/onNeutralSurface",
  shorthand: "t/ons",
  solverMode: "natural",
  variations: [ /* ... */ ],
  localBg: { kind: "token-static", value: "Neutral/Surface/Default" },
}

// token-dynamic — each color's role instance points at THAT COLOR's own other token
{
  name: "text/buttonLabel",
  shorthand: "t/btn",
  solverMode: "symmetric",
  variations: [ /* ... */ ],
  localBg: { kind: "token-dynamic", value: "[color]/fill/button/default" },
}

// color — pin directly to a seed's raw hex, bypassing tokens entirely
{
  name: "badge/onBrandSwatch",
  shorthand: "b/obs",
  solverMode: "natural",
  variations: [ /* ... */ ],
  localBg: { kind: "color", value: "Brand/Primary" },
}

// hex — a fixed, hand-authored background per theme, no lookup
{
  name: "overlay/onHero",
  shorthand: "ov/hero",
  solverMode: "natural",
  variations: [ /* ... */ ],
  localBg: { kind: "hex", value: { light: "#1A2B3C", dark: "#0A1520" } },
}
```

See `src/shared/presets/raw/dev/nclarity.ts` and `raw/dev/showcase.ts` in full for
`token-dynamic` used together with scoped status roles in a real preset.

### Gotcha: `localBg` resolves once per role — don't chain a multi-step ladder to it

`localBg` produces **exactly one background hex per (role, color, theme)** — there is
no per-variation override in the schema. If a role has a 5-step variation ladder (say,
Disabled 1.5 → Subtle 3.0 → Rest 4.5 → Hover 6.0 → Pressed 8.0) and every variation
chains to the *same* `token-dynamic`/`token-static` ref, all five targets are being
solved against one fixed background — which has its own hard contrast ceiling (often
only ~4.4–5.1:1 for a mid-tone brand fill against a light surface). Any target above
that ceiling is mathematically unreachable: the solver clips to black/white and emits a
`warning`, but **does not set `isAdjusted`** (that flag only exists in Scale mode's
step-search fallback), so every variation past the ceiling silently collapses onto the
identical clipped hex with nothing in Preview's per-token badges calling it out — you
have to actually read `result.errors.warnings`.

This is exactly the trap the `text/buttonLabel` pattern (§7's own worked example above)
walks straight into if copied uncritically: chaining a full interaction-state ladder
(Disabled → Hovered → Pressed) to one fixed `fill/button/default` ref. Verified: this
exact defect exists today, undetected, in the shipped `nclarity.ts` reference preset
itself, across all 13 colors × 3 themes (color-master skill's §8.1 has the full
diagnosis and the recipe to check for it). **A role that sits on another token via
`localBg` should carry at most 1–2 variations** — realistically "Default/Enabled" and
"Disabled" — not a full 5-step intensity or interaction ladder, because a label/icon
color on top of a fill doesn't itself have Hover/Pressed states; only the fill it sits
on does. If a role genuinely needs multiple on-fill states, split it into one
single-variation role per fill-state, each chained to that exact matching step (e.g.
`text/onBrand/disabled` → `fill/brand/Disabled`, `text/onBrand/default` →
`fill/brand/Rest`), so each solve has its own achievable background rather than sharing
one that only supports the lowest common target.

### How resolution actually works (two-pass, with cycle protection)

`localBg` in preset source is a *config-time* shape; the engine translates it into
three runtime-only fields at load (`translateLocalBg()`,
`src/shared/engine/clrUtils.ts:250`) — `localBgResolved` (theme→hex map, ready
immediately for `hex`/`color` kinds), `localBgTokenRef` (`token-static`, unresolved),
and `localBgDynamicRef` (`token-dynamic`, unresolved, still containing `[color]`).

`token-static`/`token-dynamic` need an **actual token value to look up**, which doesn't
exist until the engine has already run once. So the real pipeline is:

1. Run `variableMaker()` once, using theme backgrounds for any role with an unresolved
   token ref (temporary/wrong for those roles, but everything else is now correct).
2. Call `resolveTokenRefBgs(config, result)` (`clrUtils.ts:25`) — it scans the first
   pass's actual output tokens, matches each `localBgTokenRef`/`localBgDynamicRef`
   against a real token by slugified name, and writes the resolved hex(es) into
   `localBgResolved`/`localBgPerColor`. Returns `true` if anything was resolved.
3. If it returned `true`, **run `variableMaker()` again** — now every chained role
   solves against the real token value from pass one.

**Built-in cycle protection**: if Role A's `localBg` points at a token produced by Role
B, and Role B's `localBg` in turn points back at a token produced by Role A, `A→B→A`
would never converge. `resolveTokenRefBgs` detects this ("tainted" role tracking,
`clrUtils.ts:29,62`) and clears the ref for the second role in the cycle, falling back
silently to the theme background rather than looping forever or crashing. Don't design
a role architecture that relies on a genuine bg-dependency cycle — it will resolve, but
not the way you intended.

---

## 8. Figma variable scoping (`role.scopes`) — real, engine-supported, unused everywhere

`role.scopes: VariableScope[]` restricts which Figma property pickers a token appears
in — `"FRAME_FILL"`, `"SHAPE_FILL"`, `"TEXT_FILL"`, `"STROKE_COLOR"`, `"EFFECT_COLOR"`,
or `"ALL_SCOPES"` (the default when `scopes` is omitted or empty —
`figmaVars.ts:475,496`). **No shipped or dev preset in this codebase sets this field —
it's a real, fully-wired capability nobody has used yet.**

Use it when a role is conceptually restricted to one kind of surface and you want
Figma's own UI to enforce that instead of relying on designer discipline:

```ts
{
  name: "text/body",
  shorthand: "t/bd",
  variations: [ /* ... */ ],
  scopes: ["TEXT_FILL"], // only ever offered when picking a text fill in Figma
}
```

This is a real quality-of-life addition for a "complete" preset targeting a team that
will consume it inside Figma directly (as opposed to only exporting to code) — a
`border/*` role scoped to `["STROKE_COLOR"]`, a `text/*` role scoped to `["TEXT_FILL"]`,
and a `background/*`/`fill/*` role scoped to `["FRAME_FILL", "SHAPE_FILL"]` prevents an
entire category of "picked the wrong token for this property" mistakes at the design
tool level, for free.

---

## 9. Custom scale-step labels (`scaleSteps`) — also real, also unused everywhere

Every shipped preset — including Radix (whose real-world system uses named 1–12 steps)
and Tailwind (50/100/.../950) — leaves `scaleSteps: null`. With `null`, Scale mode's
step names are just bare integers `1, 2, ..., N` (`seriesMaker()`,
`src/shared/engine/clrUtils.ts:231`) internally; any Tailwind-looking numbers you've
seen in token *names* come from `tokenNameSegments`/shorthand tricks on top of those
bare integers, not from labeled steps.

`scaleSteps` accepts either bare strings or `{name, shorthand}` objects, mapped
**1:1 by array index** onto scale steps `0..scaleLength-1`:

```ts
scaleLength: 11,
scaleSteps: [
  { name: "50", shorthand: "50" },
  { name: "100", shorthand: "100" },
  { name: "200", shorthand: "200" },
  { name: "300", shorthand: "300" },
  { name: "400", shorthand: "400" },
  { name: "500", shorthand: "500" },
  { name: "600", shorthand: "600" },
  { name: "700", shorthand: "700" },
  { name: "800", shorthand: "800" },
  { name: "900", shorthand: "900" },
  { name: "950", shorthand: "950" },
],
```

This is the actual mechanism to reach for whenever a preset is explicitly modeling a
named reference scale (Tailwind's 50–950, Radix's 1–12, Material's 0/10/20/.../100) —
the step's own Figma variable name (in the `_scale` collection) and its
`{color.name}-{step}` internal key both use this label, not just the token name that
references it. This is a concrete, verified gap in every existing preset — using it
correctly is a genuine improvement over copying the existing pattern.

---

## 10. Reference presets to copy from

Don't start from a blank object — copy the closest existing preset and adapt:

| If you're building...                              | Copy this preset                              |
| ---------------------------------------------------- | ---------------------------------------------- |
| An empty scaffold — just the variation ladder, no colors/roles yet | `src/shared/presets/raw/dev/blank.ts` (Blank Slate) |
| A simple product system, brand-first, fully populated example | `src/shared/presets/raw/dev/wand.ts` (Regular Wand) |
| Enterprise / deep role hierarchy, multiple neutral themes | `src/shared/presets/raw/carbon.ts` (IBM Carbon) |
| iOS/macOS semantic label/fill hierarchy               | `src/shared/presets/raw/apple.ts`               |
| Utility/flat `Color/Step` naming (Tailwind-style)      | `src/shared/presets/raw/tailwind.ts`            |
| Status roles + per-color scoping + contrast chaining  | `src/shared/presets/raw/dev/nclarity.ts`        |
| HCT/Material You tonal palette                        | `src/shared/presets/raw/material.ts`            |
| Every feature at once, for reference                  | `src/shared/presets/raw/dev/showcase.ts`        |

Read `Documentations/knowledge/features-and-tricks.md`'s "Preset Quick Reference" table
for the full inventory (mode, algorithm, color/role/theme counts) before picking. Note
that even `showcase.ts` — the widest feature-coverage dev preset — still doesn't touch
`role.scopes` or custom `scaleSteps`; don't assume "the reference preset does it" is a
ceiling on what's possible.

## 11. Writing and wiring the file

1. Create `src/shared/presets/raw/dev/<name>.ts` (dev-only — fast iteration, excluded
   from `--release` builds, **auto-discovered**, no registration needed) or
   `src/shared/presets/raw/<name>.ts` (shipped preset) modeled on `carbon.ts`'s
   structure: a top-of-file comment documenting the role/variation architecture and
   contrast targets (every existing preset does this — it's load-bearing
   documentation, not decoration), then `const presets: Preset[] = [{...}]; export
   default presets;`.
2. **If it's a shipped preset (not `raw/dev/`), you must manually wire it into
   `scripts/build-presets.ts`**: add an import line and add it to the `all = [...]`
   merge array and the summary-logging array. Dev presets under `raw/dev/` need none
   of this — every `.ts`/`.js` file there is picked up automatically.
3. Give every color/role/variation a stable `_id` if you want rename-safety from the
   start (not required for a first draft, but required before this preset is used to
   sync a real Figma file that will later be edited — see the rename-safety system in
   `Documentations/knowledge/how-it-works.md`).
4. Run `npm run build` (or `npm run watch` while iterating) — this runs
   `scripts/build-presets.ts`, which auto-formats your raw file with Prettier and runs
   `validateAndFixPreset()` (`src/shared/presets/validatePreset.ts`) against it.
5. **Validation will catch and auto-fix**: hex normalization, missing `variation.target`
   (defaults to 4.5), and will **error** (build fails) on: invalid/malformed hex,
   duplicate color/role shorthand, duplicate theme names, `target` not in `(0, 21]`,
   `scopedColorIds` referencing a nonexistent color `_id`/name, invalid enum values for
   `pluginMode`/`scaleAlgorithm`/`solverMode`/`algorithmScopeLevel`/`tokenNameSegments`,
   non-positive-integer `scaleLength` in Scale mode. Fix everything the build reports
   before moving on. Note: validation does **not** check `localBg`'s token references
   resolve to anything real, or that `scopes` contains valid enum values beyond basic
   shape — a typo'd `token-static`/`token-dynamic` ref silently falls back to the theme
   background instead of erroring, so verify these in Preview, not just via the build.
6. Load the plugin in Figma (`manifest.json` via Plugins → Development → Import), open
   Theme Shop, load your preset, and use the **Preview tab** to check every token's hex
   and contrast rating before running a real sync.
7. **A clean `npm run build` is not proof the preset is correct — it only proves Layer
   1.** Before calling the file done, manually re-check every `name`/`shorthand` pair
   (colors, roles, the global `variations` list, and every role's own `variations`
   list) for **segment-depth matching**: a `name` with N `/`-separated segments needs a
   `shorthand` with the same N segments (`"Spare/1"` needs `"sp/1"`, not a flat `"s1"`).
   Layer 1 (the build) **never checks this** — only Layer 2, which fires inside the
   live plugin's own Colors/Roles tab UI (visible as a segment-count mismatch warning
   right in the row), not at build time. This is not a hypothetical: it was missed in a
   real `nmobile.ts` draft that had already passed `npm run build` cleanly — every
   `Spare/N` color kept a flat `sN` shorthand from before the color was renamed to add
   a `/` segment, and nothing in the build caught it. If you rename a color/role to add
   or remove a `/` segment, immediately re-check its shorthand in the same edit — don't
   rely on the build to catch it later, because it won't.

## 12. After the first draft: hand off to color-master

A preset that builds cleanly and looks right in Preview for one seed color is not
proven — you've fixed the *structure* (roles, variations, targets, naming, contrast
chaining, scoping), but not whether the actual output is harmonic, vivid, or
contrast-reliable across every seed color a real user will type in. That judgment, and
the tooling to back it up empirically instead of by eyeballing swatches, belongs to the
**color-master** skill. Invoke it once the role/variation architecture is settled,
before calling the preset done.
