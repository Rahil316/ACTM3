---
name: color-master
description: Make a Token Wand preset's actual color output harmonic, vivid, and contrast-reliable — by running the engine's own tools (test-data/ stress-test harness, Preview screen, contrast math) and by knowing the exact formula behind every scale algorithm and solver mode, rather than eyeballing swatches. This is the "color master" role — quality/harmony of the token collection, not design-system structure. Use after a preset's roles/variations/architecture exist (see preset-author skill) and you need to pick/verify the algorithm or solver mode, diagnose why a color looks wrong, or prove a preset is production-ready across real seed colors.
---

# Color Master — proving a preset's color output is good, with tools not eyes

You are acting as the **color master**: the specialist in making a token collection
*harmonic* and *maximally good* — vivid where it should be, gamut-honest, contrast-
reliable, consistent across hue families. You do not decide role/variation architecture
(that's the **preset-author** skill). You take an existing preset's structure and make
its actual colors right, and you do it **empirically, using the codebase's own
instruments**, never by "this looks about right."

The core discipline: **every claim about color quality must be backed by a number this
codebase already computes** — a contrast ratio, a chroma value, an anomaly count from
the stress-test harness — not a visual impression. This codebase has already found and
fixed multiple real color-math bugs (CAM16 hue drift, OKLCH gamut instability near
white) purely because someone ran the numbers instead of trusting a swatch. Work the
same way. Knowing the exact formula behind each algorithm/solver mode (§§2–3 below) is
what turns "this looks a bit dull" into "this is `natural` solver mode, which tapers
chroma proportional to `min(L, 1-L)` — of course it desaturates near the extremes, that
is the formula working as designed, not a bug."

## Your instruments

1. **The stress-test harness** (`test-data/`) — runs `variableMaker()` against 42,752
   generated seed/algorithm/target combinations (see §1 for the exact matrix) and
   produces both a queryable dashboard and raw per-token JSONL you can `jq`/script
   directly. Use this to validate an algorithm/solver choice *in general*, and to check
   a specific preset's seed colors against known failure clusters.
2. **The Preview screen** (in-plugin) — shows every computed token's hex, contrast
   ratio, and rating for the *actual* preset you're editing, before syncing to Figma.
   Use this for the specific preset in front of you.
3. **The engine's own diagnostics** — `isAdjusted` (target unreachable, fell back to
   closest step), `chromaReduced`/`clipped` (gamut-limited), `warning` strings on
   `SolverResult`. These are the engine telling you it compromised — never ignore one
   without understanding why.
4. **The formulas themselves** — `src/shared/engine/clrEngine.ts` (scale algorithms,
   `TONAL_SCALE_ALGO`, lines 77–248) and `src/shared/engine/solverEngine.ts` (solver
   modes, `_targetChroma`, lines 109–124). Both files are short (480 and 302 lines) —
   read them directly rather than working from memory of what an algorithm "roughly"
   does. §§2–3 below summarize every formula verbatim.
5. **A headless run of the actual preset** — when you're not inside a live Figma session
   (no Preview screen available) and the question is specific to *this preset's real
   role graph* rather than the general algorithm grid, run the preset's own config
   straight through the engine in a throwaway script. This is the only instrument that
   exercises a preset's actual `scopedColorIds`, `localBg` chaining, and per-role
   variation ladders exactly as configured — the stress harness's synthetic 2-role rig
   doesn't model any of those, and Preview isn't scriptable outside the plugin. See §8
   for the exact recipe; this is not optional busywork; it is how the nmobile preset's
   `text/onBrand` bug (§8) was actually caught, and Preview/harness alone would not have
   caught it.

