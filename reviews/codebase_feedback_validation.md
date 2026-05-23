# Codebase Audit & Feedback Validation Report

This document validates the feedback points, bugs, performance concerns, and code quality issues identified in the Token Wand codebase.

---

## 🛑 Bugs & Bad Cases

### 1. Default Language Fallback is Hindi
* **Location:** [lang.js:L15](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/lang/lang.js#L15)
* **Status:** **VALID**
* **Finding:** If both `uiPrefs` and `appState` are undefined during boot, the default language resolves to `"hi"` (Hindi) instead of `"en"`.
* **Fix:** Change fallback to `"en"`:
  ```javascript
  const lang = (typeof uiPrefs !== "undefined" && uiPrefs.language) || (typeof appState !== "undefined" && appState.language) || "en";
  ```

### 2. Escape Key Listener Leak
* **Location:** [themeShop.js:L42-L48](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/themeShop.js#L42-L48)
* **Status:** **VALID**
* **Finding:** The keydown listener is bound to the document when opening the theme shop. If closed via the "Back" button click, the event listener is never cleaned up, causing duplicate handlers to stack up on subsequent opens.
* **Fix:** Wire the "Back" button click handler to also invoke `document.removeEventListener("keydown", onKey)` or register the keydown listener with `{ once: true }` if appropriate.

### 3. Settings Snapshot is Incomplete
* **Location:** [settings.js:L680](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/settings.js#L680)
* **Status:** **PARTIALLY RESOLVED**
* **Finding:** The snapshot did not capture `themes` or `colors`. Theme changes would persist even if settings were cancelled. (We have resolved the `themes` snapshot in the latest update; `colors` are not modified in this overlay).

### 4. Sample Variation Index Magic
* **Location:** [publish.js:L404](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/services/publish.js#L404)
* **Status:** **VALID**
* **Finding:** The preview fallback is hardcoded to index `[2]` and falls back to index `[0]`. This index magic is fragile and would benefit from a safer utility lookup.

### 5. Parameter Shadows Global `el` Factory
* **Location:** [crud.js:L118](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/services/crud.js#L118)
* **Status:** **VALID**
* **Finding:** `function updateGroup(idx, key, value, el)` defines a parameter named `el`, shadowing the global DOM element creation function `el()`.

### 6. Typo in Variable Assignment Operator
* **Location:** [organisms.js:L237](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/components/organisms.js#L237)
* **Status:** **VALID**
* **Finding:** The code uses `const useCommonVariations =! role.customVariationList;`. While logically equivalent to `= (!value)` in Javascript, it is misleading and visually confusing.
* **Fix:** Clean up spacing: `= !role.customVariationList;`

### 7. Double-Toggle of Preview Screen Display
* **Location:** [runtime.js:L377-L378](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/runtime.js#L377-L378)
* **Status:** **VALID**
* **Finding:** `classList.add("hidden")` and `.style.display = ""` are toggled together, which is redundant.

---

## 💀 Dead / Unreachable Code

### 8. Commented-out Drag / Move Handles
* **Locations:**
  - [organisms.js:L178–L182](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/components/organisms.js#L178-L182) (Color Card)
  - [organisms.js:L319–L322](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/components/organisms.js#L319-L322) (Role Card)
* **Status:** **VALID**
* **Finding:** comment blocks with legacy arrow buttons for reordering remain inside card renderers.

### 9. Legacy Export Stubs
* **Location:** [publish.js:L555-L563](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/services/publish.js#L555-L563)
* **Status:** **VALID**
* **Finding:** `exportToCSS`, `exportToCSV`, and `exportToSCSS` are legacy functions that are only wired behind an `if` guard that checks if the old buttons exist in the DOM (which they no longer do).

### 10. Unused `embedDirectlyRow` Query
* **Location:** [settings.js:L505](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/settings.js#L505)
* **Status:** **VALID**
* **Finding:** `#settings-resolve-tokens-directly-row` was renamed or removed in the markup but is still queried here.

---

## ⚡ Performance

### 11. Over-rendering in `syncInputsFromState()`
* **Location:** [settings.js:L577](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/settings.js#L577)
* **Status:** **VALID**
* **Finding:** Rebuilds settings cards and panels even when the settings screen is hidden.
* **Fix:** Add a check for visibility of the settings overlay to skip rendering.

### 12. `isDirty()` Runs Serialization on Every Pass
* **Location:** [store.js:L196-L213](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/store.js#L196-L213)
* **Status:** **VALID**
* **Finding:** Serializes the full config using `JSON.stringify` on every dirty check.
* **Fix:** Use a counter-based dirty flag incremented on mutations.

### 13. Synchronous Engine Computations on Main Thread
* **Location:** [preview.js:L709-L717](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/preview.js#L709-L717)
* **Status:** **VALID**
* **Finding:** Debounced `schedulePreview` runs expensive token generations synchronously, blocking the main thread.

### 14. Theme Panels InnerHTML Cleared
* **Location:** [preview.js:L848-L856](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/preview.js#L848-L856)
* **Status:** **VALID**
* **Finding:** `renderThemePanel` wipes all panel contents via `innerHTML = ""`, nullifying container element recycling.

### 15. Live DOM queries in `BannerManager`
* **Location:** [notifications.js:L185-L187](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/services/notifications.js#L185-L187)
* **Status:** **VALID**
* **Finding:** `_slot()` queries `document.getElementById("banner-slot")` on every call.
* **Fix:** Cache the selector.

---

## 🛠️ Code Management & Quality

### 16. Duplicate `sectionLabel` Components
* **Locations:**
  - `panelUI.sectionLabel` in [organisms.js:L16](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/components/organisms.js#L16)
  - `inputsUI.sectionLabel` in [primitives.js:L270](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/components/primitives.js#L270)
* **Status:** **VALID**
* **Finding:** Two separate helper functions exist for section headings using different markup (`p` vs `h3`).

### 17. Inconsistent Variables / Callback Styles
* **Location:** [publish.js:L349-L356](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/services/publish.js#L349-L356)
* **Status:** **VALID**
* **Finding:** Uses older `var` and `function` callback style, inconsistent with modern ES6 syntax used elsewhere.

### 18. Globals Leak in `_pillColorCache`
* **Location:** [settings.js:L734](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/settings.js#L734)
* **Status:** **VALID**
* **Finding:** Color cache persists across settings openings and assumes exactly three segments.

### 19. Duplicate Clones in `_snapWithoutVersions()`
* **Location:** [store.js:L279-L300](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/store.js#L279-L300)
* **Status:** **VALID**
* **Finding:** `lastSavedVersion` and `versionSaveBlockedReason` both call state cloning independently.

### 20. Theme Shop Full Card Re-renders
* **Location:** [themeShop.js:L8-L34](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/themeShop.js#L8-L34)
* **Status:** **VALID**
* **Finding:** Presets are static but the cards are rebuilt and appended one by one on every open.

### 21. Missing "interface" Translation Keys
* **Locations:** `es.json` & `hi.json`
* **Status:** **RESOLVED**
* **Finding:** The key `"interface"` was originally missing but has since been added to the localizations.
