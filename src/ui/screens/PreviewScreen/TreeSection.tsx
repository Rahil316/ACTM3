import { useState } from "react";
import type { EngineResult, ProjectStore, TokenEntry } from "../../types/state";
import { RatingBadge, normalizeHex, inkColor } from "../../components/preview";
import type { GroupBy } from "./ThemePanel";

// ── Tree view ─────────────────────────────────────────────────────────────────

const TREE_INDENT = 16;

// Module-scoped (not component state) so node collapse/expand survives the
// PreviewScreen <-> PreviewSidePanel remount when crossing SIDE_PANEL_MIN_WIDTH.
// Only collapsed paths are stored since rows default open.
const collapsedPaths = new Set<string>();

function TreeRow({ path, depth, label, hex, meta, children, ink }: { path: string; depth: number; label: string; hex?: string; meta?: React.ReactNode; children?: React.ReactNode; ink: "light" | "dark" }) {
  const [open, setOpenState] = useState(!collapsedPaths.has(path));
  function setOpen(next: boolean) {
    setOpenState(next);
    if (next) collapsedPaths.delete(path);
    else collapsedPaths.add(path);
  }
  const hasChildren = !!children;
  const fontWeight = depth === 0 ? "font-bold" : depth === 1 ? "font-semibold" : "font-normal";
  const fontSize = depth === 2 ? "text-[11px]" : "text-[12px]";

  return (
    <div>
      <div className={`flex items-center gap-1.5 py-[3px] pr-2 rounded-[4px] ${hasChildren ? "cursor-pointer" : ""}`} style={{ paddingLeft: depth * TREE_INDENT + 8 }} onClick={hasChildren ? () => setOpen(!open) : undefined}>
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

  // See ThemePanel.tsx's matching filter — defense-in-depth against a
  // hand-built result that wasn't produced by the (now-filtering) engine.
  const colorEntries = (Object.entries(themeTokens) as [string, Record<number, VarMap>][]).filter(([, roles]) => Object.keys(roles).length > 0);

  function varMeta(token: TokenEntry) {
    const ratio = token.contrast?.ratio;
    const rating = token.contrast?.rating ?? "Fail";
    return (
      <>
        <span className="w-9 shrink-0 text-right text-[10px] tabular-nums" style={{ color: inkColor(ink, 0.5) }}>
          {ratio != null ? ratio.toFixed(2) : ""}
        </span>
        <span className="w-11 shrink-0">
          <RatingBadge rating={rating} />
        </span>
        <span className="w-[120px] shrink-0 text-[10px] truncate" style={{ color: inkColor(ink, 0.4) }}>
          {token.tokenName ?? ""}
        </span>
      </>
    );
  }

  const pathPrefix = `${themeIdx}/${groupBy}`;

  if (groupBy === "color") {
    return (
      <div className="px-2 py-3 flex flex-col gap-0.5">
        {colorEntries.map(([colorName, roles]) => {
          const colorEntry = projectStore.colors.find((c) => c.name === colorName);
          const srcHex = normalizeHex(colorEntry?.value ?? "888888");
          const colorPath = `${pathPrefix}/${colorName}`;
          return (
            <TreeRow key={colorName} path={colorPath} depth={0} label={colorName} hex={srcHex} ink={ink}>
              {Object.entries(roles).map(([roleIdxStr, vars]) => {
                const roleIdx = parseInt(roleIdxStr);
                const role = projectStore.roles[roleIdx];
                if (!role) return null;
                const roleVars = role.variations ?? projectStore.variations ?? [];
                const rolePath = `${colorPath}/${roleIdxStr}`;
                return (
                  <TreeRow key={roleIdxStr} path={rolePath} depth={1} label={role.name} ink={ink}>
                    {Object.entries(vars).map(([varIdxStr, token]) => {
                      const v = roleVars[parseInt(varIdxStr)];
                      const varLabel = v ? v.shorthand || v.name : varIdxStr;
                      return <TreeRow key={varIdxStr} path={`${rolePath}/${varIdxStr}`} depth={2} label={varLabel} hex={normalizeHex(token.value)} meta={varMeta(token)} ink={ink} />;
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
        const rolePath = `${pathPrefix}/${roleIdxStr}`;
        return (
          <TreeRow key={roleIdxStr} path={rolePath} depth={0} label={role.name} ink={ink}>
            {Object.entries(colorMap).map(([colorName, vars]) => {
              const colorEntry = projectStore.colors.find((c) => c.name === colorName);
              const srcHex = normalizeHex(colorEntry?.value ?? "888888");
              const colorPath = `${rolePath}/${colorName}`;
              return (
                <TreeRow key={colorName} path={colorPath} depth={1} label={colorName} hex={srcHex} ink={ink}>
                  {Object.entries(vars).map(([varIdxStr, token]) => {
                    const v = roleVars[parseInt(varIdxStr)];
                    const varLabel = v ? v.shorthand || v.name : varIdxStr;
                    return <TreeRow key={varIdxStr} path={`${colorPath}/${varIdxStr}`} depth={2} label={varLabel} hex={normalizeHex(token.value)} meta={varMeta(token)} ink={ink} />;
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