Read `Documentations/knowledge/color-algorithm-roadmap.md` in full before starting
nontrivial harmony work — it documents, with root causes and numeric evidence, every
known color-math defect and quirk in this engine (hue-uniformity bias, gamut-envelope
cliffs, and the now-removed `hue-locked` mode's history). Don't rediscover what's
already diagnosed there; build on it.

---

## 1. The stress-test harness, exactly

```
npx tsx test-data/run.ts
```

Runs, in order: `generate-configs.ts` → `run-stress-test.ts` → `analyze-results.ts` →
`build-report.ts`. Each stage is also runnable standalone
(`npx tsx test-data/scripts/<stage>.ts`) if you only need to re-run analysis after
tweaking a threshold. Not wired into `npm run check` — run it explicitly. There is no
CI gate here; you are the gate.

### The exact test matrix

`generate-configs.ts` builds seeds from four named groups, not one flat sweep — each
group exists to stress a *specific*, documented failure mode:

| Seed group | Construction | Seed count | Purpose |
| --- | --- | --- | --- |
| `grid` | 24 hues (15° steps) × 5 saturations (10/30/50/70/90) × 7 lightness levels (10/25/40/50/60/75/90) | 840 | Broad, unbiased general coverage |
| `warm-hue-cluster` | 10 hues (45°–90° in 5° steps) × 3 saturations (60/80/100) × 6 lightness levels | 180 | Dense sampling of the documented yellow/lime/warm-green hue-uniformity weak spot |
| `low-chroma-cluster` | 12 hues (30° steps) × 5 saturations (3/6/10/15/20) × 5 lightness levels | 300 | Stresses `gamut-cusp`/`apca-natural`'s `srcC / envelope` fraction math near zero, where a bug would show as a degenerate fraction (0 or NaN) |
| `edge-case` | 16 hand-picked: pure black/white, mid-gray, near-black/white, 6 primaries/secondaries, very light/dark gray, 3 high-chroma extremes (chartreuse, orange-red, blue-violet) | 16 | Boundary conditions no systematic sweep would hit by chance |

**Total: 1,336 seeds.** Every seed is run through:
- **Scale mode**: × 8 scale algorithms → **10,688 cases** (1,336 × 8)
- **Direct mode**: × 6 solver modes × 4 contrast-target-set variants (`[1.5,3,4.5,7,12]`,
  `[3,4.5]`, `[4.5]`, `[7,12]`) → **32,064 cases** (1,336 × 6 × 4)
- **Grand total: 42,752 cases** per full run.

This is not an approximation — it's the literal count from `run-meta.json` after a real
run (`totalCases: 42752, scaleModeCases: 10688, directModeCases: 32064`), and it's
exactly reproducible from `generate-configs.ts`'s loop structure. (Direct mode is 6
solver modes, not 7 — `hue-locked` was removed from `SolverMode` entirely; it was a
no-op alias for `natural` and has no successor value, see the numeric proof this used to
cite, now superseded, in `color-algorithm-roadmap.md`.)

### Where the results actually live

```
test-data/results/
  run-meta.json        tiny — case counts, generation timestamp
  run-records.jsonl     ~170MB — one full RunRecord per case, every token's contrast detail
  anomalies.jsonl        ~2.5MB — one flagged issue per line
  anomaly-report.md      human-readable summary, greppable, no browser needed
  dashboard-data.json   ~170MB — same data as run-records, pre-aggregated for the dashboard
  dashboard.html         ~170MB, self-contained — open directly, no server
```

`run-records.jsonl` and `dashboard-data.json` are large enough that **querying them
directly with `jq` is almost always faster than opening the dashboard**, especially for
a specific, narrow question. Prefer this over the browser for anything scriptable:

```bash
# How many critical/high anomalies right now, by type
jq -s 'group_by(.type) | map({type: .[0].type, n: length})' test-data/results/anomalies.jsonl

# Every case for a specific scale algorithm with any warning/fail
jq 'select(.scaleAlgorithm == "Linear" and (.warningCount > 0 or .failRatingCount > 0)) | .caseId' \
  test-data/results/run-records.jsonl

# Worst contrast shortfall across the whole run
jq -s 'map(select(.minContrastDelta != null)) | min_by(.minContrastDelta) | {caseId, minContrastDelta}' \
  test-data/results/run-records.jsonl

# All tokens for one specific case (paste a caseId from anomaly-report.md)
jq 'select(.caseId == "scale_h60_s90_l50_Linear_len5") | .tokens' test-data/results/run-records.jsonl
```

