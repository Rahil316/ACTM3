import { useState, useEffect } from "react";
import { useUiStore } from "../store/uiStore";
import { useProjectStore, ensureIds, ensureVariations } from "../store/projectStore";
import { banner } from "../store/bannerStore";
import { PRESETS } from "../lib/presets/presets";
import { ShopCard } from "../components/cards/ShopCard";
import { Button } from "../components/Button";
import { IconChevronLeft } from "../components/icons";
import { FullscreenOverlay } from "../components/FullscreenOverlay";
import type { ProjectStore, ProjectStoreSnapshot } from "../types/state";

export interface Preset {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  badge?: string;
  swatches?: string[];
  config: Partial<ProjectStoreSnapshot>;
}

export function ThemeShopOverlay() {
  const isOpen = useUiStore((s) => s.activeOverlay === "theme-shop");
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const loadState = useProjectStore((s) => s.loadState);
  const presetId = useProjectStore((s) => (s.projectStore as ProjectStore & { _presetId?: string })._presetId);

  const [query, setQuery] = useState("");

  // Keyboard close
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeOverlay();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeOverlay]);

  if (!isOpen) return null;

  const filtered = query.trim()
    ? PRESETS.filter((p) => {
        const q = query.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.tags?.some((t: string) => t.toLowerCase().includes(q)) || p.badge?.toLowerCase().includes(q);
      })
    : PRESETS;

  function handleLoad(preset: Preset) {
    const next = { ...preset.config, _presetId: preset.id } as ProjectStore & { _presetId: string };
    ensureIds(next);
    ensureVariations(next);
    loadState(next);
    closeOverlay();
    banner.success(`"${preset.name}" loaded — everything is editable.`, { autoClose: 3000 });
  }

  return (
    <FullscreenOverlay>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-3 border-b border-border-base bg-bg-app">
        <Button variant="ghost" size="sm" square icon={<IconChevronLeft className="w-4 h-4" />} onClick={closeOverlay} aria-label="Back" title="Back" />
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold text-text-primary leading-tight">Theme Shop</h2>
          <p className="text-[11px] text-text-muted mt-0.5">Load a preset to get started — everything is editable.</p>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2 border-b border-border-subtle">
        <input
          type="text"
          placeholder="Search presets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-8 px-3 rounded-[8px] bg-bg-input border border-border-input text-[12px] text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus transition-colors"
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[12px] text-text-muted">No presets match "{query}"</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filtered.map((preset) => (
              <ShopCard key={preset.id} preset={preset} isLoaded={presetId === preset.id} onLoad={() => handleLoad(preset)} />
            ))}
          </div>
        )}
      </div>
    </FullscreenOverlay>
  );
}
