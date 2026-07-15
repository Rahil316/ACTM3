---
name: Todo list
description: Prioritised actionable tasks for the Token Wand plugin — updated 2026-07-15
type: project
---

Last updated: 2026-07-15
Source: full rewrite against current code (branch `edit/ColorLibraries`) — the 2026-05-22 version described a vanilla-JS codebase that no longer exists; most of its items were already resolved (rename tracking, `tokenGrouping` UI, alpha tints, project name) or superseded by later architectural changes. See `Documentations/knowledge/project_features.md` for the full feature registry this list is derived from.

---

## 🔴 High priority — blocks other work or visible to user

- [ ] **`role.scaleAlgorithm` is dead in Scale mode**
      `_generateScales` (`src/shared/engine/clrEngine.ts:313`) reads `color.scaleAlgorithm` only — never `role.scaleAlgorithm` — even though a live per-role Algorithm dropdown exists in the UI (`RoleGroupCard.tsx`, shown when Scale mode + "Uniform Algorithm" off + scope = "Per Role"), is persisted, and is exported through `figma/config.ts`. Users can set it believing it does something; it's silently ignored. Either implement real per-role scale algorithms (non-trivial — a scale is currently generated once per color; two roles sharing that color's scale can't each get a different ramp under the current data model) or grey out / hide the control in Scale mode and explain why. Full root cause in `Documentations/knowledge/color-algorithm-roadmap.md`.

- [x] **`hue-locked` solver mode doesn't do what it says** — resolved 2026-07-15
      Deprecated and removed entirely rather than fixed or repointed — it hardcoded `_targetChroma(..., "natural")` regardless of the mode passed in, with output byte-identical to `natural`'s. `SolverMode` is now 6 modes, not 7; no successor value. `gamut-cusp` remains the mode that does what `hue-locked`'s description used to promise.

## 🟡 Medium priority — polish and correctness

- [ ] **`apca-natural` solver mode is calibrated, not reference-accurate**
      Its WCAG-target-to-Lc conversion (`WCAG_TO_LC_ANCHORS` in `solverEngine.ts`) is a hand-fit table from 6 sample hues, not a real APCA font-size/weight-aware target system. Fine for exploratory/experimental use; if this becomes a headline feature, it needs either a proper APCA target picker (Lc entered directly, not derived from a WCAG number) or explicit "experimental" labeling in the UI so users don't mistake it for full APCA compliance.

- [ ] **Two parallel token-naming implementations must be kept in sync by hand**
      `src/figma/variableTracker.ts`'s `makeLabelHelpers` (Figma sync) and `src/shared/exportEng/helpers.ts`'s `_colorLabel`/`_roleLabel`/etc. (file export) independently reimplement the same `tokenNameSegments`/shorthand logic. Both are correct today, but any future naming-rule change (a new segment type, a new shorthand rule) has to be applied in both places or Figma-synced names and exported-file names will silently diverge. Consider extracting a single shared naming module both call into.

- [ ] **Role card / solver-mode manual test matrix**
      With 6 solver modes now (not 5, and the `hue-locked` bug that inflated the count to 7 has since been resolved by removal), a manual test pass across Scale mode × Direct mode × all 6 solver modes × `useSharedRoleVariants: true/false` would catch further drift before it's found in production. No automated coverage exists to catch this class of bug (see test suite note below).

- [ ] **Inline validation feedback**
      Duplicate names and invalid hex currently show in a full error overlay. Add inline red border / helper text directly on the offending input field.

## 🟢 Low priority — new features, future work

- [ ] **Role Labels CSV**
      Convenience field to rename all variation levels at once via comma-separated string. Currently the only way to rename is per-variation inline in the list. (Carried over from the original settings PDF mockup — still not built.)

- [ ] **Pro mode definition**
      Before any implementation: define which features are gated, what upgrade UX looks like, and how flags are stored. No current branch or spec exists for this beyond historical naming references.

- [ ] **Plugin tab — Language, Beta Features, About Token Wand**
      Placeholder UI exists for Language and About; the "Beta Features" concept has no real content — only a dead `"design-lab"` keyboard-shortcut alias that routes to the normal export sheet. Implement when content is defined, or remove the dead alias. Language needs i18n infrastructure from scratch (no groundwork currently exists in the React codebase, unlike the old vanilla-JS version which had a working i18n system — that appears to have been dropped in the rewrite; worth confirming whether that was intentional).

