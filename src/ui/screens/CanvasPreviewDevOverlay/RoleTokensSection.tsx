import { useEffect, useMemo } from "react";
import { getInkMode } from "../../components/preview";
import type { ProjectStore, EngineResult } from "../../types/state";
import { resolveTokenTree, type ResolvedToken } from "../../utils/tokenGrouping";
import { SectionTitle } from "./primitives";
import { logSection, logValidation } from "./devLogging";
import type { DetailItem } from "./types";

// ── Section C: Role Tokens ────────────────────────────────────────────────────

export function RoleTokensSection({
  projectStore,
  result,
  onSelect,
  selectedRef,
}: {
  projectStore: ProjectStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  onSelect: (item: DetailItem) => void;
  selectedRef: string | null;
}) {
  const tokenCollection = projectStore.tokenCollectionName || "color tokens";

  const resolved = useMemo(() => resolveTokenTree(result as EngineResult, projectStore), [result, projectStore]);

  useEffect(() => {
    logSection("Role Tokens", result?.tokens ?? {});
    let totalTokens = 0;
    let missingTokens = 0;
    projectStore.themes.forEach((theme) => {
      const themeKey = theme.name.toLowerCase();
      const themeTokens = result?.tokens?.[themeKey] ?? {};
      Object.entries(themeTokens).forEach(([, roleMap]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.entries(roleMap as any).forEach(([, varMap]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.entries(varMap as any).forEach(([, token]) => {
            totalTokens++;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!(token as any)?.value) missingTokens++;
          });
        });
      });
      logValidation(`Theme: ${theme.name} — colors present`, Object.keys(themeTokens).length === projectStore.colors.length, `${Object.keys(themeTokens).length}/${projectStore.colors.length}`);
      Object.entries(themeTokens).forEach(([_colorName, colorRoles]) => {
        const roleCount = Object.keys((colorRoles as object) ?? {}).length;
        logValidation(`  ${theme.name} / ${_colorName} — roles`, roleCount > 0, `${roleCount} role(s)`);
      });
    });
    logValidation(`Total tokens generated`, missingTokens === 0, `${totalTokens} total, ${missingTokens} missing value`);
  }, []);

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle>Role Tokens — {projectStore.themes.length} theme(s)</SectionTitle>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {projectStore.themes.map((theme) => {
          const isBgDark = getInkMode(theme.bg) === "dark";
          const onBg = isBgDark ? "#f4f4f5" : "#18181b";
          const onBgMuted = isBgDark ? "#a1a1aa" : "#52525b";
          const themeKey = theme.name.toLowerCase();

          // Group this theme's resolved tokens by color, then by role — preserving first-seen order
          // so rendering matches the original Object.entries() traversal order.
          const themeResolved = resolved.filter((t) => t.theme === themeKey);
          const colorOrder: string[] = [];
          const byColor = new Map<string, ResolvedToken[]>();
          themeResolved.forEach((t) => {
            if (!byColor.has(t.color)) {
              byColor.set(t.color, []);
              colorOrder.push(t.color);
            }
            byColor.get(t.color)!.push(t);
          });

          return (
            <div
              key={theme.name}
              style={{
                background: theme.bg,
                borderRadius: 8,
                padding: 16,
                minWidth: 180,
                maxWidth: 300,
                border: "1px solid rgba(255,255,255,0.08)",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: onBg, marginBottom: 12 }}>{theme.name}</div>

              {colorOrder.map((colorName) => {
                const colorObj = projectStore.colors.find((c) => c.name === colorName);
                const colorTokens = byColor.get(colorName)!;

                const roleOrder: number[] = [];
                const byRole = new Map<number, ResolvedToken[]>();
                colorTokens.forEach((t) => {
                  if (!byRole.has(t.roleIdx)) {
                    byRole.set(t.roleIdx, []);
                    roleOrder.push(t.roleIdx);
                  }
                  byRole.get(t.roleIdx)!.push(t);
                });

                return (
                  <div key={colorName} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: onBg, marginBottom: 6 }}>{colorName}</div>

                    {roleOrder.map((roleIdx) => {
                      const roleTokens = byRole.get(roleIdx)!;
                      const roleObj = roleTokens[0].role;

                      return (
                        <div key={roleIdx} style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 9, color: onBgMuted, marginBottom: 3 }}>{roleObj.name}</div>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {roleTokens.map((t) => {
                              const token = t.entry;
                              if (!token?.value) return null;
                              const varDef = t.variation;
                              const varIdx = t.varIdx;
                              const ratio = token.contrast?.ratio;
                              const rating = token.contrast?.rating ?? "";
                              const ref = `token:${colorObj?._id}/${roleObj._id}/${varDef?._id}`;
                              const isSelected = selectedRef === ref;

                              return (
                                <div
                                  key={varIdx}
                                  onClick={() =>
                                    onSelect({
                                      kind: "token",
                                      colorName,
                                      colorId: colorObj?._id ?? "",
                                      roleName: roleObj.name,
                                      roleId: roleObj._id ?? "",
                                      varName: varDef?.name ?? String(varIdx),
                                      varId: varDef?._id ?? String(varIdx),
                                      themeName: theme.name,
                                      hex: token.value,
                                      pluginDataRef: ref,
                                      figmaCollection: tokenCollection,
                                      scaleStep: (token as unknown as { scaleStep?: string }).scaleStep ?? null,
                                      contrastRatio: ratio != null ? `${Number(ratio).toFixed(1)}:1` : "—",
                                      contrastRating: rating,
                                      engineToken: token,
                                    })
                                  }
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 2,
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    padding: 2,
                                    outline: isSelected ? "2px solid #a78bfa" : "2px solid transparent",
                                    outlineOffset: 1,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 4,
                                      background: token.value,
                                      border: "1px solid rgba(0,0,0,0.15)",
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 8,
                                      color: onBgMuted,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {varDef?.name ?? varIdx}
                                  </span>
                                  {ratio != null && <span style={{ fontSize: 7, color: onBgMuted }}>{Number(ratio).toFixed(1)}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
