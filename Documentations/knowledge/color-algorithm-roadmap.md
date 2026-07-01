---
name: Color algorithm roadmap
description: Analysis of existing scale/solver algorithms + brainstormed ultimate algorithm and equalizer feature — pinned for later, 2026-07-01
type: project
---

Last updated: 2026-07-01

Status: **pinned — not scheduled.** Pure analysis/brainstorm session, no code changed. Revisit when there's room to spec the ultimate algorithm and/or the equalizer UI.

---

## 1. Current algorithm analysis

Two independent mechanisms exist in `src/shared/clrEngine.ts`, easy to conflate:

- **Scale algorithms** (`ScaleAlgorithm`: `Natural`, `Uniform`, `Linear`, `Expressive`, `Symmetric`, `OKLCH`, `Material`) — Scale mode. Generate one full N-step tonal ramp per color; roles then pick steps off that ramp by contrast target or index.
- **Solver modes** (`SolverMode`: `natural`, `constant-chroma`, `symmetric`, `hue-locked`, `max-chroma`) — Direct mode. Solve a single color directly for a target contrast ratio against a background, no precomputed ramp.

They solve a related problem ("how vivid should a color get as it moves away from its natural tone") with two unrelated, independently-tuned formulas — no shared "personality" between the two modes today.

### Scale algorithms, one by one

| Algorithm | Space | Mechanism | Verdict |
|---|---|---|---|
| **Linear** | HSL | Even HSL-lightness steps, fixed hue/sat | Worst of the seven — HSL lightness isn't perceptually uniform (mid-L yellow looks far brighter than mid-L blue). |
| **Uniform** | HSL | Binary-searches HSL-L for uniform real luminance steps, hue/sat held flat | Fixes spacing; flat saturation makes near-white/near-black steps look muddy or oversaturated. |
| **Natural** | HSL | Uniform + empirical saturation taper (`sat × (1 - (|L-50|/50)^1.5 × 0.4)`) | Reasonable patch, but the exponent/cap are hand-picked, not derived from any perceptual model. Current default. |
| **Expressive** | HSL | Natural + hue drift toward warm/cool at light/dark ends | Nice instinct, but hardcoded target hues (60°/240°) and factor (0.15) regardless of the seed's own hue family. |
| **Symmetric** | HSL (log-lum) | Anchors the seed's actual luminance at the ramp's middle index, interpolates independently on each side | Good, underused idea (most algorithms assume the seed sits at ~50% lightness) — but no saturation taper at all, and spacing gets uneven if the seed is itself very light or very dark. |
| **OKLCH** | OKLCH | Binary-searches L, holds chroma+hue exactly constant | Real perceptual space, genuine improvement — but **no gamut-mapping**. Channels silently clip near the ramp extremes for saturated seeds. |
| **Material** | HCT (Google Material You space) | Binary-searches tone, holds hue+chroma constant, **properly gamut-maps** via bisection | Most rigorous of the seven — real perceptual tone model + correct gamut handling. This is Google's own MD3 tonal palette algorithm. |

**Material is the best-engineered algorithm here, but the flawed HSL-based "Natural" is the shipped default.**

### Solver modes (Direct mode)

The contrast solver (`solveColorForContrast`) is the most solid part of the file: OKLCH-based, gamut-safe (`_maxChromaAtLH` binary-searches to the true in-gamut boundary), sane fallback (falls back to black/white with a clear warning when a target is mathematically unreachable), and reports precise diagnostics (`isAdjusted`, `chromaReduced`, `clipped`).

### Confirmed issues