- [ ] **Reinstate a test suite for the color engine**
      `tests/` was removed entirely in a past cleanup pass; there is currently zero automated coverage for `clrEngine.ts`/`solverEngine.ts`/the color-math primitives. This directly contributed to how long-lived some of the bugs in `color-algorithm-roadmap.md`'s confirmed-issues list were (multiple hand-rolled CAM16/OKLCH bugs, the `hue-locked` mode, the HSL-luminance hue-skew issue) — all were found by manual numerical investigation rather than a failing test. `test-data/`'s stress-test harness (config-matrix + dashboard) is a useful complement but isn't a substitute for unit tests on the core math.

- [ ] **Color algorithm equalizer** (customizer/knob UI over the scale + solver algorithms)
      Full brainstorm in `Documentations/knowledge/color-algorithm-roadmap.md` §3. Explicitly dropped from scope once the "ultimate algorithm" idea shipped twice — as `Fidelity` for Scale mode, and as `gamut-cusp`/`apca-natural` for Direct mode. Pinned, not scheduled, unless there's a specific reason to revisit the full equalizer UI.

---

## ✅ Recently completed (since the 2026-05-22 list)

- [x] **Full React/TypeScript rewrite** of the UI — the old vanilla-JS `el()`/innerHTML codebase (`preview.js`, `notifications.js`, `betaLab.js`) no longer exists.
- [x] **Engine split** — `src/shared/clrEngine.ts` divided into `src/shared/engine/clrEngine.ts` (scale algorithms + dispatch) and `src/shared/engine/solverEngine.ts` (Direct-mode solver), so solver-mode code can be maintained independently of scale-algorithm code.
- [x] **APCA contrast support** — `src/shared/colorMath/apca-vendor.ts` + two new solver modes (`gamut-cusp`, `apca-natural`).
- [x] **HCT color space replaced with library-backed implementation** — vendored Google `material-color-utilities` `Hct` class, after multiple hand-rolled CAM16/HCT bugs were found and root-caused (see `color-algorithm-roadmap.md`).
- [x] **OKLCH color space replaced with `culori`-backed implementation** — after a hand-rolled gamut-boundary instability was found during the migration's before/after diff.
- [x] **"Fidelity" scale algorithm shipped** — the "ultimate" gamut-relative-chroma algorithm, implemented in OKLCH (pivoted from originally-planned HCT after finding a hue-drift bug in the old hand-rolled `hctToHex`, since fixed).
- [x] **Saved States / version history shipped** — `ProjectScreen.tsx`'s `VersionsScreen`: save/restore/rename/delete/export-as-`.wand` snapshots of the full config. Was a non-functional placeholder as of 2026-05-22.
- [x] **Variable scoping / collections checklist** — Run dialog now has an independent Scale/Tokens toggle pair (plus a separate Source Colors toggle) instead of syncing everything on every run.
- [x] **Canvas preview** — real-time on-canvas rendering of scales/tokens/source colors during development, with interruption tracking and fingerprint-based rebuild avoidance.
- [x] **11-format export bundle** — expanded from the original CSS/SCSS/CSV/JSON set to include Tailwind, DTCG, Style Dictionary, iOS/Swift, Android, React Native, and `.wand` config export.
- [x] **Rename detection for per-role variations** — was listed as a known gap in the 2026-05-22 todo list; confirmed already fixed in current code (`src/figma/config.ts`'s `_getTokenRenames`/`getVarMap` tracks variation renames by `_id` for both global and per-role lists).
- [x] **`tokenGrouping` UI control** — was listed as "missing" in the 2026-05-22 todo list; the underlying `ProjectStore.tokenGrouping` field no longer exists at all (removed, not merely un-wired). A same-named preview-rendering utility exists but is unrelated to variable structure.
- [x] **Alpha tints in Figma output** — confirmed still working (`syncGlobalColors`, gated by `includeSourceColors` + non-empty `alphaValues`).
- [x] **Project Name end-to-end** — confirmed used in export filenames and `.wand` snapshots via `projectSlug`/`_projectSlug` helpers.
