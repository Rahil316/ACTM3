import { useState, useCallback } from "react";
import { DndContext, closestCenter, type CollisionDetection, DragOverlay, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectStore, deriveShorthand } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { ColorGroupCard } from "../components/cards/ColorGroupCard";
import { SplitActionButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SuggestSheet, MenuRow } from "../components/MenuSheet";
import { ColorSwatch } from "../components/ColorSwatch";
import type { Color } from "../types/state";
import { SortableLeafWrapper, TreeRenderer, MultiSelectToolbar, RootDropZone, ROOT_ZONE_IDS } from "../components/Tree";
import { useEntityTreeState, type EntityTreeStateReturn } from "../hooks/useEntityTreeState";

// ── Suggested colors ──────────────────────────────────────────────────────────

const SUGGESTED_COLORS: { name: string; value: string; shorthand: string; description: string }[] = [
  { name: "Brand/Primary", value: "#0066FF", shorthand: "bp", description: "Primary brand color" },
  { name: "Brand/Accent", value: "#8B5CF6", shorthand: "ba", description: "Accent — violet" },
  { name: "Brand/Warning", value: "#F59E0B", shorthand: "bw", description: "Warning — amber" },
  { name: "Brand/Danger", value: "#EF4444", shorthand: "bd", description: "Danger — red" },
  { name: "Brand/Success", value: "#22C55E", shorthand: "bs", description: "Success — green" },
  { name: "Neutral/Gray", value: "#6B7280", shorthand: "ng", description: "Neutral gray" },
  { name: "Neutral/Warm", value: "#78716C", shorthand: "nw", description: "Warm stone gray" },
  { name: "Neutral/Cool", value: "#64748B", shorthand: "nc", description: "Cool slate gray" },
  { name: "Color/Sky", value: "#0EA5E9", shorthand: "cs", description: "Sky blue" },
  { name: "Color/Teal", value: "#14B8A6", shorthand: "ct", description: "Teal" },
  { name: "Color/Indigo", value: "#6366F1", shorthand: "ci", description: "Indigo" },
  { name: "Color/Pink", value: "#EC4899", shorthand: "cp", description: "Pink" },
  { name: "Color/Orange", value: "#F97316", shorthand: "co", description: "Orange" },
  { name: "Color/Rose", value: "#F43F5E", shorthand: "cr", description: "Rose" },
  { name: "Color/Emerald", value: "#10B981", shorthand: "ce", description: "Emerald" },
  { name: "Color/Amber", value: "#F59E0B", shorthand: "cam", description: "Amber" },
];

interface ColorSuggestSheetProps {
  existingNames: string[];
  onPick: (name: string, value: string, shorthand: string) => void;
  onBlank: () => void;
  onClose: () => void;
}

function ColorSuggestSheet({ existingNames, onPick, onBlank, onClose }: ColorSuggestSheetProps) {
  const available = SUGGESTED_COLORS.filter((s) => !existingNames.includes(s.name));
  return (
    <SuggestSheet label="Suggested colors" linkLabel="+ Custom" onLink={onBlank} onClose={onClose} empty={available.length === 0 ? <div className="px-4 py-6 text-center text-[11px] text-n-tx-muted">All suggestions already added.</div> : undefined}>
      {available.map((s) => (
        <MenuRow key={s.name} onClick={() => onPick(s.name, s.value, s.shorthand)}>
          <ColorSwatch color={s.value} size="md" />
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-semibold text-n-tx-primary truncate">{s.name}</span>
            <span className="text-[10px] text-n-tx-muted font-mono">
              {s.value.toUpperCase()} · {s.description}
            </span>
          </div>
        </MenuRow>
      ))}
    </SuggestSheet>
  );
}

// ── Flat sortable card (used when no groups present) ─────────────────────────

function SortableColorCard({ color, idx, selected, onToggleSelect }: { color: Color; idx: number; selected: boolean; onToggleSelect: (id: string, meta: boolean, shift?: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: color._id ?? "" });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) return;
        e.stopPropagation();
        onToggleSelect(color._id ?? "", e.metaKey || e.ctrlKey, e.shiftKey);
      }}
    >
      <div style={selected ? { borderRadius: 12, outline: "2px solid var(--b-fi-btn-default)", outlineOffset: 2, boxShadow: "0 0 0 4px var(--b-fi-subtle)" } : undefined}>
        <ColorGroupCard color={color} idx={idx} dragListeners={listeners as Record<string, unknown>} dragAttributes={attributes as unknown as Record<string, unknown>} />
      </div>
    </div>
  );
}

// ── Custom collision detection ────────────────────────────────────────────────
// When dragging a group, only consider group:: and root droppables so an
// expanded group's children don't steal the drop from the group header.

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

// ── ColorTree (grouped view) ──────────────────────────────────────────────────

