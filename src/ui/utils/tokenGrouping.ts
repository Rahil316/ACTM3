import type { EngineResult, TokenEntry, ProjectStore, Role, Variation } from "../types/state";

export interface ResolvedToken {
  theme: string;
  color: string;
  role: Role;
  roleIdx: number;
  variation: Variation;
  varIdx: number;
  entry: TokenEntry;
}

/**
 * Walks EngineResult.tokens[theme][color][roleIdx][varIdx], resolving each
 * role's variation list via `role.variations ?? projectStore.variations`.
 * Shared traversal used by CanvasPreviewDevOverlay, PreviewScreen, and CanvasPreviewDevTree.
 */
export function resolveTokenTree(result: EngineResult, projectStore: ProjectStore): ResolvedToken[] {
  const out: ResolvedToken[] = [];
  for (const theme of Object.keys(result.tokens)) {
    for (const color of Object.keys(result.tokens[theme])) {
      const byRole = result.tokens[theme][color];
      projectStore.roles.forEach((role, roleIdx) => {
        const variations = role.variations ?? projectStore.variations ?? [];
        const byVar = byRole[roleIdx];
        if (!byVar) return;
        variations.forEach((variation, varIdx) => {
          const entry = byVar[varIdx];
          if (!entry) return;
          out.push({ theme, color, role, roleIdx, variation, varIdx, entry });
        });
      });
    }
  }
  return out;
}

