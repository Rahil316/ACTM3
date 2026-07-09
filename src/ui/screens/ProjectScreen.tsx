import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LucideReset as RotateCcw, LucidePencil as Pencil, LucideExport as Download, LucideCheck as Check, LucideClose as X } from "../components/icons";
import { useProjectStore, relativeTime } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { CardToolbar } from "../components/CardToolbar";
import { EmptyState } from "../components/EmptyState";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Input } from "../components/Input";
import { ColorInput } from "../components/ColorInput";
import { Button, ActionButton } from "../components/Button";
import { toast } from "../store/toastStore";
import type { Theme, Version } from "../types/state";

// ── Theme card ────────────────────────────────────────────────────────────────

function SortableThemeCard({ theme, idx, removable }: { theme: Theme; idx: number; removable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: theme._id ?? idx });
  const setTheme = useProjectStore((s) => s.setTheme);
  const removeTheme = useProjectStore((s) => s.removeTheme);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group/card relative bg-n-bg-card border border-n-card-border rounded-[12px] p-3 space-y-2.5 hover:border-n-br-strong transition-colors"
    >
      <div className="grid gap-2 items-end" style={{ gridTemplateColumns: "1fr 148px" }}>
        <Input size="xl" label="Theme Mode Name" value={theme.name} placeholder="Theme name" onChange={(e) => setTheme(idx, "name", e.target.value)} />
        <ColorInput label="Theme Background" value={theme.bg} onUpdate={(hex) => setTheme(idx, "bg", hex)} idPrefix={`theme-${theme._id}`} size="xl" />
      </div>
      <Input size="lg" label="Description" value={theme.description ?? ""} placeholder="Optional — e.g. iOS true black, used for OLED screens" onChange={(e) => setTheme(idx, "description", e.target.value)} />

      <CardToolbar
        onDelete={() => removeTheme(idx)}
        deleteDisabled={!removable}
        deleteTitle="Remove theme"
        dragListeners={listeners as Record<string, unknown>}
        dragAttributes={attributes as unknown as Record<string, unknown>}
      />
    </div>
  );
}

// ── Themes screen ─────────────────────────────────────────────────────────────

export function ProjectScreen() {
  const themes = useProjectStore((s) => s.projectStore.themes);
  const addTheme = useProjectStore((s) => s.addTheme);
  const moveTheme = useProjectStore((s) => s.moveTheme);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = themes.findIndex((t) => t._id === active.id);
    const newIndex = themes.findIndex((t) => t._id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      moveTheme(oldIndex, newIndex);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <ActionButton label="+ Add Theme Mode" onClick={addTheme} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={themes.map((t, i) => t._id ?? i)} strategy={verticalListSortingStrategy}>
          {themes.map((theme, i) => (
            <SortableThemeCard key={theme._id} theme={theme} idx={i} removable={themes.length > 1} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ── Version card ──────────────────────────────────────────────────────────────

function VersionCard({ version, onRestore, onDelete }: { version: Version; onRestore: () => void; onDelete: () => void }) {
  const renameVersion = useProjectStore((s) => s.renameVersion);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(version.name);

  function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== version.name) renameVersion(version._id, trimmed);
    setEditing(false);
  }

  function cancelRename() {
    setDraftName(version.name);
    setEditing(false);
  }

  function exportWand() {
    const content = JSON.stringify(version.state, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${version.name.replace(/[^a-z0-9_-]/gi, "_")}.wand`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported "${version.name}.wand"`);
  }

  return (
    <div className="group/card relative bg-n-bg-card border border-n-card-border rounded-[12px] p-3 space-y-1.5 hover:border-n-br-strong transition-colors">
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            size="sm"
            width="flex"
            className="font-semibold"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") cancelRename();
            }}
          />
          <Button variant="icon" size="sm" icon={<Check size={11} strokeWidth={2} />} onClick={commitRename} title="Confirm rename" />
          <Button variant="icon" size="sm" icon={<X size={11} strokeWidth={2} />} onClick={cancelRename} title="Cancel" />
        </div>
      ) : (
        <div className="text-[12px] font-semibold text-n-tx-primary leading-tight truncate pr-20">{version.name}</div>
      )}

      {version.description && (
        <div className="text-[11px] text-n-tx-secondary truncate">{version.description}</div>
      )}

      <div className="text-[10px] text-n-tx-dim">{relativeTime(version.createdAt)}</div>

      <CardToolbar
        onDelete={onDelete}
        deleteTitle="Remove version"
      >
        <Button variant="icon" size="sm" title="Restore this version" onClick={onRestore} icon={<RotateCcw size={11} strokeWidth={2} />} />
        <Button variant="icon" size="sm" title="Rename" onClick={() => { setDraftName(version.name); setEditing(true); }} icon={<Pencil size={11} strokeWidth={2} />} />
        <Button variant="icon" size="sm" title="Export as .wand" onClick={exportWand} icon={<Download size={11} strokeWidth={2} />} />
      </CardToolbar>
    </div>
  );
}

// ── Versions screen ───────────────────────────────────────────────────────────

const EMPTY_VERSIONS: Version[] = [];

export function VersionsScreen() {
  const versions = useProjectStore((s) => s.projectStore.versions ?? EMPTY_VERSIONS);
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

      {versions.length === 0 ? (
        <EmptyState icon="📦" title="No versions yet" description="Save a version to snapshot your current configuration." />
      ) : (
        versions.map((v) => (
          <VersionCard
            key={v._id}
            version={v}
            onRestore={() => setConfirmRestore(v._id)}
            onDelete={() => setConfirmDelete(v._id)}
          />
        ))
      )}
    </div>
  );
}
