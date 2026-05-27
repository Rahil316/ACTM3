import { useState, useId, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../store/appStore';
import { ColorGroupCard } from '../components/cards/ColorGroupCard';
import { SplitActionButton } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Sheet } from '../components/Sheet';
import type { Color } from '../types/state';
import {
  buildTree,
  useCommittedNames,
  SortableLeafWrapper,
  TreeRenderer,
  MultiSelectToolbar,
  type TreeNode,
} from '../components/tree';

// ── Suggested colors ──────────────────────────────────────────────────────────

const SUGGESTED_COLORS: { name: string; value: string; shorthand: string; description: string }[] = [
  { name: 'Brand/Primary', value: '#0066FF', shorthand: 'bp', description: 'Primary brand color' },
  { name: 'Brand/Accent', value: '#8B5CF6', shorthand: 'ba', description: 'Accent — violet' },
  { name: 'Brand/Warning', value: '#F59E0B', shorthand: 'bw', description: 'Warning — amber' },
  { name: 'Brand/Danger', value: '#EF4444', shorthand: 'bd', description: 'Danger — red' },
  { name: 'Brand/Success', value: '#22C55E', shorthand: 'bs', description: 'Success — green' },
  { name: 'Neutral/Gray', value: '#6B7280', shorthand: 'ng', description: 'Neutral gray' },
  { name: 'Neutral/Warm', value: '#78716C', shorthand: 'nw', description: 'Warm stone gray' },
  { name: 'Neutral/Cool', value: '#64748B', shorthand: 'nc', description: 'Cool slate gray' },
  { name: 'Color/Sky', value: '#0EA5E9', shorthand: 'cs', description: 'Sky blue' },
  { name: 'Color/Teal', value: '#14B8A6', shorthand: 'ct', description: 'Teal' },
  { name: 'Color/Indigo', value: '#6366F1', shorthand: 'ci', description: 'Indigo' },
  { name: 'Color/Pink', value: '#EC4899', shorthand: 'cp', description: 'Pink' },
  { name: 'Color/Orange', value: '#F97316', shorthand: 'co', description: 'Orange' },
  { name: 'Color/Rose', value: '#F43F5E', shorthand: 'cr', description: 'Rose' },
  { name: 'Color/Emerald', value: '#10B981', shorthand: 'ce', description: 'Emerald' },
  { name: 'Color/Amber', value: '#F59E0B', shorthand: 'cam', description: 'Amber' },
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
    <div className="fixed inset-0 z-40" style={{ background: 'var(--bg-scrim)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <Sheet open className="overflow-y-auto">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Suggested colors</span>
            <button className="text-[11px] text-accent cursor-pointer hover:underline" onClick={onBlank}>
              + Custom
            </button>
          </div>
          {available.length === 0 ? (
            <div className="px-4 py-6 text-center text-[11px] text-text-muted">All suggestions already added.</div>
          ) : (
            <div className="flex flex-col overflow-y-auto">
              {available.map((s) => (
                <button
                  key={s.name}
                  onClick={() => onPick(s.name, s.value, s.shorthand)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover transition-colors cursor-pointer text-left border-b border-border-subtle last:border-0"
                >
                  <div
                    className="w-7 h-7 rounded-[6px] shrink-0 border border-black/10"
                    style={{ background: s.value }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-semibold text-text-primary truncate">{s.name}</span>
                    <span className="text-[10px] text-text-muted font-mono">
                      {s.value.toUpperCase()} · {s.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Sheet>
      </div>
    </div>
  );
}

// ── Flat sortable card (used when no groups present) ─────────────────────────

function SortableColorCard({
  color,
  idx,
  selected,
  onToggleSelect,
}: {
  color: Color;
  idx: number;
  selected: boolean;
  onToggleSelect: (id: string, meta: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: color._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      onClick={(e) => { if (e.metaKey || e.ctrlKey) { e.stopPropagation(); onToggleSelect(color._id, true); } }}
    >
      <div
        style={selected ? { borderRadius: 12, outline: '2px solid var(--accent)', outlineOffset: 2, boxShadow: '0 0 0 4px var(--accent-glow)' } : undefined}
      >
        <ColorGroupCard color={color} idx={idx} dragListeners={listeners as Record<string, unknown>} dragAttributes={attributes as unknown as Record<string, unknown>} />
      </div>
    </div>
  );
}

// ── ColorTree (grouped view) ──────────────────────────────────────────────────

function ColorTree() {
  const colors = useAppStore((s) => s.appState.colors);
  const moveColor = useAppStore((s) => s.moveColor);
  const setColor = useAppStore((s) => s.setColor);
  const [committed, flushCommitted] = useCommittedNames(colors);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overGroupPath, setOverGroupPath] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const dndId = useId();

  function toggleSelect(id: string, _meta: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ⌘G — group selected into "Untitled"; ⌘⇧G — ungroup (strip prefix); Esc — clear selection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (e.key === 'Escape' && selectedIds.size > 0) {
        e.preventDefault();
        setSelectedIds(new Set());
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || selectedIds.size === 0) return;
      if (e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        colors.forEach((c, idx) => {
          if (!selectedIds.has(c._id)) return;
          setColor(idx, 'name', c.name.split('/').pop()!);
        });
        setSelectedIds(new Set());
      } else if (e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        colors.forEach((c, idx) => {
          if (!selectedIds.has(c._id)) return;
          setColor(idx, 'name', `Untitled/${c.name.split('/').pop()!}`);
        });
        setSelectedIds(new Set());
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, colors, setColor]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const tree = useMemo(() => buildTree(committed), [committed]);

  function collectVisibleIds(nodes: TreeNode<(typeof committed)[number]>[], dragging: boolean): string[] {
    const ids: string[] = [];
    for (const n of nodes) {
      if (n.kind === 'leaf') {
        ids.push(n.item._id);
      } else {
        ids.push(`group::${n.fullPath}`);
        if (dragging || !(collapsed[n.fullPath] ?? false)) ids.push(...collectVisibleIds(n.children, dragging));
      }
    }
    return ids;
  }
  const allIds = useMemo(() => collectVisibleIds(tree, activeId !== null), [tree, collapsed, activeId]);

  const activeGroupPath = activeId?.startsWith('group::') ? activeId.slice(7) : null;

  function handleDragStart(e: DragStartEvent) {
    flushCommitted();
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: { over: { id: string } | null }) {
    if (!e.over) {
      setOverGroupPath(null);
      return;
    }
    const id = e.over.id as string;
    setOverGroupPath(id.startsWith('group::') ? id.slice(7) : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverGroupPath(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overId = over.id as string;

    // group → group: bulk rename, guard against self-nesting
    if (activeIdStr.startsWith('group::') && overId.startsWith('group::')) {
      const srcPath = activeIdStr.slice(7);
      const targetPath = overId.slice(7);
      if (targetPath === srcPath || targetPath.startsWith(srcPath + '/')) return;
      const srcSegment = srcPath.includes('/') ? srcPath.split('/').pop()! : srcPath;
      const newBase = `${targetPath}/${srcSegment}`;
      colors.forEach((c, idx) => {
        if (c.name === srcPath || c.name.startsWith(srcPath + '/'))
          setColor(idx, 'name', newBase + c.name.slice(srcPath.length));
      });
      return;
    }

    // leaf → group: rename prefix to target group
    if (overId.startsWith('group::')) {
      const fromIdx = colors.findIndex((c) => c._id === activeIdStr);
      if (fromIdx < 0) return;
      const targetPath = overId.slice(7);
      const localName = colors[fromIdx].name.split('/').pop()!;
      setColor(fromIdx, 'name', `${targetPath}/${localName}`);
      return;
    }

    // leaf → leaf: reorder within group, or move to different group
    if (!activeIdStr.startsWith('group::')) {
      const fromIdx = colors.findIndex((c) => c._id === activeIdStr);
      const toIdx = colors.findIndex((c) => c._id === overId);
      if (fromIdx < 0 || toIdx < 0) return;
      const fromGroup = colors[fromIdx].name.split('/').slice(0, -1).join('/');
      const toGroup = colors[toIdx].name.split('/').slice(0, -1).join('/');
      if (fromGroup === toGroup) {
        moveColor(fromIdx, toIdx);
      } else {
        const localName = colors[fromIdx].name.split('/').pop()!;
        setColor(fromIdx, 'name', toGroup ? `${toGroup}/${localName}` : localName);
      }
    }
  }

  function renameGroup(fullPath: string, newSegment: string) {
    const parentPath = fullPath.includes('/') ? fullPath.slice(0, fullPath.lastIndexOf('/')) : '';
    const newPath = parentPath ? `${parentPath}/${newSegment}` : newSegment;
    colors.forEach((c, idx) => {
      if (c.name === fullPath || c.name.startsWith(fullPath + '/'))
        setColor(idx, 'name', newPath + c.name.slice(fullPath.length));
    });
    setCollapsed((prev) => {
      const next = { ...prev };
      if (fullPath in next) {
        next[newPath] = next[fullPath];
        delete next[fullPath];
      }
      return next;
    });
  }

  function ungroup(fullPath: string) {
    const parentPath = fullPath.includes('/') ? fullPath.slice(0, fullPath.lastIndexOf('/')) : '';
    colors.forEach((c, idx) => {
      if (c.name === fullPath || c.name.startsWith(fullPath + '/')) {
        const rest = c.name.slice(fullPath.length + 1);
        setColor(idx, 'name', parentPath ? `${parentPath}/${rest}` : rest);
      }
    });
  }

  function addChild(fullPath: string) {
    useAppStore.getState().addColorWith(`${fullPath}/New`, '#888888', '');
  }

  const renderColorLeaf = useCallback(
    (
      color: (typeof committed)[number],
      idx: number,
      selected: boolean,
      onToggleSel: (id: string, meta: boolean) => void,
    ) => (
      <SortableLeafWrapper
        key={color._id}
        id={color._id}
        selected={selected}
        onToggleSelect={onToggleSel}
        renderContent={(listeners, attributes) => (
          <div draggable={false} onDragStart={(e) => e.preventDefault()}>
            <ColorGroupCard color={color} idx={idx} dragListeners={listeners} dragAttributes={attributes} />
          </div>
        )}
      />
    ),
    [],
  );

  const activeColor = !activeGroupPath && activeId ? colors.find((c) => c._id === activeId) : null;
  const activeGroupSegment = activeGroupPath?.split('/').pop();

  return (
    <div ref={containerRef} className="relative">
      <DndContext
        id={dndId}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver as any}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <TreeRenderer
            nodes={tree}
            collapsed={collapsed}
            overGroupPath={overGroupPath}
            activeGroupPath={activeGroupPath}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggle={(p) => setCollapsed((prev) => ({ ...prev, [p]: !prev[p] }))}
            onRenameGroup={renameGroup}
            onAddChild={addChild}
            onUngroup={ungroup}
            renderLeaf={renderColorLeaf}
            depth={0}
          />
        </SortableContext>
        <DragOverlay>
          {activeColor && (
            <div className="px-3 py-2 rounded-[10px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-primary">
              {activeColor.name}
            </div>
          )}
          {activeGroupSegment && (
            <div className="px-3 py-1.5 rounded-[8px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-secondary flex items-center gap-1.5">
              <span className="text-text-dim text-[10px]">
                {committed.filter((c) => c.name.startsWith(activeGroupPath! + '/')).length}
              </span>
              {activeGroupSegment}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedIds.size > 0 && (
        <MultiSelectToolbar
          count={selectedIds.size}
          onGroup={() => {
            colors.forEach((c, i) => {
              if (!selectedIds.has(c._id)) return;
              setColor(i, 'name', `Untitled/${c.name.split('/').pop()!}`);
            });
            setSelectedIds(new Set());
          }}
          onUngroup={() => {
            colors.forEach((c, i) => {
              if (!selectedIds.has(c._id)) return;
              setColor(i, 'name', c.name.split('/').pop()!);
            });
            setSelectedIds(new Set());
          }}
          onDelete={() => {
            const idxs = colors
              .map((c, i) => (selectedIds.has(c._id) ? i : -1))
              .filter((i) => i >= 0)
              .reverse();
            idxs.forEach((i) => useAppStore.getState().removeColor(i));
            setSelectedIds(new Set());
          }}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ColorsScreen() {
  const colors = useAppStore((s) => s.appState.colors);
  const addColor = useAppStore((s) => s.addColor);
  const addColorWith = useAppStore((s) => s.addColorWith);
  const moveColor = useAppStore((s) => s.moveColor);
  const setColor = useAppStore((s) => s.setColor);

  const [showSuggest, setShowSuggest] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const hasGroups = colors.some((c) => c.name.includes('/'));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (e.key === 'Escape' && selectedIds.size > 0) { e.preventDefault(); setSelectedIds(new Set()); return; }
      if (!(e.metaKey || e.ctrlKey) || selectedIds.size === 0) return;
      if (e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        colors.forEach((c, i) => { if (selectedIds.has(c._id)) setColor(i, 'name', c.name.split('/').pop()!); });
        setSelectedIds(new Set());
      } else if (e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        colors.forEach((c, i) => { if (selectedIds.has(c._id)) setColor(i, 'name', `Untitled/${c.name.split('/').pop()!}`); });
        setSelectedIds(new Set());
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, colors, setColor]);

  function handleDragEnd(event: DragEndEvent) {
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
    <div ref={containerRef} className="flex flex-col gap-3 p-3 relative">
      {showSuggest && (
        <ColorSuggestSheet
          existingNames={colors.map((c) => c.name)}
          onPick={handlePick}
          onBlank={() => { addColor(); setShowSuggest(false); }}
          onClose={() => setShowSuggest(false)}
        />
      )}
      {colors.length === 0 ? (
        <EmptyState
          icon="🎨"
          title="No colors yet"
          description="Add a color to start building your scale."
          action={addBtn}
        />
      ) : hasGroups ? (
        <>
          {addBtn}
          <ColorTree />
        </>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {addBtn}
          <SortableContext items={colors.map((c) => c._id)} strategy={verticalListSortingStrategy}>
            {colors.map((color, idx) => (
              <SortableColorCard key={color._id} color={color} idx={idx} selected={selectedIds.has(color._id)} onToggleSelect={toggleSelect} />
            ))}
          </SortableContext>
        </DndContext>
      )}
      {selectedIds.size > 0 && !hasGroups && (
        <MultiSelectToolbar
          count={selectedIds.size}
          onGroup={() => {
            colors.forEach((c, i) => { if (selectedIds.has(c._id)) setColor(i, 'name', `Untitled/${c.name.split('/').pop()!}`); });
            setSelectedIds(new Set());
          }}
          onUngroup={() => {
            colors.forEach((c, i) => { if (selectedIds.has(c._id)) setColor(i, 'name', c.name.split('/').pop()!); });
            setSelectedIds(new Set());
          }}
          onDelete={() => {
            const idxs = colors.map((c, i) => selectedIds.has(c._id) ? i : -1).filter((i) => i >= 0).reverse();
            idxs.forEach((i) => useAppStore.getState().removeColor(i));
            setSelectedIds(new Set());
          }}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
