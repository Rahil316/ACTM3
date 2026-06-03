import { useState } from "react";
import { useProjectStore, makeBootstrapState, ensureIds, ensureVariations } from "../store/projectStore";
import { toast } from "../store/toastStore";
import { SettingsCard } from "../components/SettingsCard";
import { Badge } from "../components/Badge";
import { SelectableCard } from "../components/SelectableCard";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PRESETS, type Preset } from "../lib/presets/presets";
import { HelperText } from "../components/typography";
import type { ProjectStore } from "../types/state";

// ── Preset shop ───────────────────────────────────────────────────────────────

function PresetShop() {
  const loadState = useProjectStore((s) => s.loadState);
  const isDirty = useProjectStore((s) => s.isDirty);
  const [confirmPreset, setConfirmPreset] = useState<Preset | null>(null);

  function handlePresetClick(preset: Preset) {
    if (isDirty()) {
      setConfirmPreset(preset);
    } else {
      applyPreset(preset);
    }
  }

  // Theme shop card design
  function themeShopCard(preset: Preset, handlePresetClick: (preset: Preset) => void) {
    return (
      <SelectableCard key={preset.id} onClick={() => handlePresetClick(preset)}>
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          {preset.badge && (
            <Badge variant="accent" size="xs" pill>
              {preset.badge}
            </Badge>
          )}
          <p className="text-[13px] font-semibold text-text-primary">{preset.name}</p>
          {preset.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="muted" size="xs" pill>
              {tag}
            </Badge>
          ))}
        </div>
        {preset.description && <HelperText className="line-clamp-2">{preset.description}</HelperText>}
      </SelectableCard>
    );
  }

  function applyPreset(preset: Preset) {
    const base = makeBootstrapState();
    const config = { ...base, ...preset.config, _presetId: preset.id } as ProjectStore;
    ensureIds(config as unknown as Partial<ProjectStore>);
    ensureVariations(config);
    loadState(config);
    toast.success(`Loaded "${preset.name}"`);
    setConfirmPreset(null);
  }

  return (
    <>
      <ConfirmDialog
        open={!!confirmPreset}
        title="Load Preset?"
        body={`This will overwrite your current configuration with "${confirmPreset?.name}".`}
        confirmLabel="Load Preset"
        confirmVariant="primary"
        onConfirm={() => {
          if (confirmPreset) applyPreset(confirmPreset);
        }}
        onCancel={() => setConfirmPreset(null)}
      />

      <SettingsCard>
        <p className="text-[12px] font-semibold text-text-primary">Presets</p>
        <HelperText>Pre-built design system configurations. Loading a preset replaces your current setup.</HelperText>
        <div className="flex flex-col gap-1.5 pt-1">{PRESETS.map((preset) => themeShopCard(preset, handlePresetClick))}</div>
      </SettingsCard>
    </>
  );
}

// ── ThemesScreen ──────────────────────────────────────────────────────────────

export function ThemesScreen() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <PresetShop />
    </div>
  );
}
