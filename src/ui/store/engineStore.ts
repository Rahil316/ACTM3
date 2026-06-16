import { create } from "zustand";
import { variableMaker, resolveTokenRefBgs, translateLocalBg } from "../utils/engine";
import type { EngineResult, EngineInput } from "../types/state";
import type { ProjectStore } from "../types/state";

// ── Config builder ────────────────────────────────────────────────────────────
// Canonical version — all consumers use this. Includes full role localBg
// resolution, solver flags, and scale step shorthands.

export function buildEngineConfig(projectStore: ProjectStore): EngineInput {
  return {
    colors: projectStore.colors.map((c) => ({
      _id: c._id,
      name: c.name,
      value: c.value,
      shorthand: c.shorthand ?? "",
      description: c.description ?? "",
      scaleAlgorithm: c.scaleAlgorithm,
      solverMode: c.solverMode,
    })),
    themes: projectStore.themes.map((t) => ({ name: t.name, bg: t.bg })),
    scaleLength: projectStore.scaleLength,
    scaleSteps: projectStore.scaleSteps?.map((s) => s.name) ?? undefined,
    scaleAlgorithm: projectStore.scaleAlgorithm,
    pluginMode: projectStore.pluginMode,
    roles: projectStore.roles.map((r) => {
      const { localBgResolved, localBgTokenRef, localBgDynamicRef } = translateLocalBg(
        r.localBg,
        projectStore.colors,
        projectStore.themes,
      );
      return {
        name: r.name,
        shorthand: r.shorthand ?? "",
        mappingMethod: r.mappingMethod,
        variations: r.variations,
        solverMode: r.solverMode,
        description: r.description,
        scopedColorIds: r.scopedColorIds,
        localBg: r.localBg,
        localBgResolved,
        localBgTokenRef,
        localBgDynamicRef,
      };
    }),
    variations: (projectStore.variations ?? []).map((v) => ({ name: v.name, shorthand: v.shorthand })),
    useUniformAlgorithm: projectStore.useUniformAlgorithm,
    algorithmScopeLevel: projectStore.algorithmScopeLevel,
    solverMode: projectStore.solverMode,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface EngineStoreState {
  result: EngineResult | null;
  config: EngineInput | null;
  status: "idle" | "computing" | "error";
  compute: (projectStore: ProjectStore) => void;
}

export const useEngineStore = create<EngineStoreState>((set) => ({
  result: null,
  config: null,
  status: "idle",

  compute: (projectStore: ProjectStore) => {
    if (
      !projectStore.colors.length ||
      !projectStore.roles.length ||
      !projectStore.themes.length
    ) {
      set({ result: null, config: null, status: "idle" });
      return;
    }

    set({ status: "computing" });

    try {
      const config = buildEngineConfig(projectStore);
      const pass1 = variableMaker(config);
      const result = resolveTokenRefBgs(config, pass1) ? variableMaker(config) : pass1;
      set({ result, config, status: "idle" });
    } catch {
      set({ result: null, config: null, status: "error" });
    }
  },
}));

// ── Imperative helper (use outside React) ─────────────────────────────────────

export const engine = {
  compute: (projectStore: ProjectStore) =>
    useEngineStore.getState().compute(projectStore),
};