interface ColorTreeProps {
  colors: Color[];
  treeState: EntityTreeStateReturn<Color>;
  collapsed: Record<string, boolean>;
  setCollapsed: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

function ColorTree({ colors, treeState, collapsed, setCollapsed }: ColorTreeProps) {
  const { dndId, sensors, allIds, activeId, activeGroupPath, overGroupPath, tree, committed,
    selectedIds, setSelectedIds, containerRef, toggleSelect,
    handleGroup, handleUngroup, handleDelete, handleClear, handleSelectAll,
    handleDragStart, handleDragOver, handleDragEnd, renameGroup, ungroup, addChild } = treeState;

  const renderColorLeaf = useCallback(
    (_committed: { _id: string; name: string }, idx: number, selected: boolean, multiDragCount: number, onToggleSel: (id: string, meta: boolean, shift?: boolean) => void) => {
      const color = colors[idx];
      if (!color) return null;
      return (
        <SortableLeafWrapper
          key={color._id}
          id={color._id ?? ""}
          selected={selected}
          multiDragCount={multiDragCount}
          onToggleSelect={onToggleSel}
          renderContent={(listeners, attributes) => (
            <div draggable={false} onDragStart={(e) => e.preventDefault()}>
              <ColorGroupCard color={color} idx={idx} dragListeners={listeners} dragAttributes={attributes} />
            </div>
          )}
        />
      );
    },
    [colors],
  );

  const activeColor = !activeGroupPath && activeId ? colors.find((c) => c._id === activeId) : null;
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
            renderLeaf={renderColorLeaf}
            depth={0}
          />
        </SortableContext>
        <RootDropZone
          activeId={activeId}
          activeIsGrouped={activeId !== null && (activeId.startsWith("group::") || (colors.find((c) => c._id === activeId)?.name ?? "").includes("/"))}
        />
        <DragOverlay>
          {activeColor && (
            <div className="px-3 py-2 rounded-[10px] border border-b-br-default bg-n-sf-default shadow-xl text-[12px] font-semibold text-n-tx-primary flex items-center gap-2">
              {activeColor._id && selectedIds.has(activeColor._id) && selectedIds.size > 1 && <span className="bg-b-fi-btn-default text-b-tx-btn-default text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">{selectedIds.size}</span>}
              {activeColor.name.split("/").pop()}
            </div>
          )}
          {activeGroupSegment && (
            <div className="px-3 py-1.5 rounded-[8px] border border-b-br-default bg-n-sf-default shadow-xl text-[12px] font-semibold text-n-tx-secondary flex items-center gap-1.5">
              <span className="text-n-tx-dim text-[10px]">{committed.filter((c) => c.name.startsWith(activeGroupPath! + "/")).length}</span>
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

export function ColorsScreen() {
  const colors = useProjectStore((s) => s.projectStore.colors);
  const addColor = useProjectStore((s) => s.addColor);
  const addColorWith = useProjectStore((s) => s.addColorWith);
  const moveColor = useProjectStore((s) => s.moveColor);
  const setColor = useProjectStore((s) => s.setColor);
  const removeColor = useProjectStore((s) => s.removeColor);
  const collapsed = useUiStore((s) => s.colorGroupCollapsed);
  const setCollapsed = useUiStore((s) => s.setColorGroupCollapsed);

  const [showSuggest, setShowSuggest] = useState(false);

  const hasGroups = colors.some((c) => c.name.includes("/"));

  const treeState = useEntityTreeState({
    items: colors,
    setName: (idx, name) => setColor(idx, "name", name),
    move: moveColor,
    remove: removeColor,
    addChild: (fullPath) => {
      const prefixShort = fullPath.split("/").filter(Boolean).map((s) => deriveShorthand(s)).join("/");
      addColorWith(`${fullPath}/New`, "#888888", `${prefixShort}/${deriveShorthand("New")}`);
    },
    collapsed,
    setCollapsed,
  });

  const { sensors, selectedIds, setSelectedIds, containerRef, toggleSelect,
    handleGroup, handleUngroup, handleDelete, handleClear, handleSelectAll } = treeState;

  function flatDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = colors.findIndex((c) => c._id === active.id);
    const to = colors.findIndex((c) => c._id === over.id);
    if (from !== -1 && to !== -1) moveColor(from, to);
  }

  function handlePick(name: string, value: string, shorthand: string) {
    addColorWith(name, value, shorthand);
    setShowSuggest(false);
  }

  const addBtn = <SplitActionButton label="+ Add Color" onAdd={addColor} onPick={() => setShowSuggest(true)} />;

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 p-3 relative"
      onClick={() => { if (selectedIds.size > 0) setSelectedIds(new Set()); }}
    >
      {showSuggest && (
        <ColorSuggestSheet
          existingNames={colors.map((c) => c.name)}
          onPick={handlePick}
          onBlank={() => { addColor(); setShowSuggest(false); }}
          onClose={() => setShowSuggest(false)}
        />
      )}
      {colors.length === 0 ? (
        <EmptyState icon="🎨" title="No colors yet" description="Add a color to start building your scale." action={addBtn} />
      ) : hasGroups ? (
        <>
          {addBtn}
          <ColorTree colors={colors} treeState={treeState} collapsed={collapsed} setCollapsed={setCollapsed} />
        </>
      ) : (
        <DndContext sensors={sensors} onDragEnd={flatDragEnd}>
          {addBtn}
          <SortableContext items={colors.map((c) => c._id ?? "")} strategy={verticalListSortingStrategy}>
            {colors.map((color, idx) => (
              <SortableColorCard key={color._id} color={color} idx={idx} selected={selectedIds.has(color._id ?? "")} onToggleSelect={toggleSelect} />
            ))}
          </SortableContext>
        </DndContext>
      )}
      {selectedIds.size > 0 && !hasGroups && <MultiSelectToolbar count={selectedIds.size} onGroup={handleGroup} onUngroup={handleUngroup} onDelete={handleDelete} onClear={handleClear} onSelectAll={handleSelectAll} />}
    </div>
  );
}
