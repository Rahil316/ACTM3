import { useState, useId, useEffect, useRef, useCallback, useMemo } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, DragOverlay, type DragOverEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectStore, deriveShorthand, groupedName } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { SuggestSheet, MenuRow } from "../components/MenuSheet";
import { RoleGroupCard } from "../components/cards/RoleGroupCard";
import { SplitActionButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import type { Role } from "../types/state";
import { buildTree, useCommittedNames, SortableLeafWrapper, TreeRenderer, MultiSelectToolbar, type TreeNode } from "../components/Tree";

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
    <SuggestSheet label="Suggested roles" linkLabel="+ Custom" onLink={onBlank} onClose={onClose} empty={available.length === 0 ? <div className="px-4 py-6 text-center text-[11px] text-text-muted">All suggestions already added.</div> : undefined}>
      {available.map((r) => (
        <MenuRow key={r.name} onClick={() => onPick(r)}>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-semibold text-text-primary truncate">{r.name}</span>
            <span className="text-[10px] text-text-muted">{r.description}</span>
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
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) return;
        e.stopPropagation();
        onToggleSelect(role._id ?? "", e.metaKey || e.ctrlKey, e.shiftKey);
      }}
    >
      <div style={selected ? { borderRadius: 12, outline: "2px solid var(--accent)", outlineOffset: 2, boxShadow: "0 0 0 4px var(--accent-glow)" } : undefined}>
        <RoleGroupCard role={role} idx={idx} dragListeners={listeners as Record<string, unknown>} dragAttributes={attributes as unknown as Record<string, unknown>} />
      </div>
    </div>
  );
}

// ── RoleTree (grouped view) ───────────────────────────────────────────────────

