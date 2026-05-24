import { useState } from 'react';
import { useAppStore, makeBootstrapState, ensureIds, ensureVariations } from '../store/appStore';
import { toast } from '../store/toastStore';
import { SettingsCard } from '../components/SettingsCard';
import { Input } from '../components/Input';
import { ColorInput } from '../components/ColorInput';
import { ActionButton } from '../components/Button';
import { ListHeader, ListRow } from '../components/ListRow';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PRESETS, type Preset } from '../lib/presets/presets';
import type { AppState } from '../types/state';

// ── Themes editor ─────────────────────────────────────────────────────────────

function ThemesEditor() {
  const themes      = useAppStore((s) => s.appState.themes);
  const setTheme    = useAppStore((s) => s.setTheme);
  const addTheme    = useAppStore((s) => s.addTheme);
  const removeTheme = useAppStore((s) => s.removeTheme);

  return (
    <SettingsCard>
      <p className="text-[12px] font-semibold text-text-primary">Themes</p>
      <p className="text-[11px] text-text-muted">Each theme defines a background color used for contrast calculation.</p>
      {themes.length > 0 && (
        <>
          <ListHeader columns={['Name', 'Background']} withRemoveButton />
          {themes.map((theme, i) => (
            <ListRow
              key={theme._id}
              onRemove={() => removeTheme(i)}
              removeDisabled={themes.length <= 1}
              removeAriaLabel="Remove theme"
            >
              <Input
                size="sm"
                value={theme.name}
                placeholder="Theme name"
                onChange={(e) => setTheme(i, 'name', e.target.value)}
              />
              <ColorInput
                value={theme.bg}
                onUpdate={(hex) => setTheme(i, 'bg', hex)}
                idPrefix={`theme-${theme._id}`}
                size="sm"
              />
            </ListRow>
          ))}
        </>
      )}
      <ActionButton label="+ Add Theme" onClick={addTheme} />
    </SettingsCard>
  );
}

// ── Preset shop ───────────────────────────────────────────────────────────────

function PresetShop() {
  const loadState = useAppStore((s) => s.loadState);
  const isDirty   = useAppStore((s) => s.isDirty);
  const [confirmPreset, setConfirmPreset] = useState<Preset | null>(null);

  function handlePresetClick(preset: Preset) {
    if (isDirty()) {
      setConfirmPreset(preset);
    } else {
      applyPreset(preset);
    }
  }

  function applyPreset(preset: Preset) {
    const base   = makeBootstrapState();
    const config = { ...base, ...preset.config, _presetId: preset.id } as AppState;
    ensureIds(config as unknown as Partial<AppState>);
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
        onConfirm={() => { if (confirmPreset) applyPreset(confirmPreset); }}
        onCancel={() => setConfirmPreset(null)}
      />

      <SettingsCard>
        <p className="text-[12px] font-semibold text-text-primary">Presets</p>
        <p className="text-[11px] text-text-muted">Pre-built design system configurations. Loading a preset replaces your current setup.</p>
        <div className="flex flex-col gap-1.5 pt-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className="w-full text-left bg-bg-card border border-border-base rounded-[10px] p-3 hover:bg-bg-hover transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                {preset.badge && (
                  <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                    {preset.badge}
                  </span>
                )}
                <p className="text-[13px] font-semibold text-text-primary">{preset.name}</p>
                {preset.tags?.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[9px] text-text-dim bg-bg-input px-1.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              {preset.description && (
                <p className="text-[11px] text-text-muted line-clamp-2">{preset.description}</p>
              )}
            </button>
          ))}
        </div>
      </SettingsCard>
    </>
  );
}

// ── ThemesScreen ──────────────────────────────────────────────────────────────

export function ThemesScreen() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <ThemesEditor />
      <PresetShop />
    </div>
  );
}
