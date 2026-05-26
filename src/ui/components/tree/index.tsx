import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// CSS is used in SortableLeafWrapper via CSS.Transform.toString
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  FolderMinus,
  Trash2,
  Check,
  X,
} from "lucide-react";

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

function buildTreeRecursive<T extends { name: string }>(
  items: T[],
  prefix: string,
  originalIndices: number[],
): TreeNode<T>[] {
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
  return nodes.reduce(
    (sum, n) => sum + (n.kind === "leaf" ? 1 : n.leafCount),
    0,
  );
}

export function buildTree<T extends { name: string }>(items: T[]): TreeNode<T>[] {
  const allIndices = items.map((_, i) => i);
  return buildTreeRecursive(items, "", allIndices);
}

// ── useCommittedNames ─────────────────────────────────────────────────────────
// 600ms debounce snapshot so tree doesn't re-group while user is mid-type.
// flushNow() called before drag starts to ensure snapshot is current.

export function useCommittedNames<T extends { _id: string; name: string }>(
  items: T[],
): [T[], () => void] {
  const [committed, setCommitted] = useState<T[]>(items);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef  = useRef(items);
  itemsRef.current = items;

  const namesKey = items.map(i => i._id + ":" + i.name).join("|");
  const prevKey  = useRef("");
  useEffect(() => {
    if (namesKey === prevKey.current) return;
    prevKey.current = namesKey;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCommitted(itemsRef.current);
    }, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [namesKey]);

  const flushNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCommitted(itemsRef.current);
  }, []);

  return [committed, flushNow];
}

// ── MultiSelectToolbar ────────────────────────────────────────────────────────

export function MultiSelectToolbar({
  count, onGroup, onUngroup, onDelete, onClear,
}: {
  count: number;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex justify-center mt-3">
      <div className="flex items-center gap-1 bg-bg-card border border-border-strong rounded-[10px] shadow-xl px-2 py-1.5">
        <span className="text-[10px] font-semibold text-text-muted tabular-nums px-1">{count} selected</span>
        <div className="w-px h-4 bg-border-base mx-0.5" />
        <button onClick={onGroup} title="Group (⌘G)" className="flex items-center gap-1 px-2 h-6 rounded-[6px] text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover cursor-pointer transition-colors">
          <Plus size={11} strokeWidth={2} />Group
        </button>
        <button onClick={onUngroup} title="Ungroup (⌘⇧G)" className="flex items-center gap-1 px-2 h-6 rounded-[6px] text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover cursor-pointer transition-colors">
          <FolderMinus size={11} strokeWidth={1.75} />Ungroup
        </button>
        <div className="w-px h-4 bg-border-base mx-0.5" />
        <button onClick={onDelete} title="Delete selected" className="flex items-center gap-1 px-2 h-6 rounded-[6px] text-[11px] font-medium text-text-dim hover:text-danger hover:bg-danger-subtle cursor-pointer transition-colors">
          <Trash2 size={11} strokeWidth={1.75} />Delete
        </button>
        <button onClick={onClear} title="Clear selection" className="w-6 h-6 rounded-[6px] flex items-center justify-center text-text-dim hover:text-text-muted hover:bg-bg-hover cursor-pointer transition-colors ml-0.5">
          <X size={11} strokeWidth={2} />
        </button>
      </div>
    </div>
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
  segment: string; fullPath: string; leafCount: number; collapsed: boolean; isOver: boolean;
  isDraggingThis: boolean;
  onToggle: () => void; onRename: (s: string) => void; onAddChild: () => void; onUngroup: () => void;
}) {
  const { setNodeRef: setDropRef } = useDroppable({ id: `group::${fullPath}` });
  const { attributes, listeners, setNodeRef: setSortRef, transform, transition } =
    useSortable({ id: `group::${fullPath}` });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(segment);

  function commit() {
    const t = draft.trim();
    if (t && t !== segment) onRename(t);
    setEditing(false);
  }

  const setRef = (el: HTMLDivElement | null) => { setDropRef(el); setSortRef(el); };

  return (
    <div
      ref={setRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDraggingThis ? 0.4 : 1 }}
      className={[
        "group flex items-center gap-1.5 px-2 py-1.5 rounded-t-[8px] select-none transition-colors cursor-pointer",
        isOver && !isDraggingThis ? "bg-accent-subtle" : "hover:bg-bg-hover",
      ].join(" ")}
      onClick={onToggle}
    >
      {/* Group drag handle */}
      <button
        className="text-text-dim hover:text-text-muted cursor-grab shrink-0 touch-none opacity-0 group-hover:opacity-100 transition-opacity"
        {...attributes}
        {...listeners}
        title="Drag group"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={11} strokeWidth={1.75} />
      </button>

      {/* Collapse toggle */}
      <span className="text-text-dim shrink-0">
        {collapsed ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
      </span>

      {/* Name / edit */}
      {editing ? (
        <input
          autoFocus value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(segment); setEditing(false); } }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-[12px] font-semibold bg-bg-input border border-accent rounded px-1.5 py-0.5 text-text-primary outline-none min-w-0"
        />
      ) : (
        <span
          className="flex-1 text-[12px] font-semibold text-text-secondary min-w-0 truncate"
          onDoubleClick={(e) => { e.stopPropagation(); setDraft(segment); setEditing(true); }}
        >
          {segment}
        </span>
      )}

      {/* Count pill */}
      <span className="text-[10px] text-text-dim tabular-nums bg-bg-hover rounded-full px-1.5 py-0.5 shrink-0">{leafCount}</span>

      {/* Action buttons */}
      <div className={["flex items-center gap-0.5 shrink-0 transition-opacity", editing ? "opacity-100" : "opacity-0 group-hover:opacity-100"].join(" ")} onClick={(e) => e.stopPropagation()}>
        {editing ? (
          <>
            <button onClick={commit} className="w-5 h-5 rounded flex items-center justify-center text-accent hover:bg-accent-subtle cursor-pointer"><Check size={11} strokeWidth={2.5} /></button>
            <button onClick={() => { setDraft(segment); setEditing(false); }} className="w-5 h-5 rounded flex items-center justify-center text-text-dim hover:bg-bg-hover cursor-pointer"><X size={11} strokeWidth={2} /></button>
          </>
        ) : (
          <>
            <button onClick={onAddChild} title="Add item in group" className="w-5 h-5 rounded flex items-center justify-center text-text-dim hover:text-accent hover:bg-accent-subtle cursor-pointer"><Plus size={11} strokeWidth={2} /></button>
            <button onClick={onUngroup} title="Ungroup (⌘⇧G)" className="w-5 h-5 rounded flex items-center justify-center text-text-dim hover:text-text-primary hover:bg-bg-hover cursor-pointer"><FolderMinus size={10} strokeWidth={1.75} /></button>
          </>
        )}
      </div>
    </div>
  );
}

