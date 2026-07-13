import { useMemo } from "react";
import type { EngineResult, ProjectStore, TokenEntry } from "../../types/state";
import { TokenTile, normalizeHex, getInkMode, inkColor } from "../../components/preview";
import { resolveTokenTree } from "../../utils/tokenGrouping";
import { ColorSection } from "./ColorSection";
import { TokenTableSection } from "./TokenTable";
import { TreeSection } from "./TreeSection";

// ── Theme panel (one per theme tab) ──────────────────────────────────────────

export type GroupBy = "color" | "role";
export type ViewMode = "grid" | "table" | "tree";

interface ThemePanelProps {
  result: EngineResult;
  projectStore: ProjectStore;
  themeIdx: number;
  groupBy: GroupBy;
  viewMode: ViewMode;
}

export function ThemePanel({ result, projectStore, themeIdx, groupBy, viewMode }: ThemePanelProps) {
  const theme = projectStore.themes[themeIdx];
  if (!theme) return null;

  const bgHex = normalizeHex(theme.bg || "#FFFFFF");
  const ink = getInkMode(bgHex);
  const themeKey = theme.name.toLowerCase();
  const themeTokens = result.tokens[themeKey] ?? {};

  // Re-group by role if needed: role → { colorName → { varIdx → token } }
  type VarMap = Record<number, TokenEntry>;
  type ByRole = Record<number, Record<string, VarMap>>;

  const colorEntries = Object.entries(themeTokens) as [string, Record<number, VarMap>][];
  const byRole = useMemo(() => {
    if (groupBy !== "role") return null;
    const out: ByRole = {};
    resolveTokenTree(result, projectStore)
      .filter((t) => t.theme === themeKey)
      .forEach((t) => {
        (out[t.roleIdx] ??= {});
        (out[t.roleIdx][t.color] ??= {});
        out[t.roleIdx][t.color][t.varIdx] = t.entry;
      });
    return out;
  }, [groupBy, result, projectStore, themeKey]);

  if (colorEntries.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-[12px] opacity-60" style={{ color: inkColor(ink) }}>
          No tokens for this theme.
        </p>
      </div>
    );
  }

  if (viewMode === "tree") {
    return <TreeSection result={result} projectStore={projectStore} themeIdx={themeIdx} groupBy={groupBy} ink={ink} />;
  }

  return (
    <div className="flex flex-col gap-4 p-3 pb-6">
      {groupBy === "color"
        ? colorEntries.map(([colorName, roles]) => {
            const colorEntry = projectStore.colors.find((c) => c.name === colorName);
            const srcHex = normalizeHex(colorEntry?.value ?? "888888");
            return viewMode === "grid" ? (
              <ColorSection key={colorName} colorName={colorName} srcHex={srcHex} roles={roles} projectStore={projectStore} ink={ink} />
            ) : (
              <TokenTableSection key={colorName} groupAxis="color" srcHex={srcHex} roles={roles} projectStore={projectStore} ink={ink} />
            );
          })
        : Object.entries(byRole!).map(([roleIdxStr, colorMap]) => {
            const roleIdx = parseInt(roleIdxStr);
            const role = projectStore.roles[roleIdx];
            if (!role) return null;

            if (viewMode === "table") {
              return <TokenTableSection key={roleIdxStr} groupAxis="role" roleName={role.name} colorMap={colorMap} projectStore={projectStore} ink={ink} />;
            }

            return (
              <div key={roleIdxStr} className="rounded-[14px] p-4" style={{ border: `1px solid ${inkColor(ink, 0.1)}`, background: inkColor(ink, 0.03) }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[13px] font-bold" style={{ color: inkColor(ink) }}>
                    {role.name}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {Object.entries(colorMap).map(([colorName, vars]) => {
                    const colorEntry = projectStore.colors.find((c) => c.name === colorName);
                    const cHex = normalizeHex(colorEntry?.value ?? "888888");
                    const roleVarsArr = role.variations ?? projectStore.variations ?? [];

                    return (
                      <div key={colorName}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: cHex, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }} />
                          <span className="text-[11px] font-bold" style={{ color: inkColor(ink, 0.7) }}>
                            {colorName}
                          </span>
                        </div>
                        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(88px,1fr))" }}>
                          {Object.entries(vars).map(([varIdxStr, token]) => {
                            const varIdx = parseInt(varIdxStr);
                            const v = roleVarsArr[varIdx];
                            const varLabel = v ? v.shorthand || v.name : String(varIdx);
                            return <TokenTile key={varIdxStr} hex={token.value} ratio={token.contrast?.ratio ?? null} rating={token.contrast?.rating ?? "Fail"} varLabel={varLabel} tokenName={token.tokenName} ink={ink} />;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
    </div>
  );
}
