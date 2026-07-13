import { useEffect } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useEngineStore } from "../../store/engineStore";
import { SectionSpinner } from "../../components/Spinner";
import { EmptyState } from "../../components/EmptyState";
import { SegmentedControl } from "../../components/SegmentedControl";
import { MicroText } from "../../components/typography";
import { ScaleSection } from "./ScaleSection";
import { ThemePanel } from "./ThemePanel";
import { SourcePanel } from "./SourcePanel";
import { reportAccessibilityWarnings } from "./accessibilityWarnings";
import { usePreviewContentState } from "./usePreviewContentState";
import type { GroupBy, ViewMode } from "./ThemePanel";

// ── Preview content ───────────────────────────────────────────────────────────

export function PreviewContent() {
  const projectStore = useProjectStore((s) => s.projectStore);
  const result = useEngineStore((s) => s.result);
  const computing = useEngineStore((s) => s.status === "computing");

  // Report accessibility warnings whenever engine result changes
  useEffect(() => {
    if (result) reportAccessibilityWarnings(result, projectStore.pluginMode);
  }, [result, projectStore.pluginMode]);

  const { activeTab, setActiveTab, groupBy, setGroupBy, viewMode, setViewMode, isEmpty, tabs, activeThemeIdx, panelBg, isScaleTab, isSourceTab, onTabBarKeyDown } = usePreviewContentState(projectStore);

  if (isEmpty) {
    return (
      <div className="p-3">
        <EmptyState icon="👁" title="Nothing to preview" description="Add at least one color and one role to see a preview." />
      </div>
    );
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
