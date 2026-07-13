/**
 * CanvasPreviewDevTree — hierarchical inspector for engine output
 *
 * Mirrors the exact structure of EngineResult:
 *   Errors/Warnings summary
 *   └─ Scales  →  [Color]  →  [Step]
 *   └─ Tokens  →  [Theme]  →  [Color]  →  [Role]  →  [Variation]
 *
 * Controls:
 *   Expand all / Collapse all — remounts tree with new defaultOpen value
 *   Filter bar — by color name, role name, warnings-only, errors-only
 */

import type { ProjectStore, EngineResult } from "../../types/state";
import { TreeRow } from "./TreeRow";
import { ErrorsBanner } from "./ErrorsBanner";
import { ConfigTree } from "./ConfigTree";
import { ScaleStepNode, ThemeColorNode } from "./TreeNodes";
import { Chip, ToolbarBtn } from "./Toolbar";
import { useDevTreeFilters } from "./useDevTreeFilters";

// ── Main tree view ────────────────────────────────────────────────────────────

export function CanvasPreviewDevTree({ projectStore, config, result }: { projectStore: ProjectStore; config: ProjectStore; result: EngineResult }) {
  const {
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
  } = useDevTreeFilters(projectStore, result);

  const themeEntries = Object.entries(result.tokens);
  const scaleEntries = Object.entries(result.scales);
  const includeScales = projectStore.includeColorScalesCollection !== false;

  // Filter scale colors
  const visibleScaleColors = visibleColors ? scaleEntries.filter(([name]) => visibleColors.has(name)) : scaleEntries;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 11 }}>
      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 12,
          padding: "8px 10px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Expand / Collapse */}
        <ToolbarBtn label="Expand all" onClick={() => triggerExpand(true)} title="Open every node" />
        <ToolbarBtn label="Collapse all" onClick={() => triggerExpand(false)} title="Close every node" />

        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

        {/* Search inputs */}
        <input
          value={colorSearch}
          onChange={(e) => setColorSearch(e.target.value)}
          placeholder="Filter color…"
          style={{
            fontSize: 10,
            padding: "3px 7px",
            borderRadius: 4,
            border: colorSearch ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#e4e4e7",
            outline: "none",
            width: 100,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        />
        <input
          value={roleSearch}
          onChange={(e) => setRoleSearch(e.target.value)}
          placeholder="Filter role…"
          style={{
            fontSize: 10,
            padding: "3px 7px",
            borderRadius: 4,
            border: roleSearch ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#e4e4e7",
            outline: "none",
            width: 100,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        />

        {(colorSearch || roleSearch) && (
          <ToolbarBtn
            label="✕ Clear"
            onClick={() => {
              setColorSearch("");
              setRoleSearch("");
            }}
          />
        )}

        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

        {/* Status filter chips */}
        <Chip label={`⚠ ${totalWarnings} warning${totalWarnings !== 1 ? "s" : ""}`} active={activeChips.has("warnings")} color="#fbbf24" onClick={() => toggleChip("warnings")} />
        <Chip label={`✕ ${result.errors.critical.length} critical`} active={activeChips.has("errors")} color="#f87171" onClick={() => toggleChip("errors")} />
        <Chip label={`↺ ${totalAdjusted} adjusted`} active={activeChips.has("adjusted")} color="#a78bfa" onClick={() => toggleChip("adjusted")} />
        <Chip label={`ℹ ${totalNotices} notice${totalNotices !== 1 ? "s" : ""}`} active={activeChips.has("warnings")} color="#60a5fa" onClick={() => toggleChip("warnings")} />

        {activeChips.size > 0 && <ToolbarBtn label="✕ Reset filters" onClick={() => setActiveChips(new Set())} />}
      </div>

      {/* Errors banner */}
      <ErrorsBanner errors={result.errors} />

      {/* ── Tree (keyed so expand/collapse remounts defaultOpen) ── */}
      <div key={expandKey}>
        {/* Config */}
        <ConfigTree config={config} expandAll={expandAll} />

        {/* Scales */}
        {includeScales && visibleScaleColors.length > 0 && (
          <TreeRow depth={0} label="Scales" defaultOpen={expandAll} tag={`${visibleScaleColors.length} color${visibleScaleColors.length !== 1 ? "s" : ""}`}>
            {visibleScaleColors.map(([colorName, steps]) => {
              const colorObj = projectStore.colors.find((c) => c.name === colorName);
              const stepEntries = Object.entries(steps);
              return (
                <TreeRow key={colorName} depth={1} label={colorName} hex={colorObj?.value} defaultOpen={expandAll} tag={`${stepEntries.length} step${stepEntries.length !== 1 ? "s" : ""}`}>
                  {stepEntries.map(([stepKey, step]) => (
                    <ScaleStepNode key={stepKey} stepKey={stepKey} step={step} depth={2} />
                  ))}
                </TreeRow>
              );
            })}
          </TreeRow>
        )}

        {/* Tokens */}
        <TreeRow depth={0} label="Tokens" defaultOpen={true} tag={`${themeEntries.length} theme${themeEntries.length !== 1 ? "s" : ""}`} status={totalWarnings > 0 ? "warn" : totalAdjusted > 0 ? "adjusted" : "ok"}>
          {themeEntries.map(([themeName, colorMap]) => {
            const theme = projectStore.themes.find((t) => t.name.toLowerCase() === themeName);

            // apply color filter to this theme's color entries
            const colorEntries = Object.entries(colorMap).filter(([cn]) => !visibleColors || visibleColors.has(cn));
            if (colorEntries.length === 0) return null;

            const themeWarn = result.errors.warnings.some((w) => w.theme === themeName);
            const themeAdjusted = colorEntries.some(([, roleMap]) => Object.values(roleMap as object).some((vm: unknown) => Object.values(vm as object).some((t: unknown) => (t as { isAdjusted?: boolean }).isAdjusted)));

            return (
              <TreeRow key={themeName} depth={1} label={themeName} hex={theme?.bg} defaultOpen={expandAll} status={themeWarn ? "warn" : themeAdjusted ? "adjusted" : "ok"} tag={`${colorEntries.length} color${colorEntries.length !== 1 ? "s" : ""}`}>
                {colorEntries.map(([colorName, roleMap]) => (
                  <ThemeColorNode
                    key={colorName}
                    colorName={colorName}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    roleMap={roleMap as any}
                    depth={2}
                    projectStore={projectStore}
                    result={result}
                    themeName={themeName}
                    visibleRoles={visibleRoles}
                  />
                ))}
              </TreeRow>
            );
          })}
        </TreeRow>
      </div>
    </div>
  );
}
