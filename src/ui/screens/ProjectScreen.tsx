import { useState } from "react";
import { useProjectStore, relativeTime } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { ActionCard } from "../components/ActionCard";
import { EmptyState } from "../components/EmptyState";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Input } from "../components/Input";
import { ColorInput } from "../components/ColorInput";
import { Button, ActionButton } from "../components/Button";
import type { Theme } from "../types/state";

// ── Theme card ────────────────────────────────────────────────────────────────

function ThemeCard({ theme, idx, removable }: { theme: Theme; idx: number; removable: boolean }) {
  const setTheme = useProjectStore((s) => s.setTheme);
  const removeTheme = useProjectStore((s) => s.removeTheme);

  return (
    <div className="bg-bg-card border border-border-base rounded-[12px] p-3 space-y-2.5">
      {/* Name + swatch + remove */}
      <div className="grid gap-2 items-end" style={{ gridTemplateColumns: "1fr 148px auto" }}>
        <Input size="xl" label="Theme Mode Name" value={theme.name} placeholder="Theme name" onChange={(e) => setTheme(idx, "name", e.target.value)} />
        <ColorInput label="Theme Background" value={theme.bg} onUpdate={(hex) => setTheme(idx, "bg", hex)} idPrefix={`theme-${theme._id}`} size="xl" />
        <Button variant="danger" size="xl" square icon={<span className="text-[12px] leading-none">×</span>} onClick={() => removeTheme(idx)} disabled={!removable} aria-label="Remove theme" />
      </div>

      {/* Description */}
      <Input size="lg" label="Description" value={theme.description ?? ""} placeholder="Optional — e.g. iOS true black, used for OLED screens" onChange={(e) => setTheme(idx, "description", e.target.value)} />
    </div>
  );
}

// ── Themes screen ─────────────────────────────────────────────────────────────

export function ProjectScreen() {
  const themes = useProjectStore((s) => s.projectStore.themes);
  const addTheme = useProjectStore((s) => s.addTheme);

  return (
    <div className="flex flex-col gap-2 p-3">
      <ActionButton label="+ Add Theme Mode" onClick={addTheme} />
      {themes.map((theme, i) => (
        <ThemeCard key={theme._id} theme={theme} idx={i} removable={themes.length > 1} />
      ))}
    </div>
  );
}

// ── Versions screen ───────────────────────────────────────────────────────────

export function VersionsScreen() {
  const versions = useProjectStore((s) => s.projectStore.versions ?? []);
  const restoreVersion = useProjectStore((s) => s.restoreVersion);
  const deleteVersion = useProjectStore((s) => s.deleteVersion);
  const openOverlay = useUiStore((s) => s.openOverlay);
  const saveBlockedReason = useProjectStore((s) => s.versionSaveBlockedReason());

  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 p-3">
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

      <Button variant="dashed" size="xl" label="+ Save Current Version" onClick={() => openOverlay("save-version")} disabled={!!saveBlockedReason} title={saveBlockedReason ?? undefined} fullWidth />

      {/* Version list */}
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
    </div>
  );
}
