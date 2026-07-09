import { useState, useCallback } from "react";
import { DndContext, closestCenter, type CollisionDetection, DragOverlay, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectStore, deriveShorthand } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { SuggestSheet, MenuRow } from "../components/MenuSheet";
import { RoleGroupCard } from "../components/cards/RoleGroupCard";
import { SplitActionButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import type { Role } from "../types/state";
import { SortableLeafWrapper, TreeRenderer, MultiSelectToolbar, RootDropZone, ROOT_ZONE_IDS } from "../components/Tree";
import { useEntityTreeState, type EntityTreeStateReturn } from "../hooks/useEntityTreeState";

// ── Suggested roles ───────────────────────────────────────────────────────────

interface RoleSuggestion {
  name: string;
  shorthand: string;
  description: string;
}

const SUGGESTED_ROLES: RoleSuggestion[] = [
  { name: "Background", shorthand: "bg", description: "Page background" },
  { name: "Background/Alt", shorthand: "bga", description: "Alternate surface" },
  { name: "Surface", shorthand: "sf", description: "Cards, panels" },
  { name: "Surface/Raised", shorthand: "sfr", description: "Elevated surfaces" },
  { name: "Border", shorthand: "bd", description: "Dividers, borders" },
  { name: "Border/Strong", shorthand: "bds", description: "Strong borders" },
  { name: "Fill", shorthand: "fi", description: "Icon fills, UI fills" },
  { name: "Fill/Strong", shorthand: "fis", description: "Accessible fills" },
  { name: "Text/Muted", shorthand: "txm", description: "Secondary text" },
  { name: "Text", shorthand: "tx", description: "Body text" },
  { name: "Text/Strong", shorthand: "txs", description: "High contrast text" },
  { name: "Text/Inverse", shorthand: "txi", description: "Text on dark bg" },
  { name: "Interactive", shorthand: "ia", description: "Buttons, links" },
  { name: "Focus", shorthand: "fc", description: "Focus rings" },
];

interface RoleSuggestSheetProps {
  existingNames: string[];
  onPick: (r: RoleSuggestion) => void;
  onBlank: () => void;
  onClose: () => void;
}

function RoleSuggestSheet({ existingNames, onPick, onBlank, onClose }: RoleSuggestSheetProps) {
  const available = SUGGESTED_ROLES.filter((r) => !existingNames.includes(r.name));
  return (
    <SuggestSheet label="Suggested roles" linkLabel="+ Custom" onLink={onBlank} onClose={onClose} empty={available.length === 0 ? <div className="px-4 py-6 text-center text-[11px] text-n-tx-muted">All suggestions already added.</div> : undefined}>
      {available.map((r) => (
        <MenuRow key={r.name} onClick={() => onPick(r)}>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-semibold text-n-tx-primary truncate">{r.name}</span>
            <span className="text-[10px] text-n-tx-muted">{r.description}</span>
          </div>
        </MenuRow>
      ))}
    </SuggestSheet>
  );
}

// ── Flat sortable card (used when no groups present) ─────────────────────────

function SortableRoleCard({ role, idx, selected, onToggleSelect }: { role: Role; idx: number; selected: boolean; onToggleSelect: (id: string, meta?: boolean, shift?: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: role._id ?? "" });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null), transition, opacity: isDragging ? 0.5 : 1 }}
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) return;
        e.stopPropagation();
        onToggleSelect(role._id ?? "", e.metaKey || e.ctrlKey, e.shiftKey);
      }}
    >
      <div style={selected ? { borderRadius: 12, outline: "2px solid var(--b-fi-btn-default)", outlineOffset: 2, boxShadow: "0 0 0 4px var(--b-fi-subtle)" } : undefined}>
        <RoleGroupCard role={role} idx={idx} dragListeners={listeners as Record<string, unknown>} dragAttributes={attributes as unknown as Record<string, unknown>} isDragging={isDragging} />
      </div>
    </div>
  );
}

