import { useState } from "react";
import { useAppStore, relativeTime } from "../store/appStore";
import { toast } from "../store/toastStore";
import { SettingsCard } from "../components/SettingsCard";
import { Badge } from "../components/Badge";
import { ActionCard } from "../components/ActionCard";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { Button, ActionButton } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Version } from "../types/state";

// ── Save form ─────────────────────────────────────────────────────────────────

function SaveForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const saveVersion = useAppStore((s) => s.saveVersion);
  const blockedReason = useAppStore((s) => s.versionSaveBlockedReason);
  const reason = blockedReason();

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
    <div className="flex flex-col gap-2">
      <Input label="Version Name" size="lg" placeholder="e.g. v1.0 — Launch" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Notes" size="lg" placeholder="Optional description…" value={desc} onChange={(e) => setDesc(e.target.value)} />
      {reason && <p className="text-[11px] text-text-muted">{reason}</p>}
      <Button variant="primary" size="md" label="Save Version" onClick={handleSave} disabled={!name.trim() || !!reason} />
    </div>
  );
}

// ── SavedStatesScreen ─────────────────────────────────────────────────────────

export function SavedStatesScreen() {
  const versions = useAppStore((s) => s.appState.versions ?? []);
  const restoreVersion = useAppStore((s) => s.restoreVersion);
  const deleteVersion = useAppStore((s) => s.deleteVersion);

  const [saveFormOpen, setSaveFormOpen] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 p-3">
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

      {/* Save new version */}
      {saveFormOpen ? <SaveForm onSaved={() => setSaveFormOpen(false)} /> : <ActionButton label="+ Save Current Version" onClick={() => setSaveFormOpen(true)} />}

      {/* Version list */}
      <SettingsCard>
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-text-primary">Saved Versions</p>
          <Badge variant="muted" size="xs">{versions.length}</Badge>
        </div>
        {versions.length === 0 ? <EmptyState icon="📦" title="No versions yet" description="Save a version to snapshot your current configuration." /> : <div className="flex flex-col gap-2 pt-1">{versions.map((v) => savedEntry(v, setConfirmRestore, setConfirmDelete))}</div>}
      </SettingsCard>
    </div>
  );
}
function savedEntry(v: Version, setConfirmRestore: (id: string) => void, setConfirmDelete: (id: string) => void) {
  return (
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
  );
}