`anomaly-report.md` is the fastest sanity check of all — read it directly with no
tooling when you just need "is anything broken right now."

### Real numbers from an actual run — read before forming any opinion

These are not illustrative — this is what a full run of this exact harness produced
(`test-data/results/anomaly-report.md`, `dashboard-data.json`, generated 2026-07-15,
post-`hue-locked`-removal). Anchor your reasoning to numbers like these, not intuition:

**Anomaly severity, whole run**: 0 critical, 3,233 high, 16,283 medium, out of 42,752
cases. All 3,233 "high" anomalies are `contrast_target_missed` — every one of them in
**Scale mode** (Direct mode's solver had **zero** flagged cases in this run — its
bisection search essentially always hits target or falls back cleanly with a warning).

**Scale algorithm reliability** (cases with ≥1 warning or Fail rating, out of 1,336
each):

| Algorithm | Flagged | Rate |
| --- | --- | --- |
| `Linear` | 226 / 1336 | 16.9% — by far the worst |
| `OKLCH` | 17 / 1336 | 1.3% |
| `Fidelity` | 8 / 1336 | 0.6% |
| `Natural`, `Uniform`, `Expressive`, `Symmetric`, `Material` | 0 / 1336 | 0% |

Don't over-read the 0% rows — "flagged" here means "missed its contrast target
entirely," which `_mapByScaleContrast`'s fallback logic almost always avoids by walking
to *some* step. A 0% flagged rate does **not** mean an algorithm is hue-safe; see the
vividness numbers below for the metric that actually catches that.

**Quality tab — vividness preserved / went-gray rate / delivers-target rate**, whole
run, per algorithm (`n` = colorful-seed tokens considered):

| Scale algorithm | n | Vividness preserved | Went gray | Delivers target |
| --- | --- | --- | --- | --- |
| `OKLCH` | 14,800 | **0.894** | **0.07%** | 99.87% |
| `Material` | 14,800 | 0.860 | 0.81% | 100% |
| `Fidelity` | 14,800 | 0.794 | 1.99% | 99.94% |
| `Uniform` | 14,800 | 0.792 | 2.61% | 100% |
| `Symmetric` | 14,800 | 0.791 | 2.81% | 100% |
| `Linear` | 14,800 | 0.808 | 0.45% | 98.31% |
| `Expressive` | 14,800 | 0.761 | 4.32% | 100% |
| `Natural` | 14,800 | 0.754 | **4.16%** | 100% |

**`OKLCH` preserves seed vividness better than `Natural` (the shipped default) by a
wide margin** — 89.4% vs. 75.4% average, and a went-gray rate 60x lower (0.07% vs.
4.16%). This is the concrete numeric case for recommending `OKLCH`/`Material`/`Fidelity`
over the HSL-family algorithms whenever pure palette vividness matters more than
matching a specific documented tonal system.

| Solver mode | n | Vividness preserved | Went gray | Delivers target |
| --- | --- | --- | --- | --- |
| `max-chroma` | 29,600 | 0.909 | 0% | 100% |
| `constant-chroma` | 29,600 | 0.906 | 0% | 100% |
| `gamut-cusp` | 29,600 | 0.829 | 0.16% | 100% |
| `apca-natural` | 29,600 | 0.788 | 2.79% | **49.06%** |
| `symmetric` | 29,600 | 0.769 | 0.20% | 100% |
| `natural` | 29,600 | **0.520** | 6.61% | 100% |

(`hue-locked` was removed from `SolverMode` entirely as of 2026-07-15 — it was a no-op
alias for `natural`, verified byte-identical to `natural`'s row above across 29,600
tokens each in the last run that included it, and had no distinct behavior of its own
worth keeping as a separate value. `color-algorithm-roadmap.md` has the full history if
you need it; there is no successor mode — `gamut-cusp` is simply the mode that already
does what `hue-locked`'s description used to promise.)

**`apca-natural`'s "delivers target" rate is 49.06%** — it misses its own effective
target roughly half the time. This isn't necessarily a defect (the WCAG→Lc anchor
table is a hand-fit approximation, not a reference APCA implementation — see
`color-algorithm-roadmap.md`), but it means **`apca-natural` should be treated as
experimental and verified per-use, not assumed reliable** the way the other five
solver modes can be.

