import { useState, useRef } from 'react';
import { useAppStore, makeBootstrapState, ensureIds, ensureVariations, relativeTime } from '../store/appStore';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { SectionCollapsible } from '../components/Collapsible';
import { ActionCard } from '../components/ActionCard';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SettingsCard } from '../components/SettingsCard';
import { Input } from '../components/Input';
import { Button, ActionButton } from '../components/Button';
import { CentredOverlay } from '../components/ResultOverlay';
import { PRESETS, type Preset } from '../lib/presets/presets';
import type { AppState } from '../types/state';

// ── Quick Start overlay ───────────────────────────────────────────────────────

interface QuickStartProps {
  onClose: () => void;
}

export function QuickStart({ onClose }: QuickStartProps) {
  const loadState = useAppStore((s) => s.loadState);
  const isOpen    = useUiStore((s) => s.activeOverlay === 'quick-start');
  const close     = useUiStore((s) => s.closeOverlay);

  const wandPresets = PRESETS.filter((p) => p.badge === 'TW');

  function loadPreset(preset: Preset) {
    const base = makeBootstrapState();
    const config = { ...base, ...preset.config, _presetId: preset.id };
    ensureIds(config as unknown as Partial<AppState>);
    ensureVariations(config as AppState);
    loadState(config as AppState);
    close();
  }

  if (!isOpen) return null;

  return (
    <CentredOverlay open zIndex={80}>
      <h2 className="text-[20px] font-bold text-text-primary">Welcome to Token Wand</h2>
      <p className="text-[13px] text-text-muted max-w-[280px]">
        Choose a starting point, or skip to build from scratch.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[320px]">
        {wandPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => loadPreset(preset)}
            className="w-full text-left bg-bg-card border border-border-base rounded-[10px] p-3 hover:bg-bg-hover transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              {preset.badge && (
                <span className="text-[9px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full">
                  {preset.badge}
                </span>
              )}
              <p className="text-[13px] font-semibold text-text-primary">{preset.name}</p>
            </div>
            {preset.description && (
              <p className="text-[11px] text-text-muted line-clamp-2">{preset.description}</p>
            )}
          </button>
        ))}
      </div>
      <Button variant="ghost" size="md" label="Start blank" onClick={close} />
    </CentredOverlay>
  );
}

// ── Theme Shop overlay ────────────────────────────────────────────────────────

export function ThemeShop() {
  const loadState  = useAppStore((s) => s.loadState);
  const isDirty    = useAppStore((s) => s.isDirty);
  const isOpen     = useUiStore((s) => s.activeOverlay === 'theme-shop');
  const close      = useUiStore((s) => s.closeOverlay);

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
    const config = { ...base, ...preset.config, _presetId: preset.id };
    ensureIds(config as unknown as Partial<AppState>);
    ensureVariations(config as AppState);
    loadState(config as AppState);
    toast.success(`Loaded "${preset.name}"`);
    close();
  }

  if (!isOpen) return null;

  return (
    <CentredOverlay open zIndex={80} className="overflow-y-auto items-stretch p-0">
      {/* Confirm overwrite dialog */}
      <ConfirmDialog
        open={!!confirmPreset}
        title="Load Preset?"
        body={`This will overwrite your current configuration with "${confirmPreset?.name}".`}
        confirmLabel="Load Preset"
        confirmVariant="primary"
        onConfirm={() => { if (confirmPreset) applyPreset(confirmPreset); setConfirmPreset(null); }}
        onCancel={() => setConfirmPreset(null)}
      />

      <div className="flex flex-col h-full">
        <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-base">
          <div>
            <h2 className="text-[18px] font-semibold text-text-primary">Theme Shop</h2>
            <p className="text-[11px] text-text-muted mt-0.5">Pre-built design system presets</p>
          </div>
          <Button variant="ghost" size="md" label="Close" onClick={close} />
        </div>

        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className="w-full text-left bg-bg-card border border-border-base rounded-[10px] p-3 hover:bg-bg-hover transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
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
      </div>
    </CentredOverlay>
  );
}

// ── Version save form ─────────────────────────────────────────────────────────

function SaveVersionForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const saveVersion             = useAppStore((s) => s.saveVersion);
  const blockedReason           = useAppStore((s) => s.versionSaveBlockedReason);

  const reason = blockedReason();

  function handleSave() {
    if (!name.trim()) return;
    const ok = saveVersion(name.trim(), desc.trim());
    if (ok) {
      setName('');
      setDesc('');
      toast.success('Version saved');
      onSaved();
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <Input
        label="Version Name"
        size="lg"
        placeholder="e.g. v1.0 — Launch"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label="Notes"
        size="lg"
        placeholder="Optional description…"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      {reason && <p className="text-[11px] text-text-muted">{reason}</p>}
      <Button
        variant="primary"
        size="md"
        label="Save Version"
        onClick={handleSave}
        disabled={!name.trim() || !!reason}
      />
    </div>
  );
}

// ── JSON Import/Export ────────────────────────────────────────────────────────

