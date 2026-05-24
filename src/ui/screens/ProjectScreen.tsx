import { useState, useRef } from 'react';
import { useAppStore, makeBootstrapState, ensureIds, ensureVariations, relativeTime, generateId } from '../store/appStore';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { SectionCollapsible } from '../components/Collapsible';
import { ActionCard } from '../components/ActionCard';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SettingsCard } from '../components/SettingsCard';
import { Modal, ModalHeader } from '../components/Modal';
import { Input } from '../components/Input';
import { ColorInput } from '../components/ColorInput';
import { Button, ActionButton } from '../components/Button';
import { ListHeader, ListRow } from '../components/ListRow';
import { CentredOverlay } from '../components/ResultOverlay';
import { PRESETS, type Preset } from '../lib/presets/presets';
import type { AppState } from '../types/state';

// ── Quick Start overlay ───────────────────────────────────────────────────────

// One representative preset per design system shown in the quick-start grid.
const QUICK_START_PRESET_IDS = [
  'regular-wand',
  'material-3',
  'atlassian-ds',
  'radix-ui',
  'apple-hig',
  'tailwind-css',
  'ibm-carbon',
  'shopify-polaris',
];

interface QuickStartProps {
  onClose: () => void;
}

export function QuickStart({ onClose: _onClose }: QuickStartProps) {
  const loadState         = useAppStore((s) => s.loadState);
  const isOpen            = useUiStore((s) => s.activeOverlay === 'quick-start');
  const close             = useUiStore((s) => s.closeOverlay);
  const setActiveSidebarTab = useUiStore((s) => s.setActiveSidebarTab);
  const importRef         = useRef<HTMLInputElement>(null);

  const quickPresets = QUICK_START_PRESET_IDS
    .map((id) => PRESETS.find((p) => p.id === id))
    .filter(Boolean) as Preset[];

  function loadPreset(preset: Preset) {
    const base   = makeBootstrapState();
    const config = { ...base, ...preset.config, _presetId: preset.id };
    ensureIds(config as unknown as Partial<AppState>);
    ensureVariations(config as AppState);
    loadState(config as AppState);
    close();
  }

  function startBlank() {
    const state = makeBootstrapState();
    state.colors = [
      { _id: generateId(), name: 'Brand', shorthand: 'br', value: '0066FF', description: '', scaleAlgorithm: state.scaleAlgorithm, solverMode: state.solverMode },
      { _id: generateId(), name: 'Neutral', shorthand: 'nt', value: '6B7280', description: '', scaleAlgorithm: state.scaleAlgorithm, solverMode: state.solverMode },
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
          toast.error('Invalid file: missing colors, roles, or themes');
          return;
        }
        ensureIds(parsed);
        ensureVariations(parsed);
        loadState(parsed);
        close();
        toast.success('Configuration imported');
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (!isOpen) return null;

  return (
    <CentredOverlay open zIndex={80}>
      <input ref={importRef} type="file" accept=".json,.wand" className="hidden" onChange={handleImportFile} />
      <div className="text-[32px] leading-none">✦</div>
      <h2 className="text-[20px] font-bold text-text-primary">Welcome to Token Wand</h2>
      <p className="text-[13px] text-text-muted max-w-[300px] text-center">
        Pick a design system to start from, or begin with a blank canvas.
      </p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-[360px]">
        {quickPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => loadPreset(preset)}
            className="text-left bg-bg-card border border-border-base rounded-[10px] p-3 hover:bg-bg-hover hover:border-accent/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1">
              {preset.badge && (
                <span className="text-[9px] font-bold bg-accent/15 text-accent px-1.5 py-0.5 rounded-full shrink-0">
                  {preset.badge}
                </span>
              )}
              <p className="text-[12px] font-semibold text-text-primary truncate">{preset.name}</p>
            </div>
            {preset.description && (
              <p className="text-[10px] text-text-muted line-clamp-2 leading-snug">{preset.description}</p>
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-2 w-full max-w-[360px]">
        <Button variant="secondary" size="md" label="Browse Presets" onClick={() => { close(); setActiveSidebarTab('themes'); }} className="flex-1" />
        <Button variant="ghost"     size="md" label="Import .wand"   onClick={() => importRef.current?.click()} className="flex-1" />
        <Button variant="ghost"     size="md" label="Start Blank"    onClick={startBlank} className="flex-1" />
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

// ── Save Version overlay (triggered from header) ──────────────────────────────

export function SaveVersionOverlay() {
  const isOpen       = useUiStore((s) => s.activeOverlay === 'save-version');
  const closeOverlay = useUiStore((s) => s.closeOverlay);

  if (!isOpen) return null;

  return (
    <Modal open layer="dialog">
      <ModalHeader
        title="Save State"
        subtitle="Snapshot the current configuration as a named version."
        actions={<Button variant="secondary" size="md" label="Cancel" onClick={closeOverlay} />}
      />
      <div className="p-3">
        <SaveVersionForm onSaved={closeOverlay} />
      </div>
    </Modal>
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const themes      = useAppStore((s) => s.appState.themes);
  const setTheme    = useAppStore((s) => s.setTheme);
  const addTheme    = useAppStore((s) => s.addTheme);
  const removeTheme = useAppStore((s) => s.removeTheme);

  const [profileOpen, setProfileOpen] = useState(true);
  const [themesOpen, setThemesOpen]   = useState(true);
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
        if (!Array.isArray(parsed.colors) || !Array.isArray(parsed.roles) || !Array.isArray(parsed.themes)) {
          toast.error('Invalid file: missing colors, roles, or themes');
          return;
        }
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
      <input ref={fileInputRef} type="file" accept=".json,.wand" className="hidden" onChange={handleImportFile} />

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
            label="Export JSON"
            onClick={exportJson}
            className="w-full justify-start"
          />
          <Button
            variant="secondary"
            size="md"
            label="Import JSON / .wand"
            onClick={() => fileInputRef.current?.click()}
            className="w-full justify-start"
          />
        </div>
      </SettingsCard>

      {/* Themes */}
      <SettingsCard>
        <SectionCollapsible open={themesOpen} onToggle={() => setThemesOpen((v) => !v)} label="Themes"
          badge={<span className="text-[10px] text-text-muted bg-bg-input px-1.5 py-0.5 rounded-full">{themes.length}</span>}
        >
          <div className="flex flex-col gap-1 pt-2">
            <p className="text-[11px] text-text-muted mb-1">Each theme defines a background color used for contrast calculation.</p>
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
          </div>
        </SectionCollapsible>
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