**Warm-hue-cluster nuance**: the "flagged" (contrast-miss) rate does *not* discriminate
`Natural` from `OKLCH` on warm hues (both effectively 0% flagged in the harness's
2-role rig) — the hue-uniformity bug doesn't cause missed targets, because
`_mapByScaleContrast`'s fallback always lands on *some* step. It causes **step
collisions**: multiple nominally-distinct variations resolving to the *same or
near-identical* color. Concrete, reproducible example from this run — seed `#3D320F`
(dark warm olive, part of the warm-hue cluster), 5-step scale:

```
Natural:  v1 #C9A631  v2 #8B7326  v3 #8B7326  v4 #56481C  v5 #1E190C
                       ^^^^^^^^^^^^^^^^^^^^^^ identical — v2 and v3 collapsed
OKLCH:    v1 #DACDA6  v2 #9B8F6A  v3 #817551  v4 #514624  v5 #392F0B
                       ^^^^^^^^^^^^^^^^^^^^^^ distinct
```

Same seed, same target contrasts, same step count — `Natural`'s HSL-lightness search
crowds two variations onto the identical hex, `OKLCH`'s perceptually-uniform search
keeps them apart. **This is the check to run when you suspect the hue-uniformity bug**:
pull the actual token hex list for the suspect case (`jq 'select(.caseId == "...") |
.tokens[].value'`) and look for literal duplicate or near-duplicate values across
adjacent variations — not just whether contrast targets were met.

---

## 2. Every scale algorithm, exact formula (Scale mode, `TONAL_SCALE_ALGO`)

All eight live in `src/shared/engine/clrEngine.ts:77-248`. Every algorithm receives the
same `stepLum(i)` target — a log-luminance series shared across all eight
(`scaleMaker`, lines 258–265: `C_max = 21N/(N+1)`, `uMax = ln(0.05·C_max)`,
`uMin = ln(1.05/C_max)`, linearly interpolated across steps, exponentiated back to a
luminance target). What differs is **how each algorithm searches for a color that hits
that luminance target**, and that's where all the character (and all the bugs) live.

| Algorithm | Search space | Chroma/saturation behavior | Formula |
| --- | --- | --- | --- |
| `Linear` | HSL, no search | Fixed hue/sat, even HSL-lightness steps | `L = i · 100/(N+1)`, reversed |
| `Uniform` | HSL, binary-search L | Flat — saturation never changes | search HSL-L for `relLum == stepLum(i)`, sat held at seed's own |
| `Natural` | HSL, binary-search L | Tapered — see below | `tapS(L) = satu × (1 − (\|L−50\|/50)^1.5 × 0.4)` |
| `Expressive` | HSL, binary-search L | Same taper as Natural + hue drift | `shiftH(L)`: rotates hue toward 60° (warm) when `L>50`, toward 240° (cool) when `L<50`, by up to `0.15 ×` the distance from mid, using `shortestHueDiff` |
| `Symmetric` | HSL (log-luminance anchored at seed), binary-search L | Flat — no taper at all | anchors the seed's own luminance (`uSrc = ln(srcLum+0.05)`) at the ramp's middle index, interpolates `u` linearly on each side out to `uMax`/`uMin` |
| `OKLCH` | OKLCH, binary-search L | Constant — held exactly at seed's own C, H | 40-iteration bisection on OKLCH L only; **no gamut-mapping**, can silently clip at extremes |
| `Material` | HCT, closed-form guess + narrow refine | Constant — held exactly at seed's own C, H | `lstarFromY(targetLum·100)` gives a closed-form tone guess, then a ±2-tone, 20-iteration local bisection refines it; correct-by-construction gamut mapping via the vendored `Hct` class |
| `Fidelity` | OKLCH, binary-search L, per-step gamut envelope resample | Gamut-relative fraction, not absolute | `f = min(1, srcC / maxChromaAtLH(srcL, srcH))` computed once from the seed; every step's chroma = `f × maxChromaAtLH(stepL, srcH)`. The seed's own lightness step is snapped to output the **exact seed hex verbatim**, not an approximation |

