/**
 * CanvasPreviewDevOverlay — browser-side mirror of canvasPreview.ts
 *
 * Renders Source Colors, Color Scales, and Role Tokens as HTML so you can
 * validate engine output without running the Figma plugin.
 *
 * Open with: Alt+Shift+P
 * Click any swatch / step / token tile to inspect its full reference + storage info.
 */

import { useRef } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { useEngineStore } from "../../store/engineStore";
import { CanvasPreviewDevTree } from "../CanvasPreviewDevTree";
import { Badge } from "./primitives";
import { ModeToggle } from "./ModeToggle";
import { DetailPanel } from "./DetailPanel";
import { SourceColorsSection } from "./SourceColorsSection";
import { ColorScalesSection } from "./ColorScalesSection";
import { RoleTokensSection } from "./RoleTokensSection";
import { useDevOverlayState } from "./useDevOverlayState";

export function CanvasPreviewDevOverlay() {
  const projectStore = useProjectStore((s) => s.projectStore);
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const scrollRef = useRef<HTMLDivElement>(null);

  const result = useEngineStore((s) => s.result);

  const { mode, selectedItem, setSelectedItem, selectedRef, handleModeChange } = useDevOverlayState(projectStore, result);

  const includeSource = projectStore.includeSourceColors === true;
  // Mirrors canvasPreview.ts's skipScales: Direct mode has no scale collection
  // at all (result.scales is now undefined, not just empty), so this section
  // would otherwise render placeholder gray swatches with no real data behind them.
  const includeScales = projectStore.pluginMode !== "direct" && projectStore.includeColorScalesCollection !== false;

  const warningCount = result?.errors.warnings.length ?? 0;
  const criticalCount = result?.errors.critical.length ?? 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#f4f4f5",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "#0f0f11",
          gap: 10,
        }}
      >
        {/* Left: title + status badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", flexShrink: 0 }}>✦</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", flexShrink: 0 }}>Canvas Preview Dev</span>
          <Badge color="#71717a">testing only</Badge>
          {criticalCount > 0 && <Badge color="#f87171">✕ {criticalCount} critical</Badge>}
          {warningCount > 0 && (
            <Badge color="#fbbf24">
              ⚠ {warningCount} warning{warningCount > 1 ? "s" : ""}
            </Badge>
          )}
          {mode === "flat" && selectedItem && (
            <Badge color="#f59e0b">
              {selectedItem.kind} · {selectedItem.pluginDataRef}
            </Badge>
          )}
        </div>

        {/* Centre: mode toggle */}
        <ModeToggle mode={mode} onChange={handleModeChange} />

        {/* Right: stats + close */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "#52525b" }}>
            {projectStore.colors.length}c · {projectStore.roles.length}r · {projectStore.themes.length}t
          </span>
          <button
            onClick={closeOverlay}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#a1a1aa",
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Close Esc
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {!result ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}>Engine returned no result — check the console for errors.</div>
        ) : mode === "flat" ? (
          <>
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {includeSource && projectStore.colors.length > 0 && <SourceColorsSection projectStore={projectStore} onSelect={setSelectedItem} selectedRef={selectedRef} />}
              {includeScales && <ColorScalesSection projectStore={projectStore} result={result} onSelect={setSelectedItem} selectedRef={selectedRef} />}
              <RoleTokensSection projectStore={projectStore} result={result} onSelect={setSelectedItem} selectedRef={selectedRef} />
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 9, color: "#3f3f46", textAlign: "center" }}>✦ Token Wand · Flat view · Click any tile to inspect · Open console for validation logs</div>
            </div>
            {selectedItem && <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />}
          </>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <CanvasPreviewDevTree projectStore={projectStore} config={projectStore} result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
