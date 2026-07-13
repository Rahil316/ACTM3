import { useEffect, useMemo, useState } from "react";
import type { ProjectStore } from "../../types/state";
import { logValidation } from "./devLogging";
import type { DetailItem, TreeViewMode } from "./types";

export function useDevOverlayState(projectStore: ProjectStore, result: unknown) {
  const [mode, setMode] = useState<TreeViewMode>("flat");
  const [selectedItem, setSelectedItem] = useState<DetailItem | null>(null);

  const selectedRef = useMemo<string | null>(() => selectedItem?.pluginDataRef ?? null, [selectedItem]);

  useEffect(() => {
    console.clear();
    console.log("%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "color:#a78bfa;font-weight:bold");
    console.log("%c  CanvasPreviewDev — Token Wand output validation", "color:#a78bfa;font-size:13px;font-weight:bold");
    console.log("%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "color:#a78bfa;font-weight:bold");
    console.log(`Colors: ${projectStore.colors.length} | Roles: ${projectStore.roles.length} | Themes: ${projectStore.themes.length}`);
    logValidation("Engine result present", !!result);
    logValidation("Colors defined", projectStore.colors.length > 0, `${projectStore.colors.length}`);
    logValidation("Roles defined", projectStore.roles.length > 0, `${projectStore.roles.length}`);
    logValidation("Themes defined", projectStore.themes.length > 0, `${projectStore.themes.length}`);
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    console.group(`%c[CanvasPreviewDev] Selected — ${selectedItem.kind} — ${selectedItem.pluginDataRef}`, "color:#f59e0b;font-weight:bold");
    console.log(selectedItem);
    console.groupEnd();
  }, [selectedItem]);

  const handleModeChange = (m: TreeViewMode) => {
    setMode(m);
    setSelectedItem(null);
  };

  return { mode, selectedItem, setSelectedItem, selectedRef, handleModeChange };
}
