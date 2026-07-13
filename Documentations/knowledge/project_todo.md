---
name: Todo list
description: Prioritised actionable tasks for the Token Wand plugin — updated 2026-05-22
type: project
---

Last updated: 2026-05-22

---

## 🔴 High priority — blocks other work or visible to user

- [ ] **Role variation rename detection**
      `buildVariableRenameMap` handles shared variations only. Per-role custom variation renames (`customVariationList: true`) silently create new variables instead of renaming. Fix or document the limitation explicitly in the Run dialog.

- [ ] **Alpha tints in preview panel**
      `includeAlphaTints` flag works in Figma output. `preview.js` doesn't show alpha tokens visually. Add a section to `renderPreviewPanel`.

- [ ] **`tokenGrouping` UI control missing**
      `projectStore.tokenGrouping` (`"color"` / `"role"`) controls color-first vs role-first variable structure and is wired in the engine, but no settings UI control renders it. Add a segmented control to the Collections section of Token Settings.

---

## 🟡 Medium priority — polish and correctness

- [ ] **Role card — full end-to-end test in both modes**
      Manual test matrix: Scale mode × Direct mode × `mappingMethod: "contrast"` × `mappingMethod: "index"` × `customVariationList: true/false`. Verify Figma variable output is correct in all combinations.

- [ ] **Inline validation feedback**
      Duplicate names and invalid hex currently show in full error overlay. Add inline red border / helper text directly on the offending input field.

- [ ] **`preview.js` — migrate remaining innerHTML to `el()`**
      Preview panel HTML generation still uses some innerHTML string concatenation. Migrate to `el()` for consistency.

- [ ] **Project Name end-to-end verification**
      `projectStore.name` is read in `translateConfig`. Verify it is used in: export filenames (CSS, SCSS, CSV, JSON downloads) and Figma sync success messages.

- [ ] **Per-role variation override — full manual test**
      `customVariationList: true` + `customVariations[]` paths exist in state and UI. Full manual test across Scale and Direct modes not completed. Cover: add/remove custom variations, drag to reorder, sync to Figma, export to CSS/JSON.

---

## 🟢 Low priority — new features, future work

- [ ] **Saved States (version history)**
      Store snapshot array in `figma.root.setPluginData("tw_snapshots")`.
      UI: list in Project tab with timestamp, name, View / Restore / Delete buttons.

- [ ] **Pro mode definition**
      Before any implementation: define which features are gated, what upgrade UX looks like, and how flags are stored.
      Current branch: `ProModeBeta_updated`.

- [ ] **Plugin tab — Language, Beta Features, About Token Wand**
      Placeholder UI exists. Implement when content is defined. Language needs i18n infrastructure.

- [ ] **Design Lab**
      `betaLab.js` has `LAB_ENABLED = false`. Button in more-sheet shows an alert. Replace with actual overlay when implemented.

- [ ] **Offline / inlined font support**
      Google Fonts loaded at runtime (`fonts.googleapis.com`). Low priority unless offline use case arises.

- [ ] **Role Labels CSV**
      Convenience field to rename all variation levels at once via comma-separated string. Currently the only way to rename is per-variation inline in the list.

- [ ] **Color algorithm equalizer** (customizer/knob UI over the scale algorithms)
      Full brainstorm and analysis in `Documentations/knowledge/color-algorithm-roadmap.md`. Explicitly dropped from scope when the "ultimate algorithm" shipped as the `Fidelity` scale algorithm — pinned, not scheduled.

---

## ✅ Recently completed

- [x] **"Fidelity" scale algorithm** shipped — the "ultimate" gamut-relative-chroma algorithm from `Documentations/knowledge/color-algorithm-roadmap.md`, implemented in OKLCH (pivoted from the originally-planned HCT after finding a pre-existing hue-drift bug in `hctToHex` — see that doc's implementation note). New test coverage added in `tests/shared/clrEngine.test.ts` (previously zero tests existed for `clrEngine.ts`).
- [x] Full file restructure: `color/`, `ui/` folders, dissolved `utils.js`
- [x] Settings migrated to full-screen 2-tab panel (Token Settings, Plugin)
- [x] `inputsUI.btn()` — universal button primitive with 5 variants + sizes
- [x] `RoleGroupCard` fixed — was returning single element, `.forEach` expected array
- [x] `DEFAULT_VARIATION_TARGETS` duplicate `const` removed
- [x] `setRole()` and `setRoleVariation()` — bounds checks added
- [x] `syncInputsFromState()` — now calls plugin tab values sync
- [x] `uiPrefs` load — validated against allowed scales/themes before applying
- [x] Dead code cleanup: removed `_demoConfigStr`, removed dead mutation branches in `setRole()`, fixed `run-creater` typo → `run-creator`, fixed Burgundy shorthand collision
- [x] Terminology refactor: `pluginMode: "tonal"` → `"scale"`, `"adaptiveEngine"` → `"direct"`; `tonalScales`/`colorTokens` → `scales`/`tokens`; `tknName`/`tknRef` → `tokenName`/`tokenRef`; all "ramp" → "scale" references updated
- [x] Renamed config fields: `tonalScaleCollectionName` → `scaleCollectionName`, `tokenNameOrder` → `tokenNameSegments`, `useGlobalAlgo` → `useUniformAlgorithm`, `perColorAlgoScope` → `algorithmScopeLevel`, `includeGlobalColors` → `includeSourceColors`, `globalColorsCollectionName` → `sourceCollectionName`, `embedDirectly` → `resolveTokensDirectly`
- [x] `includeColorScalesCollection` verified wired: `src/figma/config.ts` forwards it; `src/figma/figmaVars.ts` checks it in `skipScales` condition
- [x] `useUniformAlgorithm` / `algorithmScopeLevel` verified wired: `src/figma/config.ts` forwards; `src/shared/clrEngine.ts` reads them
- [x] `scaleStepNames` verified wired end-to-end
- [x] `alphaValues` verified wired end-to-end
- [x] `ctm.js` preset deleted — no longer referenced
- [x] TW presets moved to `tw.js` (TW Regular, TW Pro, TW Funk)
- [x] `manifest.json` — only Google Fonts in `allowedDomains`
