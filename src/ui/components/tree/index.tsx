import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// CSS is used in SortableLeafWrapper via CSS.Transform.toString
import { ChevronRight, ChevronDown, GripVertical, Plus, FolderMinus, Trash2, Check, X } from 'lucide-react';
import { Button } from '../Button';

// ── Tree types ────────────────────────────────────────────────────────────────

export interface GroupNode<T> {
  kind: 'group';
  segment: string;
  fullPath: string;
  children: TreeNode<T>[];
  leafCount: number;
}
export interface LeafNode<T> {
  kind: 'leaf';
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
    const slash = rest.indexOf('/');
    if (slash > 0) {
      const seg = rest.slice(0, slash);
      if (!groupMap.has(seg)) groupMap.set(seg, []);
      groupMap.get(seg)!.push(idx);
    } else {
      directLeaves.push({ kind: 'leaf', item, idx });
    }
  }

  const result: TreeNode<T>[] = [];
  for (const [seg, childIndices] of groupMap) {
    const fullPath = prefix ? `${prefix}/${seg}` : seg;
    const children = buildTreeRecursive(items, fullPath, childIndices);
    const leafCount = countLeaves(children);
    result.push({ kind: 'group', segment: seg, fullPath, children, leafCount });
  }
  result.push(...directLeaves);
  return result;
}

export function countLeaves<T>(nodes: TreeNode<T>[]): number {
  return nodes.reduce((sum, n) => sum + (n.kind === 'leaf' ? 1 : n.leafCount), 0);
}

export function buildTree<T extends { name: string }>(items: T[]): TreeNode<T>[] {
  const allIndices = items.map((_, i) => i);
  return buildTreeRecursive(items, '', allIndices);
}

// ── useCommittedNames ─────────────────────────────────────────────────────────
// 600ms debounce snapshot so tree doesn't re-group while user is mid-type.
// flushNow() called before drag starts to ensure snapshot is current.

