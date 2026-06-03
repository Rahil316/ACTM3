import { useState, useId, useEffect, useRef, useCallback, useMemo } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Settings, RefreshCw } from "lucide-react";
import { SplitActionButton, Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { SuggestSheet, MenuRow } from "../components/MenuSheet";
import { ColorSwatch } from "../components/ColorSwatch";
import { Badge } from "../components/Badge";
import { FieldLabel } from "../components/typography";
import { ColorGroupCard } from "../components/cards/ColorGroupCard";
import { RoleGroupCard } from "../components/cards/RoleGroupCard";
import { useProjectStore } from "../store/projectStore";
import { buildTree, useCommittedNames, SortableLeafWrapper, TreeRenderer, MultiSelectToolbar, type TreeNode } from "../components/tree";

// ── Section A — Role Scope Picker ─────────────────────────────────────────────

const MOCK_COLORS = [
  { _id: "c1", name: "Brand/Primary", hex: "#0066FF" },
  { _id: "c2", name: "Brand/Accent", hex: "#8B5CF6" },
  { _id: "c3", name: "Neutral/Gray", hex: "#6B7280" },
  { _id: "c4", name: "Neutral/Warm", hex: "#78716C" },
  { _id: "c5", name: "Color/Sky", hex: "#0EA5E9" },
];

function ScopeSheet({ scopedIds, onChange, onClose }: { scopedIds: string[] | null; onChange: (ids: string[] | null) => void; onClose: () => void }) {
  const isAll = scopedIds === null;
  const effectiveIds = isAll ? MOCK_COLORS.map((c) => c._id) : scopedIds;

  function toggleAll() {
    onChange(null);
  }

  function toggleColor(id: string) {
    const current = isAll ? MOCK_COLORS.map((c) => c._id) : [...scopedIds];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange(next.length === 0 || next.length === MOCK_COLORS.length ? null : next);
  }

  return (
    <SuggestSheet label="Scope to colors" onClose={onClose}>
      <MenuRow onClick={toggleAll}>
        <Checkbox checked={isAll} />
        <span className="text-[12px] font-medium text-text-primary">All colors</span>
      </MenuRow>
      {MOCK_COLORS.map((c) => (
        <MenuRow key={c._id} onClick={() => toggleColor(c._id)}>
          <Checkbox checked={effectiveIds.includes(c._id)} />
          <ColorSwatch color={c.hex} size="sm" radius="sm" />
          <span className="text-[12px] text-text-primary">{c.name}</span>
        </MenuRow>
      ))}
    </SuggestSheet>
  );
}

function SectionA() {
  const [scopedIds, setScopedIds] = useState<string[] | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const scopeLabel = scopedIds === null ? null : `${scopedIds.length} of ${MOCK_COLORS.length} colors`;

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Section A — Role Scope Picker</FieldLabel>

      <div className="rounded-[10px] border border-border-base bg-bg-card px-3 py-2.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[12px] font-semibold text-text-primary">Background</span>
          {scopeLabel && (
            <Badge variant="accent" size="xs" pill>
              {scopeLabel}
            </Badge>
          )}
          <button
            onClick={() => setShowSheet(true)}
            className={["w-6 h-6 rounded-[6px] flex items-center justify-center transition-colors cursor-pointer", showSheet || scopedIds !== null ? "text-accent bg-accent-subtle" : "text-text-muted hover:text-text-primary hover:bg-bg-hover"].join(" ")}
            title="Scope to colors"
          >
            <Settings size={12} strokeWidth={1.75} />
          </button>
        </div>
        <p className="text-[10px] text-text-muted">
          {scopedIds === null
            ? "Applied to all colors"
            : `Applied to: ${MOCK_COLORS.filter((c) => scopedIds.includes(c._id))
                .map((c) => c.name)
                .join(", ")}`}
        </p>
      </div>

      {showSheet && <ScopeSheet scopedIds={scopedIds} onChange={setScopedIds} onClose={() => setShowSheet(false)} />}
    </div>
  );
}

// ── Section B — Tree with real cards ─────────────────────────────────────────

const DEMO_COLORS = [
  { name: "Brand/Primary", value: "#0066FF", shorthand: "bp" },
  { name: "Brand/Accent", value: "#8B5CF6", shorthand: "ba" },
  { name: "Brand/Sub/Tint", value: "#BFDBFE", shorthand: "bt" },
  { name: "Neutral/Gray", value: "#6B7280", shorthand: "ng" },
  { name: "Neutral/Warm", value: "#78716C", shorthand: "nw" },
  { name: "Solo", value: "#F59E0B", shorthand: "sl" },
];

