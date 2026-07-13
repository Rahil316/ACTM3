import { useEffect } from "react";
import { usePersistedString } from "../../hooks/usePersistedString";
import type { ProjectStore } from "../../types/state";
import type { GroupBy, ViewMode } from "./ThemePanel";
import { normalizeHex } from "../../components/preview";

export type TabId = "scale" | `theme-${number}` | "source";

export function usePreviewContentState(projectStore: ProjectStore) {
  const [activeTab, setActiveTab] = usePersistedString<TabId>("preview_activeTab", "scale");
  const [groupBy, setGroupBy] = usePersistedString<GroupBy>("preview_groupBy", "color");
  const [viewMode, setViewMode] = usePersistedString<ViewMode>("preview_viewMode", "grid");

  // Default to first theme tab in direct mode
  useEffect(() => {
    if (projectStore.pluginMode === "direct" && activeTab === "scale" && projectStore.themes.length > 0) {
      setActiveTab("theme-0");
    }
  }, [projectStore.pluginMode, projectStore.themes.length]);

  const isScaleMode = projectStore.pluginMode === "scale";
  const isEmpty = !projectStore.colors.length || !projectStore.roles.length;

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

  return {
    activeTab,
    setActiveTab,
    groupBy,
    setGroupBy,
    viewMode,
    setViewMode,
    isScaleMode,
    isEmpty,
    tabs,
    activeThemeIdx,
    panelBg,
    isScaleTab,
    isSourceTab,
    onTabBarKeyDown,
  };
}