export function useCommittedNames<T extends { _id: string; name: string }>(items: T[]): [T[], () => void] {
  const [committed, setCommitted] = useState<T[]>(items);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const namesKey = items.map((i) => i._id + ':' + i.name).join('|');
  const prevKey = useRef('');
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

export function MultiSelectToolbar({
  count,
  onGroup,
  onUngroup,
  onDelete,
  onClear,
}: {
  count: number;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return createPortal(
    <div className="fixed bottom-4 inset-x-0 flex justify-center z-50 pointer-events-none">
      <div className="flex items-center gap-1 bg-bg-card border border-border-strong rounded-[10px] shadow-xl px-2 py-1.5 pointer-events-auto">
        <span className="text-[10px] font-semibold text-text-muted tabular-nums px-1">{count} selected</span>
        <div className="w-px h-4 bg-border-base mx-0.5" />
        <Button variant="ghost" size="xs" label="Group" title="Group (⌘G)" leftIcon={<Plus size={11} strokeWidth={2} />} onClick={onGroup} className="text-text-secondary hover:text-text-primary" />
        <Button variant="ghost" size="xs" label="Ungroup" title="Ungroup (⌘⇧G)" leftIcon={<FolderMinus size={11} strokeWidth={1.75} />} onClick={onUngroup} className="text-text-secondary hover:text-text-primary" />
        <div className="w-px h-4 bg-border-base mx-0.5" />
        <Button variant="ghost" size="xs" label="Delete" title="Delete selected" leftIcon={<Trash2 size={11} strokeWidth={1.75} />} onClick={onDelete} className="text-text-dim hover:text-danger hover:bg-danger-subtle" />
        <Button variant="icon" size="xs" title="Clear selection (Esc)" icon={<X size={11} strokeWidth={2} />} onClick={onClear} className="ml-0.5" />
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
  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
  } = useSortable({ id: `group::${fullPath}` });
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
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDraggingThis ? 0.4 : 1 }}
      className={[
        'group flex items-center gap-1.5 px-2 py-1.5 rounded-t-[8px] select-none transition-colors cursor-pointer',
        isOver && !isDraggingThis ? 'bg-accent-subtle' : 'hover:bg-bg-hover',
      ].join(' ')}
      onClick={onToggle}
    >
      {/* Group drag handle */}
      <Button
        variant="icon"
        size="sm"
        className="cursor-grab touch-none shrink-0 text-text-muted hover:text-text-primary hover:bg-bg-hover"
        {...(attributes as any)}
        {...(listeners as any)}
        title="Drag group"
        onClick={(e) => e.stopPropagation()}
        icon={<GripVertical size={12} strokeWidth={1.75} />}
      />

      {/* Collapse chevron */}
      <span className="text-text-muted shrink-0">
        {collapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}
      </span>

      {/* Name / edit */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(segment);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-[12px] font-semibold bg-bg-input border border-accent rounded px-1.5 py-0.5 text-text-primary outline-none min-w-0"
        />
      ) : (
        <span
          className="flex-1 text-[12px] font-semibold text-text-primary min-w-0 truncate"
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
      <span className="text-[10px] font-medium text-text-muted tabular-nums bg-bg-hover rounded-full px-1.5 py-0.5 shrink-0">
        {leafCount}
      </span>

      {/* Action buttons */}
      <div
        className="flex items-center gap-0.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {editing ? (
          <>
            <Button variant="icon" size="sm" onClick={commit} title="Confirm rename" icon={<Check size={12} strokeWidth={2.5} />} className="text-accent hover:text-accent hover:bg-accent-subtle" />
            <Button variant="icon" size="sm" onClick={() => { setDraft(segment); setEditing(false); }} title="Cancel rename" icon={<X size={12} strokeWidth={2} />} className="text-text-muted hover:text-text-primary hover:bg-bg-hover" />
          </>
        ) : (
          <>
            <Button variant="icon" size="sm" onClick={onAddChild} title="Add item in group" icon={<Plus size={12} strokeWidth={2} />} className="text-text-muted hover:text-accent hover:bg-accent-subtle" />
            <Button variant="icon" size="sm" onClick={onUngroup} title="Ungroup (⌘⇧G)" icon={<FolderMinus size={12} strokeWidth={1.75} />} className="text-text-muted hover:text-text-primary hover:bg-bg-hover" />
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
  id,
  selected,
  onToggleSelect,
  renderContent,
}: {
  id: string;
  selected: boolean;
  onToggleSelect: (id: string, meta: boolean) => void;
  renderContent: (listeners: Record<string, unknown>, attributes: Record<string, unknown>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          e.stopPropagation();
          onToggleSelect(id, true);
        }
      }}
    >
      <div
        className="flex-1 min-w-0"
        style={
          selected
            ? {
                borderRadius: 12,
                outline: '2px solid var(--accent)',
                outlineOffset: 2,
                boxShadow: '0 0 0 4px var(--accent-glow)',
              }
            : undefined
        }
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
  nodes,
  collapsed,
  overGroupPath,
  activeGroupPath,
  selectedIds,
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
  onToggleSelect: (id: string, meta: boolean) => void;
  onToggle: (path: string) => void;
  onRenameGroup: (fullPath: string, newSegment: string) => void;
  onAddChild: (fullPath: string) => void;
  onUngroup: (fullPath: string) => void;
  renderLeaf: (
    item: T,
    idx: number,
    selected: boolean,
    onToggleSelect: (id: string, meta: boolean) => void,
  ) => React.ReactNode;
  depth: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {nodes.map((node) => {
        if (node.kind === 'group') {
          const isCollapsed = collapsed[node.fullPath] ?? false;
          const isDragging = activeGroupPath === node.fullPath;
          const isDropTarget = overGroupPath === node.fullPath && !isDragging;
          return (
            <div
              key={node.fullPath}
              className={[
                'group/treegroup rounded-[10px] border transition-all',
                isDropTarget
                  ? 'border-accent bg-accent-subtle/40 shadow-[0_0_0_3px_var(--accent-glow)]'
                  : 'border-border-base bg-bg-app hover:border-border-strong hover:shadow-sm',
              ].join(' ')}
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
                <div className="border-t border-border-subtle p-2">
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
