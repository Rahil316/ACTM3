import { useMemo, useState } from "react";
import type { ProjectStore, EngineResult, TokenEntry } from "../../types/state";

export type FilterChip = "warnings" | "errors" | "adjusted";

export function useDevTreeFilters(projectStore: ProjectStore, result: EngineResult) {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [colorSearch, setColorSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [activeChips, setActiveChips] = useState<Set<FilterChip>>(new Set());

  // ── Expand/collapse key — incrementing remounts the tree so defaultOpen reruns ──
  const [expandKey, setExpandKey] = useState(0);
  const [expandAll, setExpandAll] = useState(false);

  function triggerExpand(all: boolean) {
    setExpandAll(all);
    setExpandKey((k) => k + 1);
  }

  function toggleChip(chip: FilterChip) {
    setActiveChips((prev) => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(chip) ? next.delete(chip) : next.add(chip);
      return next;
    });
  }

  // ── Derived sets from filters ─────────────────────────────────────────────
  const colorQ = colorSearch.trim().toLowerCase();
  const roleQ = roleSearch.trim().toLowerCase();

  const visibleColors: Set<string> | null = useMemo(() => {
    if (!colorQ && !activeChips.has("warnings") && !activeChips.has("errors")) return null;
    const names = new Set<string>();
    projectStore.colors.forEach((c) => {
      const matchSearch = !colorQ || c.name.toLowerCase().includes(colorQ);
      const matchWarn = !activeChips.has("warnings") || result.errors.warnings.some((w) => w.color === c.name);
      const matchErr = !activeChips.has("errors") || result.errors.critical.some((e) => String(e).includes(c.name));
      if (matchSearch && matchWarn && matchErr) names.add(c.name);
    });
    return names;
  }, [colorQ, activeChips, projectStore.colors, result.errors]);

  const visibleRoles: Set<string> | null = useMemo(() => {
    if (!roleQ && !activeChips.has("warnings") && !activeChips.has("adjusted")) return null;
    const names = new Set<string>();
    projectStore.roles.forEach((r) => {
      const matchSearch = !roleQ || r.name.toLowerCase().includes(roleQ);
      const matchWarn = !activeChips.has("warnings") || result.errors.warnings.some((w) => w.role === r.name);
      const matchAdjusted =
        !activeChips.has("adjusted") ||
        (() => {
          return Object.values(result.tokens).some((colorMap) =>
            Object.values(colorMap).some((roleMap) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rm = roleMap as any;
              return Object.entries(rm).some(([roleIdxStr]) => {
                const idx = parseInt(roleIdxStr, 10);
                const roleObj = projectStore.roles[idx];
                if (roleObj?.name !== r.name) return false;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return Object.values(rm[roleIdxStr] as any).some((t: unknown) => (t as TokenEntry).isAdjusted);
              });
            }),
          );
        })();
      if (matchSearch && matchWarn && matchAdjusted) names.add(r.name);
    });
    return names;
  }, [roleQ, activeChips, projectStore.roles, result.tokens, result.errors]);

  // ── Counts for toolbar labels ─────────────────────────────────────────────
  const totalWarnings = result.errors.warnings.length;
  const totalNotices = result.errors.notices.length;
  const totalAdjusted = useMemo(
    () =>
      Object.values(result.tokens).reduce(
        (acc, colorMap) =>
          acc + Object.values(colorMap).reduce((a2, roleMap) => a2 + Object.values(roleMap as object).reduce((a3: number, varMap: unknown) => a3 + Object.values(varMap as object).filter((t: unknown) => (t as TokenEntry).isAdjusted).length, 0), 0),
        0,
      ),
    [result.tokens],
  );

  return {
    colorSearch,
    setColorSearch,
    roleSearch,
    setRoleSearch,
    activeChips,
    toggleChip,
    setActiveChips,
    expandKey,
    expandAll,
    triggerExpand,
    visibleColors,
    visibleRoles,
    totalWarnings,
    totalNotices,
    totalAdjusted,
  };
}
