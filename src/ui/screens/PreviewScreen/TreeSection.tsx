import { useState } from "react";
import type { EngineResult, ProjectStore, TokenEntry } from "../../types/state";
import { RatingBadge, normalizeHex, inkColor } from "../../components/preview";
import type { GroupBy } from "./ThemePanel";

// ── Tree view ─────────────────────────────────────────────────────────────────

const TREE_INDENT = 16;

function TreeRow({ depth, label, hex, meta, defaultOpen = true, children, ink }: { depth: number; label: string; hex?: string; meta?: React.ReactNode; defaultOpen?: boolean; children?: React.ReactNode; ink: "light" | "dark" }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = !!children;
  const fontWeight = depth === 0 ? "font-bold" : depth === 1 ? "font-semibold" : "font-normal";
  const fontSize = depth === 2 ? "text-[11px]" : "text-[12px]";

  return (
    <div>
      <div className={`flex items-center gap-1.5 py-[3px] pr-2 rounded-[4px] ${hasChildren ? "cursor-pointer" : ""}`} style={{ paddingLeft: depth * TREE_INDENT + 8 }} onClick={hasChildren ? () => setOpen((o) => !o) : undefined}>
        <span className="w-[10px] shrink-0 text-[8px] leading-none select-none" style={{ color: inkColor(ink, 0.3) }}>
          {hasChildren ? (open ? "▼" : "▶") : ""}
        </span>
        {hex && <div className="w-3 h-3 rounded-[2px] shrink-0" style={{ background: hex, boxShadow: `0 0 0 1px ${inkColor(ink, 0.15)}` }} />}
        <span className={`${fontSize} ${fontWeight} flex-1 truncate`} style={{ color: inkColor(ink, depth === 2 ? 0.75 : 1) }}>
          {label}
        </span>
        {meta && <div className="flex items-center gap-1.5 shrink-0 ml-2">{meta}</div>}
      </div>
      {hasChildren && open && <div>{children}</div>}
    </div>
  );
}

interface TreeSectionProps {
  result: EngineResult;
  projectStore: ProjectStore;
  themeIdx: number;
  groupBy: GroupBy;
  ink: "light" | "dark";
}

export function TreeSection({ result, projectStore, themeIdx, groupBy, ink }: TreeSectionProps) {
  const theme = projectStore.themes[themeIdx];
  if (!theme) return null;

  const themeKey = theme.name.toLowerCase();
  const themeTokens = result.tokens[themeKey] ?? {};
  type VarMap = Record<number, TokenEntry>;

  const colorEntries = Object.entries(themeTokens) as [string, Record<number, VarMap>][];

  function varMeta(token: TokenEntry) {
    const ratio = token.contrast?.ratio;
    const rating = token.contrast?.rating ?? "Fail";
    return (
      <>
        {ratio != null && (
          <span className="text-[10px] tabular-nums" style={{ color: inkColor(ink, 0.5) }}>
            {ratio.toFixed(2)}
          </span>
        )}
        <RatingBadge rating={rating} />
        {token.tokenName && (
          <span className="text-[10px] max-w-[120px] truncate" style={{ color: inkColor(ink, 0.4) }}>
            {token.tokenName}
          </span>
        )}
      </>
    );
  }

  if (groupBy === "color") {
    return (
      <div className="px-2 py-3 flex flex-col gap-0.5">
        {colorEntries.map(([colorName, roles]) => {
          const colorEntry = projectStore.colors.find((c) => c.name === colorName);
          const srcHex = normalizeHex(colorEntry?.value ?? "888888");
          return (
            <TreeRow key={colorName} depth={0} label={colorName} hex={srcHex} ink={ink}>
              {Object.entries(roles).map(([roleIdxStr, vars]) => {
                const roleIdx = parseInt(roleIdxStr);
                const role = projectStore.roles[roleIdx];
                if (!role) return null;
                const roleVars = role.variations ?? projectStore.variations ?? [];
                return (
                  <TreeRow key={roleIdxStr} depth={1} label={role.name} ink={ink}>
                    {Object.entries(vars).map(([varIdxStr, token]) => {
                      const v = roleVars[parseInt(varIdxStr)];
                      const varLabel = v ? v.shorthand || v.name : varIdxStr;
                      return <TreeRow key={varIdxStr} depth={2} label={varLabel} hex={normalizeHex(token.value)} meta={varMeta(token)} ink={ink} />;
                    })}
                  </TreeRow>
                );
              })}
            </TreeRow>
          );
        })}
      </div>
    );
  }

  // groupBy === "role"
  const byRole: Record<number, Record<string, VarMap>> = {};
  for (const [colorName, roles] of colorEntries) {
    for (const [roleIdxStr, vars] of Object.entries(roles)) {
      const ri = parseInt(roleIdxStr);
      if (!byRole[ri]) byRole[ri] = {};
      byRole[ri][colorName] = vars as VarMap;
    }
  }

  return (
    <div className="px-2 py-3 flex flex-col gap-0.5">
      {Object.entries(byRole).map(([roleIdxStr, colorMap]) => {
        const role = projectStore.roles[parseInt(roleIdxStr)];
        if (!role) return null;
        const roleVars = role.variations ?? projectStore.variations ?? [];
        return (
          <TreeRow key={roleIdxStr} depth={0} label={role.name} ink={ink}>
            {Object.entries(colorMap).map(([colorName, vars]) => {
              const colorEntry = projectStore.colors.find((c) => c.name === colorName);
              const srcHex = normalizeHex(colorEntry?.value ?? "888888");
              return (
                <TreeRow key={colorName} depth={1} label={colorName} hex={srcHex} ink={ink}>
                  {Object.entries(vars).map(([varIdxStr, token]) => {
                    const v = roleVars[parseInt(varIdxStr)];
                    const varLabel = v ? v.shorthand || v.name : varIdxStr;
                    return <TreeRow key={varIdxStr} depth={2} label={varLabel} hex={normalizeHex(token.value)} meta={varMeta(token)} ink={ink} />;
                  })}
                </TreeRow>
              );
            })}
          </TreeRow>
        );
      })}
    </div>
  );
}
