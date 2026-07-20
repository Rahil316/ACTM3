# Flat Companion Collections — Implementation Plan

## Context

Figma variable names use `/` as the only folder-nesting delimiter, and forbid `.`, `$`, `{`, `}` entirely. Token Wand writes its three Figma variable collections (scale, tokens, source) with `/`-nested names like `primary/text/dim`. Exported code references use dot-paths (`primary.text.dim`), so developers can't copy a variable name straight from Figma's panel into code — the separators don't match, and Figma's own constraint rules out simply renaming to use dots.

This was worked out over an extended design conversation (product requirements below reflect decisions already made and should not be re-litigated), followed by direct verification of every relevant file in the codebase (not assumed from memory) and a dedicated architecture pass. The fix: an optional "flat" companion Figma variable collection alongside each of the three existing collections, using a configurable join convention (camelCase, snake_case, or a custom separator) instead of `/`, so a developer can copy-paste `primaryTextDim` / `primary_text_dim` / `primary-text-dim` directly.

## Product requirements (decided, not open questions)

1. **Per-artifact opt-in.** Scale, tokens, and source each get their own flat-collection toggle. No nested collection for an artifact ⇒ no *tied* flat collection possible for that artifact (untied is still possible if the artifact is otherwise enabled).
2. **Tied vs. untied, per collection.** Tied = flat variable's value is a `VARIABLE_ALIAS` to the nested twin (zero duplication, multi-theme free — one alias resolves per-mode automatically, so a tied flat variable needs only one mode). Untied = flat variable holds independent real values, fully rewritten every sync, and must maintain its own parallel per-theme modes. Untied is the automatic fallback when the user opts out of tying, or the nested collection doesn't exist.
3. **Tie-mode transitions are always a full reinitialize.** Whether triggered by the user flipping the setting or by a deletion fallback, treat exactly like first-time creation — no partial/incremental migration path.
4. **Deletion/drift detection is Figma-plugin-only.** The CLI only reads a static `.wand` file and writes export files — it has no live Figma document to diff against, so none of this section applies to it; the CLI's flat-collection support (a later phase, not this plan) would just export both name shapes from the same resolved config, no lifecycle to track.
   - Collections are looked up by **name**, not a stored id (verified in `variableTracker.ts`) — detection is simply "does a collection with the configured name exist right now."
   - Timing: not on every debounced re-check while a dialog is open; runs on the user's manual "Check for Figma Edits" click, or forced once before the first Sync/Update click in a session.
   - On a detected missing collection, prompt the user: **restore** it, or **proceed without** (an affected tied flat collection falls back to untied for that run, per point 3).
   - Dismissing the prompt without an explicit choice aborts the sync — nothing is written.
5. **Collision handling, two layers.** (a) A new authoring guideline (docs only) against case-insensitive/shorthand name overlaps. (b) A hard, unconditional, blocking pre-publish check — sync cannot proceed past an unresolved collision, regardless of how unlikely guideline-compliant presets make it.
6. **Per-collection settings, global-or-override.** Join convention and segment-order/shorthand rules can each be set once globally and inherited, or overridden per collection. Tied/untied is likewise a per-collection choice.
7. **Collection names must be globally unique** — checked instantly in the settings UI, and again as a hard block in the pre-publish check (covers presets/imports that bypass the UI).
8. **Segment order and shorthand rules are respected** by flat naming, same semantics as nested, just joined differently.

## Design invariant

A flat collection is a **naming projection** of the same intended entries the nested collections already produce — same resolved value, same stable `_id`-based identity; only the name-join (and, for tied mode, the value shape: alias vs. hex) differs. This lets almost everything ride the existing `buildIntendedEntries` → `ClassifyEntry` → `classifyEntry` / `upsertVariables` pipeline (`src/figma/variableTracker.ts`, `src/figma/figmaVars.ts`) with one new name-joining step and one new tokenRef namespace, instead of a parallel engine.

---

## 1. Types

### `src/ui/types/state.ts` — `ProjectStore`

