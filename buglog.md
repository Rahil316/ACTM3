# Bug Log

Backlog of issues found during code sweeps. Ordered by severity within each section.

---

## Medium

### [BUG-1] `renameMap` has inconsistent shape across code paths
- **Files:** [figmaVars.js:42](src/figma/figmaVars.js#L42), [main.js:83](src/figma/main.js#L83)
- **Status:** Fixed
- **Description:** The fallback `renameMap` in `figmaVars.js` is `{ scale: {}, tokens: {} }`, but the fallback in `main.js` includes a third key `summary: { scaleCount: 0, tokenCount: 0, changes: [] }`. Same logical object, two different shapes depending on code path. Any consumer expecting `summary` will get `undefined` from the figmaVars path.
- **Fix:** Align both fallbacks to include `summary`, or centralise the fallback into a shared constant.

---

### [BUG-2] Silent failure when `config.roles` is missing
- **File:** [figmaVars.js:120–126](src/figma/figmaVars.js#L120)
- **Status:** Fixed
- **Description:** `config.roles[roleId]` is accessed with no guard on `config.roles` itself. The `|| {}` fallback masks the error — all role properties silently become `undefined` downstream, producing incorrect variable names with no visible error.
- **Fix:** Add an explicit guard: `if (!config.roles) return;` or `const roleDef = config.roles?.[roleId] ?? {};`

---

### [BUG-3] `occupiedNames` can diverge from actual Figma variable names
- **File:** [figmaVars.js:22](src/figma/figmaVars.js#L22)
- **Status:** Fixed
- **Description:** After calling `variable.name = newName`, `occupiedNames` is updated unconditionally. If the Figma API silently ignores the mutation (no throw), local tracking falls out of sync with the real variable names, potentially allowing duplicate names or blocking valid renames.
- **Fix:** Verify the rename took effect by reading `variable.name` back after assignment, or check Figma API guarantees.

---

## Low

### [BUG-4] Inverted class toggle on `resolveTokensDirectly` button
- **File:** [ui/runtime.js](src/ui/runtime.js) *(or wherever `toggleResolveTokensDirectly` lives)*
- **Status:** Fixed
- **Description:** `btn.classList.toggle("on", !appState.resolveTokensDirectly)` applies the `"on"` class when the value is `false`. The negation should be removed.
- **Fix:** `btn.classList.toggle("on", appState.resolveTokensDirectly);`

---

### [BUG-5] Fragile null handling for `scaleCol` (works by accident)
- **File:** [figmaVars.js:139](src/figma/figmaVars.js#L139)
- **Status:** Fixed
- **Description:** `scaleFigmaName && scaleCol ? scaleCol.id : ...` only avoids a null-dereference because short-circuit evaluation kicks in. A refactor that reorders the condition could introduce a crash.
- **Fix:** Explicit null guard or optional chaining: `scaleCol?.id`.

---

### [BUG-6] `parseInt` called without radix
- **File:** [figmaVars.js:123](src/figma/figmaVars.js#L123)
- **Status:** Fixed
- **Description:** `parseInt(roleId)` should specify base 10 to avoid unexpected parsing of strings with leading zeros or non-decimal prefixes.
- **Fix:** `parseInt(roleId, 10)`

---

### [BUG-7] Probe collection could be orphaned on `addMode` failure
- **File:** [main.js:34–46](src/figma/main.js#L34)
- **Status:** Fixed
- **Description:** `probeCol` is created then removed in a `finally` block. If `addMode()` throws after collection creation, the `finally` null-check saves it today — but the pattern is fragile. A future edit removing the null check would orphan the collection in the user's Figma file.
- **Fix:** Wrap removal in `try { probeCol?.remove(); } catch {}` inside `finally` for explicit safety.

---

### [BUG-8] Generic error handler sends `undefined` to UI if `err.message` is absent
- **File:** [main.js:122](src/figma/main.js#L122)
- **Status:** Fixed
- **Description:** `err.message` is sent directly to the UI with no fallback. If `err` is a non-Error object or has no `.message`, the UI receives the string `"undefined"`.
- **Fix:** `err?.message ?? String(err) ?? "Unknown error"`

---

---

## `src/ui/store.js`

### [BUG-9] Three inconsistent "already saved?" comparison strategies
- **File:** [store.js:277](src/ui/store.js#L277), [store.js:281](src/ui/store.js#L281), [store.js:296](src/ui/store.js#L296)
- **Status:** Fixed
- **Severity:** Medium
- **Description:** `lastSavedVersion`, `isDefaultState`, and `versionSaveBlockedReason` all check whether state matches a saved baseline, but use different strategies. `isDefaultState` strips `_id` fields via `_stripIds` before comparing; the other two do not. If IDs ever differ between the live state and a saved snapshot, `lastSavedVersion` and `versionSaveBlockedReason` will disagree with each other and with `isDefaultState`.
- **Fix:** Centralise the "state equals snapshot" comparison into a single helper that consistently strips or includes IDs.

---

### [BUG-10] Missing bounds check in `setColor` — inconsistent with sibling mutators
- **File:** [store.js:436](src/ui/store.js#L436)
- **Status:** Fixed
- **Severity:** Medium
- **Description:** `setColor(idx, key, value)` directly accesses `appState.colors[idx]` with no out-of-bounds guard. `setRole` (line 448) and `setVariation` (line 501) both return early if the index is invalid. A stale event handler referencing a deleted color would silently write to `undefined`.
- **Fix:** Add `if (!appState.colors[idx]) return;` at the top of `setColor`, matching the pattern in `setRole`.

---

### [BUG-11] `parseInt` without radix in `setRole`
- **File:** [store.js:450](src/ui/store.js#L450)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `parseInt(key.slice("variationTarget:".length))` has no radix. Same issue as BUG-6.
- **Fix:** `parseInt(..., 10)`

---

### [BUG-12] Near-duplicate version comparison logic in `lastSavedVersion` and `versionSaveBlockedReason`
- **File:** [store.js:271](src/ui/store.js#L271), [store.js:288](src/ui/store.js#L288)
- **Status:** Fixed
- **Severity:** Low
- **Description:** Both functions clone `appState`, delete `versions`, and stringify to compare against `versions[0].state`. The comment on line 287 even notes a single-clone optimization that was never applied. If the comparison logic drifts between the two, they'll silently disagree.
- **Fix:** Extract a shared `_snapWithoutVersions()` helper and use it in both.

---

### [BUG-13] `markClean` fires inside `loadState` before persistence is confirmed
- **File:** [store.js:187](src/ui/store.js#L187), [store.js:329–335](src/ui/store.js#L329)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `loadState` calls `markClean()` immediately, so `isDirty()` returns false even before `_persistState()` is called by the caller. If the plugin closes between `loadState` and `_persistState()`, the restore is lost with no dirty flag to warn the user.
- **Fix:** Move `markClean()` to after `_persistState()` in `restoreVersion`, or document that callers must persist before relying on `isDirty`.

---

### [BUG-14] `_blankStateSnap` frozen at module init time
- **File:** [store.js:106](src/ui/store.js#L106)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `_blankStateSnap` is captured once when `store.js` first evaluates. If defaults or ID generation ever change after this line, `isDefaultState()` will compare against a stale baseline. Low risk today since IDs are stripped, but fragile as the file grows.
- **Fix:** No immediate action needed; worth noting if `_bootstrapConfig` or `ensureVariations` are ever made dynamic.

---

---

## `src/ui/runtime.js`

### [BUG-15] Two mismatched show/hide code paths for preview screen
- **File:** [runtime.js:309–343](src/ui/runtime.js#L309)
- **Status:** Fixed
- **Severity:** Medium
- **Description:** The preview screen is shown with both `classList.remove("hidden")` and `style.display = "flex"`, but hidden by `classList.add("hidden")` and `style.display = ""`. The `openPreview` keyboard handler sets both correctly; `preview-back` (line 309) and `closePreview` (line 501) only clear the inline style without touching the class. Any path that only removes `"hidden"` will leave the panel invisible because the inline `display` style was never re-applied.
- **Fix:** Centralise show/hide into a single `showPreview()` / `hidePreview()` helper that always sets both `classList` and `style.display` together.

---

### [BUG-16] Browser boot skips `ensureVariations`
- **File:** [runtime.js:559–561](src/ui/runtime.js#L559)
- **Status:** Fixed
- **Severity:** Medium
- **Description:** The standalone browser boot path calls `ensureIds(parsed)` but not `ensureVariations()`. The Figma boot path goes through `loadState()` which calls both. In the browser dev environment, `appState.variations` may be missing or have wrong-length `variationTargets` arrays.
- **Fix:** Call `ensureVariations()` after `appState` is assigned on line 561, matching what `loadState` does.

---

### [BUG-17] `pendingScope` never resets — `|| "all"` fallback is dead code
- **File:** [runtime.js:523](src/ui/runtime.js#L523)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `pendingScope` is initialised to `"all"` and never reset after a run. The `|| "all"` fallback on the `Alt+Enter` shortcut is therefore unreachable. More importantly, the scope silently "sticks" from the previous run dialog selection, so `Alt+Enter` may trigger a partial sync when the user expects a full one.
- **Fix:** Reset `pendingScope` to `"all"` after each sync completes (e.g. in the `finish` handler), and remove the dead fallback.

---

### [BUG-18] Ordering assumption between `setSavedState` and `markClean` on finish
- **File:** [runtime.js:169–170](src/ui/runtime.js#L169)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `setSavedState(appState)` deep-clones the current state, then `markClean()` hashes it. If anything mutates `appState` between these two lines the saved snapshot and the clean hash will drift. Nothing does today, but the two calls should be documented as order-dependent or collapsed.
- **Fix:** Add a comment marking the ordering constraint, or wrap both in a single `commitSync()` helper.

---

### [BUG-19] `parseInt` without radix in `getPreviewPanelForCode`
- **File:** [runtime.js:457](src/ui/runtime.js#L457)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `parseInt(code.replace("Digit", ""))` has no radix. Same pattern as BUG-6, BUG-11.
- **Fix:** `parseInt(..., 10)`

---

### [BUG-20] Tooltip rect measured before positioning — dimensions may be stale
- **File:** [runtime.js:250–255](src/ui/runtime.js#L250)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `tooltipEl.getBoundingClientRect()` is called while the tooltip is still at its previous position. `tipRect.width` / `tipRect.height` reflect the prior tooltip's dimensions, making centering and overflow-clamping slightly off on the first frame after content changes.
- **Fix:** Force a layout flush before measuring: set `textContent` first, then read `getBoundingClientRect()` after — which is already the order here, but the element must be visible (`active` class added) before measuring. Move `classList.add("active")` before the `getBoundingClientRect()` call.

---

## `src/ui/router.js`

### [BUG-21] No null guard on `getElementById` in show/hide helpers
- **File:** [router.js:22–43](src/ui/router.js#L22)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `showSheet`, `showOverlay`, and `hideOverlay` all call `document.getElementById(id)` and immediately access the result without checking for `null`. A missing or mistyped ID will throw. `createDialogue` (line 76) guards correctly with `if (!slot) return` — the helpers should follow the same pattern.
- **Fix:** Add `if (!el) return;` after each `getElementById` call in the three helpers.

---

### [BUG-22] `hideOverlay` hardcodes cleanup for two specific overlay IDs
- **File:** [router.js:44](src/ui/router.js#L44)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `hideOverlay` calls `hideSheets()` only when `id === "success-overlay"` or `id === "error-overlay"`. Any new overlay that needs the same cleanup has to be manually added here — it reads like a one-off fix rather than a deliberate design.
- **Fix:** Either pass a flag to `hideOverlay` to opt in to sheet cleanup, or handle it at the call sites instead of inside the helper.

---

### [BUG-23] Unnecessary `hideSheets` → `showSheet` round-trip in bottom-sheet dialogue
- **File:** [router.js:107–108](src/ui/router.js#L107)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `hideSheets()` sets `inert` on all `.bottom-sheet` elements including the target, then `showSheet(targetID)` immediately re-opens it. The round-trip is unnecessary and fragile — if `hideSheets` ever gains animation or async behaviour, `showSheet` could fire before the hide completes.
- **Fix:** Only close other open sheets, not the target one, or directly call `showSheet(targetID)` without the preceding `hideSheets()`.

---

### [BUG-24] `toggleSection` doesn't guard against missing element
- **File:** [router.js:12–14](src/ui/router.js#L12)
- **Status:** Fixed
- **Severity:** Low
- **Description:** If `id` doesn't match any DOM element, `section` is `null` and `section.classList.toggle` throws. Same missing-element pattern as BUG-21.
- **Fix:** Add `if (!section) return;` after the `getElementById` call.

---

### [BUG-25] Unknown tab name in `switchSidebarTab` leaves UI blank with no feedback
- **File:** [router.js:172](src/ui/router.js#L172)
- **Status:** Fixed
- **Severity:** Low
- **Description:** If an unrecognised tab string is passed, `activeSidebarTab` is updated and buttons are toggled, but no screen renders. The UI ends up blank with no error or warning. The valid tab names are implicit — they're not validated against `UI_MODES` or any other constant.
- **Fix:** Add a `console.warn` or early return for unrecognised tabs, or validate against an explicit allowlist.

---

---

## `src/color/clrEngine.js`

### [BUG-26] Null hue/sat silently produces all-black scales
- **File:** [clrEngine.js:176–177](src/color/clrEngine.js#L176)
- **Status:** Fixed
- **Severity:** Medium
- **Description:** `hexToHue` and `hexToSat` return `null` for an invalid hex input. These nulls are passed directly into scale algorithms as `hue` and `satu`. The algorithms multiply `null * (...)` producing `NaN`, which `hslToHex` can't handle and returns `null` for, which the `|| "#000000"` fallback silently converts to all-black scales. No warning or error is surfaced to the caller.
- **Fix:** Validate `hexIn` at the top of `scaleMaker` and return early (or throw) if `hexToHue`/`hexToSat` come back null.

---

### [BUG-27] Short scale array from `scaleMaker` flows null values into token output
- **File:** [clrEngine.js:269–270](src/color/clrEngine.js#L269)
- **Status:** Fixed
- **Severity:** Medium
- **Description:** If `scaleMaker` returns fewer items than `scaleLength` (e.g. due to null inputs), `scaleData[i]` is `undefined`. `normalizeHex(undefined)` returns `null`, so `scale[step].value` becomes `null` and flows silently into contrast calculations and final token output.
- **Fix:** Assert `scaleData.length === scaleLength` after calling `scaleMaker`, or handle null step values explicitly before writing to `scale`.

---

### [BUG-28] `_h2lr` doesn't handle 3-digit shorthand hex
- **File:** [clrEngine.js:428](src/color/clrEngine.js#L428)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `_h2lr` strips `#` and calls `parseInt(..., 16)` directly, skipping `normalizeHex`. A 3-char input like `"#FFF"` parses to `0xFFF = 4095` rather than `0xFFFFFF`, producing a wrong colour silently. Any direct caller of `hexToOklch` or `hexToHct` with shorthand hex is affected.
- **Fix:** Normalize input at the top of `_h2lr` via `normalizeHex`, or document that callers must pass 6-digit hex.

---

### [BUG-29] `_searchL` silently advances search on failed hex conversion
- **File:** [clrEngine.js:772–774](src/color/clrEngine.js#L772)
- **Status:** Fixed
- **Severity:** Low
- **Description:** When `getHexAtL(mid)` returns falsy, the loop treats it as "luminance too low" and advances `lo = mid`. A run of failed conversions pushes the search toward the high end without any diagnostic, potentially returning a boundary value rather than a genuine solution.
- **Fix:** Count failed conversions and surface a warning if they exceed a threshold, rather than silently advancing the search.

---

### [BUG-30] `parseInt` without radix in `_mapByIndex`
- **File:** [clrEngine.js:359](src/color/clrEngine.js#L359)
- **Status:** Fixed
- **Severity:** Low
- **Description:** `parseInt(targets[vi])` has no radix. Same pattern as BUG-6, BUG-11, BUG-19.
- **Fix:** `parseInt(targets[vi], 10)`

---

### [BUG-31] `bgIsLight` threshold of `0.18` is undocumented
- **File:** [clrEngine.js:804](src/color/clrEngine.js#L804)
- **Status:** Fixed
- **Severity:** Low
- **Description:** The light/dark background threshold `bgLum > 0.18` affects fallback colour selection and binary search direction. The value is close to the luminance where contrast to black equals contrast to white (`sqrt(0.05 * 1.05) - 0.05 ≈ 0.179`), which would make it intentional — but there's no comment explaining this. A reader could change it to `0.5` or `0.2` thinking it's arbitrary.
- **Fix:** Add a comment deriving or citing the 0.179 equal-contrast threshold so the value is clearly intentional.

---

## `src/color/clrUtils.js`

### [BUG-32] `contrastRating` label `"AA Large"` is ambiguous for non-large text
- **File:** [clrUtils.js:142–146](src/color/clrUtils.js#L142)
- **Status:** Fixed
- **Severity:** Low
- **Description:** Ratios between 3:1 and 4.5:1 return `"AA Large"`, which is technically correct per WCAG (AA compliance for large text ≥ 3:1). However, the label implies AA compliance for all text, which is only true for large text (18pt normal or 14pt bold). Any consumer displaying this rating without that caveat may mislead users into thinking small text passes AA.
- **Fix:** Rename to `"AA Large Text"` or append a note, and ensure any UI that renders this label includes the "large text only" qualifier.

---

*Last updated: 2026-05-23*
