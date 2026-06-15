import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// CSS is used in SortableLeafWrapper via CSS.Transform.toString
import { LucideChevronRight as ChevronRight, LucideChevronDown as ChevronDown, LucideGripVertical as GripVertical, LucidePlus as Plus, LucideFolderMinus as FolderMinus, LucideTrash as Trash2, LucideCheck as Check, LucideClose as X, LucideCheckSquare as CheckSquare } from "./icons";
import { Button } from "./Button";

// ── Tree types ────────────────────────────────────────────────────────────────

export interface GroupNode<T> {
  kind: "group";
  segment: string;
  fullPath: string;
  children: TreeNode<T>[];
  leafCount: number;
}
export interface LeafNode<T> {
  kind: "leaf";
  item: T;
  idx: number;
}
export type TreeNode<T> = GroupNode<T> | LeafNode<T>;

// ── Tree builder ──────────────────────────────────────────────────────────────

function buildTreeRecursive<T extends { name: string }>(items: T[], prefix: string, originalIndices: number[]): TreeNode<T>[] {
  const groupMap = new Map<string, number[]>();
  const directLeaves: LeafNode<T>[] = [];

  for (const idx of originalIndices) {
    const item = items[idx];
    const rest = prefix ? item.name.slice(prefix.length + 1) : item.name;
    const slash = rest.indexOf("/");
    if (slash > 0) {
      const seg = rest.slice(0, slash);
      if (!groupMap.has(seg)) groupMap.set(seg, []);
      groupMap.get(seg)!.push(idx);
    } else {
      directLeaves.push({ kind: "leaf", item, idx });
    }
  }

  const result: TreeNode<T>[] = [];
  for (const [seg, childIndices] of groupMap) {
    const fullPath = prefix ? `${prefix}/${seg}` : seg;
    const children = buildTreeRecursive(items, fullPath, childIndices);
    const leafCount = countLeaves(children);
    result.push({ kind: "group", segment: seg, fullPath, children, leafCount });
  }
  result.push(...directLeaves);
  return result;
}

export function countLeaves<T>(nodes: TreeNode<T>[]): number {
  return nodes.reduce((sum, n) => sum + (n.kind === "leaf" ? 1 : n.leafCount), 0);
}

export function buildTree<T extends { name: string }>(items: T[]): TreeNode<T>[] {
  const allIndices = items.map((_, i) => i);
  return buildTreeRecursive(items, "", allIndices);
}

// ── useCommittedNames ─────────────────────────────────────────────────────────
// 600ms debounce snapshot so tree doesn't re-group while user is mid-type.
// flushNow() called before drag starts to ensure snapshot is current.

export function useCommittedNames<T extends { _id: string; name: string }>(items: T[]): [T[], () => void] {
  const [committed, setCommitted] = useState<T[]>(items);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const namesKey = items.map((i) => i._id + ":" + i.name).join("|");
  const prevKey = useRef("");
  useEffect(() => {
    if (namesKey === prevKey.current) return;
    prevKey.current = namesKey;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCommitted(itemsRef.current);
    }, 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [namesKey]);

  const flushNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCommitted(itemsRef.current);
  }, []);

  return [committed, flushNow];
}

// ── MultiSelectToolbar ────────────────────────────────────────────────────────