const DEMO_ROLES = [
  { name: "Surface/Default", shorthand: "sd", minContrast: 4.5, variationTargets: [300, 500, 700] },
  { name: "Surface/Subtle", shorthand: "ss", minContrast: 2.0, variationTargets: [100, 200] },
  { name: "Text/Primary", shorthand: "tp", minContrast: 7.0, variationTargets: [800, 900] },
  { name: "Text/Secondary", shorthand: "ts", minContrast: 4.5, variationTargets: [600, 700] },
  { name: "Standalone", shorthand: "sa", minContrast: 4.5, variationTargets: [500] },
];

function ColorTree() {
  const colors = useProjectStore((s) => s.projectStore.colors);
  const moveColor = useProjectStore((s) => s.moveColor);
  const setColor = useProjectStore((s) => s.setColor);
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

  // Cmd+G — group selected into "Untitled"
  // Cmd+Shift+G — ungroup selected (strip their group prefix)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (!(e.metaKey || e.ctrlKey) || selectedIds.size === 0) return;
      if (e.key === "g" && e.shiftKey) {
        e.preventDefault();
        colors.forEach((c, idx) => {
          if (!selectedIds.has(c._id)) return;
          const localName = c.name.split("/").pop()!;
          setColor(idx, "name", localName);
        });
        setSelectedIds(new Set());
      } else if (e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        colors.forEach((c, idx) => {
          if (!selectedIds.has(c._id)) return;
          const localName = c.name.split("/").pop()!;
          setColor(idx, "name", `Untitled/${localName}`);
        });
        setSelectedIds(new Set());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, colors, setColor]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const tree = useMemo(() => buildTree(committed), [committed]);

  // Only include IDs that are actually rendered (collapsed groups skip their children).
  // During a drag we include everything so the active item stays registered.
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

  function handleDragOver(e: { over: { id: string } | null }) {
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

    // ── Group dragged onto group ──────────────────────────────────────────────
    if (activeIdStr.startsWith("group::") && overId.startsWith("group::")) {
      const srcPath = activeIdStr.slice(7);
      const targetPath = overId.slice(7);
      // Don't nest a group into its own descendant
      if (targetPath === srcPath || targetPath.startsWith(srcPath + "/")) return;
      const srcSegment = srcPath.includes("/") ? srcPath.split("/").pop()! : srcPath;
      const newBase = `${targetPath}/${srcSegment}`;
      colors.forEach((c, idx) => {
        if (c.name === srcPath || c.name.startsWith(srcPath + "/")) {
          setColor(idx, "name", newBase + c.name.slice(srcPath.length));
        }
      });
      return;
    }

    // ── Leaf dragged onto group ───────────────────────────────────────────────
    if (overId.startsWith("group::")) {
      const fromIdx = colors.findIndex((c) => c._id === activeIdStr);
      if (fromIdx < 0) return;
      const targetPath = overId.slice(7);
      const localName = colors[fromIdx].name.split("/").pop()!;
      setColor(fromIdx, "name", `${targetPath}/${localName}`);
      return;
    }

    // ── Leaf dragged onto leaf ────────────────────────────────────────────────
    if (!activeIdStr.startsWith("group::")) {
      const fromIdx = colors.findIndex((c) => c._id === activeIdStr);
      const toIdx = colors.findIndex((c) => c._id === overId);
      if (fromIdx < 0 || toIdx < 0) return;
      const fromGroup = colors[fromIdx].name.split("/").slice(0, -1).join("/");
      const toGroup = colors[toIdx].name.split("/").slice(0, -1).join("/");
      if (fromGroup === toGroup) {
        moveColor(fromIdx, toIdx);
      } else {
        const localName = colors[fromIdx].name.split("/").pop()!;
        setColor(fromIdx, "name", toGroup ? `${toGroup}/${localName}` : localName);
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
    useProjectStore.getState().addColorWith(`${fullPath}/New`, "#888888", "");
  }

  const renderColorLeaf = useCallback(
    (color: (typeof committed)[number], idx: number, selected: boolean, _multiDragCount: number, onToggleSel: (id: string, meta: boolean, shift?: boolean) => void) => (
      <SortableLeafWrapper
        key={color._id}
        id={color._id}
        selected={selected}
        onToggleSelect={onToggleSel}
        renderContent={() => (
          <div draggable={false} onDragStart={(e) => e.preventDefault()}>
            <ColorGroupCard color={color} idx={idx} />
          </div>
        )}
      />
    ),
    [],
  );

  const activeColor = !activeGroupPath && activeId ? colors.find((c) => c._id === activeId) : null;
  const activeGroup = activeGroupPath ? committed.find((c) => c.name.startsWith(activeGroupPath + "/") || c.name === activeGroupPath) : null;
  const activeGroupSegment = activeGroupPath?.split("/").pop();

  return (
    <div ref={containerRef} className="relative">
      <DndContext id={dndId} sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver as any} onDragEnd={handleDragEnd}>
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <TreeRenderer
            nodes={tree}
            collapsed={collapsed}
            overGroupPath={overGroupPath}
            activeGroupPath={activeGroupPath}
            selectedIds={selectedIds}
            multiDragCount={0}
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
          {activeColor && <div className="px-3 py-2 rounded-[10px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-primary">{activeColor.name}</div>}
          {activeGroupSegment && (
            <div className="px-3 py-1.5 rounded-[8px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-secondary flex items-center gap-1.5">
              <span className="text-text-dim text-[10px]">{activeGroup ? committed.filter((c) => c.name.startsWith(activeGroupPath! + "/")).length : 0}</span>
              {activeGroupSegment}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Multi-select floating toolbar */}
      {selectedIds.size > 0 && (
        <MultiSelectToolbar
          count={selectedIds.size}
          onGroup={() => {
            colors.forEach((c, i) => {
              if (!selectedIds.has(c._id)) return;
              setColor(i, "name", `Untitled/${c.name.split("/").pop()!}`);
            });
            setSelectedIds(new Set());
          }}
          onUngroup={() => {
            colors.forEach((c, i) => {
              if (!selectedIds.has(c._id)) return;
              setColor(i, "name", c.name.split("/").pop()!);
            });
            setSelectedIds(new Set());
          }}
          onDelete={() => {
            const idxs = colors
              .map((c, i) => (selectedIds.has(c._id) ? i : -1))
              .filter((i) => i >= 0)
              .reverse();
            idxs.forEach((i) => useProjectStore.getState().removeColor(i));
            setSelectedIds(new Set());
          }}
          onClear={() => setSelectedIds(new Set())}
          onSelectAll={() => setSelectedIds(new Set(colors.map((c) => c._id)))}
        />
      )}
    </div>
  );
}

function RoleTree() {
  const roles = useProjectStore((s) => s.projectStore.roles);
  const moveRole = useProjectStore((s) => s.moveRole);
  const setRole = useProjectStore((s) => s.setRole);
  const [committed, flushCommitted] = useCommittedNames(roles);
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (!(e.metaKey || e.ctrlKey) || selectedIds.size === 0) return;
      if (e.key === "g" && e.shiftKey) {
        e.preventDefault();
        roles.forEach((r, idx) => {
          if (!selectedIds.has(r._id)) return;
          setRole(idx, "name", r.name.split("/").pop()!);
        });
        setSelectedIds(new Set());
      } else if (e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        roles.forEach((r, idx) => {
          if (!selectedIds.has(r._id)) return;
          setRole(idx, "name", `Untitled/${r.name.split("/").pop()!}`);
        });
        setSelectedIds(new Set());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, roles, setRole]);

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

  function handleDragOver(e: { over: { id: string } | null }) {
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

    if (activeIdStr.startsWith("group::") && overId.startsWith("group::")) {
      const srcPath = activeIdStr.slice(7);
      const targetPath = overId.slice(7);
      if (targetPath === srcPath || targetPath.startsWith(srcPath + "/")) return;
      const srcSegment = srcPath.includes("/") ? srcPath.split("/").pop()! : srcPath;
      const newBase = `${targetPath}/${srcSegment}`;
      roles.forEach((r, idx) => {
        if (r.name === srcPath || r.name.startsWith(srcPath + "/")) setRole(idx, "name", newBase + r.name.slice(srcPath.length));
      });
      return;
    }

    if (overId.startsWith("group::")) {
      const fromIdx = roles.findIndex((r) => r._id === activeIdStr);
      if (fromIdx < 0) return;
      const targetPath = overId.slice(7);
      const localName = roles[fromIdx].name.split("/").pop()!;
      setRole(fromIdx, "name", `${targetPath}/${localName}`);
      return;
    }

    if (!activeIdStr.startsWith("group::")) {
      const fromIdx = roles.findIndex((r) => r._id === activeIdStr);
      const toIdx = roles.findIndex((r) => r._id === overId);
      if (fromIdx < 0 || toIdx < 0) return;
      const fromGroup = roles[fromIdx].name.split("/").slice(0, -1).join("/");
      const toGroup = roles[toIdx].name.split("/").slice(0, -1).join("/");
      if (fromGroup === toGroup) {
        moveRole(fromIdx, toIdx);
      } else {
        const localName = roles[fromIdx].name.split("/").pop()!;
        setRole(fromIdx, "name", toGroup ? `${toGroup}/${localName}` : localName);
      }
    }
  }

  function renameGroup(fullPath: string, newSegment: string) {
    const parentPath = fullPath.includes("/") ? fullPath.slice(0, fullPath.lastIndexOf("/")) : "";
    const newPath = parentPath ? `${parentPath}/${newSegment}` : newSegment;
    roles.forEach((r, idx) => {
      if (r.name === fullPath || r.name.startsWith(fullPath + "/")) setRole(idx, "name", newPath + r.name.slice(fullPath.length));
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
    roles.forEach((r, idx) => {
      if (r.name === fullPath || r.name.startsWith(fullPath + "/")) {
        const rest = r.name.slice(fullPath.length + 1);
        setRole(idx, "name", parentPath ? `${parentPath}/${rest}` : rest);
      }
    });
  }

  function addChild(fullPath: string) {
    useProjectStore.getState().addRoleWith(`${fullPath}/New`, "", 4.5, [500]);
  }

  const renderRoleLeaf = useCallback(
    (role: (typeof committed)[number], idx: number, selected: boolean, _multiDragCount: number, onToggleSel: (id: string, meta: boolean, shift?: boolean) => void) => (
      <SortableLeafWrapper
        key={role._id}
        id={role._id}
        selected={selected}
        onToggleSelect={onToggleSel}
        renderContent={(listeners, attributes) => (
          /* pb-10 reserves space for the floating toolbar that sits below the card */
          <div className="pb-10" draggable={false} onDragStart={(e) => e.preventDefault()}>
            <RoleGroupCard role={role} idx={idx} dragListeners={listeners} dragAttributes={attributes} />
          </div>
        )}
      />
    ),
    [],
  );

  const activeRole = !activeGroupPath && activeId ? roles.find((r) => r._id === activeId) : null;
  const activeGroupSegment = activeGroupPath?.split("/").pop();

  return (
    <div ref={containerRef} className="relative">
      <DndContext id={dndId} sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver as any} onDragEnd={handleDragEnd}>
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <TreeRenderer
            nodes={tree}
            collapsed={collapsed}
            overGroupPath={overGroupPath}
            activeGroupPath={activeGroupPath}
            selectedIds={selectedIds}
            multiDragCount={0}
            onToggleSelect={toggleSelect}
            onToggle={(p) => setCollapsed((prev) => ({ ...prev, [p]: !prev[p] }))}
            onRenameGroup={renameGroup}
            onAddChild={addChild}
            onUngroup={ungroup}
            renderLeaf={renderRoleLeaf}
            depth={0}
          />
        </SortableContext>
        <DragOverlay>
          {activeRole && <div className="px-3 py-2 rounded-[10px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-primary">{activeRole.name}</div>}
          {activeGroupSegment && (
            <div className="px-3 py-1.5 rounded-[8px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-secondary flex items-center gap-1.5">
              <span className="text-text-dim text-[10px]">{committed.filter((r) => r.name.startsWith(activeGroupPath! + "/")).length}</span>
              {activeGroupSegment}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Multi-select floating toolbar */}
      {selectedIds.size > 0 && (
        <MultiSelectToolbar
          count={selectedIds.size}
          onGroup={() => {
            roles.forEach((r, i) => {
              if (!selectedIds.has(r._id)) return;
              setRole(i, "name", `Untitled/${r.name.split("/").pop()!}`);
            });
            setSelectedIds(new Set());
          }}
          onUngroup={() => {
            roles.forEach((r, i) => {
              if (!selectedIds.has(r._id)) return;
              setRole(i, "name", r.name.split("/").pop()!);
            });
            setSelectedIds(new Set());
          }}
          onDelete={() => {
            const idxs = roles
              .map((r, i) => (selectedIds.has(r._id) ? i : -1))
              .filter((i) => i >= 0)
              .reverse();
            idxs.forEach((i) => useProjectStore.getState().removeRole(i));
            setSelectedIds(new Set());
          }}
          onClear={() => setSelectedIds(new Set())}
          onSelectAll={() => setSelectedIds(new Set(roles.map((r) => r._id)))}
        />
      )}
    </div>
  );
}

// ── Suggestion sheets (mirrors ColorsScreen / RolesScreen) ───────────────────

const SUGGESTED_COLORS = [
  { name: "Brand/Primary", value: "#0066FF", shorthand: "bp" },
  { name: "Brand/Accent", value: "#8B5CF6", shorthand: "ba" },
  { name: "Brand/Warning", value: "#F59E0B", shorthand: "bw" },
  { name: "Brand/Danger", value: "#EF4444", shorthand: "bd" },
  { name: "Brand/Success", value: "#22C55E", shorthand: "bs" },
  { name: "Neutral/Gray", value: "#6B7280", shorthand: "ng" },
  { name: "Neutral/Warm", value: "#78716C", shorthand: "nw" },
  { name: "Neutral/Cool", value: "#64748B", shorthand: "nc" },
  { name: "Color/Sky", value: "#0EA5E9", shorthand: "cs" },
  { name: "Color/Teal", value: "#14B8A6", shorthand: "ct" },
  { name: "Color/Indigo", value: "#6366F1", shorthand: "ci" },
  { name: "Color/Pink", value: "#EC4899", shorthand: "cp" },
];

const SUGGESTED_ROLES = [
  { name: "Background", shorthand: "bg", minContrast: 1.05, variationTargets: [1, 1.05, 1.1, 1.2, 1.35] },
  { name: "Surface", shorthand: "sf", minContrast: 1.15, variationTargets: [1.35, 1.5, 1.8, 2.2, 2.7] },
  { name: "Border", shorthand: "bd", minContrast: 1.6, variationTargets: [2.7, 3.2, 4, 4.8, 5.8] },
  { name: "Fill", shorthand: "fi", minContrast: 3, variationTargets: [2.7, 4, 5.8, 8.5, 11.5] },
  { name: "Fill/Strong", shorthand: "fis", minContrast: 4.5, variationTargets: [4, 5.8, 8.5, 11.5, 14.5] },
  { name: "Text/Muted", shorthand: "txm", minContrast: 3, variationTargets: [7, 8.5, 10, 11.5, 13] },
  { name: "Text", shorthand: "tx", minContrast: 4.5, variationTargets: [10, 11.5, 13, 14.5, 16] },
  { name: "Text/Strong", shorthand: "txs", minContrast: 7, variationTargets: [13, 14.5, 16, 17.5, 19] },
  { name: "Interactive", shorthand: "ia", minContrast: 3, variationTargets: [3.5, 4.5, 5.5, 7, 9] },
  { name: "Focus", shorthand: "fc", minContrast: 3, variationTargets: [3, 4.5, 5.5, 7, 9] },
];

function ColorSuggestSheet({ existingNames, onPick, onBlank, onClose }: { existingNames: string[]; onPick: (c: (typeof SUGGESTED_COLORS)[number]) => void; onBlank: () => void; onClose: () => void }) {
  const available = SUGGESTED_COLORS.filter((c) => !existingNames.includes(c.name));
  return (
    <SuggestSheet label="Suggested colors" linkLabel="+ Custom" onLink={onBlank} onClose={onClose} empty={available.length === 0 ? <div className="px-4 py-6 text-center text-[11px] text-text-muted">All suggestions added.</div> : undefined}>
      {available.map((c) => (
        <MenuRow key={c.name} onClick={() => onPick(c)}>
          <ColorSwatch color={c.value} size="md" />
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-semibold text-text-primary truncate">{c.name}</span>
            <span className="text-[10px] text-text-muted font-mono">{c.value.toUpperCase()}</span>
          </div>
        </MenuRow>
      ))}
    </SuggestSheet>
  );
}

function RoleSuggestSheet({ existingNames, onPick, onBlank, onClose }: { existingNames: string[]; onPick: (r: (typeof SUGGESTED_ROLES)[number]) => void; onBlank: () => void; onClose: () => void }) {
  const available = SUGGESTED_ROLES.filter((r) => !existingNames.includes(r.name));
  return (
    <SuggestSheet label="Suggested roles" linkLabel="+ Custom" onLink={onBlank} onClose={onClose} empty={available.length === 0 ? <div className="px-4 py-6 text-center text-[11px] text-text-muted">All suggestions added.</div> : undefined}>
      {available.map((r) => (
        <MenuRow key={r.name} onClick={() => onPick(r)}>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-semibold text-text-primary truncate">{r.name}</span>
            <span className="text-[10px] text-text-muted">
              {r.minContrast}:1 min contrast · {r.variationTargets.length} vars
            </span>
          </div>
        </MenuRow>
      ))}
    </SuggestSheet>
  );
}

// ── SectionB ──────────────────────────────────────────────────────────────────

function SectionB() {
  const colors = useProjectStore((s) => s.projectStore.colors);
  const roles = useProjectStore((s) => s.projectStore.roles);
  const addColor = useProjectStore((s) => s.addColor);
  const addColorWith = useProjectStore((s) => s.addColorWith);
  const addRole = useProjectStore((s) => s.addRole);
  const addRoleWith = useProjectStore((s) => s.addRoleWith);
  const removeColor = useProjectStore((s) => s.removeColor);
  const removeRole = useProjectStore((s) => s.removeRole);

  const [showColorSuggest, setShowColorSuggest] = useState(false);
  const [showRoleSuggest, setShowRoleSuggest] = useState(false);

  const hasDemo = colors.some((c) => DEMO_COLORS.some((d) => d.name === c.name)) || roles.some((r) => DEMO_ROLES.some((d) => d.name === r.name));

  function loadDemo() {
    for (let i = colors.length - 1; i >= 0; i--) {
      if (DEMO_COLORS.some((d) => d.name === colors[i].name)) removeColor(i);
    }
    for (let i = roles.length - 1; i >= 0; i--) {
      if (DEMO_ROLES.some((d) => d.name === roles[i].name)) removeRole(i);
    }
    DEMO_COLORS.forEach((c) => addColorWith(c.name, c.value, c.shorthand));
    DEMO_ROLES.forEach((r) => addRoleWith(r.name, r.shorthand, r.minContrast, r.variationTargets));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <FieldLabel>Section B — Tree with real cards</FieldLabel>
        <Button variant="underlined" size="xs" onClick={loadDemo} leftIcon={<RefreshCw size={10} strokeWidth={2.5} />} label={hasDemo ? "Reload demo data" : "Load demo data"} />
      </div>

      {colors.length > 0 && (
        <div className="flex flex-col gap-1">
          <FieldLabel className="px-1">Colors</FieldLabel>
          <ColorTree />
        </div>
      )}

      <SplitActionButton label="+ Add Color" onAdd={addColor} onPick={() => setShowColorSuggest(true)} />

      {roles.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <FieldLabel className="px-1">Roles</FieldLabel>
          <RoleTree />
        </div>
      )}

      <SplitActionButton label="+ Add Role" onAdd={addRole} onPick={() => setShowRoleSuggest(true)} />

      {showColorSuggest && (
        <ColorSuggestSheet
          existingNames={colors.map((c) => c.name)}
          onPick={(c) => {
            addColorWith(c.name, c.value, c.shorthand);
            setShowColorSuggest(false);
          }}
          onBlank={() => {
            addColor();
            setShowColorSuggest(false);
          }}
          onClose={() => setShowColorSuggest(false)}
        />
      )}
      {showRoleSuggest && (
        <RoleSuggestSheet
          existingNames={roles.map((r) => r.name)}
          onPick={(r) => {
            addRoleWith(r.name, r.shorthand, r.minContrast, r.variationTargets);
            setShowRoleSuggest(false);
          }}
          onBlank={() => {
            addRole();
            setShowRoleSuggest(false);
          }}
          onClose={() => setShowRoleSuggest(false)}
        />
      )}
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function TestLabScreen() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h2 className="text-[14px] font-bold text-text-primary mb-0.5">Test Lab</h2>
        <p className="text-[11px] text-text-muted">Design sandbox — store wired</p>
      </div>
      <SectionA />
      <div className="border-t border-border-subtle" />
      <SectionB />
    </div>
  );
}
