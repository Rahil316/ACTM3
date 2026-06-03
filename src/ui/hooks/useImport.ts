import { useRef, useCallback } from "react";
import { useProjectStore, ensureIds, ensureVariations } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { toast } from "../store/toastStore";
import type { ProjectStore } from "../types/state";

export function useImport() {
  const loadState = useProjectStore((s) => s.loadState);
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const ref = useRef<HTMLInputElement>(null);

  const trigger = useCallback(() => {
    ref.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string) as ProjectStore;
          if (!Array.isArray(parsed.colors) || !Array.isArray(parsed.roles) || !Array.isArray(parsed.themes)) {
            toast.error("Invalid file: missing colors, roles, or themes");
            return;
          }
          ensureIds(parsed);
          ensureVariations(parsed);
          loadState(parsed);
          closeOverlay();
          toast.success("Configuration imported");
        } catch {
          toast.error("Invalid JSON file");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [loadState, closeOverlay],
  );

  return { trigger, ref, handleChange };
}