- **`hue-locked` solver mode is functionally identical to `natural`.** `src/shared/clrEngine.ts:778-788`. Three independent sources disagree about what it does — the Settings UI copy says "pushes to the maximum in-gamut chroma at each lightness"; a shipped dev preset comment says "picks light or dark text per color automatically"; the actual code computes `rawC` via the exact same `_targetChroma(..., "natural")` curve as `natural` mode and clamps it the same way. The resulting color is the same as `natural` — only an internal diagnostic-flag threshold differs. Reads like an abandoned/half-finished mode.
- **Per-Role scale-algorithm scope is dead in Scale mode.** `_generateScales` (`src/shared/clrEngine.ts:247-277`) reads only `color.scaleAlgorithm`, never `role.scaleAlgorithm` — anywhere in the pipeline. But the field is fully wired end-to-end: `RoleGroupCard.tsx:166` renders a live per-role "Algorithm" dropdown (shown when Scale mode + "Uniform Algorithm" off + scope = "Per Role"), it's persisted, exported through `figma/config.ts:136`, and shown in the dev inspector's ConfigTree. Users can set it, believing it does something — it's silently ignored. Structurally this makes sense (a scale is generated once per color; two roles referencing the same color's scale can't each get their own ramp under the current one-scale-per-color data model), but the UI doesn't communicate that limitation. Direct mode's equivalent scope control works correctly (`_getSolverMode` does read `role.solverMode`) — the bug is specific to Scale mode.
- **OKLCH scale algorithm has no gamut-mapping** — unlike Material, which bisects to the true in-gamut boundary via `hctToHex`.
- **Zero test coverage on `clrEngine.ts`.** `tests/shared/clrUtils.test.ts` only covers primitives (`validHex`, `normalizeHex`, `hexToRgb`, contrast math). None of `scaleMaker`, `variableMaker`, `solveColorForContrast`, `hexToOklch`/`oklchToHex`, `hexToHct`/`hctToHex` have any test — the ~800 lines doing the actual perceptual math are unguarded. Partly why the two bugs above shipped unnoticed.
- **Naming collision**: "Natural" is both a `ScaleAlgorithm` value and, lowercased, a `SolverMode` value. Different mechanisms, same word, shown in adjacent Settings panels depending on plugin mode.

### Verdict

- **Accessibility**: strong. Contrast-target-driven mapping is the backbone of both modes; the solver has real gamut-awareness and honest failure reporting.
- **Aesthetics**: uneven. One algorithm (Material) is done right, one (OKLCH) is nearly right with a fixable gap, the other five are a legacy HSL family papering over HSL's unsuitability for tonal ramps with increasingly specific empirical patches rather than a shared model.

---

## 2. The "gamut-relative chroma" idea (the "ultimate" algorithm)

Core insight nothing here exploits: **every hue has its own uniquely-shaped maximum-chroma envelope across the lightness range**, asymmetric per hue (yellow's max chroma peaks near the light end; blue's peaks mid-dark). No algorithm here — and no mainstream design-tool ramp generator known — builds a ramp aware of this envelope's *shape* per-hue. They either hold raw chroma constant and clip on contact (OKLCH here, effectively Material/Tailwind too) or apply a universal taper curve blind to the hue's real gamut (Natural/Expressive here).

**Mechanism, three parts:**

1. **Compute the seed's chroma as a fraction of its own hue's envelope, at its own lightness.** Sample max-in-gamut chroma at the seed's hue+tone (one bisection — reuses `_maxChromaAtLH`/`hctToHex`'s existing bisection primitive). `f = srcChroma / envelope(srcTone)` — "how close to maximally vivid is this color, for what's physically possible at its hue/tone."
2. **Hold `f` constant across every step, not raw chroma.** For each target lightness, sample that lightness's envelope for the same hue, target chroma = `f × envelope(L)`. The taper *is* the hue's real gamut shape, scaled by the seed's own vividness — not a guessed universal exponent.
3. **Gamut-safe by construction, no fallback needed.** Since `f ≤ 1` always (the seed is a real achievable color), `f × envelope(L') ≤ envelope(L')` at every step. No bisect-down-to-fit needed anywhere — Material's gamut-correctness and OKLCH's "stay true to the seed" goal simultaneously, which are mutually exclusive today.

**Run it in HCT, not OKLCH**, for the hue axis — HCT already corrects for the Hunt/Bezold–Brücke hue-perception shift OKLCH doesn't, and `hctToHex`'s bisection is most of what's needed for envelope sampling already (reuse, not new color math).

**Why it beats each precedent:**
- vs. **Material** (raw chroma held, clip-on-demand): fixes "some hues clip hard, others look understated" — every seed gets consistent *relative* vividness regardless of hue.
- vs. **OKLCH** (raw chroma, no gamut-map at all): same fix, plus closes the channel-clipping bug.
- vs. **Natural/Expressive** (arbitrary taper curves): taper is the real physical gamut boundary, not a guessed exponent.
- vs. **Symmetric** (anchors lightness, no chroma taper): complementary, not competing — combine Symmetric's "don't assume the seed sits at 50%" with this chroma idea into one algorithm.