Fixed named blocks, not an array — exactly three artifacts exist forever, and the rest of the codebase (`CollectionMetadataMaps`, `SyncCollectionKind`, `PerCollectionTally`) already hard-codes that triad. No `generateId()` needed.

```ts
export type FlatJoinConvention = "camelCase" | "snake_case" | "separator";

export interface FlatNamingSettings {
  join: FlatJoinConvention;
  separator: string;                 // used only when join === "separator"; validated against forbidden chars
  tokenNameSegments: TokenNameSegment[];
  useShorthandColors: boolean;
  useShorthandRoles: boolean;
  useShorthandVariations: boolean;
  useShorthandSteps: boolean;
}

export interface FlatCollectionSettings {
  enabled: boolean;
  name: string;                      // must be globally unique among all active collection names
  tied: boolean;
  namingOverride?: FlatNamingSettings;  // undefined => inherit projectStore.flatDefaults
}

// Added to ProjectStore:
flatDefaults: FlatNamingSettings;
flatScale: FlatCollectionSettings;
flatTokens: FlatCollectionSettings;
flatSource: FlatCollectionSettings;
```

`resolveFlatNaming(settings, flatDefaults) => FlatNamingSettings` (new, in `config.ts`) returns `settings.namingOverride ?? flatDefaults`.

### `src/figma/config.ts` — `PluginConfig`

`translateConfig` reads the four new fields through, pre-resolving each into an effective per-collection block so downstream code never re-implements inheritance:

```ts
flatScale:  { enabled: boolean; name: string; tied: boolean; naming: FlatNamingSettings } | null;
flatTokens: { enabled: boolean; name: string; tied: boolean; naming: FlatNamingSettings } | null;
flatSource: { enabled: boolean; name: string; tied: boolean; naming: FlatNamingSettings } | null;
```

Set to `null` when the artifact's own nested collection is disabled (reusing the same gates already computed there: `includeColorScalesCollection`, `pluginMode === "direct"`, `includeSourceColors`). Whether `tied` is actually achievable (nested collection exists *in Figma right now*) is a live fact resolved at analysis/sync time, not here.

### Join helper

New pure function `joinFlat(segments: string[], naming: FlatNamingSettings): string` — the flat analogue of `.join("/")`. `camelCase` lowercases the first segment and upper-camels the rest; `snake_case` joins with `_`; `separator` joins with `naming.separator`. Per-segment labels (shorthand vs. full name) still come from `makeLabelHelpers`, but keyed off `naming.useShorthand*` — give `makeLabelHelpers` an optional second `naming` argument (defaulting to `config`) so the nested path is untouched.

---

## 2. tokenRef namespace (collision avoidance with nested refs)

Flat variables get a distinct prefix, with the **identity suffix kept identical** to the nested tokenRef:

- `flat-scale:{colorId}/{step}`
- `flat-token:{colorId}/{roleIdStr}/{varIdStr}`
- `flat-source:{colorId}` and `flat-source:{colorId}/{opacity}`

Keeping the suffix identical is load-bearing: rename tracking is automatic and `_id`-based for free, and a tied flat variable finds its alias target by swapping the prefix (`flatRef.replace(/^flat-/, "")`) with no separate lookup table. `bucketFor` (in `figmaVars.ts`) gains the three `flat-*` prefixes; `buildMetadataMap`'s `expectedPrefix` union widens to include them, each flat map built with its own prefix so a flat variable and its nested twin (same suffix) never collide in the same map.

---

## 3. `buildIntendedEntries` extension

Extend the return shape and add an optional `flatCtx`:

```ts
buildIntendedEntries(result, config, scaleAliasCtx?, flatCtx?) =>
  { token, scale, source, flatToken, flatScale, flatSource: ClassifyEntry[] }
```

Inside each existing loop, when the corresponding flat collection is enabled, push a parallel flat entry reusing the already-computed segment labels and resolved value, rejoined via `joinFlat`:

- **Flat scale:** same hex value; `name = joinFlat([cLabel, stepLabel], naming)`; `tokenRef = "flat-scale:" + <same suffix>`.
- **Flat token, tied:** value is `VARIABLE_ALIAS` to the **nested token twin** (not the scale variable) — resolve via `flatCtx.tokenMetadataMap.get(nestedRef)` (the nested tokenRef obtained by stripping the `flat-` prefix). One mode only (no per-theme walk needed — the alias resolves through the nested variable's own modes).
- **Flat token, untied:** raw resolved value per theme, identical to what the nested entry holds for that theme; per-theme values are applied in the sync stage (§5), not here — the entry array stays one-per-token (theme-invariant identity), matching how the nested path already collapses to first-theme for the variable set.
- **Flat source:** same value (hex, or `{r,g,b,a}` for alpha variants); tied aliases the nested source twin, untied copies the value (source has one mode either way, so tied/untied differ only in value shape here).

`flatCtx` carries `{ localVars, tokenMetadataMap, scaleMetadataMap, sourceMetadataMap }` so alias targets resolve without rebuilding maps mid-loop.

---

## 4. Scaling the 4 collection-parameter-shaped functions — restructure to a descriptor array

This feature doubles the slot count these functions handle (3 → 6). `computeSyncPreview`, `computeValueDrift`, and `analyzeNameConflicts` already have an internal loop-over-the-triad helper — one step from data-driven. Adopt:

```ts
type CollectionSlotKind = "token" | "scale" | "source" | "flat-token" | "flat-scale" | "flat-source";

interface CollectionSlot {
  kind: CollectionSlotKind;
  prefix: `${string}:`;
  collection: VariableCollection | null;
  entries: ClassifyEntry[];
  metadataMap: Map<string, Variable> | null;
}
```

New `buildCollectionSlots(result, config, localVars, collections, metadataMaps, scaleAliasCtx, flatCtx): CollectionSlot[]` builds all six (flat ones only when enabled) from one `buildIntendedEntries` call, pairing each entry array with its live collection (looked up by configured name) and metadata map. `computeSyncPreview`, `computeValueDrift`, `analyzeNameConflicts` iterate `slots`, calling their existing inner helper per slot — the helper bodies barely change, they already take `(col, prefix, entries, map)`.

`SyncPreviewItem.collection`, `ValueDriftItem.collection`, `NameConflict.type`, and `SyncCollectionKind` (exported from `src/ui/types/messages.ts`) all widen from the closed `"token"|"scale"|"source"` union to `CollectionSlotKind`. `messages.ts` re-exports these types from `variableTracker.ts` — keep both files' unions in lockstep (mechanical, same PR). `PerCollectionTally` widens automatically via `SyncCollectionKind`.

---

## 5. New sync stage in `figmaVars.ts`

Add **STAGE 5: Flat companion collections**, running after STAGE 3 (source) but before the orphan-purge pass (the existing code's purge comment mislabels itself "STAGE 4" — rename it "STAGE 6" while touching this to end the confusion). Ordering rationale: tied flat variables alias nested twins, so nested collections must be fully upserted first; purge runs last so it sees final flat state.

```
for each enabled flat collection (scale, tokens, source):
  flatCol = await this.getOrCreateCollection(flat.name)
  apply flat renames via applyRenames(flatCol, renameMap.flatX)   // see §8 renameMap extension
  flatMap = buildMetadataMap(flatCol, this.cache.variables, "flat-<kind>:")
  tied = flat.tied && nestedTwinCollectionExists && decision !== "proceed-untied"   // see the fix below
  if tied:
     modeId = flatCol.modes[0].modeId          // one mode
     vars = flat entries with value = { type: "VARIABLE_ALIAS", id: <nested twin var id> }
     await this.upsertVariables(flatCol, modeId, vars, flatMap, decisions, driftDecisions)
  else:  // untied
     for each theme (tokens) / single pass (scale, source):
        modeId = this.ensureMode(flatCol, theme)
        vars = flat entries with raw value for that theme
        await this.upsertVariables(flatCol, modeId, vars, flatMap, decisions, driftDecisions)
```

Reuse points: tied alias targets are found by swapping the tokenRef prefix and reading the already-built STAGE 1–3 metadata maps (nested twin is guaranteed present since STAGE 5 runs after them). Untied per-theme setup reuses `ensureMode` verbatim, including the "rename Mode 1" trick and the paid-plan `addMode` failure path (same `skippedModes` warning). "Full rewrite every sync" for untied needs no special code — `upsertVariables` already writes every intended value unconditionally, and orphan purge removes anything not in the intended set; regenerating the flat entries fresh each sync *is* the full rewrite. Tie-mode transitions likewise need no migration code beyond the purge extension in §8 — different `tied` value produces different intended entries, and existing diff/purge machinery reconciles the collection to the new shape once stale variables are cleared.

`perCollection` bucketing (`bucketFor`) extends with the three `flat-*` prefixes.

**Fix over the first-pass design — "proceed without" on a missing *nested* collection must actually suppress its recreation.** `getOrCreateCollection` (verified at `figmaVars.ts:264-270`) unconditionally creates a collection by name if absent — it has no decision-gate today. If the user picks "proceed without" for a *nested* collection that's gone missing (not just a flat one), STAGE 1–3 must not silently recreate it via that unconditional call, or the user's choice is ignored. `sync()` needs a `restoreDecisions: Record<CollectionSlotKind, "restore" | "proceed-untied">` param (see §7); STAGE 1/2/3 each check it before calling `getOrCreateCollection` for their own artifact and skip that stage entirely (falling any tied flat collection depending on it to untied, per point 3) when the decision is "proceed-untied" for that nested slot. "Restore" is the default/no-op path — normal `getOrCreateCollection` behavior already recreates it.

---

## 6. Collision pre-check

New `analyzeFlatCollisions(slots)` in `variableTracker.ts`, called unconditionally from `runPrePublishAnalysis` (not gated behind any change heuristic) — it operates purely on already-computed flat entries, no extra Figma round trip.

For each enabled flat collection, build `name → tokenRef[]`; any name with ≥2 distinct tokenRefs is a collision. Also fold in global collection-name uniqueness (point 7): collect `tokenCollectionName`/`scaleCollectionName`/`sourceCollectionName` plus every enabled flat `name`, flag duplicates.

```ts
interface FlatCollisionReport {
  nameCollisions: { collection: CollectionSlotKind; joinedName: string; tokenRefs: string[] }[];
  collectionNameConflicts: { name: string; usedBy: string[] }[];
}
// PrePublishReport gains: flatCollisions: FlatCollisionReport;
```

Hard block in `useRunDialogState.handleConfirmRun`, before `doSync`:
```ts
const hasBlockingFlatIssue = flatCollisions.nameCollisions.length > 0 || flatCollisions.collectionNameConflicts.length > 0;
if (hasBlockingFlatIssue) return;   // no decision resolves this — user must edit config
```
Unlike drift/conflict items, this has no per-item decision UI — it's a hard stop surfaced in the new Flat tab (§9) with the specific colliding names, requiring a config edit (rename a color/role/shorthand) to clear.

---

## 7. Missing-collection detection + restore/proceed decision

### Detection data

Detection = "does a collection with the configured name exist right now" (name-keyed, no stored id — matches the codebase's existing `collections.find(c => c.name === X)` pattern).

```ts
interface FlatCollectionStatus {
  collection: CollectionSlotKind;
  configuredName: string;
  flatExists: boolean;
  tiedRequested: boolean;
  nestedTwinName: string;
  nestedTwinExists: boolean;      // relevant only when tiedRequested
  needsDecision: boolean;         // true when tiedRequested && !nestedTwinExists, OR a previously-synced collection has disappeared
}
// PrePublishReport gains: flatStatuses: FlatCollectionStatus[];
```

Computed in `runPrePublishAnalysis` from the collections list already fetched there — zero extra Figma calls.

### State — mirrors `valueDriftChecked`/`allDriftDecided` exactly, same file

`useRunDialogState.ts` gains:
```ts
const [flatCollectionsChecked, setFlatCollectionsChecked] = useState(false);
const [flatStatuses, setFlatStatuses] = useState<FlatCollectionStatus[]>([]);
const [flatDecisions, setFlatDecisions] = useState<Record<CollectionSlotKind, "restore" | "proceed-untied">>({});
const allFlatDecided = flatStatuses.every(s => !s.needsDecision || !!flatDecisions[s.collection]);
```
Reset `flatCollectionsChecked` to `false` in `onDialogOpen` and in the debounced-edit effect, same lines that reset `valueDriftChecked`. Set from the response in `onCollectionCheckResult`.

### Gating — reuse the existing `checkValueDrift` round trip, don't add a third boolean

Both missing-collection detection and value drift share the identical timing requirement (not on debounced re-checks; only manual "Check for Figma Edits" or forced-once-before-first-Sync). `runPrePublishAnalysis` computes `flatStatuses` on every pass (cheap — no extra Figma calls), but the UI only *acts* on `needsDecision` once the `checkValueDrift`-flagged pass has landed, exactly like drift items only block after `valueDriftChecked`. Extend `handleConfirmRun`:

```ts
const handleConfirmRun = useCallback(() => {
  if (!valueDriftChecked) { checkValueDrift(); return; }   // same forced pass now also lands flatStatuses
  if (hasBlockingFlatIssue) return;                          // §6, hard stop, no decision resolves it
  if (!allDriftDecided || !allNameConflictsDecided || !allFlatDecided) return;
  const validationIssues = validate();
  if (validationIssues?.length) { setIssues(validationIssues); setPhase("validation-warning"); return; }
  doSync(scope);
}, [...]);
```
If the user dismisses the prompt without deciding, `allFlatDecided` stays false and this early-returns — nothing is written, matching requirement 4's no-silent-default rule.

### Carrying the decision to the write

`RunCreatorMessage` gains:
```ts
flatDecisions?: Record<CollectionSlotKind, "restore" | "proceed-untied">;
```
Threaded through `index.ts`'s `run-creator` handler into `VariableManager.sync(..., flatDecisions)`. In STAGE 5 (and the STAGE 1–3 gate from §5's fix), a `"proceed-untied"` decision for a given slot forces that run to skip recreating a missing nested collection (if the slot is a nested one) or forces the flat collection itself to untied mode (if the slot is the flat one) — both cases route through the retie-purge path in §8 to clear any stale variables first. `"restore"` requires no special STAGE 5 handling: the nested collection is recreated normally by STAGE 1–3's unconditional `getOrCreateCollection`, so the tie resolves as if nothing had been deleted.

---

## 8. Structural change / orphan-purge extension

New `StructuralChangeKind` values in `variableTracker.ts`:
```ts
| "flat-scale-removed"  | "flat-token-removed"  | "flat-source-removed"
| "flat-scale-renamed"  | "flat-token-renamed"  | "flat-source-renamed"
| "flat-scale-retied"   | "flat-token-retied"   | "flat-source-retied"
```

`detectStructuralChanges` gains, per flat collection, comparisons mirroring the existing scale/source blocks: `enabled` true→false ⇒ `flat-*-removed` (`orphanedCollection = old name`); `name` changed while enabled ⇒ `flat-*-renamed`; `tied` flipped while enabled ⇒ `flat-*-retied`.

`purgeOrphanedVars` extension: `flat-*-removed`/`flat-*-renamed` reuse the existing `removeCollection` helper verbatim (same as the current `source-removed`/`*-renamed` cases). `flat-*-retied` has no collection to remove, but mode structure changes (tied = 1 mode, untied = N theme modes) — the safe, requirement-3-compliant handling is to remove all variables in that flat collection (filter `this.cache.variables` by collection id, remove, mirroring the existing `alpha-removed` loop) so STAGE 5 rebuilds them from scratch as first-time creation, rather than attempting in-place mode reconciliation. The `flatDecisions[kind] === "proceed-untied"` fallback from §7 is routed through this same retie-purge path before its untied rewrite.

`buildVariableRenameMap` (`config.ts`) gains a flat-equivalent: same `_id`-based `_mapIdToLabel` approach, reconstructing flat-joined names (via `joinFlat`) instead of `/`-joined ones, for each enabled flat collection — so flat variables get rename-safety identical to nested ones (`renameMap.flatScale`/`flatTokens`/`flatSource`, consumed by STAGE 5's `applyRenames` call in §5).

---

## 9. UI placement

### Settings — `SettingsOverlay.tsx`, "Figma Collections" card (existing `CollectionRow`s around lines 222–261)

Under each existing `CollectionRow`, add a conditionally-rendered flat sub-block gated on that artifact's own nested toggle: Token Collection (always on) always shows its flat block; Scale/Source show theirs only when their own toggle is on. Each flat block is a `CollectionRow` (label "Flat Companion", `checked={flatX.enabled}`, name `Input`) plus, when enabled, `SmallRow`s for: **Tied** toggle, **Join convention** control (camelCase / snake_case / separator, with a separator text input when selected), and an **Override naming** toggle that reveals its own copy of the existing `SortableSegmentPill` drag-reorder + shorthand toggles (reused component, wired to `flatX.namingOverride`, independent of `ExportSettings` — confirmed `ExportSettings` is export-only and never read by Figma sync, so flat-collection naming for sync must live directly on `ProjectStore`). One global "Flat Naming Defaults" card (bound to `flatDefaults`) sits above the three, feeding any collection without its own override.

**Instant name-uniqueness validation** (point 7's UI half): the flat-name `Input` shows an inline error when its value duplicates any other active collection name, computed synchronously against the current `projectStore`. UI-only convenience; the hard block is §6's pre-publish check.

### Run dialog — `RunDialog.tsx` / `useRunDialogState.ts`

Extend `RunDialogTab` to `"summary" | "changes" | "value-drift" | "health" | "flat"`, add a `FlatTab` to the tab bar with a badge mirroring `valueDriftLabel`'s convention (warning dot when `hasBlockingFlatIssue || flatStatuses.some(s => s.needsDecision)`). `FlatTab` (`isChecking={isCheckingOrStale}` like the other tabs) renders: the collision/name-conflict list from §6 (non-dismissible, "fix in Settings" messaging), and missing-collection rows from `flatStatuses` where `needsDecision`, each with a **Restore** / **Proceed without (untied)** control writing `flatDecisions[kind]` — same interaction shape as `ValueDriftTab`'s per-item keep/use control. Flat create/modify/delete items flow into the existing `ChangesTab` for free once `SyncPreviewItem.collection`'s union is widened (§4) — just needs a label mapping for the three new kinds.

---

## 10. Preset schema + validation

`Preset.config` is `Partial<ProjectStoreSnapshot>` — the four new `ProjectStore` fields are automatically valid preset fields, no separate schema type needed. New data-driven `Rule` entries in `validatePreset.ts`'s `RULES` array (no branching-logic edits, matches its existing pattern):

- `flat-join-enum` — each present naming block's `join` ∈ `["camelCase", "snake_case", "separator"]`.
- `flat-separator-valid` — when `join === "separator"`, the separator is non-empty and contains none of `/ . $ { }`.
- `flat-token-name-segments-enum` — reuse the existing `TOKEN_NAME_SEGMENTS` check, applied to each flat naming block.
- `flat-collection-names-unique` — the preset-time version of point 7's uniqueness rule (covers imports that bypass the settings UI): collect `scaleCollectionName`/`tokenCollectionName`/`sourceCollectionName` plus every enabled flat `name`, flag duplicates.
- `flat-requires-nested` — `flatScale.enabled` requires `includeColorScalesCollection`, `flatSource.enabled` requires `includeSourceColors` (structural consistency; `flatTokens` has no such prerequisite since the token collection always exists).

The collision check itself (two distinct paths flattening to one name) is **not** a preset rule — it depends on fully-resolved engine output (actual colors/roles/variations), so it only lives in the runtime `analyzeFlatCollisions` (§6); the preset-time guideline (point 5a) stays documentation-only.

### Default backfill — `src/ui/store/projectStore.ts`

Add a block in `ensureVariations` (next to the existing `exportSettings` backfill), and to the initial project-store factory: if `flatDefaults`/`flatScale`/`flatTokens`/`flatSource` are missing (old presets/`.wand` files), seed via a new `makeDefaultFlatSettings()` — `flatDefaults = { join: "camelCase", separator: "-", tokenNameSegments: state.tokenNameSegments ?? [...], useShorthand*: false }`, each `flatX = { enabled: false, name: "<nested name> flat", tied: true, namingOverride: undefined }`. No `generateId()` needed — fixed named blocks, not an array.

---

## Sequencing

1. **Types** — `state.ts`, `PluginConfig` in `config.ts`, union widening in `messages.ts`/`variableTracker.ts`. Everything else compiles against these.
2. **`joinFlat` + `resolveFlatNaming` + `makeLabelHelpers`'s optional naming override** — pure, verifiable in isolation.
3. **`buildIntendedEntries` flat arrays + `flatCtx`**, then the descriptor-array refactor (§4) of the four analysis functions. Verify existing (non-flat) projects show **zero preview diff** before moving on — this is the riskiest step since it touches shared machinery every sync/preview call already depends on.
4. **`runPrePublishAnalysis`** adds `flatCollisions` + `flatStatuses`; `translateConfig` + `ensureVariations` backfill.
5. **`figmaVars.ts` STAGE 5** + `bucketFor` widening + tie-target resolution + the §5 restore/proceed-untied gate fix on STAGE 1–3, then structural-change/purge extension (§8) including the retie-purge path.
6. **`useRunDialogState.ts` gate + state**, `RunCreatorMessage.flatDecisions`, threading through `index.ts`'s `run-creator` handler.
7. **UI** — `SettingsOverlay.tsx` flat blocks + instant uniqueness validation; `RunDialog.tsx` `FlatTab` + `ChangesTab` label widening for the new collection kinds.
8. **`validatePreset.ts`** rules + default-backfill.

## Explicitly out of scope for this plan

- **CLI** (`cli/`) — no live Figma document, no lifecycle to track; flat-collection *export* support (emitting both name shapes from a `.wand` file) is a separate, later feature, not covered here.
- **Export-side (`ExportSettings`/`src/shared/exportEng/`)** flat-naming exposure for file exports — this plan is scoped to Figma sync only; `ExportSettings` is confirmed export-only and untouched by this design.

## Verification

- `npm run check` (typecheck + lint) after each sequencing step, especially step 3 (the descriptor-array refactor) — a regression there silently breaks sync/preview for every existing project, flat or not.
- Manual, in Figma Desktop (`npm run watch`, import `manifest.json`): create a scale-mode project, enable a tied flat tokens collection, sync, confirm the flat collection has one mode and its variables show `VARIABLE_ALIAS` values resolving correctly per-theme in Figma's own variable panel.
- Manual: flip an enabled flat collection to untied, re-sync, confirm it gains per-theme modes with independent real values and the prior tied-mode variable is gone (not left stale).
- Manual: delete a flat collection directly in Figma, reopen the sync dialog, click "Check for Figma Edits" (or Sync without checking first, confirming it forces the check) — confirm the Flat tab surfaces a restore/proceed prompt, and that dismissing it without a choice blocks Sync with nothing written.
- Manual: construct two roles/colors whose shorthands collide once flattened — confirm the pre-publish check blocks Sync with the specific colliding names shown, and that fixing the shorthand clears the block on the next check.
- Manual: rename a color that's referenced by an enabled flat collection — confirm the flat variable is renamed (not recreated) in Figma, verifying `_id`-based rename-safety extends correctly to flat variables.