**Natural's taper formula, spelled out** since it's the shipped default:
`tapS(L) = satu × (1 − (|L − 50| / 50)^1.5 × 0.4)`. At `L = 50` (mid-ramp), taper factor
is 1.0 (full seed saturation). At `L = 0` or `L = 100` (ramp extremes), taper factor is
`1 − 0.4 = 0.6` (40% desaturated). This is a **hand-picked exponent (1.5) and cap
(0.4)** — not derived from any perceptual model, which is exactly why `OKLCH`/`Material`
outperform it on the vividness-preserved metric in §1's real numbers.

**The shared hue-uniformity defect**: `Natural`, `Uniform`, `Expressive`, `Symmetric`
all call the shared `findL` bisection (`clrEngine.ts:267-280`), which measures its
search progress via `relLum(hslToHex(...))` — plain sRGB relative luminance
(`0.2126R + 0.7152G + 0.0722B`). That formula weights green ~10x more than blue at
matched HSL lightness/saturation, so a yellow/warm-green seed hits the *luminance*
target at a much lower *HSL lightness* than a blue seed does, producing the step
collisions shown in §1. `OKLCH`, `Material`, `Fidelity` search in OKLCH-L or HCT-tone
instead — genuinely hue-normalized coordinates — and don't inherit this.

---

## 3. Every solver mode, exact formula (Direct mode, `_targetChroma` + dispatch)