function RoleTree() {
  const roles = useProjectStore((s) => s.projectStore.roles);
  const moveRole = useProjectStore((s) => s.moveRole);
  const setRole = useProjectStore((s) => s.setRole);
  const committedRoles = useMemo(() => roles.map((r) => ({ ...r, _id: r._id ?? "" })), [roles]);
  const [committed, flushCommitted] = useCommittedNames(committedRoles);
  const collapsed = useUiStore((s) => s.roleGroupCollapsed);
  const setCollapsed = useUiStore((s) => s.setRoleGroupCollapsed);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overGroupPath, setOverGroupPath] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dndId = useId();

  const handleGroup = useCallback(() => {
    const selectedNames = roles.filter((r) => r._id && selectedIds.has(r._id)).map((r) => r.name);
    roles.forEach((r, i) => {
      if (r._id && selectedIds.has(r._id)) setRole(i, "name", groupedName(r.name, selectedNames));
    });
    setSelectedIds(new Set());
  }, [roles, selectedIds, setRole]);

  const handleUngroup = useCallback(() => {
    roles.forEach((r, i) => {
      if (r._id && selectedIds.has(r._id)) setRole(i, "name", r.name.split("/").pop()!);
    });
    setSelectedIds(new Set());
  }, [roles, selectedIds, setRole]);

  const handleDelete = useCallback(() => {
    const idxs = roles
      .map((r, i) => (r._id && selectedIds.has(r._id) ? i : -1))
      .filter((i) => i >= 0)
      .reverse();
    idxs.forEach((i) => useProjectStore.getState().removeRole(i));
    setSelectedIds(new Set());
  }, [roles, selectedIds]);

  const handleClear = useCallback(() => setSelectedIds(new Set()), []);

  const handleSelectAll = useCallback(() => setSelectedIds(new Set(roles.map((r) => r._id ?? ""))), [roles]);

  function getTreeOrderIds() {
    function collectLeaves(nodes: TreeNode<(typeof committed)[number]>[]): string[] {
      return nodes.flatMap((n) => (n.kind === "leaf" ? [n.item._id] : collectLeaves(n.children)));
    }
    return collectLeaves(buildTree(committed));
  }

  function toggleSelect(id: string, meta: boolean, shift = false) {
    if (!meta && !shift) return;
    if (shift && lastSelectedRef.current) {
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
        roles.forEach((r, idx) => {
          if (!r._id || !selectedIds.has(r._id)) return;
          setRole(idx, "name", r.name.split("/").pop()!);
        });
        setSelectedIds(new Set());
      } else if (e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        const selectedNames = roles.filter((r) => r._id && selectedIds.has(r._id)).map((r) => r.name);
        roles.forEach((r, idx) => {
          if (!r._id || !selectedIds.has(r._id)) return;
          setRole(idx, "name", groupedName(r.name, selectedNames));
        });
        setSelectedIds(new Set());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, roles, setRole, committed]);

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

    // group → group
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

    // leaf → group: move dragged item (+ all selected) into target group
    if (overId.startsWith("group::")) {
      const targetPath = overId.slice(7);
      const idsToMove = selectedIds.has(activeIdStr) ? [...selectedIds] : [activeIdStr];
      roles.forEach((r, idx) => {
        if (!r._id || !idsToMove.includes(r._id)) return;
        const localName = r.name.split("/").pop()!;
        setRole(idx, "name", `${targetPath}/${localName}`);
      });
      setSelectedIds(new Set());
      return;
    }

    // leaf → leaf: single reorder or cross-group move
    if (!activeIdStr.startsWith("group::")) {
      const fromIdx = roles.findIndex((r) => r._id === activeIdStr);
      const toIdx = roles.findIndex((r) => r._id === overId);
      if (fromIdx < 0 || toIdx < 0) return;
      const fromGroup = roles[fromIdx].name.split("/").slice(0, -1).join("/");
      const toGroup = roles[toIdx].name.split("/").slice(0, -1).join("/");
      if (fromGroup === toGroup) {
        moveRole(fromIdx, toIdx);
      } else {
        const idsToMove = selectedIds.has(activeIdStr) ? [...selectedIds] : [activeIdStr];
        roles.forEach((r, idx) => {
          if (!r._id || !idsToMove.includes(r._id)) return;
          const localName = r.name.split("/").pop()!;
          setRole(idx, "name", toGroup ? `${toGroup}/${localName}` : localName);
        });
        setSelectedIds(new Set());
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
    const prefixShort = fullPath
      .split("/")
      .filter(Boolean)
      .map((s) => deriveShorthand(s))
      .join("/");
    useProjectStore.getState().addRoleWith(`${fullPath}/New`, `${prefixShort}/${deriveShorthand("New")}`);
  }

  const renderRoleLeaf = useCallback(
    (role: (typeof committed)[number], idx: number, selected: boolean, multiDragCount: number, onToggleSel: (id: string, meta: boolean, shift?: boolean) => void) => (
      <SortableLeafWrapper
        key={role._id}
        id={role._id}
        selected={selected}
        multiDragCount={multiDragCount}
        onToggleSelect={onToggleSel}
        renderContent={(listeners, attributes) => (
          <div draggable={false} onDragStart={(e) => e.preventDefault()}>
            <RoleGroupCard role={role} idx={idx} dragListeners={listeners} dragAttributes={attributes} />
          </div>
        )}
      />
    ),
    [committed],
  );

  const activeRole = !activeGroupPath && activeId ? roles.find((r) => r._id === activeId) : null;
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
            renderLeaf={renderRoleLeaf}
            depth={0}
          />
        </SortableContext>
        <DragOverlay>
          {activeRole && (
            <div className="px-3 py-2 rounded-[10px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-primary flex items-center gap-2">
              {activeRole._id && selectedIds.has(activeRole._id) && selectedIds.size > 1 && <span className="bg-accent text-text-on-accent text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">{selectedIds.size}</span>}
              {activeRole.name.split("/").pop()}
            </div>
          )}
          {activeGroupSegment && (
            <div className="px-3 py-1.5 rounded-[8px] border border-accent bg-bg-card shadow-xl text-[12px] font-semibold text-text-secondary flex items-center gap-1.5">
              <span className="text-text-dim text-[10px]">{committed.filter((r) => r.name.startsWith(activeGroupPath! + "/")).length}</span>
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

  const [showSuggest, setShowSuggest] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasGroups = roles.some((r) => r.name.includes("/"));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function toggleSelect(id: string, meta = false, shift = false) {
    if (!meta && !shift) return;
    if (shift && lastSelectedRef.current) {
      const flatIds = roles.map((r) => r._id ?? "");
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
        roles.forEach((r, i) => {
          if (r._id && selectedIds.has(r._id)) setRole(i, "name", r.name.split("/").pop()!);
        });
        setSelectedIds(new Set());
      } else if (e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        const selectedNames = roles.filter((r) => r._id && selectedIds.has(r._id)).map((r) => r.name);
        roles.forEach((r, i) => {
          if (r._id && selectedIds.has(r._id)) setRole(i, "name", groupedName(r.name, selectedNames));
        });
        setSelectedIds(new Set());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, roles, setRole]);

  function handleDragEnd(event: DragEndEvent) {
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
      onClick={() => {
        if (selectedIds.size > 0) setSelectedIds(new Set());
      }}
    >
      {showSuggest && (
        <RoleSuggestSheet
          existingNames={roles.map((r) => r.name)}
          onPick={handlePick}
          onBlank={() => {
            addRole();
            setShowSuggest(false);
          }}
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
          <SortableContext items={roles.map((r) => r._id ?? "")} strategy={verticalListSortingStrategy}>
            {roles.map((role, idx) => (
              <SortableRoleCard key={role._id} role={role} idx={idx} selected={selectedIds.has(role._id ?? "")} onToggleSelect={toggleSelect} />
            ))}
          </SortableContext>
        </DndContext>
      )}
      {selectedIds.size > 0 && !hasGroups && (
        <MultiSelectToolbar
          count={selectedIds.size}
          onGroup={() => {
            const selectedNames = roles.filter((r) => r._id && selectedIds.has(r._id)).map((r) => r.name);
            roles.forEach((r, i) => {
              if (r._id && selectedIds.has(r._id)) setRole(i, "name", groupedName(r.name, selectedNames));
            });
            setSelectedIds(new Set());
          }}
          onUngroup={() => {
            roles.forEach((r, i) => {
              if (r._id && selectedIds.has(r._id)) setRole(i, "name", r.name.split("/").pop()!);
            });
            setSelectedIds(new Set());
          }}
          onDelete={() => {
            const idxs = roles
              .map((r, i) => (r._id && selectedIds.has(r._id) ? i : -1))
              .filter((i) => i >= 0)
              .reverse();
            idxs.forEach((i) => useProjectStore.getState().removeRole(i));
            setSelectedIds(new Set());
          }}
          onClear={() => setSelectedIds(new Set())}
          onSelectAll={() => setSelectedIds(new Set(roles.map((r) => r._id ?? "")))}
        />
      )}
    </div>
  );
}