**Open sub-question**: should the seed's exact hex be forced to appear as one literal ramp step (guaranteed fidelity, tiny local unevenness around that step) or only used to calibrate `f` (perfectly smooth curve, seed itself may not be pixel-identical to any step)? Material doesn't force literal inclusion either. **Resolved as a spectrum, not a binary** — see Seed Anchor knob below; different presets can sit at different points on it.

---

## 3. The algorithm equalizer idea

Instead of shipping this as one more preset in a dropdown, decompose all seven existing algorithms (+ the new idea) into the orthogonal knobs they're each secretly hard-coding one fixed combination of. No mainstream design tool or Figma plugin exposes a perceptual color algorithm's internal parameters as a live, tunable equalizer — this is a genuinely novel product surface, not just an algorithmic tweak.

| Knob | Controls | Where existing presets sit |
|---|---|---|
| **Seed Anchor** (0→1) | Force the seed's own lightness/hex to sit at its real relative position vs. ignore it for a pure uniform curve | Uniform/Natural/OKLCH/Material = 0. Symmetric = 1 (crudely). Top end = literal seed inclusion, resolving the open sub-question above. |
| **Taper Amount** (0→1) | How much chroma falls off toward light/dark extremes | Uniform/OKLCH = 0 (flat). Natural/Expressive = fixed ~0.4. Nobody offers "aggressive" or "none, with warning." |
| **Taper Reference** | Absolute chroma vs. gamut-relative fraction (idea #2) | Every existing algorithm = absolute. Gamut-relative is the new option. |
| **Hue Drift** (0→1 + direction) | Warm/cool hue shift at light/dark ends | Expressive = fixed ~0.15 toward hardcoded 60°/240°. Everyone else = 0. |
| **Perceptual Model** | HSL / OKLCH / HCT | Linear/Uniform/Natural/Expressive/Symmetric = HSL. OKLCH = OKLCH. Material = HCT. |
| **Contrast-Aware Placement** (on/off) | Nudge step lightness toward the actual configured variation targets instead of pure uniform spacing | Nobody does this today — the direct link to "accessible + pleasing." |

**Rules for this feature:**
- **Gamut correctness is never a knob.** Always mapped correctly; no user-facing "let it clip" option — there's no aesthetic upside to that, only accidental breakage.
- **Warnings are triggered by output sanity checks, not input-range thresholds.** Catches bad *combinations* a per-knob range limit can't predict:
  - Step collision — two steps landing perceptually identical.
  - Chroma collapse — most steps going near-gray unintentionally (some hues have a narrow high-chroma window in sRGB; gamut-relative taper can expose that harshly).
  - Hue drift beyond recognition — lightest/darkest steps reading as a visibly different hue family than the seed.
  - Broken monotonicity in lightness/contrast — this one is a correctness guard to **enforce**, not just warn about, since `_mapByScaleContrast` assumes monotonic contrast ordering when scanning for a target step.
- **De-risking combinatorial ugliness** (the real risk of free-form knobs vs. hand-tuned presets): a strong default (the gamut-relative algorithm), named snapshot points along each slider, curated full-equalizer presets (same pattern as the existing Theme Shop, one level deeper), and live preview as the final safety net.

---

## 4. Open questions (unresolved — do not answer in this doc)

- **Perceptual Model: knob or top-level mode switch?** If HCT mostly obsoletes manual Hue Drift, should picking HCT hide/gray out that slider, or do all knobs always coexist regardless of model? Deferred — revisit once there's a prototype to react to.
- **Exact knob ranges/defaults/increments.** Paused, low priority for now.
- **Naming** — of the ultimate algorithm itself, and of the equalizer feature/knob labels (needs to be plain-language enough for a non-color-scientist designer).
- **Implementation order once work resumes** — spec and ship the ultimate algorithm alone first (as an 8th preset), validate it, *then* build equalizer UI around it; or design both together from day one.

(Seed-exact-inclusion is **resolved**, not open — it folds into the Seed Anchor knob's range rather than needing a separate decision.)