export function MultiSelectToolbar({ count, onGroup, onUngroup, onDelete, onClear, onSelectAll }: { count: number; onGroup: () => void; onUngroup: () => void; onDelete: () => void; onClear: () => void; onSelectAll: () => void }) {
  return createPortal(
    <div className="fixed bottom-4 inset-x-0 flex justify-center z-50 pointer-events-none">
      <div className="flex items-center gap-1 bg-n-sf-raised border border-n-br-strong rounded-[10px] shadow-xl px-2 py-1.5 pointer-events-auto">
        <span className="text-[10px] font-semibold text-n-tx-primary tabular-nums px-1">{count} selected</span>
        <div className="w-px h-4 bg-n-br-strong mx-0.5" />
        <Button variant="ghost" size="xs" label="All" title="Select all (⌘A)" leftIcon={<CheckSquare size={11} strokeWidth={2} />} onClick={onSelectAll} className="text-n-tx-primary hover:text-b-tx-muted hover:bg-b-fi-subtle" />
        <Button variant="ghost" size="xs" label="Group" title="Group (⌘G)" leftIcon={<Plus size={11} strokeWidth={2} />} onClick={onGroup} className="text-n-tx-primary hover:text-b-tx-muted hover:bg-b-fi-subtle" />
        <Button variant="ghost" size="xs" label="Ungroup" title="Ungroup (⌘⇧G)" leftIcon={<FolderMinus size={11} strokeWidth={1.75} />} onClick={onUngroup} className="text-n-tx-primary hover:text-n-tx-primary hover:bg-n-sf-hover" />
        <div className="w-px h-4 bg-n-br-strong mx-0.5" />
        <Button variant="ghost" size="xs" label="Delete" title="Delete selected" leftIcon={<Trash2 size={11} strokeWidth={1.75} />} onClick={onDelete} className="text-n-tx-primary hover:text-d-tx-muted hover:bg-d-fi-subtle" />
        <Button variant="icon" size="xs" title="Clear selection (Esc)" icon={<X size={11} strokeWidth={2} />} onClick={onClear} className="ml-0.5 text-n-tx-primary" />
      </div>
    </div>,
    document.body,
  );
}

// ── DroppableGroupHeader ──────────────────────────────────────────────────────
// Owns both useDroppable and useSortable on `group::{fullPath}`.
// Double-click name to edit inline. Click anywhere on row to toggle collapse.
// Action buttons and drag handle call e.stopPropagation() to not trigger toggle.

export function DroppableGroupHeader({
  segment,
  fullPath,
  leafCount,
  collapsed,
  isOver,
  isDraggingThis,
  onToggle,
  onRename,
  onAddChild,
  onUngroup,
}: {
  segment: string;
  fullPath: string;
  leafCount: number;
  collapsed: boolean;
  isOver: boolean;
  isDraggingThis: boolean;
  onToggle: () => void;
  onRename: (s: string) => void;
  onAddChild: () => void;
  onUngroup: () => void;
}) {
  const { setNodeRef: setDropRef } = useDroppable({ id: `group::${fullPath}` });
  const { attributes, listeners, setNodeRef: setSortRef, transform, transition } = useSortable({ id: `group::${fullPath}` });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(segment);

  function commit() {
    const t = draft.trim();
    if (t && t !== segment) onRename(t);
    setEditing(false);
  }

  const setRef = (el: HTMLDivElement | null) => {
    setDropRef(el);
    setSortRef(el);
  };

  return (
    <div
      ref={setRef}
      style={{ transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null), transition, opacity: isDraggingThis ? 0.4 : 1 }}
      className={["group flex items-center gap-1.5 px-2 py-1.5 rounded-t-[8px] select-none transition-colors cursor-pointer", isOver && !isDraggingThis ? "bg-b-fi-subtle" : "hover:bg-n-sf-hover"].join(" ")}
      onClick={onToggle}
    >
      {/* Group drag handle */}
      <Button
        variant="icon"
        size="sm"
        className="cursor-grab touch-none shrink-0 text-n-tx-muted hover:text-n-tx-primary hover:bg-n-sf-hover"
        {...(attributes as React.HTMLAttributes<HTMLButtonElement>)}
        {...(listeners as React.HTMLAttributes<HTMLButtonElement>)}
        title="Drag group"
        onClick={(e) => e.stopPropagation()}
        icon={<GripVertical size={12} strokeWidth={1.75} />}
      />

      {/* Collapse chevron */}
      <span className="text-n-tx-muted shrink-0">{collapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}</span>

      {/* Name / edit */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(segment);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-[12px] font-semibold bg-n-sf-input border border-b-br-strong rounded px-1.5 py-0.5 text-n-tx-primary outline-none min-w-0"
        />
      ) : (
        <span
          className="flex-1 text-[12px] font-semibold text-n-tx-primary min-w-0 truncate"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setDraft(segment);
            setEditing(true);
          }}
        >
          {segment}
        </span>
      )}

      {/* Count pill */}
      <span className="text-[10px] font-semibold tabular-nums bg-n-br-strong text-n-tx-primary rounded-full px-1.5 py-0.5 shrink-0 group-hover/treegroup:bg-b-fi-btn-default group-hover/treegroup:text-b-tx-btn-default transition-colors">{leafCount}</span>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {editing ? (
          <>
            <Button variant="icon" size="sm" onClick={commit} title="Confirm rename" icon={<Check size={12} strokeWidth={2.5} />} className="text-b-tx-muted hover:text-b-tx-muted hover:bg-b-fi-subtle" />
            <Button
              variant="icon"
              size="sm"
              onClick={() => {
                setDraft(segment);
                setEditing(false);
              }}
              title="Cancel rename"
              icon={<X size={12} strokeWidth={2} />}
              className="text-n-tx-muted hover:text-n-tx-primary hover:bg-n-sf-hover"
            />
          </>
        ) : (
          <>
            <Button variant="icon" size="sm" onClick={onAddChild} title="Add item in group" icon={<Plus size={12} strokeWidth={2} />} className="opacity-60 hover:opacity-100 hover:text-b-tx-muted hover:bg-b-fi-subtle text-n-tx-primary" />
            <Button variant="icon" size="sm" onClick={onUngroup} title="Ungroup (⌘⇧G)" icon={<FolderMinus size={12} strokeWidth={1.75} />} className="opacity-60 hover:opacity-100 hover:text-n-tx-primary hover:bg-n-sf-hover text-n-tx-primary" />
          </>
        )}
      </div>
    </div>
  );
}

