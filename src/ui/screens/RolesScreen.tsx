import { useState, useId, useEffect, useRef, useCallback, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "../store/appStore";
import { RoleGroupCard } from "../components/cards/RoleGroupCard";
import { SplitActionButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Sheet } from "../components/Sheet";
import type { Role } from "../types/state";
import {
  buildTree,
  useCommittedNames,
  SortableLeafWrapper,
  TreeRenderer,
  MultiSelectToolbar,
  type TreeNode,
} from "../components/tree";

// ── Suggested roles ───────────────────────────────────────────────────────────

interface RoleSuggestion {
  name: string;
  shorthand: string;
  minContrast: number;
  variationTargets: number[];
  description: string;
}

const SUGGESTED_ROLES: RoleSuggestion[] = [
  { name: "Background",      shorthand: "bg",  minContrast: 1.05, variationTargets: [1, 1.05, 1.1, 1.2, 1.35],       description: "Page background" },
  { name: "Background/Alt",  shorthand: "bga", minContrast: 1.1,  variationTargets: [1.1, 1.2, 1.35, 1.5, 1.8],       description: "Alternate surface" },
  { name: "Surface",         shorthand: "sf",  minContrast: 1.15, variationTargets: [1.35, 1.5, 1.8, 2.2, 2.7],       description: "Cards, panels" },
  { name: "Surface/Raised",  shorthand: "sfr", minContrast: 1.25, variationTargets: [1.8, 2.2, 2.7, 3.2, 4],          description: "Elevated surfaces" },
  { name: "Border",          shorthand: "bd",  minContrast: 1.6,  variationTargets: [2.7, 3.2, 4, 4.8, 5.8],          description: "Dividers, borders" },
  { name: "Border/Strong",   shorthand: "bds", minContrast: 2.5,  variationTargets: [4, 4.8, 5.8, 7, 8.5],            description: "Strong borders" },
  { name: "Fill",            shorthand: "fi",  minContrast: 3,    variationTargets: [2.7, 4, 5.8, 8.5, 11.5],         description: "Icon fills, UI fills" },
  { name: "Fill/Strong",     shorthand: "fis", minContrast: 4.5,  variationTargets: [4, 5.8, 8.5, 11.5, 14.5],        description: "Accessible fills" },
  { name: "Text/Muted",      shorthand: "txm", minContrast: 3,    variationTargets: [7, 8.5, 10, 11.5, 13],           description: "Secondary text" },
  { name: "Text",            shorthand: "tx",  minContrast: 4.5,  variationTargets: [10, 11.5, 13, 14.5, 16],         description: "Body text" },
  { name: "Text/Strong",     shorthand: "txs", minContrast: 7,    variationTargets: [13, 14.5, 16, 17.5, 19],         description: "High contrast text" },
  { name: "Text/Inverse",    shorthand: "txi", minContrast: 4.5,  variationTargets: [1.1, 1.2, 1.35, 1.5, 1.8],      description: "Text on dark bg" },
  { name: "Interactive",     shorthand: "ia",  minContrast: 3,    variationTargets: [3.5, 4.5, 5.5, 7, 9],            description: "Buttons, links" },
  { name: "Focus",           shorthand: "fc",  minContrast: 3,    variationTargets: [3, 4.5, 5.5, 7, 9],              description: "Focus rings" },
];

interface RoleSuggestSheetProps {
  existingNames: string[];
  onPick: (r: RoleSuggestion) => void;
  onBlank: () => void;
  onClose: () => void;
}

function contrastLabel(c: number) {
  if (c >= 7) return 'AAA';
  if (c >= 4.5) return 'AA';
  if (c >= 3) return 'AA Lg';
  return `${c}:1`;
}

function RoleSuggestSheet({ existingNames, onPick, onBlank, onClose }: RoleSuggestSheetProps) {
  const available = SUGGESTED_ROLES.filter((r) => !existingNames.includes(r.name));
  return (
    <div className="fixed inset-0 z-40" style={{ background: 'var(--bg-scrim)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <Sheet open className="overflow-y-auto">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Suggested roles</span>
            <button className="text-[11px] text-accent cursor-pointer hover:underline" onClick={onBlank}>+ Custom</button>
          </div>
          {available.length === 0 ? (
            <div className="px-4 py-6 text-center text-[11px] text-text-muted">All suggestions already added.</div>
          ) : (
            <div className="flex flex-col overflow-y-auto">
              {available.map((r) => (
                <button
                  key={r.name}
                  onClick={() => onPick(r)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover transition-colors cursor-pointer text-left border-b border-border-subtle last:border-0"
                >
                  <div className="shrink-0 w-10 text-center">
                    <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-[4px] bg-bg-card border border-border-base text-text-muted uppercase">{contrastLabel(r.minContrast)}</span>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[12px] font-semibold text-text-primary truncate">{r.name}</span>
                    <span className="text-[10px] text-text-muted">{r.description} · min {r.minContrast}:1</span>
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

function SortableRoleCard({ role, idx }: { role: Role; idx: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: role._id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
      }}
      {...attributes}
      {...listeners}
    >
      <RoleGroupCard role={role} idx={idx} />
    </div>
  );
}

// ── RoleTree (grouped view) ───────────────────────────────────────────────────

function RoleTree() {
  const roles    = useAppStore((s) => s.appState.roles);
  const moveRole = useAppStore((s) => s.moveRole);
  const setRole  = useAppStore((s) => s.setRole);
  const [committed, flushCommitted] = useCommittedNames(roles);
  const [collapsed, setCollapsed]         = useState<Record<string, boolean>>({});
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [overGroupPath, setOverGroupPath] = useState<string | null>(null);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const dndId = useId();

  function toggleSelect(id: string, _meta: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ⌘G — group selected; ⌘⇧G — ungroup
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

  function collectVisibleIds(nodes: TreeNode<typeof committed[number]>[], dragging: boolean): string[] {
    const ids: string[] = [];
    for (const n of nodes) {
      if (n.kind === "leaf") { ids.push(n.item._id); }
      else {
        ids.push(`group::${n.fullPath}`);
        if (dragging || !(collapsed[n.fullPath] ?? false))
          ids.push(...collectVisibleIds(n.children, dragging));
      }
    }
    return ids;
  }
  const allIds = useMemo(
    () => collectVisibleIds(tree, activeId !== null),
    [tree, collapsed, activeId],
  );

  const activeGroupPath = activeId?.startsWith("group::") ? activeId.slice(7) : null;

  function handleDragStart(e: DragStartEvent) {
    flushCommitted();
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: { over: { id: string } | null }) {
    if (!e.over) { setOverGroupPath(null); return; }
    const id = e.over.id as string;
    setOverGroupPath(id.startsWith("group::") ? id.slice(7) : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverGroupPath(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overId      = over.id as string;

    // group → group
    if (activeIdStr.startsWith("group::") && overId.startsWith("group::")) {
      const srcPath    = activeIdStr.slice(7);
      const targetPath = overId.slice(7);
      if (targetPath === srcPath || targetPath.startsWith(srcPath + "/")) return;
      const srcSegment = srcPath.includes("/") ? srcPath.split("/").pop()! : srcPath;
      const newBase    = `${targetPath}/${srcSegment}`;
      roles.forEach((r, idx) => {
        if (r.name === srcPath || r.name.startsWith(srcPath + "/"))
          setRole(idx, "name", newBase + r.name.slice(srcPath.length));
      });
      return;
    }

    // leaf → group
    if (overId.startsWith("group::")) {
      const fromIdx = roles.findIndex((r) => r._id === activeIdStr);
      if (fromIdx < 0) return;
      const targetPath = overId.slice(7);
      const localName  = roles[fromIdx].name.split("/").pop()!;
      setRole(fromIdx, "name", `${targetPath}/${localName}`);
      return;
    }

    // leaf → leaf
    if (!activeIdStr.startsWith("group::")) {
      const fromIdx = roles.findIndex((r) => r._id === activeIdStr);
      const toIdx   = roles.findIndex((r) => r._id === overId);
      if (fromIdx < 0 || toIdx < 0) return;
      const fromGroup = roles[fromIdx].name.split("/").slice(0, -1).join("/");
      const toGroup   = roles[toIdx].name.split("/").slice(0, -1).join("/");
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
    const newPath    = parentPath ? `${parentPath}/${newSegment}` : newSegment;
    roles.forEach((r, idx) => {
      if (r.name === fullPath || r.name.startsWith(fullPath + "/"))
        setRole(idx, "name", newPath + r.name.slice(fullPath.length));
    });
    setCollapsed((prev) => {
      const next = { ...prev };
      if (fullPath in next) { next[newPath] = next[fullPath]; delete next[fullPath]; }
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
    useAppStore.getState().addRoleWith(`${fullPath}/New`, "", 4.5, [500]);
  }

  const renderRoleLeaf = useCallback((role: typeof committed[number], idx: number, selected: boolean, onToggleSel: (id: string, meta: boolean) => void) => (
    <SortableLeafWrapper key={role._id} id={role._id} selected={selected} onToggleSelect={onToggleSel}
      renderContent={(listeners, attributes) => (
        <div draggable={false} onDragStart={(e) => e.preventDefault()}>
          <RoleGroupCard role={role} idx={idx} dragListeners={listeners} dragAttributes={attributes} />
        </div>
      )}
    />
  ), []);

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
          {activeRole && (
            <div className="px-3 py-2 rounded-[10px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-primary">
              {activeRole.name}
            </div>
          )}
          {activeGroupSegment && (
            <div className="px-3 py-1.5 rounded-[8px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-secondary flex items-center gap-1.5">
              <span className="text-text-dim text-[10px]">{committed.filter(r => r.name.startsWith(activeGroupPath! + "/")).length}</span>
              {activeGroupSegment}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedIds.size > 0 && (
        <MultiSelectToolbar
          count={selectedIds.size}
          onGroup={() => { roles.forEach((r, i) => { if (!selectedIds.has(r._id)) return; setRole(i, "name", `Untitled/${r.name.split("/").pop()!}`); }); setSelectedIds(new Set()); }}
          onUngroup={() => { roles.forEach((r, i) => { if (!selectedIds.has(r._id)) return; setRole(i, "name", r.name.split("/").pop()!); }); setSelectedIds(new Set()); }}
          onDelete={() => { const idxs = roles.map((r, i) => selectedIds.has(r._id) ? i : -1).filter(i => i >= 0).reverse(); idxs.forEach(i => useAppStore.getState().removeRole(i)); setSelectedIds(new Set()); }}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function RolesScreen() {
  const roles       = useAppStore((s) => s.appState.roles);
  const addRole     = useAppStore((s) => s.addRole);
  const addRoleWith = useAppStore((s) => s.addRoleWith);
  const moveRole    = useAppStore((s) => s.moveRole);

  const [showSuggest, setShowSuggest] = useState(false);

  const hasGroups = roles.some(r => r.name.includes("/"));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = roles.findIndex((r) => r._id === active.id);
    const to = roles.findIndex((r) => r._id === over.id);
    if (from !== -1 && to !== -1) moveRole(from, to);
  }

  function handlePick(r: RoleSuggestion) {
    addRoleWith(r.name, r.shorthand, r.minContrast, r.variationTargets);
    setShowSuggest(false);
  }

  const addBtn = (
    <SplitActionButton
      label="+ Add Role"
      onAdd={addRole}
      onPick={() => setShowSuggest(true)}
    />
  );

  return (
    <div className="flex flex-col gap-9 p-3 relative">
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
          <RoleTree />
        </>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {addBtn}
          <SortableContext items={roles.map((r) => r._id)} strategy={verticalListSortingStrategy}>
            {roles.map((role, idx) => (
              <SortableRoleCard key={role._id} role={role} idx={idx} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
