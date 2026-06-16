import { useMemo } from "react";
import { useEngineStore } from "../../../../store/engineStore";
import { useProjectStore } from "../../../../store/projectStore";
import { ratingFromRatio } from "../../../../types/state";
import type { EngineResult, TokenEntry, ContrastRating, Role } from "../../../../types/state";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdjustmentItem {
  tokenName: string;
  color: string;
  role: string;
  variation: string;
  theme: string;
  target: number;
  achieved: number;
  delta: number;
  targetRating: ContrastRating;
  achievedRating: ContrastRating | null;
  ratingShift: boolean;
}

export interface NameCollisionItem {
  tokenName: string;
  duplicates: { color: string; role: string; variation: string }[];
}

export interface ModeDriftItem {
  tokenName: string;
  color: string;
  role: string;
  variation: string;
  modes: { theme: string; ratio: number | null; rating: ContrastRating | null }[];
  ratingChanges: boolean;
}

export interface InversionItem {
  role: string;
  variations: { name: string; target: number | null }[];
}

export interface HealthReport {
  adjustments: AdjustmentItem[];
  nameCollisions: NameCollisionItem[];
  modeDrift: ModeDriftItem[];
  inversions: InversionItem[];
  totalTokens: number;
  issueCount: number;
}

// ── Core computation ──────────────────────────────────────────────────────────

export function computeHealthReport(result: EngineResult, themes: { name: string }[], roles: Role[], colors: { name: string }[]): HealthReport {
  const adjustments: AdjustmentItem[] = [];
  const totalTokensSet = new Set<string>();

  // For mode drift we need all themes' data for each token
  // Build: colorName → roleIdx → varIdx → { theme → TokenEntry }
  type TokenKey = `${string}|${number}|${number}`;
  const byKey = new Map<TokenKey, { entry: TokenEntry; theme: string }[]>();

  for (const [themeName, colorMap] of Object.entries(result.tokens)) {
    for (const [colorName, roleMap] of Object.entries(colorMap)) {
      for (const [roleIdxStr, varMap] of Object.entries(roleMap as Record<string, Record<number, TokenEntry>>)) {
        const roleIdx = Number(roleIdxStr);
        for (const [varIdxStr, entry] of Object.entries(varMap)) {
          const varIdx = Number(varIdxStr);
          totalTokensSet.add(`${colorName}|${roleIdx}|${varIdx}`);

          // A. Adjustments
          if (entry.isAdjusted && entry.contrastTarget != null && entry.contrast.ratio != null) {
            const targetRating = ratingFromRatio(entry.contrastTarget);
            const achievedRating = entry.contrast.rating ?? null;
            adjustments.push({
              tokenName: entry.tokenName,
              color: colorName,
              role: entry.role,
              variation: entry.variation,
              theme: themeName,
              target: entry.contrastTarget,
              achieved: entry.contrast.ratio,
              delta: entry.contrastTarget - entry.contrast.ratio,
              targetRating,
              achievedRating,
              ratingShift: achievedRating !== targetRating,
            });
          }

          // Accumulate for mode drift
          const key: TokenKey = `${colorName}|${roleIdx}|${varIdx}`;
          if (!byKey.has(key)) byKey.set(key, []);
          byKey.get(key)!.push({ entry, theme: themeName });
        }
      }
    }
  }

  // B. Mode drift — only for configs with >1 theme
  const modeDrift: ModeDriftItem[] = [];
  if (themes.length > 1) {
    for (const [, entries] of byKey) {
      if (entries.length < 2) continue;
      const ratings = entries.map((e) => e.entry.contrast.rating);
      const firstRating = ratings[0];
      const ratingChanges = ratings.some((r) => r !== firstRating);
      if (ratingChanges) {
        const first = entries[0].entry;
        modeDrift.push({
          tokenName: first.tokenName,
          color: first.color,
          role: first.role,
          variation: first.variation,
          modes: entries.map((e) => ({
            theme: e.theme,
            ratio: e.entry.contrast.ratio,
            rating: e.entry.contrast.rating,
          })),
          ratingChanges: true,
        });
      }
    }
  }

  // C. Inversions — variation targets for a role should be monotonic.
  // This is role-level, not theme-level: targets are set once per role and apply
  // to every theme. One entry per role, no per-theme duplication.
  const inversions: InversionItem[] = [];
  for (const role of roles) {
    const vars = role.variations;
    if (!vars || vars.length < 2) continue;
    const targets = vars.map((v) => v.target ?? null);
    if (targets.some((t) => t == null)) continue;
    const nums = targets as number[];
    const isMonoUp = nums.every((v, i) => i === 0 || v >= nums[i - 1]);
    const isMonoDown = nums.every((v, i) => i === 0 || v <= nums[i - 1]);
    if (!isMonoUp && !isMonoDown) {
      inversions.push({
        role: role.name,
        variations: vars.map((v) => ({ name: v.name, target: v.target ?? null })),
      });
    }
  }

  // D. Name collisions — token names must be unique within the project.
  // Derived purely from project structure: color × role × variation name combos.
  const nameCollisions: NameCollisionItem[] = [];
  const nameMap = new Map<string, { color: string; role: string; variation: string }[]>();
  for (const color of colors) {
    for (const role of roles) {
      const vars = role.variations ?? [];
      for (const v of vars) {
        const name = `${color.name}/${role.name}/${v.name}`;
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name)!.push({ color: color.name, role: role.name, variation: v.name });
      }
    }
  }
  for (const [tokenName, dupes] of nameMap) {
    if (dupes.length > 1) nameCollisions.push({ tokenName, duplicates: dupes });
  }

  const issueCount = adjustments.length + nameCollisions.length + modeDrift.filter((d) => d.ratingChanges).length + inversions.length;

  return {
    adjustments,
    nameCollisions,
    modeDrift,
    inversions,
    totalTokens: totalTokensSet.size,
    issueCount,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHealthReport(): HealthReport | null {
  const result = useEngineStore((s) => s.result);
  const themes = useProjectStore((s) => s.projectStore.themes);
  const roles = useProjectStore((s) => s.projectStore.roles);
  const colors = useProjectStore((s) => s.projectStore.colors);

  return useMemo(() => {
    if (!result) return null;
    return computeHealthReport(result, themes, roles, colors);
  }, [result, themes, roles, colors]);
}
