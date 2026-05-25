import { useState, useRef } from "react";
import { usePersistedToggle } from "../hooks/usePersistedToggle";
import { useAppStore, ensureIds, ensureVariations, relativeTime } from "../store/appStore";
import { toast } from "../store/toastStore";
import { SectionCollapsible } from "../components/Collapsible";
import { ActionCard } from "../components/ActionCard";
import { EmptyState } from "../components/EmptyState";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SettingsCard } from "../components/SettingsCard";
import { Input } from "../components/Input";
import { ColorInput } from "../components/ColorInput";
import { Button, ActionButton } from "../components/Button";
import { Badge } from "../components/Badge";
import { ListHeader, ListRow } from "../components/ListRow";
import { SectionLabel, HelperText } from "../components/typography";
import type { AppState } from "../types/state";

// ── Version save form ─────────────────────────────────────────────────────────
export function SaveVersionForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const saveVersion = useAppStore((s) => s.saveVersion);
  const versionSaveBlockedReason = useAppStore((s) => s.versionSaveBlockedReason);
  // Subscribe to appState so this re-evaluates reactively when state changes
  useAppStore((s) => s.appState);
  const reason = versionSaveBlockedReason();

  function handleSave() {
    if (!name.trim()) return;
    const ok = saveVersion(name.trim(), desc.trim());
    if (ok) {
      setName("");
      setDesc("");
      toast.success("Version saved");
      onSaved();
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <Input label="Version Name" size="lg" placeholder="e.g. v1.0 — Launch" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Notes" size="lg" placeholder="Optional description…" value={desc} onChange={(e) => setDesc(e.target.value)} />
      {reason && <HelperText>{reason}</HelperText>}
      <Button variant="primary" size="md" label="Save Version" onClick={handleSave} disabled={!name.trim() || !!reason} />
    </div>
  );
}

// ── Main Project screen ───────────────────────────────────────────────────────

export function ProjectScreen() {
  const appState = useAppStore((s) => s.appState);
  const updateName = useAppStore((s) => s.updateProjectName);
  const updateDesc = useAppStore((s) => s.updateProjectDescription);
  const restoreVersion = useAppStore((s) => s.restoreVersion);
  const deleteVersion = useAppStore((s) => s.deleteVersion);
  const loadState = useAppStore((s) => s.loadState);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const themes = useAppStore((s) => s.appState.themes);
  const setTheme = useAppStore((s) => s.setTheme);
  const addTheme = useAppStore((s) => s.addTheme);
  const removeTheme = useAppStore((s) => s.removeTheme);

  const [profileOpen, toggleProfileOpen] = usePersistedToggle("project_profile", true);
  const [versionsOpen, toggleVersionsOpen] = usePersistedToggle("project_versions", true);
  const [saveFormOpen, setSaveFormOpen] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState<AppState | null>(null);

  const versions = appState.versions ?? [];

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
        setConfirmImport(parsed);
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function applyImport(state: AppState) {
    ensureIds(state);
    ensureVariations(state);
    loadState(state);
    toast.success("Configuration imported");
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
        onConfirm={() => {
          if (confirmRestore) restoreVersion(confirmRestore);
          setConfirmRestore(null);
        }}
        onCancel={() => setConfirmRestore(null)}
      />

      {/* Confirm delete version */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this version?"
        body="This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger-solid"
        onConfirm={() => {
          if (confirmDelete) deleteVersion(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Confirm import */}
      <ConfirmDialog
        open={!!confirmImport}
        title="Import configuration?"
        body="This will overwrite your current colors, roles, and settings."
        confirmLabel="Import"
        confirmVariant="primary"
        onConfirm={() => {
          if (confirmImport) applyImport(confirmImport);
        }}
        onCancel={() => setConfirmImport(null)}
      />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".json,.wand" className="hidden" onChange={handleImportFile} />

      {/* Project Profile */}
      <SettingsCard>
        <SectionCollapsible open={profileOpen} onToggle={toggleProfileOpen} label="Project Profile">
          <div className="flex flex-col gap-2 pt-2">
            <Input label="Project Name" size="lg" value={appState.name} onChange={(e) => updateName(e.target.value)} />
            <Input label="Description" size="lg" placeholder="Optional…" value={appState.description} onChange={(e) => updateDesc(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 pt-2 mt-2">
            <SectionLabel className="mb-1 text-[14px] text-white">Theme Modes</SectionLabel>
            <HelperText className="mb-1">Each theme defines a background color used for contrast calculation.</HelperText>
            {themes.length > 0 && (
              <>
                <ListHeader columns={["Name", "Background"]} withRemoveButton />
                {themes.map((theme, i) => (
                  <ListRow key={theme._id} onRemove={() => removeTheme(i)} removeDisabled={themes.length <= 1} removeAriaLabel="Remove theme">
                    <Input size="sm" value={theme.name} placeholder="Theme name" onChange={(e) => setTheme(i, "name", e.target.value)} />
                    <ColorInput value={theme.bg} onUpdate={(hex) => setTheme(i, "bg", hex)} idPrefix={`theme-${theme._id}`} size="sm" />
                  </ListRow>
                ))}
              </>
            )}
            <ActionButton label="+ Add Theme" onClick={addTheme} />
          </div>
        </SectionCollapsible>
      </SettingsCard>

      {/* Quick actions */}
      {/* <SettingsCard>
        <SectionLabel className="text-white">Quick Actions</SectionLabel>
        <div className="flex gap-1.5">
          <Button variant="secondary" size="md" label="Export .wand" onClick={exportJson} className="w-full justify-start" />
          <Button variant="secondary" size="md" label="Import .wand" onClick={() => fileInputRef.current?.click()} className="w-full justify-start" />
        </div>
      </SettingsCard> */}

      {/* Versions */}
      {/* this should not be collpasable but a plain list with the title always visible  */}
      <SettingsCard>
        <SectionCollapsible
          open={versionsOpen}
          onToggle={toggleVersionsOpen}
          label="Versions"
          badge={
            <Badge variant="muted" size="xs">
              {versions.length}
            </Badge>
          }
        >
          <div className="flex flex-col gap-2 pt-2">
            {versions.length === 0 ? (
              <EmptyState icon="📦" title="No versions yet" description="Save a version to snapshot your current configuration." />
            ) : (
              versions.map((v) => (
                <ActionCard
                  key={v._id}
                  title={v.name}
                  subtitle={v.description || undefined}
                  meta={relativeTime(v.createdAt)}
                  actions={
                    <>
                      <Button variant="secondary" size="sm" label="Restore" onClick={() => setConfirmRestore(v._id)} />
                      <Button variant="danger" size="sm" label="Delete" onClick={() => setConfirmDelete(v._id)} />
                    </>
                  }
                />
              ))
            )}

            {/* Save version form toggle */}
            {saveFormOpen ? <SaveVersionForm onSaved={() => setSaveFormOpen(false)} /> : <ActionButton label="+ Save Current Version" onClick={() => setSaveFormOpen(true)} />}
          </div>
        </SectionCollapsible>
      </SettingsCard>
    </div>
  );
}
