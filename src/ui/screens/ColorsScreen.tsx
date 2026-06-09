import { useState, useId, useEffect, useRef, useCallback, useMemo } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, DragOverlay, type DragOverEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectStore, deriveShorthand, groupedName } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { ColorGroupCard } from "../components/cards/ColorGroupCard";
import { SplitActionButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SuggestSheet, MenuRow } from "../components/MenuSheet";
import { ColorSwatch } from "../components/ColorSwatch";
import type { Color } from "../types/state";
import { buildTree, useCommittedNames, SortableLeafWrapper, TreeRenderer, MultiSelectToolbar, type TreeNode } from "../components";

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
    <SuggestSheet label="Suggested colors" linkLabel="+ Custom" onLink={onBlank} onClose={onClose} empty={available.length === 0 ? <div className="px-4 py-6 text-center text-[11px] text-text-muted">All suggestions already added.</div> : undefined}>
      {available.map((s) => (
        <MenuRow key={s.name} onClick={() => onPick(s.name, s.value, s.shorthand)}>
          <ColorSwatch color={s.value} size="md" />
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-semibold text-text-primary truncate">{s.name}</span>
            <span className="text-[10px] text-text-muted font-mono">
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
      <div style={selected ? { borderRadius: 12, outline: "2px solid var(--accent)", outlineOffset: 2, boxShadow: "0 0 0 4px var(--accent-glow)" } : undefined}>
        <ColorGroupCard color={color} idx={idx} dragListeners={listeners as Record<string, unknown>} dragAttributes={attributes as unknown as Record<string, unknown>} />
      </div>
    </div>
  );
}

// ── ColorTree (grouped view) ──────────────────────────────────────────────────

function ColorTree() {
  const colors = useProjectStore((s) => s.projectStore.colors);
  const moveColor = useProjectStore((s) => s.moveColor);
  const setColor = useProjectStore((s) => s.setColor);
  const committedColors = useMemo(() => colors.map((c) => ({ ...c, _id: c._id ?? "" })), [colors]);
  const [committed, flushCommitted] = useCommittedNames(committedColors);
  const collapsed = useUiStore((s) => s.colorGroupCollapsed);
  const setCollapsed = useUiStore((s) => s.setColorGroupCollapsed);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overGroupPath, setOverGroupPath] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dndId = useId();

  const handleGroup = useCallback(() => {
    const selectedNames = colors.filter((c) => c._id && selectedIds.has(c._id)).map((c) => c.name);
    colors.forEach((c, i) => {
      if (c._id && selectedIds.has(c._id)) setColor(i, "name", groupedName(c.name, selectedNames));
    });
    setSelectedIds(new Set());
  }, [colors, selectedIds, setColor]);

  const handleUngroup = useCallback(() => {
    colors.forEach((c, i) => {
      if (c._id && selectedIds.has(c._id)) setColor(i, "name", c.name.split("/").pop()!);
    });
    setSelectedIds(new Set());
  }, [colors, selectedIds, setColor]);

  const handleDelete = useCallback(() => {
    const idxs = colors
      .map((c, i) => (c._id && selectedIds.has(c._id) ? i : -1))
      .filter((i) => i >= 0)
      .reverse();
    idxs.forEach((i) => useProjectStore.getState().removeColor(i));
    setSelectedIds(new Set());
  }, [colors, selectedIds]);

  const handleClear = useCallback(() => setSelectedIds(new Set()), []);

  const handleSelectAll = useCallback(() => setSelectedIds(new Set(colors.map((c) => c._id ?? ""))), [colors]);

  function getTreeOrderIds() {
    function collectLeaves(nodes: TreeNode<(typeof committed)[number]>[]): string[] {
      return nodes.flatMap((n) => (n.kind === "leaf" ? [n.item._id] : collectLeaves(n.children)));
    }
    return collectLeaves(buildTree(committed));
  }

  function toggleSelect(id: string, meta: boolean, shift = false) {
    if (!meta && !shift) return;
    if (shift && lastSelectedRef.current) {
      // ⌘⇧+click — range select in visual tree order
      const orderedIds = getTreeOrderIds();
      const a = orderedIds.indexOf(lastSelectedRef.current);
      const b = orderedIds.indexOf(id);
      if (a !== -1 && b !== -1) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = lo; i <= hi; i++) next.add(orderedIds[i]);
          return next;
        });
        return;
      }
    }
    // ⌘+click — toggle individual item (enters multi-select mode)
    lastSelectedRef.current = id;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function collapseAll() {
    const tree = buildTree(committed);
    function collectPaths(nodes: TreeNode<(typeof committed)[number]>[]): string[] {
      return nodes.flatMap((n) => (n.kind === "group" ? [n.fullPath, ...collectPaths(n.children)] : []));
    }
    const paths = collectPaths(tree);
    setCollapsed((prev) => {
      const next = { ...prev };
      paths.forEach((p) => {
        next[p] = true;
      });
      return next;
    });
  }

  // ⌘G — group selected; ⌘⇧G — ungroup; Esc — clear; Alt+L — collapse all
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (e.key === "Escape" && selectedIds.size > 0) {
        e.preventDefault();
        setSelectedIds(new Set());
        return;
      }
      if (e.altKey && e.key === "l") {
        e.preventDefault();
        collapseAll();
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || selectedIds.size === 0) return;
      if (e.key === "g" && e.shiftKey) {
        e.preventDefault();
        colors.forEach((c, idx) => {
          if (!c._id || !selectedIds.has(c._id)) return;
          setColor(idx, "name", c.name.split("/").pop()!);
        });
        setSelectedIds(new Set());
      } else if (e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        const selectedNames = colors.filter((c) => c._id && selectedIds.has(c._id)).map((c) => c.name);
        colors.forEach((c, idx) => {
          if (!c._id || !selectedIds.has(c._id)) return;
          setColor(idx, "name", groupedName(c.name, selectedNames));
        });
        setSelectedIds(new Set());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, colors, setColor, committed]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const tree = useMemo(() => buildTree(committed), [committed]);

  function collectVisibleIds(nodes: TreeNode<(typeof committed)[number]>[], dragging: boolean): string[] {
    const ids: string[] = [];
    for (const n of nodes) {
      if (n.kind === "leaf") {
        ids.push(n.item._id);
      } else {
        ids.push(`group::${n.fullPath}`);
        if (dragging || !(collapsed[n.fullPath] ?? false)) ids.push(...collectVisibleIds(n.children, dragging));
      }
    }
    return ids;
  }
  const allIds = useMemo(() => collectVisibleIds(tree, activeId !== null), [tree, collapsed, activeId]);

  const activeGroupPath = activeId?.startsWith("group::") ? activeId.slice(7) : null;

  function handleDragStart(e: DragStartEvent) {
    flushCommitted();
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: DragOverEvent) {
    if (!e.over) {
      setOverGroupPath(null);
      return;
    }
    const id = e.over.id as string;
    setOverGroupPath(id.startsWith("group::") ? id.slice(7) : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverGroupPath(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overId = over.id as string;

    // group → group: bulk rename, guard against self-nesting
    if (activeIdStr.startsWith("group::") && overId.startsWith("group::")) {
      const srcPath = activeIdStr.slice(7);
      const targetPath = overId.slice(7);
      if (targetPath === srcPath || targetPath.startsWith(srcPath + "/")) return;
      const srcSegment = srcPath.includes("/") ? srcPath.split("/").pop()! : srcPath;
      const newBase = `${targetPath}/${srcSegment}`;
      colors.forEach((c, idx) => {
        if (c.name === srcPath || c.name.startsWith(srcPath + "/")) setColor(idx, "name", newBase + c.name.slice(srcPath.length));
      });
      return;
    }

    // leaf → group: move dragged item (+ all selected) into target group
    if (overId.startsWith("group::")) {
      const targetPath = overId.slice(7);
      const idsToMove = selectedIds.has(activeIdStr) ? [...selectedIds] : [activeIdStr];
      colors.forEach((c, idx) => {
        if (!c._id || !idsToMove.includes(c._id)) return;
        const localName = c.name.split("/").pop()!;
        setColor(idx, "name", `${targetPath}/${localName}`);
      });
      setSelectedIds(new Set());
      return;
    }

    // leaf → leaf: single reorder or cross-group move
    // Multi-select drag onto a leaf just moves the dragged item — don't bulk reorder
    if (!activeIdStr.startsWith("group::")) {
      const fromIdx = colors.findIndex((c) => c._id === activeIdStr);
      const toIdx = colors.findIndex((c) => c._id === overId);
      if (fromIdx < 0 || toIdx < 0) return;
      const fromGroup = colors[fromIdx].name.split("/").slice(0, -1).join("/");
      const toGroup = colors[toIdx].name.split("/").slice(0, -1).join("/");
      if (fromGroup === toGroup) {
        // If multi-selected, move all selected to follow the dragged item
        if (selectedIds.has(activeIdStr) && selectedIds.size > 1) {
          const idsToMove = [...selectedIds].filter((id) => id !== activeIdStr);
          idsToMove.forEach((id) => {
            const idx = colors.findIndex((c) => c._id === id);
            if (idx >= 0) setColor(idx, "name", colors[idx].name);
          });
          moveColor(fromIdx, toIdx);
        } else {
          moveColor(fromIdx, toIdx);
        }
      } else {
        // Cross-group: move dragged + all selected to the target group
        const idsToMove = selectedIds.has(activeIdStr) ? [...selectedIds] : [activeIdStr];
        colors.forEach((c, idx) => {
          if (!c._id || !idsToMove.includes(c._id)) return;
          const localName = c.name.split("/").pop()!;
          setColor(idx, "name", toGroup ? `${toGroup}/${localName}` : localName);
        });
        setSelectedIds(new Set());
      }
    }
  }

  function renameGroup(fullPath: string, newSegment: string) {
    const parentPath = fullPath.includes("/") ? fullPath.slice(0, fullPath.lastIndexOf("/")) : "";
    const newPath = parentPath ? `${parentPath}/${newSegment}` : newSegment;
    colors.forEach((c, idx) => {
      if (c.name === fullPath || c.name.startsWith(fullPath + "/")) setColor(idx, "name", newPath + c.name.slice(fullPath.length));
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
    const parentPath = fullPath.includes("/") ? fullPath.slice(0, fullPath.lastIndexOf("/")) : "";
    colors.forEach((c, idx) => {
      if (c.name === fullPath || c.name.startsWith(fullPath + "/")) {
        const rest = c.name.slice(fullPath.length + 1);
        setColor(idx, "name", parentPath ? `${parentPath}/${rest}` : rest);
      }
    });
  }

  function addChild(fullPath: string) {
    const prefixShort = fullPath
      .split("/")
      .filter(Boolean)
      .map((s) => deriveShorthand(s))
      .join("/");
    useProjectStore.getState().addColorWith(`${fullPath}/New`, "#888888", `${prefixShort}/${deriveShorthand("New")}`);
  }

  const renderColorLeaf = useCallback(
    (color: (typeof committed)[number], idx: number, selected: boolean, multiDragCount: number, onToggleSel: (id: string, meta: boolean, shift?: boolean) => void) => (
      <SortableLeafWrapper
        key={color._id}
        id={color._id}
        selected={selected}
        multiDragCount={multiDragCount}
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
  const activeGroupSegment = activeGroupPath?.split("/").pop();

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={() => {
        if (selectedIds.size > 0) setSelectedIds(new Set());
      }}
    >
      <DndContext id={dndId} sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
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
        <DragOverlay>
          {activeColor && (
            <div className="px-3 py-2 rounded-[10px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-primary flex items-center gap-2">
              {activeColor._id && selectedIds.has(activeColor._id) && selectedIds.size > 1 && <span className="bg-accent text-text-on-accent text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">{selectedIds.size}</span>}
              {activeColor.name.split("/").pop()}
            </div>
          )}
          {activeGroupSegment && (
            <div className="px-3 py-1.5 rounded-[8px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-secondary flex items-center gap-1.5">
              <span className="text-text-dim text-[10px]">{committed.filter((c) => c.name.startsWith(activeGroupPath! + "/")).length}</span>
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

  const [showSuggest, setShowSuggest] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasGroups = colors.some((c) => c.name.includes("/"));

  const handleGroup = useCallback(() => {
    const selectedNames = colors.filter((c) => c._id && selectedIds.has(c._id)).map((c) => c.name);
    colors.forEach((c, i) => {
      if (c._id && selectedIds.has(c._id)) setColor(i, "name", groupedName(c.name, selectedNames));
    });
    setSelectedIds(new Set());
  }, [colors, selectedIds, setColor]);

  const handleUngroup = useCallback(() => {
    colors.forEach((c, i) => {
      if (c._id && selectedIds.has(c._id)) setColor(i, "name", c.name.split("/").pop()!);
    });
    setSelectedIds(new Set());
  }, [colors, selectedIds, setColor]);

  const handleDelete = useCallback(() => {
    const idxs = colors
      .map((c, i) => (c._id && selectedIds.has(c._id) ? i : -1))
      .filter((i) => i >= 0)
      .reverse();
    idxs.forEach((i) => useProjectStore.getState().removeColor(i));
    setSelectedIds(new Set());
  }, [colors, selectedIds]);

  const handleClear = useCallback(() => setSelectedIds(new Set()), []);

  const handleSelectAll = useCallback(() => setSelectedIds(new Set(colors.map((c) => c._id ?? ""))), [colors]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function toggleSelect(id: string, meta = false, shift = false) {
    if (!meta) {
      lastSelectedRef.current = id;
      setSelectedIds(new Set([id]));
      return;
    }
    if (shift && lastSelectedRef.current) {
      const flatIds = colors.map((c) => c._id ?? "");
      const a = flatIds.indexOf(lastSelectedRef.current);
      const b = flatIds.indexOf(id);
      if (a !== -1 && b !== -1) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = lo; i <= hi; i++) next.add(flatIds[i]);
          return next;
        });
        return;
      }
    }
    lastSelectedRef.current = id;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (e.key === "Escape" && selectedIds.size > 0) {
        e.preventDefault();
        setSelectedIds(new Set());
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || selectedIds.size === 0) return;
      if (e.key === "g" && e.shiftKey) {
        e.preventDefault();
        colors.forEach((c, i) => {
          if (c._id && selectedIds.has(c._id)) setColor(i, "name", c.name.split("/").pop()!);
        });
        setSelectedIds(new Set());
      } else if (e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        const selectedNames = colors.filter((c) => c._id && selectedIds.has(c._id)).map((c) => c.name);
        colors.forEach((c, i) => {
          if (c._id && selectedIds.has(c._id)) setColor(i, "name", groupedName(c.name, selectedNames));
        });
        setSelectedIds(new Set());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    <div
      ref={containerRef}
      className="flex flex-col gap-3 p-3 relative"
      onClick={() => {
        if (selectedIds.size > 0) setSelectedIds(new Set());
      }}
    >
      {showSuggest && (
        <ColorSuggestSheet
          existingNames={colors.map((c) => c.name)}
          onPick={handlePick}
          onBlank={() => {
            addColor();
            setShowSuggest(false);
          }}
          onClose={() => setShowSuggest(false)}
        />
      )}
      {colors.length === 0 ? (
        <EmptyState icon="🎨" title="No colors yet" description="Add a color to start building your scale." action={addBtn} />
      ) : hasGroups ? (
        <>
          {addBtn}
          <ColorTree />
        </>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
