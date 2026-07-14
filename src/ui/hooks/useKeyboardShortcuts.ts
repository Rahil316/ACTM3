import { useEffect, useRef } from "react";
 
declare const __RELEASE__: boolean;
import { useUiStore } from "../store/uiStore";
import { useProjectStore } from "../store/projectStore";
import { toast } from "../store/toastStore";

export function useKeyboardShortcuts(importRef: React.RefObject<HTMLInputElement | null>) {
  const openOverlay = useUiStore((s) => s.openOverlay);
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const setActiveTab = useUiStore((s) => s.setActiveSidebarTab);
  const saveBlocked = useProjectStore((s) => s.versionSaveBlockedReason);

  // Track activeOverlay via a ref so the handler never goes stale
  const activeOverlayRef = useRef(useUiStore.getState().activeOverlay);
  useEffect(() => {
    return useUiStore.subscribe((s) => {
      activeOverlayRef.current = s.activeOverlay;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.closest("input, textarea, select")) return;

      if (e.key === "Escape") {
        if (activeOverlayRef.current) closeOverlay();
        return;
      }

      if (!e.altKey || e.ctrlKey || e.metaKey) return;

      // Use e.code (physical key) not e.key — on Mac, Alt produces special
      // Unicode characters (Alt+P → π, Alt+1 → ¡) so e.key is unreliable.
      switch (e.code) {
        case "Enter":
          e.preventDefault();
          openOverlay("run-dialog");
          break;
        case "Digit1":
          e.preventDefault();
          setActiveTab("color-groups");
          break;
        case "Digit2":
          e.preventDefault();
          setActiveTab("roles");
          break;
        case "Digit3":
          e.preventDefault();
          setActiveTab("project");
          break;
        case "Digit4":
          e.preventDefault();
          setActiveTab("versions");
          break;
        case "Digit0":
          e.preventDefault();
          openOverlay("theme-shop");
          break;
        case "KeyP":
          e.preventDefault();
          if (e.shiftKey && !__RELEASE__) openOverlay("canvas-preview-dev");
          else if (!e.shiftKey) openOverlay("preview");
          break;
        case "KeyK":
          e.preventDefault();
          openOverlay("settings");
          break;
        case "KeyE":
          e.preventDefault();
          openOverlay("design-lab");
          break;
        case "KeyI":
          e.preventDefault();
          importRef.current?.click();
          break;
        case "KeyS": {
          e.preventDefault();
          const reason = saveBlocked();
          if (!reason) openOverlay("save-version");
          else toast.error(reason);
          break;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Store actions are stable Zustand references — safe to omit from deps
  }, []);
}