// ── SortableLeafWrapper ───────────────────────────────────────────────────────
// ⌘+click toggles selection. Accent outline + glow when selected.
// renderContent(listeners, attributes) pattern lets consumers pass dnd handles
// into nested elements (e.g. a grip button inside RoleGroupCard's toolbar).

export const SortableLeafWrapper = React.memo(function SortableLeafWrapper({
  id, selected, onToggleSelect, renderContent,
}: {
  id: string;
  selected: boolean;
  onToggleSelect: (id: string, meta: boolean) => void;
  renderContent: (listeners: Record<string, unknown>, attributes: Record<string, unknown>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      onClick={(e) => { if (e.metaKey || e.ctrlKey) { e.stopPropagation(); onToggleSelect(id, true); } }}
    >
      <div
        className="flex-1 min-w-0"
        style={selected ? { borderRadius: 12, outline: "2px solid var(--accent)", outlineOffset: 2, boxShadow: "0 0 0 4px var(--accent-glow)" } : undefined}
      >
        {renderContent(listeners as Record<string, unknown>, attributes as unknown as Record<string, unknown>)}
      </div>
    </div>
  );
});

// ── TreeRenderer ──────────────────────────────────────────────────────────────
// Generic recursive renderer. Group containers get a bordered box + drop glow.
// Collapsed groups skip children render entirely.

export function TreeRenderer<T extends { name: string; _id: string }>({
  nodes, collapsed, overGroupPath, activeGroupPath,
  selectedIds, onToggleSelect,
  onToggle, onRenameGroup, onAddChild, onUngroup, renderLeaf, depth,
}: {
  nodes: TreeNode<T>[];
  collapsed: Record<string, boolean>;
  overGroupPath: string | null;
  activeGroupPath: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, meta: boolean) => void;
  onToggle: (path: string) => void;
  onRenameGroup: (fullPath: string, newSegment: string) => void;
  onAddChild: (fullPath: string) => void;
  onUngroup: (fullPath: string) => void;
  renderLeaf: (item: T, idx: number, selected: boolean, onToggleSelect: (id: string, meta: boolean) => void) => React.ReactNode;
  depth: number;
}) {
  return (
    <div className="flex flex-col gap-9">
      {nodes.map((node) => {
        if (node.kind === "group") {
          const isCollapsed  = collapsed[node.fullPath] ?? false;
          const isDragging   = activeGroupPath === node.fullPath;
          const isDropTarget = overGroupPath === node.fullPath && !isDragging;
          return (
            <div
              key={node.fullPath}
              className={[
                "group/treegroup rounded-[10px] border transition-all",
                isDropTarget
                  ? "border-accent bg-accent-subtle/40 shadow-[0_0_0_3px_var(--accent-glow)]"
                  : "border-border-base bg-bg-app hover:border-border-strong hover:shadow-sm",
              ].join(" ")}
            >
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
                <div className="border-t border-border-subtle px-2.5 pb-2.5 pt-2">
                  <TreeRenderer
                    nodes={node.children}
                    collapsed={collapsed}
                    overGroupPath={overGroupPath}
                    activeGroupPath={activeGroupPath}
                    selectedIds={selectedIds}
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
        return (
          <div key={node.item._id}>
            {renderLeaf(node.item, node.idx, selectedIds.has(node.item._id), onToggleSelect)}
          </div>
        );
      })}
    </div>
  );
}
