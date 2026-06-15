import { useState, useEffect, useDeferredValue, useCallback, useMemo } from "react";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { banner } from "../store/bannerStore";
import { SectionSpinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { Modal, ModalHeader } from "../components/Modal";
import { Button } from "../components/Button";
import { SegmentedControl } from "../components/SegmentedControl";
import { variableMaker, resolveTokenRefBgs, translateLocalBg } from "../utils/engine";
import type { EngineInput, EngineResult } from "../types/state";
import { CardTitle, MicroText } from "../components/typography";
import type { ProjectStore } from "../types/state";
import { RatingBadge, TokenTile, ScaleStepSlice, SourceColorCard, getInkMode, inkColor, normalizeHex, copyText } from "../components/preview";

// ── Engine call ───────────────────────────────────────────────────────────────

function buildEngineConfig(projectStore: ProjectStore): EngineInput {
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
      const { localBgResolved, localBgTokenRef, localBgDynamicRef } = translateLocalBg(r.localBg, projectStore.colors, projectStore.themes);
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

function runEngine(projectStore: ProjectStore): EngineResult | null {
  if (!projectStore.colors.length || !projectStore.roles.length || !projectStore.themes.length) return null;
  try {
    const config = buildEngineConfig(projectStore);
    const pass1 = variableMaker(config);
    // Two-pass: resolve token-kind localBg refs from pass-1 output, re-run if needed
    if (resolveTokenRefBgs(config, pass1)) return variableMaker(config);
    return pass1;
  } catch {
    return null;
  }
}

// ── Color section (grid mode) ─────────────────────────────────────────────────

interface ColorSectionProps {
  colorName: string;
  srcHex: string;
  roles: Record<number, Record<number, import("../../shared/clrEngine").TokenEntry>>;
  projectStore: ProjectStore;
  ink: "light" | "dark";
}

function ColorSection({ colorName, srcHex, roles, projectStore, ink }: ColorSectionProps) {
  const variations = projectStore.variations ?? [];

  return (
    <div className="rounded-[14px] p-4" style={{ border: `1px solid ${inkColor(ink, 0.1)}`, background: inkColor(ink, 0.03) }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: srcHex, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }} />
        <span className="text-[13px] font-bold" style={{ color: inkColor(ink) }}>
          {colorName}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(roles).map(([roleIdxStr, vars]) => {
          const roleIdx = parseInt(roleIdxStr);
          const role = projectStore.roles[roleIdx];
          if (!role) return null;
          const roleVars = role.variations ?? variations;

          return (
            <div key={roleIdx} className="flex flex-col gap-2">
              <span className="text-[12px] font-bold truncate" style={{ color: inkColor(ink, 0.9) }}>
                {role.name}
              </span>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(88px,1fr))" }}>
                {Object.entries(vars).map(([varIdxStr, token]) => {
                  const varIdx = parseInt(varIdxStr);
                  const v = roleVars[varIdx];
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
}

// ── Table section ─────────────────────────────────────────────────────────────

interface TableSectionProps {
  colorName: string;
  srcHex: string;
  roles: Record<number, Record<number, import("../../shared/clrEngine").TokenEntry>>;
  projectStore: ProjectStore;
  ink: "light" | "dark";
}

function TableSection({ srcHex, roles, projectStore, ink }: TableSectionProps) {
  const variations = projectStore.variations ?? [];
  const hdrInk = getInkMode(srcHex);
  const COL = "minmax(80px,1fr) 64px 56px 48px minmax(120px,2fr)";

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${inkColor(ink, 0.1)}` }}>
      {/* Section header — uses source color as bg */}
      <div className="grid items-center h-8 sticky top-0 z-10" style={{ background: srcHex, gridTemplateColumns: COL }}>
        {(["Token", "Hex", "Ratio", "WCAG", "Token Name"] as const).map((h, i) => (
          <div key={h} className="px-2 text-[10px] font-bold tracking-[0.07em] uppercase truncate" style={{ color: inkColor(hdrInk, 0.75), paddingLeft: i === 0 ? 12 : undefined }}>
            {h}
          </div>
        ))}
      </div>

      {Object.entries(roles).map(([roleIdxStr, vars]) => {
        const roleIdx = parseInt(roleIdxStr);
        const role = projectStore.roles[roleIdx];
        if (!role) return null;
        const roleVars = role.variations ?? variations;

        return (
          <div key={roleIdx}>
            <div className="h-[26px] flex items-center px-4" style={{ background: inkColor(ink, 0.05), borderTop: `1px solid ${inkColor(ink, 0.08)}` }}>
              <span className="text-[10px] font-bold tracking-[0.06em] uppercase truncate" style={{ color: inkColor(ink, 0.5) }}>
                {role.name}
              </span>
            </div>

            {Object.entries(vars).map(([varIdxStr, token]) => {
              const varIdx = parseInt(varIdxStr);
              const v = roleVars[varIdx];
              const varLabel = v ? v.shorthand || v.name : String(varIdx);
              const ratio = typeof token.contrast?.ratio === "number" ? token.contrast.ratio.toFixed(1) : "—";

              return (
                <div
                  key={varIdxStr}
                  className="grid items-center h-9 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ gridTemplateColumns: COL, borderTop: `1px solid ${inkColor(ink, 0.06)}` }}
                  onClick={() => copyText(token.value, "hex")}
                  title={`${token.value.toUpperCase()} — click to copy hex`}
                >
                  <div className="px-3 flex items-center gap-1.5 min-w-0">
                    <div className="w-3.5 h-3.5 rounded-[3px] shrink-0" style={{ background: token.value, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }} />
                    <span className="text-[11px] font-semibold truncate" style={{ color: inkColor(ink, 0.85) }}>
                      {varLabel}
                    </span>
                  </div>
                  <div className="px-2 min-w-0">
                    <span
                      className="text-[10px] font-mono font-semibold tracking-[0.04em]"
                      style={{ color: token.value }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(token.value, "hex");
                      }}
                    >
                      {token.value.toUpperCase()}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: inkColor(ink, 0.8) }}>
                      {ratio}
                    </span>
                  </div>
                  <div className="px-2">
                    <RatingBadge rating={token.contrast?.rating ?? "Fail"} />
                  </div>
                  <div className="px-2 min-w-0">
                    {token.tokenName ? (
                      <span
                        className="text-[10px] font-mono truncate block cursor-pointer hover:underline"
                        style={{ color: inkColor(ink, 0.45) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyText(token.tokenName, "token name");
                        }}
                        title={`${token.tokenName} — click to copy`}
                      >
                        {token.tokenName}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: inkColor(ink, 0.2) }}>
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Role-group table section ──────────────────────────────────────────────────
// Like TableSection but role is the top-level header, colors are sub-headers.

interface RoleTableSectionProps {
  roleName: string;
  colorMap: Record<string, Record<number, import("../../shared/clrEngine").TokenEntry>>;
  projectStore: ProjectStore;
  ink: "light" | "dark";
}

function RoleTableSection({ roleName, colorMap, projectStore, ink }: RoleTableSectionProps) {
  const COL = "minmax(80px,1fr) 64px 56px 48px minmax(120px,2fr)";
  const role = projectStore.roles.find((r) => r.name === roleName);
  const roleVars = role?.variations ?? projectStore.variations ?? [];

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${inkColor(ink, 0.1)}` }}>
      {/* Role header row */}
      <div className="grid items-center h-8 sticky top-0 z-10" style={{ background: inkColor(ink, 0.12), gridTemplateColumns: COL }}>
        {(["Role / Color", "Hex", "Ratio", "WCAG", "Token Name"] as const).map((h, i) => (
          <div key={h} className="px-2 text-[10px] font-bold tracking-[0.07em] uppercase truncate" style={{ color: inkColor(ink, 0.75), paddingLeft: i === 0 ? 12 : undefined }}>
            {i === 0 ? roleName : h}
          </div>
        ))}
      </div>

      {Object.entries(colorMap).map(([colorName, vars]) => {
        const colorEntry = projectStore.colors.find((c) => c.name === colorName);
        const cHex = normalizeHex(colorEntry?.value ?? "888888");
        return (
          <div key={colorName}>
            {/* Color sub-header */}
            <div className="h-[26px] flex items-center gap-2 px-4" style={{ background: inkColor(ink, 0.05), borderTop: `1px solid ${inkColor(ink, 0.08)}` }}>
              <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: cHex }} />
              <span className="text-[10px] font-bold tracking-[0.06em] uppercase truncate" style={{ color: inkColor(ink, 0.5) }}>
                {colorName}
              </span>
            </div>

            {Object.entries(vars).map(([varIdxStr, token]) => {
              const varIdx = parseInt(varIdxStr);
              const v = roleVars[varIdx];
              const varLabel = v ? v.shorthand || v.name : String(varIdx);
              const contrastRatioStr = typeof token.contrast?.ratio === "number" ? token.contrast.ratio.toFixed(1) : "—";

              return (
                <div key={varIdxStr} className="grid items-center h-9 cursor-pointer hover:opacity-80 transition-opacity" style={{ gridTemplateColumns: COL, borderTop: `1px solid ${inkColor(ink, 0.06)}` }} onClick={() => copyText(token.value, "hex")}>
                  <div className="px-3 flex items-center gap-1.5 min-w-0">
                    <div className="w-3.5 h-3.5 rounded-[3px] shrink-0" style={{ background: token.value, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }} />
                    <span className="text-[11px] font-semibold truncate" style={{ color: inkColor(ink, 0.85) }}>
                      {varLabel}
                    </span>
                  </div>
                  <div className="px-2 min-w-0">
                    <span
                      className="text-[10px] font-mono font-semibold tracking-[0.04em]"
                      style={{ color: token.value }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(token.value, "hex");
                      }}
                    >
                      {token.value.toUpperCase()}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: inkColor(ink, 0.8) }}>
                      {contrastRatioStr}
                    </span>
                  </div>
                  <div className="px-2">
                    <RatingBadge rating={token.contrast?.rating ?? "Fail"} />
                  </div>
                  <div className="px-2 min-w-0">
                    {token.tokenName ? (
                      <span
                        className="text-[10px] font-mono truncate block cursor-pointer hover:underline"
                        style={{ color: inkColor(ink, 0.45) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyText(token.tokenName, "token name");
                        }}
                      >
                        {token.tokenName}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: inkColor(ink, 0.2) }}>
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Scale table view ──────────────────────────────────────────────────────────

interface ScaleTableViewProps {
  result: EngineResult;
  projectStore: ProjectStore;
}

function ScaleTableView({ result, projectStore }: ScaleTableViewProps) {
  const COL = "80px 1fr 64px 56px 48px";
  const themes = projectStore.themes;

  if (Object.keys(result.scales).length === 0) {
    return <p className="text-[12px] text-n-tx-muted p-4 text-center">No scale in Direct mode.</p>;
  }

  return (
    <div className="flex flex-col gap-4 p-3 pb-6">
      {projectStore.colors.map((color) => {
        const scale = result.scales[color.name];
        if (!scale) return null;
        const srcHex = normalizeHex(color.value);
        const hdrInk = getInkMode(srcHex);

        return (
          <div key={color._id} className="rounded-[10px] overflow-hidden border border-n-br-default">
            {/* Color header */}
            <div className="grid items-center h-8 sticky top-0 z-10" style={{ background: srcHex, gridTemplateColumns: COL }}>
              {(["Step", "Hex", "Ratio", "WCAG", ""].concat(themes.map((t) => t.name)) as string[]).slice(0, 4 + themes.length).map((h, i) => (
                <div key={i} className="px-2 text-[10px] font-bold tracking-[0.07em] uppercase truncate" style={{ color: inkColor(hdrInk, 0.75), paddingLeft: i === 0 ? 12 : undefined }}>
                  {i === 0 ? color.name : h}
                </div>
              ))}
            </div>

            {Object.entries(scale).map(([stepName, stepData]) => {
              const firstTheme = themes[0];
              const contrast = firstTheme ? stepData.contrast?.[firstTheme.name.toLowerCase()] : null;
              const ratioStr = typeof contrast?.ratio === "number" ? contrast.ratio.toFixed(1) : "—";

              return (
                <div key={stepName} className="grid items-center h-9 border-t border-n-br-subtle cursor-pointer hover:bg-n-sf-hover transition-colors" style={{ gridTemplateColumns: COL }} onClick={() => copyText(stepData.value, `${color.name}/${stepName}`)}>
                  <div className="px-3 flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-[3px] shrink-0 border border-n-br-subtle" style={{ background: stepData.value }} />
                    <span className="text-[11px] font-semibold text-n-tx-primary">{stepName}</span>
                  </div>
                  <div className="px-2">
                    <span
                      className="text-[10px] font-mono font-semibold"
                      style={{ color: stepData.value }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(stepData.value, "hex");
                      }}
                    >
                      {stepData.value.toUpperCase()}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className="text-[12px] font-bold tabular-nums text-n-tx-primary">{ratioStr}</span>
                  </div>
                  <div className="px-2">{contrast?.rating && <RatingBadge rating={contrast.rating} />}</div>
                  <div className="px-2 text-[10px] text-n-tx-dim font-mono truncate">
                    {themes
                      .slice(1)
                      .map((t) => {
                        const c = stepData.contrast?.[t.name.toLowerCase()];
                        return c ? `${t.name}: ${c.ratio?.toFixed(1)}` : "";
                      })
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

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

function TreeSection({ result, projectStore, themeIdx, groupBy, ink }: TreeSectionProps) {
  const theme = projectStore.themes[themeIdx];
  if (!theme) return null;

  const themeKey = theme.name.toLowerCase();
  const themeTokens = result.tokens[themeKey] ?? {};
  type VarMap = Record<number, import("../../shared/clrEngine").TokenEntry>;

  const colorEntries = Object.entries(themeTokens) as [string, Record<number, VarMap>][];

  function varMeta(token: import("../../shared/clrEngine").TokenEntry) {
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

// ── Theme panel (one per theme tab) ──────────────────────────────────────────

type GroupBy = "color" | "role";
type ViewMode = "grid" | "table" | "tree";

interface ThemePanelProps {
  result: EngineResult;
  projectStore: ProjectStore;
  themeIdx: number;
  groupBy: GroupBy;
  viewMode: ViewMode;
}

function ThemePanel({ result, projectStore, themeIdx, groupBy, viewMode }: ThemePanelProps) {
  const theme = projectStore.themes[themeIdx];
  if (!theme) return null;

  const bgHex = normalizeHex(theme.bg || "#FFFFFF");
  const ink = getInkMode(bgHex);
  const themeKey = theme.name.toLowerCase();
  const themeTokens = result.tokens[themeKey] ?? {};

  // Re-group by role if needed: role → { colorName → { varIdx → token } }
  type VarMap = Record<number, import("../../shared/clrEngine").TokenEntry>;
  type ByRole = Record<number, Record<string, VarMap>>;

  function buildByRole(): ByRole {
    const out: ByRole = {};
    for (const [colorName, roles] of Object.entries(themeTokens)) {
      for (const [roleIdxStr, vars] of Object.entries(roles)) {
        const roleIdx = parseInt(roleIdxStr);
        if (!out[roleIdx]) out[roleIdx] = {};
        out[roleIdx][colorName] = vars as VarMap;
      }
    }
    return out;
  }

  const colorEntries = Object.entries(themeTokens) as [string, Record<number, VarMap>][];
  const byRole = useMemo(() => (groupBy === "role" ? buildByRole() : null), [groupBy, themeTokens]);

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
              <TableSection key={colorName} colorName={colorName} srcHex={srcHex} roles={roles} projectStore={projectStore} ink={ink} />
            );
          })
        : Object.entries(byRole!).map(([roleIdxStr, colorMap]) => {
            const roleIdx = parseInt(roleIdxStr);
            const role = projectStore.roles[roleIdx];
            if (!role) return null;

            if (viewMode === "table") {
              return <RoleTableSection key={roleIdxStr} roleName={role.name} colorMap={colorMap} projectStore={projectStore} ink={ink} />;
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

// ── Color scale section ───────────────────────────────────────────────────────

interface ScaleSectionProps {
  result: EngineResult;
  projectStore: ProjectStore;
  groupByStep?: boolean;
  viewMode?: ViewMode;
}

function ScaleSection({ result, projectStore, groupByStep = false, viewMode = "grid" }: ScaleSectionProps) {
  const colors = projectStore.colors;
  const themes = projectStore.themes;
  const themeKeys = themes.map((t) => t.name.toLowerCase());

  if (Object.keys(result.scales).length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-[12px] text-n-tx-muted">No scale in Direct mode — colors are solved directly per variation target.</p>
      </div>
    );
  }

  if (groupByStep) {
    const firstScale = result.scales[colors[0]?.name];
    const stepNames = firstScale ? Object.keys(firstScale) : [];

    return (
      <div className="flex flex-col gap-4 p-3 pb-6">
        {stepNames.map((stepName) => (
          <div key={stepName} className="flex flex-col gap-2">
            <div className="px-1">
              <CardTitle>{stepName}</CardTitle>
            </div>

            {viewMode === "table" ? (
              // Table: one row per color at this step
              <div className="rounded-[10px] overflow-hidden border border-n-br-default">
                {colors.map((color) => {
                  const stepData = result.scales[color.name]?.[stepName];
                  if (!stepData) return null;
                  const srcHex = normalizeHex(color.value);
                  const contrast = themeKeys.length > 0 ? stepData.contrast?.[themeKeys[0]] : null;
                  const ratioStr = typeof contrast?.ratio === "number" ? contrast.ratio.toFixed(1) : "—";
                  return (
                    <div
                      key={color._id}
                      className="grid items-center h-9 border-t border-n-br-subtle first:border-0 cursor-pointer hover:bg-n-sf-hover transition-colors"
                      style={{ gridTemplateColumns: "1fr 64px 56px 48px" }}
                      onClick={() => copyText(stepData.value, `${color.name}/${stepName}`)}
                    >
                      <div className="px-3 flex items-center gap-2 min-w-0">
                        <div className="w-3.5 h-3.5 rounded-[3px] shrink-0" style={{ background: stepData.value, boxShadow: "0 0 0 1px rgba(0,0,0,0.10)" }} />
                        <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: srcHex, boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }} />
                        <span className="text-[11px] font-semibold text-n-tx-primary truncate">{color.name}</span>
                      </div>
                      <div className="px-2">
                        <span className="text-[10px] font-mono font-semibold" style={{ color: stepData.value }}>
                          {stepData.value.toUpperCase()}
                        </span>
                      </div>
                      <div className="px-2">
                        <span className="text-[12px] font-bold tabular-nums text-n-tx-primary">{ratioStr}</span>
                      </div>
                      <div className="px-2">{contrast?.rating && <RatingBadge rating={contrast.rating} />}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Strip: all colors at this step as a horizontal spectrum
              <div className="flex w-full h-24 rounded-[10px] overflow-hidden cursor-crosshair" style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.12)", border: "1px solid rgba(136,136,136,0.10)" }}>
                {colors.map((color) => {
                  const stepData = result.scales[color.name]?.[stepName];
                  if (!stepData) return null;
                  return <ScaleStepSlice key={color._id} stepName={color.name} stepData={stepData} themeKeys={themeKeys} colorName={color.name} />;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === "table") {
    return <ScaleTableView result={result} projectStore={projectStore} />;
  }

  return (
    <div className="flex flex-col gap-5 p-3 pb-6">
      {colors.map((color) => {
        const scale = result.scales[color.name];
        if (!scale) return null;
        const steps = Object.entries(scale);
        const srcHex = normalizeHex(color.value);

        return (
          <div key={color._id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: srcHex }} />
              <CardTitle>{color.name}</CardTitle>
              <MicroText className="text-n-tx-dim ml-1">{srcHex.toUpperCase()}</MicroText>
            </div>

            <div className="flex w-full h-24 rounded-[10px] overflow-hidden cursor-crosshair" style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.12)", border: "1px solid rgba(136,136,136,0.10)" }}>
              {steps.map(([stepName, stepData]) => (
                <ScaleStepSlice key={stepName} stepName={stepName} stepData={stepData} themeKeys={themeKeys} colorName={color.name} />
              ))}
            </div>

            {(projectStore.alphaValues?.length ?? 0) > 0 && <SourceColorCard color={color} alphaValues={projectStore.alphaValues ?? []} showAlphas />}
          </div>
        );
      })}
    </div>
  );
}

// ── Source collection panel ───────────────────────────────────────────────────

function SourcePanel({ projectStore }: { projectStore: ProjectStore }) {
  const showAlphas = (projectStore.alphaValues?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5 p-3 pb-6">
      {projectStore.colors.map((color) => (
        <SourceColorCard key={color._id} color={color} alphaValues={projectStore.alphaValues ?? []} showAlphas={showAlphas} />
      ))}
    </div>
  );
}

// ── Accessibility warnings ────────────────────────────────────────────────────

function reportAccessibilityWarnings(result: EngineResult, pluginMode: string): void {
  const { warnings } = result.errors;
  // In direct mode the solver always produces the closest achievable color —
  // "can't hit exact target" is expected and not actionable for the user.
  // Contrast warnings only apply in scale mode where steps are discrete.
  if (!warnings || warnings.length === 0 || pluginMode !== "scale") {
    banner.remove("preview-contrast-warnings");
    return;
  }
  const msg = `${warnings.length} contrast warning${warnings.length > 1 ? "s" : ""}: some tokens may not meet their contrast targets.`;
  banner.show({ id: "preview-contrast-warnings", type: "warning", title: "Contrast Warnings", message: msg });
}

// ── Preview content ───────────────────────────────────────────────────────────

type TabId = "scale" | `theme-${number}` | "source";

function PreviewContent() {
  const projectStore = useProjectStore((s) => s.projectStore);
  const deferred = useDeferredValue(projectStore);

  const [result, setResult] = useState<EngineResult | null>(null);
  const [computing, setComputing] = useState(false);
  function usePersistedString<T extends string>(key: string, def: T): [T, (v: T) => void] {
    const [val, setVal] = useState<T>(() => {
      try {
        return (localStorage.getItem(key) as T) ?? def;
      } catch {
        return def;
      }
    });
    function set(v: T) {
      setVal(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        /* ignore */
      }
    }
    return [val, set];
  }

  const [activeTab, setActiveTab] = usePersistedString<TabId>("preview_activeTab", "scale");
  const [groupBy, setGroupBy] = usePersistedString<GroupBy>("preview_groupBy", "color");
  const [viewMode, setViewMode] = usePersistedString<ViewMode>("preview_viewMode", "grid");

  const compute = useCallback((state: ProjectStore) => {
    setComputing(true);
    setTimeout(() => {
      const r = runEngine(state);
      setResult(r);
      setComputing(false);
      if (r) reportAccessibilityWarnings(r, state.pluginMode);
    }, 0);
  }, []);

  useEffect(() => {
    compute(deferred);
  }, [deferred, compute]);

  // Default to first theme tab in direct mode
  useEffect(() => {
    if (projectStore.pluginMode === "direct" && activeTab === "scale" && projectStore.themes.length > 0) {
      setActiveTab("theme-0");
    }
  }, [projectStore.pluginMode, projectStore.themes.length]);

  const isScaleMode = projectStore.pluginMode === "scale";
  const isEmpty = !projectStore.colors.length || !projectStore.roles.length;

  if (isEmpty) {
    return (
      <div className="p-3">
        <EmptyState icon="👁" title="Nothing to preview" description="Add at least one color and one role to see a preview." />
      </div>
    );
  }

  const tabs: { id: TabId; label: string; bg?: string }[] = [
    ...(isScaleMode ? [{ id: "scale" as TabId, label: "Scale" }] : []),
    ...projectStore.themes.map((t, i) => ({
      id: `theme-${i}` as TabId,
      label: t.name,
      bg: normalizeHex(t.bg || "#FFFFFF"),
    })),
    ...(projectStore.includeSourceColors ? [{ id: "source" as TabId, label: "Source" }] : []),
  ];

  const activeThemeMatch = activeTab.match(/^theme-(\d+)$/);
  const activeThemeIdx = activeThemeMatch ? parseInt(activeThemeMatch[1]) : -1;
  const activeTheme = activeThemeIdx >= 0 ? projectStore.themes[activeThemeIdx] : null;
  const panelBg = activeTheme ? normalizeHex(activeTheme.bg || "#FFFFFF") : undefined;
  const isScaleTab = activeTab === "scale";
  const isSourceTab = activeTab === "source";

  function cycleTab(dir: 1 | -1) {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    const next = tabs[(idx + dir + tabs.length) % tabs.length];
    if (next) setActiveTab(next.id);
  }

  function onTabBarKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      cycleTab(1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      cycleTab(-1);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar + toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-n-br-subtle flex-wrap gap-y-2">
        {/* Tabs — arrow-key navigable */}
        <div className="flex items-center gap-1 flex-wrap" role="tablist" onKeyDown={onTabBarKeyDown}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${isActive ? "bg-b-fi-btn-default text-b-tx-btn-default" : "bg-n-sf-input text-n-tx-muted hover:bg-n-sf-hover hover:text-n-tx-primary"}`}
              >
                {tab.bg && <span className="w-2.5 h-2.5 rounded-[2px] shrink-0 inline-block" style={{ background: tab.bg, boxShadow: "0 0 0 1px rgba(128,128,128,0.2)" }} />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Toolbar — hidden on Source tab */}
        <div className={`flex items-center gap-2 ${isSourceTab ? "invisible pointer-events-none" : ""}`}>
          {computing && <MicroText className="text-n-tx-dim">Computing…</MicroText>}
          <SegmentedControl
            segments={
              isScaleTab
                ? [
                    { value: "color", label: "Color" },
                    { value: "role", label: "Step" },
                  ]
                : [
                    { value: "color", label: "Color" },
                    { value: "role", label: "Role" },
                  ]
            }
            value={groupBy}
            onChange={(v) => setGroupBy(v as GroupBy)}
          />
          <SegmentedControl
            segments={
              isScaleTab
                ? [
                    { value: "grid", label: "Strip" },
                    { value: "table", label: "Table" },
                  ]
                : [
                    { value: "grid", label: "Grid" },
                    { value: "table", label: "Table" },
                    { value: "tree", label: "Tree" },
                  ]
            }
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
          />
        </div>
      </div>

      {/* Panel */}
      {computing ? (
        <div className="flex-1 flex items-center justify-center">
          <SectionSpinner message="Computing tokens…" />
        </div>
      ) : result ? (
        <div className="flex-1 overflow-y-auto" style={panelBg ? { backgroundColor: panelBg } : undefined}>
          {isScaleTab && <ScaleSection result={result} projectStore={projectStore} groupByStep={groupBy === "role"} viewMode={viewMode} />}
          {activeThemeIdx >= 0 && <ThemePanel result={result} projectStore={projectStore} themeIdx={activeThemeIdx} groupBy={groupBy} viewMode={viewMode} />}
          {isSourceTab && <SourcePanel projectStore={projectStore} />}
        </div>
      ) : (
        <div className="flex-1 p-3">
          <EmptyState icon="⚠" title="Engine error" description="Could not compute tokens. Check color values and settings." />
        </div>
      )}
    </div>
  );
}

export function PreviewScreen() {
  const isOpen = useUiStore((s) => s.activeOverlay === "preview");
  const closeOverlay = useUiStore((s) => s.closeOverlay);

  if (!isOpen) return null;

  return (
    <Modal open layer="overlay">
      <ModalHeader title="Preview" subtitle="Live token and color scale preview." actions={<Button variant="secondary" size="md" label="Close" onClick={closeOverlay} />} />
      <div className="flex-1 overflow-hidden flex flex-col">
        <PreviewContent />
      </div>
    </Modal>
  );
}