// ── SortableLeafWrapper ───────────────────────────────────────────────────────
// ⌘+click toggles selection. Accent outline + glow when selected.
// When selected, the whole card is draggable (not just the grip handle).
// multiDragCount > 1 shows a badge on the drag ghost.

export const SortableLeafWrapper = React.memo(function SortableLeafWrapper({
  id,
  selected,
  multiDragCount,
  onToggleSelect,
  renderContent,
}: {
  id: string;
  selected: boolean;
  multiDragCount?: number;
  onToggleSelect: (id: string, meta: boolean, shift?: boolean) => void;
  renderContent: (listeners: Record<string, unknown>, attributes: Record<string, unknown>, isDragging: boolean) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  // When this card is selected, the whole wrapper becomes the drag handle.
  // When not selected, pass listeners down to the grip inside the card.
  const wrapperListeners = selected ? listeners : {};
  const contentListeners = selected ? {} : listeners;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...(selected ? (attributes as React.HTMLAttributes<HTMLDivElement>) : {})}
      {...(wrapperListeners as React.HTMLAttributes<HTMLDivElement>)}
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect(id, e.metaKey || e.ctrlKey, e.shiftKey);
      }}
    >
      <div
        className="relative flex-1 min-w-0"
        style={
          selected
            ? {
                borderRadius: 12,
                outline: "2px solid var(--b-br-strong)",
                outlineOffset: 2,
                boxShadow: "0 0 0 4px var(--b-fi-subtle)",
              }
            : undefined
        }
      >
        {renderContent(contentListeners as Record<string, unknown>, selected ? {} : (attributes as unknown as Record<string, unknown>), isDragging)}
        {/* Multi-drag count badge — shown on the card being dragged */}
        {isDragging && multiDragCount && multiDragCount > 1 && <div className="absolute -top-2 -right-2 bg-b-fi-btn-default text-b-tx-btn-default text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md z-10">{multiDragCount}</div>}
      </div>
    </div>
  );
});

// ── TreeRenderer ──────────────────────────────────────────────────────────────
// Generic recursive renderer. Group containers get a bordered box + drop glow.
// Collapsed groups skip children render entirely.

