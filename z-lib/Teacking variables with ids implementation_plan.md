# Implementation Plan: Metadata-Based Variable Tracking (Modular Architecture)

This plan outlines the architecture, backend changes, frontend layout, and validation steps to track Figma variables using private plugin metadata. It is specifically designed to enforce a highly modular structure, ensuring ongoing maintenance is easy and preventing giant files.

---

## 1. Edge-Case Gap Analysis & Safeguards

To ensure no critical cases are left exposed, the following safeguards are implemented:

| Edge Case | Potential Issue | Safeguard / Solution |
| :--- | :--- | :--- |
| **Duplicated / Cloned File** | Figma variable IDs change in the cloned file. | `tokenRef` metadata is cloned by Figma. Since we look up via `tokenRef` (not Figma's internal variable ID), the variables match perfectly on first sync. |
| **Type Mismatch** | User changes config or variable definition resulting in type mismatch (e.g. `COLOR` vs `FLOAT`). Figma throws when setting value. | In `upsertVariables`, if a matched variable has a `resolvedType` mismatch with the target type, delete the variable and recreate it under the correct type. |
| **Alt-Dragged / Duplicated Variable** | Two variables copy the same `tokenRef` metadata. | `buildMetadataMap` detects duplicates. The first variable keeps the metadata; any subsequent duplicate has its metadata cleared (`""`) to decouple it from tracking. |
| **Collection Mismatch** | A variable is moved to the wrong collection (e.g., scale variable moved to token collection). | `buildMetadataMap` isolates sweeps per collection. Furthermore, we ignore/prune `tokenRef` keys that don't match the collection's type prefix (e.g., ignoring `scale:` refs in the token collection). |
| **Rename Collisions** | Renaming a variable to a name already occupied by another variable in the collection. | Check `occupiedNames` before renaming. If the name is occupied, skip the rename to avoid Figma errors. |
| **Scale / Source Conflicts** | User manually renames scale or source variables, causing broken aliases downstream. | Expand conflict analysis to check for scale and source color conflicts. Update `scaleVarNameMap` with the kept Figma names so downstream aliases resolve to the correct Figma variables. |

---

## 2. Performance Safeguards

When dealing with 1000+ variables, Figma API writes become the primary performance bottleneck because each write triggers document layout updates and history checkpoints. We implement three critical optimizations:

1. **Flat $O(1)$ Lookup Map**: We fetch local variables *once* via `figma.variables.getLocalVariablesAsync()`. In `variableTracker.ts`, we convert this cache into a flat `Map<string, Variable>` keyed by `tokenRef`. Lookup is $O(1)$ instead of $O(N \times M)$ nested sweeps, preventing the Figma UI from freezing.
2. **Conditional Value Updates (Dirty Checks)**: We only call `setValueForMode` if the new value differs from the existing value in `variable.valuesByMode[modeId]`. For colors, we compare the RGB/RGBA float channels. If they match, the write is skipped.
3. **Conditional Metadata / Description Updates**: We only set `variable.description = ...` and `variable.setPluginData(...)` if the values differ from the current state. During incremental syncs where nothing has changed, Figma writes drop to **zero**, completing the operation in under ~50ms.

---

## 3. Modular Architectural Structure

To avoid file bloating and ensure a clean separation of concerns, the implementation is divided into small, independent modules:

```
src/
├── plugin/
│   ├── index.ts               # Plugin entry point (coordinates UI messaging and routes commands)
│   ├── figmaVars.ts           # CRUD variable operations (writes variables/values to Figma, reads cache)
│   └── variableTracker.ts     # [NEW] Identification & Conflict Analyzer (pure metadata, matching, and conflict logic)
│
└── ui/
    ├── hooks/
    │   └── useSyncSession.ts  # [NEW] React hook managing conflict state, decisions, and sync action triggers
    ├── components/
    │   └── ConflictList.tsx   # [NEW] React UI component for displaying name mismatches and resolution settings
    └── screens/
        └── RunDialog.tsx      # Orchestrator (delegates layout to ConflictList and state to useSyncSession)
```

---

## 4. Technical Specification & File Contents

### A. Identification & Conflict Tracker
#### [NEW] [variableTracker.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/plugin/variableTracker.ts)
* **Responsibility:** Metadata indexing, stable reference generation, duplicate cleaning, and conflict analysis.
* **Stable Keys (`tokenRef`):**
  - Semantic Tokens: `token:[colorId]/[roleId]/[variationId]` (e.g., `token:nc-bp/bgrzvh4x8bqi/3`)
  - Scales: `scale:[colorId]/[step]` (e.g., `scale:nc-bp/5`)
  - Alpha Constants: `source:[colorId]/[opacity]` (e.g., `source:nc-bp/50`)

```typescript
import type { Variable, VariableCollection } from '@figma/plugin-typings';

export interface NameConflict {
  tokenRef: string;
  figmaName: string;
  suggestedName: string;
  type: 'token' | 'scale' | 'source';
}

// Builds an O(1) lookup map of tokenRef to Variable and cleans duplicate metadata (Alt-drags)
export function buildMetadataMap(
  collection: VariableCollection,
  allVariables: Variable[],
  expectedPrefix?: 'token:' | 'scale:' | 'source:'
): Map<string, Variable> {
  const map = new Map<string, Variable>();
  const colVars = allVariables.filter((v) => v.variableCollectionId === collection.id);

  for (const variable of colVars) {
    const ref = variable.getPluginData('tokenRef');
    if (ref) {
      // Safeguard: Collection mismatch check
      if (expectedPrefix && !ref.startsWith(expectedPrefix)) {
        variable.setPluginData('tokenRef', '');
        continue;
      }

      if (map.has(ref)) {
        // Clear metadata on duplicate to decouple it from our tracking system
        variable.setPluginData('tokenRef', '');
      } else {
        map.set(ref, variable);
      }
    }
  }
  return map;
}

// Matches variable in Figma by tokenRef (primary) or by name (fallback for legacy)
export function findVariable(
  collection: VariableCollection,
  tokenRef: string,
  expectedName: string,
  metadataMap: Map<string, Variable>,
  allVariables: Variable[]
): Variable | null {
  // 1. Primary: Lookup via metadata
  let variable = metadataMap.get(tokenRef);
  if (variable) return variable;

  // 2. Fallback: Lookup by name in same collection for legacy migration
  const colVars = allVariables.filter((v) => v.variableCollectionId === collection.id);
  variable = colVars.find((v) => v.name === expectedName) || null;

  if (variable) {
    // Migrate legacy variable by setting tokenRef metadata
    variable.setPluginData('tokenRef', tokenRef);
    metadataMap.set(tokenRef, variable);
  }
  return variable;
}

export function analyzeNameConflicts(
  result: any,
  config: any,
  localVars: Variable[],
  tokenCol: VariableCollection | null,
  scaleCol: VariableCollection | null,
  sourceCol: VariableCollection | null
): NameConflict[] {
  const conflicts: NameConflict[] = [];

  const colorLabel = (name: string) => {
    if (!config.useShorthandColors) return name;
    const col = config.colors.find((c: any) => c.name === name);
    return (col && col.shorthand) || name;
  };
  const roleLabel = (name: string, roleIdx: number) => {
    if (!config.useShorthandRoles) return name;
    const role = config.roles[roleIdx];
    return (role && role.shorthand) || name;
  };
  const stepLabel = (name: string) =>
    config.useShorthandSteps && config.scaleStepShorthands?.[name]
      ? config.scaleStepShorthands[name]
      : name;

  // 1. Check scale collection conflicts
  if (scaleCol && result.scales) {
    const scaleMetadataMap = buildMetadataMap(scaleCol, localVars, 'scale:');
    for (const [colorName, scale] of Object.entries(result.scales as Record<string, any>)) {
      const colorObj = config.colors.find((c: any) => c.name === colorName);
      const colorId = colorObj?._id || colorName;
      const cLabel = colorLabel(colorName);

      for (const [step, entry] of Object.entries(scale as Record<string, any>)) {
        const tokenRef = `scale:${colorId}/${step}`;
        const suggestedName = `${cLabel}/${stepLabel(step)}`;

        const variableInFigma = scaleMetadataMap.get(tokenRef);
        if (variableInFigma && variableInFigma.name !== suggestedName) {
          conflicts.push({
            tokenRef,
            figmaName: variableInFigma.name,
            suggestedName,
            type: 'scale',
          });
        }
      }
    }
  }

  // 2. Check token collection conflicts
  if (tokenCol && result.tokens) {
    const tokenMetadataMap = buildMetadataMap(tokenCol, localVars, 'token:');
    const tokenNameOrder: string[] =
      config.tokenNameSegments ||
      (config.tokenGrouping === 'role'
        ? ['role', 'color', 'variation']
        : ['color', 'role', 'variation']);

    const firstTheme = Object.keys(result.tokens)[0];
    if (firstTheme) {
      const colors = result.tokens[firstTheme];
      for (const [colorName, roles] of Object.entries(colors as Record<string, any>)) {
        const colorObj = config.colors.find((c: any) => c.name === colorName);
        const colorId = colorObj?._id || colorName;
        const cLabel = colorLabel(colorName);

        for (const [roleId, variations] of Object.entries(roles as Record<string, any>)) {
          const roleObj = config.roles[roleId] || {};
          const roleIdStr = roleObj._id || roleId;
          const rName = roleObj.name || roleId;
          const rLabel = roleLabel(rName, parseInt(roleId, 10));

          const variationDefs = roleObj.customVariationList && roleObj.customVariations?.length
            ? roleObj.customVariations
            : config.variations;

          for (let vi = 0; vi < variationDefs.length; vi++) {
            const token = variations[String(vi)];
            if (!token) continue;

            const varDef = variationDefs[vi];
            const varIdStr = varDef._id || String(vi);
            const dispName =
              config.useShorthandVariations && varDef.shorthand
                ? varDef.shorthand
                : varDef.name || String(vi);

            const tokenRef = `token:${colorId}/${roleIdStr}/${varIdStr}`;
            const segParts: Record<string, string> = {
              color: cLabel,
              role: rLabel,
              variation: dispName,
            };
            const suggestedName = tokenNameOrder.map((s) => segParts[s] || s).join('/');

            const variableInFigma = tokenMetadataMap.get(tokenRef);
            if (variableInFigma && variableInFigma.name !== suggestedName) {
              conflicts.push({
                tokenRef,
                figmaName: variableInFigma.name,
                suggestedName,
                type: 'token',
              });
            }
          }
        }
      }
    }
  }

  // 3. Check source constants conflicts
  if (sourceCol && config.includeSourceColors && config.colors) {
    const sourceMetadataMap = buildMetadataMap(sourceCol, localVars, 'source:');
    for (const color of config.colors) {
      const colorId = color._id || color.name;
      const label =
        config.useShorthandColors && color.shorthand ? color.shorthand : color.name;

      // Base source constant
      const baseRef = `source:${colorId}`;
      const baseSuggested = `${label}/${label}`;
      const baseVar = sourceMetadataMap.get(baseRef);
      if (baseVar && baseVar.name !== baseSuggested) {
        conflicts.push({
          tokenRef: baseRef,
          figmaName: baseVar.name,
          suggestedName: baseSuggested,
          type: 'source',
        });
      }

      // Alpha tint source constants
      if (config.includeAlphaTints && config.alphaValues) {
        for (const opacityInt of config.alphaValues) {
          const alphaRef = `source:${colorId}/${opacityInt}`;
          const alphaSuggested = `${label}/Opacities/${opacityInt}`;
          const alphaVar = sourceMetadataMap.get(alphaRef);
          if (alphaVar && alphaVar.name !== alphaSuggested) {
            conflicts.push({
              tokenRef: alphaRef,
              figmaName: alphaVar.name,
              suggestedName: alphaSuggested,
              type: 'source',
            });
          }
        }
      }
    }
  }

  return conflicts;
}
```

---

### B. Custom State Hook for Conflicts
#### [NEW] [useSyncSession.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/hooks/useSyncSession.ts)
* **Responsibility:** Manages transient conflict arrays and user decisions.

```typescript
import { useState, useCallback } from 'react';
import type { NameConflict } from '../../plugin/variableTracker';
import { sendToPlugin } from '../types/messages';

export function useSyncSession(appState: any, savedState: any) {
  const [conflicts, setConflicts] = useState<NameConflict[]>([]);
  const [decisions, setDecisions] = useState<Record<string, 'keep' | 'revert'>>({});

  const loadConflicts = useCallback((list: NameConflict[]) => {
    setConflicts(list || []);
    const initialDecisions: Record<string, 'keep' | 'revert'> = {};
    (list || []).forEach((c) => {
      initialDecisions[c.tokenRef] = 'keep';
    });
    setDecisions(initialDecisions);
  }, []);

  const setDecision = useCallback((ref: string, val: 'keep' | 'revert') => {
    setDecisions((prev) => ({ ...prev, [ref]: val }));
  }, []);

  const runSync = useCallback((scope: string) => {
    sendToPlugin({
      type: 'run-creator',
      state: appState,
      scope,
      savedState: savedState ?? null,
      decisions,
    });
  }, [appState, savedState, decisions]);

  return { conflicts, decisions, loadConflicts, setDecision, runSync };
}
```

---

### C. Resolution UI component
#### [NEW] [ConflictList.tsx](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/components/ConflictList.tsx)
* **Responsibility:** Renders list of detected manual renames and allows custom override selections.

```typescript
import type { NameConflict } from '../../plugin/variableTracker';
import { SettingsCard } from './SettingsCard';
import { SegmentedControl } from './SegmentedControl';
import { SectionLabel, HelperText, Mono, MicroText } from './typography';

interface ConflictListProps {
  conflicts: NameConflict[];
  decisions: Record<string, 'keep' | 'revert'>;
  onChange: (ref: string, decision: 'keep' | 'revert') => void;
}

export function ConflictList({ conflicts, decisions, onChange }: ConflictListProps) {
  if (conflicts.length === 0) return null;

  return (
    <SettingsCard>
      <SectionLabel className="text-warning">Manual Renames Detected</SectionLabel>
      <HelperText className="mb-3">
        Some variables have been renamed manually in Figma. Choose whether to keep the Figma names or revert to the design system suggested format.
      </HelperText>
      <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
        {conflicts.map((conflict) => (
          <div
            key={conflict.tokenRef}
            className="flex flex-col gap-1.5 p-2.5 border border-border-subtle rounded-md bg-bg-surface-subtle"
          >
            <div className="flex items-center justify-between gap-2">
              <Mono className="text-xs text-text-subtle truncate max-w-[200px]" title={conflict.figmaName}>
                Figma: {conflict.figmaName}
              </Mono>
              <SegmentedControl
                size="sm"
                segments={[
                  { value: 'keep', label: 'Keep Figma' },
                  { value: 'revert', label: 'Overwrite' },
                ]}
                value={decisions[conflict.tokenRef] || 'keep'}
                onChange={(v) => onChange(conflict.tokenRef, v as 'keep' | 'revert')}
              />
            </div>
            <MicroText className="text-text-muted">
              Suggested: {conflict.suggestedName}
            </MicroText>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}
```

---

## 5. Proposed Modifications to Existing Code

### 1. [config.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/plugin/config.ts)
* Update `_mapRoles` to propagate the role `_id` so that composite `tokenRef` references remain invariant even when role names are modified.

### 2. [messages.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/types/messages.ts)
* Update `CollectionCheckResultMessage` to include `conflicts?: NameConflict[]`.
* Update `RunCreatorMessage` to include `decisions?: Record<string, 'keep' | 'revert'>`.

### 3. [useFigmaBridge.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/hooks/useFigmaBridge.ts)
* In standalone mock handler for `check-collections`, mock a name conflict (e.g. `token:primary/text/default`) to verify layout/interactivity in offline mode.

### 4. [figmaVars.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/plugin/figmaVars.ts)
* Update `upsertVariables` to accept decisions.
* Integrate `findVariable` to match variables by `tokenRef` metadata (primary) or by expected name (fallback/legacy).
* Write the `tokenRef` metadata back to Figma variables via `setPluginData('tokenRef', ...)`.
* Respect user decisions (`keep` vs `revert`) when updating names.
* Resolve `resolvedType` mismatches by removing and recreating the variable.
* Maintain `scaleVarNameMap` with the actual (possibly user-renamed) variable name, ensuring references inside semantic tokens link to the correct Figma variables.

### 5. [index.ts](file:///Users/mac/Documents/Plugin/Git/ACTM/src/plugin/index.ts)
* In `check-collections`, run `analyzeNameConflicts` on local variables and send conflicts back to the UI.
* In `run-creator`, receive the `decisions` map and pass it to `VariableManager.sync`.

### 6. [RunDialog.tsx](file:///Users/mac/Documents/Plugin/Git/ACTM/src/ui/screens/RunDialog.tsx)
* Bind state and actions to `useSyncSession`.
* Render the `ConflictList` component below the scope selector when conflicts are present.

---

## 6. Verification & QA Plan

### Automated Vitest Suite
- Write a suite of mock tests in `src/plugin/__tests__/variableTracker.test.ts` validating:
  - Sweeping duplicate keys clears metadata on the second item.
  - Conflict list is generated correctly for mismatched names across scale, tokens, and source.
  - Variable lookup handles legacy fallback name matching.
  - Type mismatch auto-recreates variables.
  - In-place renaming logic respects decisions correctly.

### Manual Verification
1. Run variable sync on a clean file to instantiate all variables.
2. Manually rename `Brand/Primary/stroke/1` to `Brand/Primary/stroke/custom-hairline` in the Figma variable panel.
3. Re-open the plugin: check that the `RunDialog` lists the manual rename conflict.
4. Keep Figma Name: sync variables and verify that it remains `Brand/Primary/stroke/custom-hairline` in Figma.
5. Overwrite Name: sync variables and verify that it changes back to `Brand/Primary/stroke/1` in Figma.