function useJsonExport() {
  const appState = useAppStore((s) => s.appState);

  function exportJson() {
    const json = JSON.stringify(appState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(appState.name || 'token-wand').replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported JSON');
  }

  return { exportJson };
}

// ── Main Project screen ───────────────────────────────────────────────────────

export function ProjectScreen() {
  const appState        = useAppStore((s) => s.appState);
  const updateName      = useAppStore((s) => s.updateProjectName);
  const updateDesc      = useAppStore((s) => s.updateProjectDescription);
  const restoreVersion  = useAppStore((s) => s.restoreVersion);
  const deleteVersion   = useAppStore((s) => s.deleteVersion);
  const loadState       = useAppStore((s) => s.loadState);
  const validate        = useAppStore((s) => s.validate);
  const openOverlay     = useUiStore((s) => s.openOverlay);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileOpen, setProfileOpen] = useState(true);
  const [versionsOpen, setVersionsOpen] = useState(true);
  const [saveFormOpen, setSaveFormOpen] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null);
  const [confirmImport, setConfirmImport]   = useState<AppState | null>(null);

  const { exportJson } = useJsonExport();
  const versions = appState.versions ?? [];

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as AppState;
        const issues = validate();
        setConfirmImport(parsed);
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function applyImport(state: AppState) {
    ensureIds(state);
    ensureVariations(state);
    loadState(state);
    toast.success('Configuration imported');
    setConfirmImport(null);
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Confirm restore version */}
      <ConfirmDialog
        open={!!confirmRestore}
        title="Restore this version?"
        body="Your current configuration will be replaced."
        confirmLabel="Restore"
        confirmVariant="primary"
        onConfirm={() => { if (confirmRestore) restoreVersion(confirmRestore); setConfirmRestore(null); }}
        onCancel={() => setConfirmRestore(null)}
      />

      {/* Confirm delete version */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this version?"
        body="This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger-solid"
        onConfirm={() => { if (confirmDelete) deleteVersion(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Confirm import */}
      <ConfirmDialog
        open={!!confirmImport}
        title="Import configuration?"
        body="This will overwrite your current colors, roles, and settings."
        confirmLabel="Import"
        confirmVariant="primary"
        onConfirm={() => { if (confirmImport) applyImport(confirmImport); }}
        onCancel={() => setConfirmImport(null)}
      />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

      {/* Project Profile */}
      <SettingsCard>
        <SectionCollapsible open={profileOpen} onToggle={() => setProfileOpen((v) => !v)} label="Project Profile">
          <div className="flex flex-col gap-2 pt-2">
            <Input
              label="Project Name"
              size="lg"
              value={appState.name}
              onChange={(e) => updateName(e.target.value)}
            />
            <Input
              label="Description"
              size="lg"
              placeholder="Optional…"
              value={appState.description}
              onChange={(e) => updateDesc(e.target.value)}
            />
          </div>
        </SectionCollapsible>
      </SettingsCard>

      {/* Quick actions */}
      <SettingsCard>
        <p className="text-[11px] font-bold tracking-[0.6px] text-text-muted uppercase mb-2">Quick Actions</p>
        <div className="flex flex-col gap-1.5">
          <Button
            variant="secondary"
            size="md"
            label="Browse Presets (Theme Shop)"
            onClick={() => openOverlay('theme-shop')}
            className="w-full justify-start"
          />
          <Button
            variant="secondary"
            size="md"
            label="Export JSON"
            onClick={exportJson}
            className="w-full justify-start"
          />
          <Button
            variant="secondary"
            size="md"
            label="Import JSON"
            onClick={() => fileInputRef.current?.click()}
            className="w-full justify-start"
          />
        </div>
      </SettingsCard>

      {/* Versions */}
      <SettingsCard>
        <SectionCollapsible
          open={versionsOpen}
          onToggle={() => setVersionsOpen((v) => !v)}
          label="Versions"
          badge={
            <span className="text-[10px] text-text-muted bg-bg-input px-1.5 py-0.5 rounded-full">
              {versions.length}
            </span>
          }
        >
          <div className="flex flex-col gap-2 pt-2">
            {versions.length === 0 ? (
              <EmptyState
                icon="📦"
                title="No versions yet"
                description="Save a version to snapshot your current configuration."
              />
            ) : (
              versions.map((v) => (
                <ActionCard
                  key={v._id}
                  title={v.name}
                  subtitle={v.description || undefined}
                  meta={relativeTime(v.createdAt)}
                  actions={
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        label="Restore"
                        onClick={() => setConfirmRestore(v._id)}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        label="Delete"
                        onClick={() => setConfirmDelete(v._id)}
                      />
                    </>
                  }
                />
              ))
            )}

            {/* Save version form toggle */}
            {saveFormOpen ? (
              <SaveVersionForm onSaved={() => setSaveFormOpen(false)} />
            ) : (
              <ActionButton label="+ Save Current Version" onClick={() => setSaveFormOpen(true)} />
            )}
          </div>
        </SectionCollapsible>
      </SettingsCard>
    </div>
  );
}