export function TreeRenderer<T extends { name: string; _id: string }>({
  nodes,
  collapsed,
  overGroupPath,
  activeGroupPath,
  selectedIds,
  multiDragCount,
  onToggleSelect,
  onToggle,
  onRenameGroup,
  onAddChild,
  onUngroup,
  renderLeaf,
  depth,
}: {
  nodes: TreeNode<T>[];
  collapsed: Record<string, boolean>;
  overGroupPath: string | null;
  activeGroupPath: string | null;
  selectedIds: Set<string>;
  multiDragCount: number;
  onToggleSelect: (id: string, meta: boolean, shift?: boolean) => void;
  onToggle: (path: string) => void;
  onRenameGroup: (fullPath: string, newSegment: string) => void;
  onAddChild: (fullPath: string) => void;
  onUngroup: (fullPath: string) => void;
  renderLeaf: (item: T, idx: number, selected: boolean, multiDragCount: number, onToggleSelect: (id: string, meta: boolean, shift?: boolean) => void) => React.ReactNode;
  depth: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {nodes.map((node) => {
        if (node.kind === "group") {
          const isCollapsed = collapsed[node.fullPath] ?? false;
          const isDragging = activeGroupPath === node.fullPath;
          const isDropTarget = overGroupPath === node.fullPath && !isDragging;
          return (
            <div key={node.fullPath} className={["group/treegroup rounded-[10px] border transition-all bg-n-sf-sunken", isDropTarget ? "border-b-br-default bg-b-fi-subtle/40 shadow-[0_0_0_3px_var(--b-fi-subtle)]" : "border-n-br-default hover:border-n-br-strong hover:shadow-sm"].join(" ")}>
              <DroppableGroupHeader
                segment={node.segment}
                fullPath={node.fullPath}
                leafCount={node.leafCount}
                collapsed={isCollapsed}
                isOver={isDropTarget}
                isDraggingThis={isDragging}
                onToggle={() => onToggle(node.fullPath)}
                onRename={(s) => onRenameGroup(node.fullPath, s)}
                onAddChild={() => onAddChild(node.fullPath)}
                onUngroup={() => onUngroup(node.fullPath)}
              />
              {!isCollapsed && !isDragging && (
                <div className="border-t border-n-br-subtle p-2">
                  <TreeRenderer
                    nodes={node.children}
                    collapsed={collapsed}
                    overGroupPath={overGroupPath}
                    activeGroupPath={activeGroupPath}
                    selectedIds={selectedIds}
                    multiDragCount={multiDragCount}
                    onToggleSelect={onToggleSelect}
                    onToggle={onToggle}
                    onRenameGroup={onRenameGroup}
                    onAddChild={onAddChild}
                    onUngroup={onUngroup}
                    renderLeaf={renderLeaf}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
          );
        }
        return <div key={node.item._id}>{renderLeaf(node.item, node.idx, selectedIds.has(node.item._id), multiDragCount, onToggleSelect)}</div>;
      })}
    </div>
  );
}

// ── Root drop zones ───────────────────────────────────────────────────────────
// Three zones that all ungroup on drop: left strip, right strip, bottom zone.
// Each has a distinct droppable ID; handleDragEnd treats all three as "root".

export const ROOT_ZONE_IDS = ["root-bottom", "root-left", "root-right"] as const;
export type RootZoneId = (typeof ROOT_ZONE_IDS)[number];

function SideStrip({ id, side }: { id: RootZoneId; side: "left" | "right" }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`absolute top-0 bottom-0 w-5 z-10 flex items-center justify-center transition-colors rounded-[6px] ${side === "left" ? "left-0" : "right-0"} ${isOver ? "bg-b-fi-subtle border border-b-br-default" : "border border-transparent"}`}>
      {isOver && <span className="text-b-tx-muted text-[9px] font-bold [writing-mode:vertical-rl] rotate-180 select-none">ungroup</span>}
    </div>
  );
}

export function RootDropZone({ activeId, activeIsGrouped }: { activeId: string | null; activeIsGrouped: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "root-bottom" });
  if (!activeId || !activeIsGrouped) return null;
  return (
    <>
      <SideStrip id="root-left" side="left" />
      <SideStrip id="root-right" side="right" />
      <div ref={setNodeRef} className={`mt-1 h-14 rounded-[8px] border-2 border-dashed flex items-center justify-center text-[11px] transition-colors ${isOver ? "border-b-br-default bg-b-fi-subtle text-b-tx-muted" : "border-n-br-default text-n-tx-dim"}`}>
        {isOver ? "Release to ungroup" : "Drop here to ungroup"}
      </div>
    </>
  );
}
