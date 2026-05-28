# Performance Backlog

Items deferred from the performance analysis. Done items are marked.

---

## ✅ Done

### #6 — description field missing `useLocalField`
`ColorGroupCard.tsx` — description input now buffers locally and commits on blur.

### #3 — Preview engine blocks paint
`PreviewScreen.tsx` — `runEngine` wrapped in `setTimeout(0)` so the spinner renders before compute starts.

### #4 — `buildByRole` not memoized
`PreviewScreen.tsx` — wrapped in `useMemo([groupBy, themeTokens])`.

### #10 — 3-char hex silently dropped on blur
`ColorInput.tsx` — `onBlur` handler now expands `FFF → FFFFFF` and commits.

---

## Backlog

### #5 — Color picker fires 60 store updates/sec
**File**: `ColorInput.tsx` — `handlePickerChange`
**Fix**: Commit to store on `pointerup` / `onBlur` only; buffer intermediate value in a ref.
**Expected gain**: Eliminates ~60 renders/sec during color wheel drag.
**Tradeoff**: Tiny visual lag in other panels while dragging (acceptable — preview already debounces).

---

### #2 — `versionSaveBlockedReason` runs on every keystroke
**File**: `App.tsx` + `appStore.ts`
**Fix**: Remove `appState` from `App.tsx` subscribe. Move blocked-reason check inside the save dialog on open.
**Expected gain**: Eliminates deep-clone + full JSON.stringify on every keypress.
**Tradeoff**: Bookmark button stays enabled even when save would be blocked — user sees reason only when they click.

---

### #1 — Overlay components mounted and subscribed when closed
**Files**: `App.tsx`, `RunDialog.tsx`, `SettingsOverlay.tsx`, `ExportSheet.tsx`
**Fix**: Conditionally mount — `{activeOverlay === 'run' && <RunDialog />}` etc.
**Expected gain**: Closed overlays stop subscribing to store entirely.
**Tradeoff**: Slight mount cost on first open (negligible).
**Priority**: `RunDialog` and `ExportSheet` first (heavier selectors).

---

### #8 — Inline toolbar handlers break memoization
**Files**: `ColorsScreen.tsx`, `RolesScreen.tsx`, `testLab.tsx`
**Fix**: Wrap `onGroup`, `onUngroup`, `onDelete`, `onSelectAll` in `useCallback`.
**Expected gain**: `MultiSelectToolbar` stops re-rendering on every state update.
**Tradeoff**: Minor code verbosity.
**Note**: Low-impact standalone; best done alongside #1.

---

### #9 — Drag tree traversal at 60fps
**Files**: `ColorsScreen.tsx`, `RolesScreen.tsx`
**Fix**: Cache visible IDs on `dragStart`, use cache during drag, invalidate on `dragEnd`.
**Expected gain**: Removes recursive tree walk at 60fps during drag.
**Tradeoff**: Stale cache if items are added mid-drag (impossible in practice).
**Note**: Only noticeable at 50+ groups. Defer until then.

---

### #7 — `useCommittedNames` string key allocation
**File**: `tree/index.tsx`
**Fix**: Cache key in a ref, recompute only when `items` reference changes.
**Expected gain**: Reduces short-lived string allocation.
**Tradeoff**: Minimal — GC handles this fine at typical project sizes. Skip unless profiling shows pressure.
