import { useRef } from "react";
import { useAppStore, makeBootstrapState, ensureIds, ensureVariations, generateId } from "../store/appStore";
import { useUiStore } from "../store/uiStore";
import { toast } from "../store/toastStore";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { CentredOverlay } from "../components/ResultOverlay";
import { PRESETS, type Preset } from "../lib/presets/presets";
import type { AppState } from "../types/state";

// ── Quick Start overlay ───────────────────────────────────────────────────────

// One representative preset per design system shown in the quick-start grid.
const QUICK_START_PRESET_IDS = ["regular-wand", "material-3", "atlassian-ds", "radix-ui", "apple-hig", "tailwind-css", "ibm-carbon", "shopify-polaris"];

interface QuickStartProps {
  onClose: () => void;
}

export function QuickStart({ onClose: _onClose }: QuickStartProps) {
  const loadState = useAppStore((s) => s.loadState);
  const isOpen = useUiStore((s) => s.activeOverlay === "quick-start");
  const close = useUiStore((s) => s.closeOverlay);
  const setActiveSidebarTab = useUiStore((s) => s.setActiveSidebarTab);
  const importRef = useRef<HTMLInputElement>(null);

  const quickPresets = QUICK_START_PRESET_IDS.map((id) => PRESETS.find((p) => p.id === id)).filter(Boolean) as Preset[];

  function loadPreset(preset: Preset) {
    const base = makeBootstrapState();
    const config = { ...base, ...preset.config, _presetId: preset.id };
    ensureIds(config as unknown as Partial<AppState>);
    ensureVariations(config as AppState);
    loadState(config as AppState);
    close();
  }

  function startBlank() {
    const state = makeBootstrapState();
    state.colors = [
      { _id: generateId(), name: "Brand", shorthand: "br", value: "0066FF", description: "", scaleAlgorithm: state.scaleAlgorithm, solverMode: state.solverMode },
      { _id: generateId(), name: "Neutral", shorthand: "nt", value: "6B7280", description: "", scaleAlgorithm: state.scaleAlgorithm, solverMode: state.solverMode },
    ];
    ensureIds(state);
    ensureVariations(state);
    loadState(state);
    close();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as AppState;
        if (!Array.isArray(parsed.colors) || !Array.isArray(parsed.roles) || !Array.isArray(parsed.themes)) {
          toast.error("Invalid file: missing colors, roles, or themes");
          return;
        }
        ensureIds(parsed);
        ensureVariations(parsed);
        loadState(parsed);
        close();
        toast.success("Configuration imported");
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!isOpen) return null;

  return (
    <CentredOverlay open zIndex={80}>
      <input ref={importRef} type="file" accept=".json,.wand" className="hidden" onChange={handleImportFile} />
      <div className="text-[32px] leading-none">✦</div>
      <h2 className="text-[20px] font-bold text-text-primary">Welcome to Token Wand</h2>
      <p className="text-[13px] text-text-muted max-w-[300px] text-center">Pick a design system to start from, or begin with a blank canvas.</p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-[360px]">
        {quickPresets.map((preset) => (
          <button key={preset.id} onClick={() => loadPreset(preset)} className="text-left bg-bg-card border border-border-base rounded-[10px] p-3 hover:bg-bg-hover hover:border-accent transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              {preset.badge && <Badge variant="accent" size="xs" pill>{preset.badge}</Badge>}
              <p className="text-[12px] font-semibold text-text-primary truncate">{preset.name}</p>
            </div>
            {preset.description && <p className="text-[10px] text-text-muted line-clamp-2 leading-snug">{preset.description}</p>}
          </button>
        ))}
      </div>
      <div className="flex gap-2 w-full max-w-[360px]">
        <Button
          variant="secondary"
          size="md"
          label="Browse Presets"
          onClick={() => {
            close();
            setActiveSidebarTab("themes");
          }}
          className="flex-1"
        />
        <Button variant="ghost" size="md" label="Import .wand" onClick={() => importRef.current?.click()} className="flex-1" />
        <Button variant="ghost" size="md" label="Start Blank" onClick={startBlank} className="flex-1" />
      </div>
    </CentredOverlay>
  );
}