// ── Custom collision detection ────────────────────────────────────────────────

const groupAwareCollision: CollisionDetection = (args) => {
  const activeId = args.active.id as string;
  if (activeId.startsWith("group::")) {
    const groupAndRoot = args.droppableContainers.filter(
      (c) => (c.id as string).startsWith("group::") || ROOT_ZONE_IDS.includes(c.id as typeof ROOT_ZONE_IDS[number]),
    );
    const hits = closestCenter({ ...args, droppableContainers: groupAndRoot });
    if (hits.length > 0) return hits;
  }
  return closestCenter(args);
};

// ── RoleTree (grouped view) ───────────────────────────────────────────────────

interface RoleTreeProps {
  roles: Role[];
  treeState: EntityTreeStateReturn<Role>;
  collapsed: Record<string, boolean>;
  setCollapsed: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

function RoleTree({ roles, treeState, collapsed, setCollapsed }: RoleTreeProps) {
  const { dndId, sensors, allIds, activeId, activeGroupPath, overGroupPath, tree, committed,
    selectedIds, setSelectedIds, containerRef, toggleSelect,
    handleGroup, handleUngroup, handleDelete, handleClear, handleSelectAll,
    handleDragStart, handleDragOver, handleDragEnd, renameGroup, ungroup, addChild } = treeState;

  const renderRoleLeaf = useCallback(
    (_committed: { _id: string; name: string }, idx: number, selected: boolean, multiDragCount: number, onToggleSel: (id: string, meta: boolean, shift?: boolean) => void) => {
      const role = roles[idx];
      if (!role) return null;
      return (
        <SortableLeafWrapper
          key={role._id}
          id={role._id ?? ""}
          selected={selected}
          multiDragCount={multiDragCount}
          onToggleSelect={onToggleSel}
          renderContent={(listeners, attributes, isDragging) => (
            <div draggable={false} onDragStart={(e) => e.preventDefault()}>
              <RoleGroupCard role={role} idx={idx} dragListeners={listeners} dragAttributes={attributes} isDragging={isDragging} />
            </div>
          )}
        />
      );
    },
    [roles],
  );

  const activeRole = !activeGroupPath && activeId ? roles.find((r) => r._id === activeId) : null;
  const activeGroupSegment = activeGroupPath?.split("/").pop();

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={() => { if (selectedIds.size > 0) setSelectedIds(new Set()); }}
    >
      <DndContext id={dndId} sensors={sensors} collisionDetection={groupAwareCollision} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <TreeRenderer
            nodes={tree}
            collapsed={collapsed}
            overGroupPath={overGroupPath}
            activeGroupPath={activeGroupPath}
            selectedIds={selectedIds}
            multiDragCount={activeId && selectedIds.has(activeId) ? selectedIds.size : 0}
            onToggleSelect={toggleSelect}
            onToggle={(p) => setCollapsed((prev) => ({ ...prev, [p]: !prev[p] }))}
            onRenameGroup={renameGroup}
            onAddChild={addChild}
            onUngroup={ungroup}
            renderLeaf={renderRoleLeaf}
            depth={0}
          />
        </SortableContext>
        <RootDropZone
          activeId={activeId}
          activeIsGrouped={activeId !== null && (activeId.startsWith("group::") || (roles.find((r) => r._id === activeId)?.name ?? "").includes("/"))}
        />
        <DragOverlay>
          {activeRole && (
            <div className="px-3 py-2 rounded-[10px] border border-b-br-default bg-n-sf-default shadow-xl text-[12px] font-semibold text-n-tx-primary flex items-center gap-2">
              {activeRole._id && selectedIds.has(activeRole._id) && selectedIds.size > 1 && <span className="bg-b-fi-btn-default text-b-tx-btn-default text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">{selectedIds.size}</span>}
              {activeRole.name.split("/").pop()}
            </div>
          )}
          {activeGroupSegment && (
            <div className="px-3 py-1.5 rounded-[8px] border border-b-br-default bg-n-sf-default shadow-xl text-[12px] font-semibold text-n-tx-secondary flex items-center gap-1.5">
              <span className="text-n-tx-dim text-[10px]">{committed.filter((r) => r.name.startsWith(activeGroupPath! + "/")).length}</span>
              {activeGroupSegment}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      {selectedIds.size > 0 && <MultiSelectToolbar count={selectedIds.size} onGroup={handleGroup} onUngroup={handleUngroup} onDelete={handleDelete} onClear={handleClear} onSelectAll={handleSelectAll} />}
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function RolesScreen() {
  const roles = useProjectStore((s) => s.projectStore.roles);
  const addRole = useProjectStore((s) => s.addRole);
  const addRoleWith = useProjectStore((s) => s.addRoleWith);
  const moveRole = useProjectStore((s) => s.moveRole);
  const setRole = useProjectStore((s) => s.setRole);
  const removeRole = useProjectStore((s) => s.removeRole);
  const collapsed = useUiStore((s) => s.roleGroupCollapsed);
  const setCollapsed = useUiStore((s) => s.setRoleGroupCollapsed);

  const [showSuggest, setShowSuggest] = useState(false);

  const hasGroups = roles.some((r) => r.name.includes("/"));

  const treeState = useEntityTreeState({
    items: roles,
    setName: (idx, name) => setRole(idx, "name", name),
    move: moveRole,
    remove: removeRole,
    addChild: (fullPath) => {
      const prefixShort = fullPath.split("/").filter(Boolean).map((s) => deriveShorthand(s)).join("/");
      addRoleWith(`${fullPath}/New`, `${prefixShort}/${deriveShorthand("New")}`);
    },
    collapsed,
    setCollapsed,
  });

  const { sensors, selectedIds, setSelectedIds, containerRef, toggleSelect,
    handleGroup, handleUngroup, handleDelete, handleClear, handleSelectAll } = treeState;

  function flatDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = roles.findIndex((r) => r._id === active.id);
    const to = roles.findIndex((r) => r._id === over.id);
    if (from !== -1 && to !== -1) moveRole(from, to);
  }

  function handlePick(r: RoleSuggestion) {
    addRoleWith(r.name, r.shorthand);
    setShowSuggest(false);
  }

  const addBtn = <SplitActionButton label="+ Add Role" onAdd={addRole} onPick={() => setShowSuggest(true)} />;

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 p-3 relative"
      onClick={() => { if (selectedIds.size > 0) setSelectedIds(new Set()); }}
    >
      {showSuggest && (
        <RoleSuggestSheet
          existingNames={roles.map((r) => r.name)}
          onPick={handlePick}
          onBlank={() => { addRole(); setShowSuggest(false); }}
          onClose={() => setShowSuggest(false)}
        />
      )}
      {roles.length === 0 ? (
        <EmptyState icon="🎯" title="No roles yet" description="Add a role to define how colors are applied." action={addBtn} />
      ) : hasGroups ? (
        <>
          {addBtn}
          <RoleTree roles={roles} treeState={treeState} collapsed={collapsed} setCollapsed={setCollapsed} />
        </>
      ) : (
        <DndContext sensors={sensors} onDragEnd={flatDragEnd}>
          {addBtn}
          <SortableContext items={roles.map((r) => r._id ?? "")} strategy={verticalListSortingStrategy}>
            {roles.map((role, idx) => (
              <SortableRoleCard key={role._id} role={role} idx={idx} selected={selectedIds.has(role._id ?? "")} onToggleSelect={(id, meta = false, shift) => toggleSelect(id, meta, shift)} />
            ))}
          </SortableContext>
        </DndContext>
      )}
      {selectedIds.size > 0 && !hasGroups && <MultiSelectToolbar count={selectedIds.size} onGroup={handleGroup} onUngroup={handleUngroup} onDelete={handleDelete} onClear={handleClear} onSelectAll={handleSelectAll} />}
    </div>
  );
}
