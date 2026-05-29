# Walkthrough: Metadata-Based Variable Tracking & Direct Mode UX Fixes

We have successfully implemented and verified:
1. The metadata-based tracking system for Figma variables (supports manual variable renames, duplicate cleaning, type-mismatch handling, and document-first persistence with zero-contamination).
2. The UI optimization for Direct Mode/scale bypass inside `RunDialog.tsx`.
3. The correction of sync tally counts in `figmaVars.ts` to eliminate double-counting of variable mutations.

---

## 1. Architectural Modules Overview

To prevent file bloating and ease long-term maintenance, all features have been modularized:

- [variableTracker.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/plugin/variableTracker.ts): Contains pure utilities for building $O(1)$ metadata maps, duplicate pruning, legacy name matching fallbacks, and sweeping rename conflicts across scales, semantic tokens, and source constants.
- [useSyncSession.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/hooks/useSyncSession.ts): A transient React hook managing conflicts state and user decisions (`keep` Figma renames vs `revert`/overwrite with suggested names).
- [ConflictList.tsx](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/components/ConflictList.tsx): A settings card component that renders the manual renames list cleanly with segment controls.
- [eslint.config.mjs](file:///Users/mac/Documents/Plugin/Git/ACTM/eslint.config.mjs): Configured the project's Flat ESLint file to properly run type-aware linting for the plugin sandbox code and integrate `@figma/eslint-plugin-figma-plugins` recommended rules.
- [config.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/plugin/config.ts): Propagated `_id` on roles definitions so that `tokenRef` references remain invariant when roles are modified.
- [messages.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/types/messages.ts): Defined type contracts for the UI/plugin bridge messages.
- [useFigmaBridge.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/hooks/useFigmaBridge.ts): Added standalone mock conflicts for local Storybook testing and reduced the Zustand save debounce to `500ms` for snappier saves.
- [figmaVars.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/plugin/figmaVars.ts): Overwrote sync operations to match variables by `tokenRef`, handle type mismatches, bypass redundant writes, and save config exclusively to the document node. Track variable mutations uniquely inside a `mutations` Map to ensure each variable gets counted at most once as either created, renamed, or updated.
- [index.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/plugin/index.ts): Wired check-collections and run-creator messages, and loaded config doc-only.
- [RunDialog.tsx](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/RunDialog.tsx): Mounted conflict controls, bound state handlers, dynamically hid the scope selection controls when scales are bypassed, and defaulted the sync scope to roles in Direct Mode.
- [figmaVars.test.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/plugin/__tests__/figmaVars.test.ts) [NEW]: Added test assertions verifying that variable creations and updates are tallied accurately and uniquely.

---

## 2. Direct Mode UX Optimization

When the plugin is in Direct Mode (or when scales are turned off via settings), color scales are not generated in Figma.
- **Dynamic Defaults**: On opening the "Publish to Figma" dialog, if scale bypass is detected, the sync scope is forced to `'roles'`.
- **Conditional Layout**: The redundant "Scope" card is hidden, replaced with an informative `Callout` ("Direct Sync Enabled") explaining that variables will be synchronized directly into semantic roles without creating a separate scales collection.

---

## 3. Sync Tally Count Fixes

Previously, when a variable was created or updated, multiple properties (value, description, rename) could increment the tally counters multiple times for the same variable.
- **Unique Mutation Categories**: We introduced a session-scoped `mutations` Map inside `VariableManager` tracking `'created'`, `'renamed'`, or `'updated'` per `tokenRef`.
- **Priority Classification**:
  1. A created variable is recorded as `'created'` and will never be upgraded to `'updated'` (even when its initial value/description are populated).
  2. An existing variable that is renamed gets recorded as `'renamed'` and won't be downgraded or re-counted as `'updated'`.
  3. Other changed variables are recorded as `'updated'` (at most once per variable, even if both description and value changed).
- **Corrected Success Screen**: The overlay now reports precise, accurate statistics.

---

## 4. Build & Test Results

### Typecheck Results
`npm run typecheck` passes cleanly with no compilation issues:
```bash
> token-wand@1.0.0 typecheck
> tsc --noEmit
```

### Vitest Unit Test Results
We run a total of 428 tests across 21 test files. All tests pass cleanly:
```bash
Test Files  21 passed (21)
     Tests  428 passed (428)
```

### Production Release Build
The release bundler compiles and packages the plugin successfully:
```bash
✓ theme.generated.css written
Wrote 16 presets → src/ui/lib/presets/presets.json
vite v5.4.21 building for production...
✓ 1834 modules transformed.
../../dist-release/ui.html  606.77 kB │ gzip: 170.54 kB
✓ built in 1.81s
✓ dist-release/scripts.js built
✓ dist-release/manifest.json written
```