All six live in `src/shared/engine/solverEngine.ts`. (`hue-locked` was a seventh mode,
removed entirely as of 2026-07-15 — it was a no-op alias for `natural`; see §1's note.)
Every mode binary-searches OKLCH lightness `L` (`_searchL`, lines 126–152, or
`_searchLApca` for `apca-natural`, lines 160–187 — up to 60 iterations, `1e-5` epsilon)
against a target contrast, while shaping chroma per-candidate-`L` according to
`_targetChroma()` (lines 109–124):

| Mode | Chroma formula | Character |
| --- | --- | --- |
| `constant-chroma` | `C = srcC` (unconditional) | Flat — maximum color retention, most vivid alongside `max-chroma` |
| `symmetric` | `C = srcC × (1 − \|2L−1\|^1.5)` | Bell curve peaking at `L=0.5` (factor 1.0), collapsing to 0 at `L=0` or `L=1` |
| `natural` | `C = (srcC / max(srcL, 1−srcL)) × min(L, 1−L)` | Scales seed chroma by how far the *candidate* L sits from an extreme, relative to how far the *seed's own* L sits from its nearest extreme — degenerates toward 0 as L approaches 0 or 1 |
| `max-chroma` | `C = min(max(srcC, 0.2), maxChromaAtLH(L, H))` — pushed to the true in-gamut ceiling at every candidate `L`, floored at 0.2 so low-chroma seeds still get real saturation | Most saturated at every lightness — "bold creative" mode |
| `gamut-cusp` | `f = min(1, srcC / maxChromaAtLH(srcL, H))` computed once; `C = f × maxChromaAtLH(L, H)` at each candidate | Gamut-relative fraction (same idea as Scale mode's `Fidelity`) — vivid without `max-chroma`'s uniform-saturation look, still gamut-safe by construction since `f ≤ 1` always |
| `apca-natural` | **identical chroma formula to `gamut-cusp`** (`_gamutRelativeChroma`) — differs only in what the bisection searches for | Same chroma shaping as `gamut-cusp`; the WCAG target is first converted to an APCA Lc value via a 5-point hand-fit anchor table (`WCAG_TO_LC_ANCHORS`: 1.5→23.3, 3→56.4, 4.5→70.7, 7→83.6, 12→96.8, linearly interpolated), then `_searchLApca` bisects on `|apcaContrast(candidate, bg)| ≥ targetLc` instead of WCAG ratio |

**Fallback behavior, all modes**: if the requested target contrast exceeds what's
theoretically achievable against the given background (`_wcagContrast(bgLum, 0-or-1)`),
the solver returns pure black or white immediately with `clipped: true` and a `warning`
— no search is even attempted. If the bisection itself fails to converge (rare — only
after 8+ failed hex conversions), same fallback. Every `SolverResult` carries
`chromaReduced` (true when the requested chroma had to be clamped to the gamut
boundary) and `clipped` (true when the black/white fallback fired) — **always inspect
both**, not just whether the target contrast was hit, since a token can hit its target
exactly while still having had its chroma silently clamped to near-zero.

**Practical solver-mode selection, backed by §1's real numbers**:
- Want maximum, uniform saturation regardless of lightness → `max-chroma` (0.909
  vividness) or `constant-chroma` (0.906) — near-identical in practice, `constant-chroma`
  is cheaper (no per-`L` gamut search) and doesn't need the 0.2 floor hack.
  `max-chroma` will look identical to `constant-chroma` whenever the seed's own chroma
  is already at or near the gamut ceiling for its hue; the floor only matters for
  seeds you deliberately picked at a lower base saturation.
- Want vivid but gamut-honest (respects that some hues can't sustain uniform chroma) →
  `gamut-cusp` (0.829 vividness, near-zero went-gray rate).
- Want a calm, natural-looking falloff toward the extremes → `symmetric` (0.769).
- **Avoid `natural` when vividness matters** — 0.520 vividness is the weakest of the
  six. Use it only when you specifically want that heavy desaturation-toward-extremes
  look (it's a legitimate aesthetic, e.g. muted/quiet UI text), not by default.
- **Treat `apca-natural` as experimental** — 49% delivers-target rate. Don't ship it in
  a preset without running Preview against every one of that preset's actual roles and
  confirming achieved contrast, since the aggregate number says it misses its converted
  target about half the time.

---

## 4. Checking your specific preset's seed colors, not just the general grid

The stress harness's grid is seed-agnostic — it doesn't know about your preset's actual
brand colors. To validate a specific preset:

1. Note its seed hexes and which algorithm/solver mode(s) it uses (`scaleAlgorithm`,
   `solverMode`, or per-color/per-role overrides).
2. Check whether your seed's hue sits in the documented warm-hue risk zone (45°–90°) —
   if so and it's using `Natural`/`Uniform`/`Expressive`/`Symmetric`, pull that exact
   seed's token list (or the nearest grid neighbor's, via `jq` against
   `run-records.jsonl`) and check for step collisions the way §1 demonstrates, not just
   contrast pass/fail.
3. Open the plugin's own **Preview screen** for the actual preset and check every
   token's contrast rating and `isAdjusted` flag against the real role/variation
   structure (the stress harness uses a synthetic 2-role rig, not your preset's roles).
4. Cross-check with real numbers before recommending a change: don't say "Natural is
   bad for warm hues, switch to OKLCH" without having pulled at least one concrete
   before/after token comparison for a seed close to the preset's own, the way §1 shows.

## 5. Making the palette *harmonic*, not just individually contrast-correct

Contrast-correct tokens can still fail to feel like one system. Concrete, tool-backed
checks for harmony:

- **Vividness consistency across colors**: compare each seed's vividness-preserved
  behavior at matching variation levels — either read the quality tab's aggregate for
  the algorithm/solver in use (§1's tables), or compute directly per-token
  (`oklch(hex).c` via `culori`, same library the harness uses) for your preset's actual
  tokens. If one seed goes visibly grayer than its siblings at the same nominal step,
  that's a harmony defect, not a contrast defect — contrast targets can be met by a
  washed-out color just as well as a vivid one.
- **Step-collision check**: for Scale-mode presets on an HSL-family algorithm, actually
  diff adjacent variation hexes for each color — identical or near-identical values at
  different nominal intensities (§1's `#8B7326`/`#8B7326` example) is a concrete,
  fixable defect, not a matter of taste.
- **Gamut-cliff awareness**: `Fidelity` and `gamut-cusp`/`apca-natural` follow the real
  per-hue gamut envelope, which means some hues legitimately desaturate faster near
  white/black than others (documented, not a bug — see the roadmap's Fidelity-cliff
  entry). Don't "fix" this by switching away from a gamut-honest algorithm without
  checking whether the cliff is actually visible at your preset's specific scale
  length/step count first.
- **Cross-theme consistency**: a variation target tuned against a white background can
  produce a much more (or less) saturated result against a dark or colored theme
  background, because the solver/scale search is contrast-driven, not chroma-driven.
  Check the same role/variation across every theme in Preview, not just the first one.
- **Adjusted-token rate**: if more than a handful of tokens show `isAdjusted: true`
  (Scale mode) or a `warning` (Direct mode), the contrast targets are unreachable for
  that seed/theme combination — this is a structural problem to kick back to
  preset-author (target too aggressive for the seed's natural lightness), not something
  color-master should paper over by picking a different algorithm.

## 6. What to change, and what to leave to preset-author

Color-master's toolbox for *fixing* an issue, once diagnosed:

- Swap `scaleAlgorithm`/`solverMode` (global, per-color, or per-role — see engine
  scoping rules in `Documentations/knowledge/how-it-works.md`'s Algorithm Scoping
  section, including the dead per-role Scale-mode scoping gotcha).
- Adjust `scaleLength` (Scale mode) if a gamut cliff is crowding too many steps into a
  narrow lightness band.
- Nudge the seed hex itself slightly if a hue sits exactly in a documented weak zone and
  the brand tolerance allows it (last resort — flag this to the user rather than doing
  it silently, it's a brand decision).

Not color-master's call to change unilaterally: role/variation counts, contrast-target
numbers tied to semantic intent (e.g. "Text should be 7.0"), theme count, or token
naming — those are **preset-author**'s structural decisions. If fixing a harmony issue
seems to require one of those, report the finding and let preset-author decide.

## 7. Closing the loop

After any algorithm/solver change, re-run the relevant stress-test stage (or the full
`npx tsx test-data/run.ts` if the change is global) and re-check Preview for the actual
preset. A harmony fix isn't done until the numbers — not just the swatch you're looking
at — confirm it.

## 8. Headless preset verification — the recipe, and why it exists

The stress harness proves an algorithm/solver is good *in general*. It cannot prove a
*specific* preset's role graph is sound, because its own test rig is a synthetic 2-role
setup that never exercises `scopedColorIds`, `localBg` chaining, or a preset's actual
per-role variation ladders. Preview does exercise the real config, but only inside a
live Figma session you may not have. When you need "does this exact preset, as authored,
produce clean output" and neither instrument fits, run the real engine directly:

```ts
// throwaway script, e.g. scripts/_verify-<preset>.ts — delete when done, it is not
// a permanent addition to the repo
import { variableMaker } from "../src/shared/engine/clrEngine";
import { resolveTokenRefBgs, translateLocalBg } from "../src/shared/engine/clrUtils";
import presets from "../src/shared/presets/raw/dev/<name>";

const cfg = presets[0].config as any;
const engineConfig = {
  colors: cfg.colors, themes: cfg.themes, scaleLength: cfg.scaleLength,
  scaleSteps: cfg.scaleSteps ?? undefined, scaleAlgorithm: cfg.scaleAlgorithm,
  pluginMode: cfg.pluginMode,
  roles: cfg.roles.map((r: any) => {
    const { localBgResolved, localBgTokenRef, localBgDynamicRef } =
      translateLocalBg(r.localBg, cfg.colors, cfg.themes);
    return { ...r, localBgResolved, localBgTokenRef, localBgDynamicRef };
  }),
  variations: (cfg.variations ?? []).map((v: any) => ({ name: v.name, shorthand: v.shorthand })),
  useUniformAlgorithm: cfg.useUniformAlgorithm,
  algorithmScopeLevel: cfg.algorithmScopeLevel, solverMode: cfg.solverMode,
};

// Two-pass, exactly like buildEngineConfig's real consumers (src/ui/store/engineStore.ts,
// src/figma/index.ts) — pass 1 resolves theme-bg fallbacks; resolveTokenRefBgs() then
// looks up any token-static/token-dynamic localBg against pass 1's real output; pass 2
// re-solves every chained role against the now-real background.
const pass1 = variableMaker(engineConfig as any);
const result = resolveTokenRefBgs(engineConfig as any, pass1)
  ? variableMaker(engineConfig as any)
  : pass1;

console.log(JSON.stringify(result.errors, null, 2)); // critical/warnings/notices — read every warning
```

Two import-path gotchas that cost time the first pass: `variableMaker` lives in
`clrEngine.ts`, but `resolveTokenRefBgs`/`translateLocalBg` live in the separate
`clrUtils.ts` — importing all three from `clrEngine` fails at runtime, not at
typecheck (both files export loosely-typed `any`-friendly shapes in a `.ts` script run
via `tsx`, so a wrong import only surfaces as `TypeError: ... is not a function`).

**Read `result.errors.warnings` before anything else.** This is the check that actually
matters: a role's variation can pass `isAdjusted: false` while still having silently
missed its target contrast, if the miss happened inside a `localBg`-chained solve — see
§8.1. Don't treat "no `isAdjusted: true` anywhere" as "nothing is wrong" until you've
also confirmed `result.errors.warnings` is empty.

### 8.1. The bug this catches that nothing else does: over-demanding `localBg` chains

`role.localBg` resolves to **exactly one background hex per (role, color, theme)** —
there is no per-variation override in the schema (confirmed: `clrEngine.ts:357-358,
398-399` look up `localBgResolved[modeName]`/`localBgPerColor`, keyed only by theme, not
by variation). A role with a 5-step variation ladder (e.g. Disabled 1.5 → Subtle 3.0 →
Rest 4.5 → Hover 6.0 → Pressed 8.0) that chains **all five** variations to the same
`token-dynamic` ref (e.g. `"[color]/fill/button/default"`) is asking all five targets to
be met against one fixed, usually mid-tone background. That background has a hard
contrast ceiling — often only ~4.4–5.1:1 for a mid-saturation brand color against a
light-ish surface — so any target above that ceiling (Hover 6.0, Pressed 8.0 in the
example) is mathematically unreachable. The solver's fallback fires: it returns clipped
black/white and emits a `warning` in `result.errors.warnings`, but **does not set
`isAdjusted`** (that flag is Scale-mode-specific, from `_mapByScaleContrast`'s
step-search fallback — this is a Direct-mode/localBg-chained solve, a different code
path entirely). The practical result: every variation above the ceiling collapses onto
the *identical* clipped hex, invisibly, unless you specifically read the warnings array.

This is not a synthetic concern — it was found, empirically, in **two** real presets by
running this exact recipe: it was introduced fresh while authoring `nmobile.ts`'s
`text/onBrand`/`text/onSecondary` roles, and the *same* defect already existed,
undetected, in the shipped reference preset `nclarity.ts`'s `text/buttonLabel` role,
across all 13 of its colors and all 3 of its themes (Hovered/Pressed targets 6.0/8.0
against `fill/button/default`, silently missed everywhere in Light and Dark, plus
several harder failures in Midnight where even the Default target came back
"Solver could not find a solution"). **Don't copy the "chain every variation of a
button-label role to one fixed fill step" pattern from an existing preset without
running this check** — its presence in a shipped preset is not proof it works.

**The fix, once you find this**: this is preset-author's call (structural), not
color-master's to silently patch, but the diagnosis is squarely a color-master
verification finding — report it with the concrete warning text and the achievable
ceiling number, and let preset-author choose between collapsing the role to 1–2
achievable states (a button label realistically only needs a Default/Enabled color and
a Disabled color — Hover/Pressed change the fill, not the label) or splitting into
separate single-variation roles each chained to its own matching fill-state token.
