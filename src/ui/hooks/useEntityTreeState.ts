import { useState, useRef, useEffect, useCallback, useMemo, useId } from "react";
import { useSensor, useSensors, PointerSensor, type DragStartEvent, type DragOverEvent, type DragEndEvent } from "@dnd-kit/core";
import { buildTree, useCommittedNames, type TreeNode } from "../components/Tree";
import { groupedName } from "../store/projectStore";
import { ROOT_ZONE_IDS } from "../components/Tree";

export type EntityTreeStateReturn<T extends { _id?: string; name: string }> = ReturnType<typeof useEntityTreeState<T>>;

export interface EntityTreeStateOptions<T extends { _id?: string; name: string }> {
  items: T[];
  setName: (idx: number, name: string) => void;
  move: (from: number, to: number) => void;
  remove: (idx: number) => void;
  addChild: (fullPath: string) => void;
  collapsed: Record<string, boolean>;
  setCollapsed: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

export function useEntityTreeState<T extends { _id?: string; name: string }>({
  items,
  setName,
  move,
  remove,
  addChild,
  collapsed,
  setCollapsed,
}: EntityTreeStateOptions<T>) {
  const committedItems = useMemo(() => items.map((item) => ({ ...item, _id: item._id ?? "" })), [items]);
  const [committed, flushCommitted] = useCommittedNames(committedItems);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overGroupPath, setOverGroupPath] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dndId = useId();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const tree = useMemo(() => buildTree(committed), [committed]);

  // ── Selection ────────────────────────────────────────────────────────────────

  function getTreeOrderIds(): string[] {
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

  const handleGroup = useCallback(() => {
    const selectedNames = items.filter((c) => c._id && selectedIds.has(c._id)).map((c) => c.name);
    items.forEach((c, i) => {
      if (c._id && selectedIds.has(c._id)) setName(i, groupedName(c.name, selectedNames));
    });
    setSelectedIds(new Set());
  }, [items, selectedIds, setName]);

  const handleUngroup = useCallback(() => {
    items.forEach((c, i) => {
      if (c._id && selectedIds.has(c._id)) setName(i, c.name.split("/").pop()!);
    });
    setSelectedIds(new Set());
  }, [items, selectedIds, setName]);

  const handleDelete = useCallback(() => {
    const idxs = items
      .map((c, i) => (c._id && selectedIds.has(c._id) ? i : -1))
      .filter((i) => i >= 0)
      .reverse();
    idxs.forEach((i) => remove(i));
    setSelectedIds(new Set());
  }, [items, selectedIds, remove]);

  const handleClear = useCallback(() => setSelectedIds(new Set()), []);

  const handleSelectAll = useCallback(
    () => setSelectedIds(new Set(items.map((c) => c._id ?? ""))),
    [items],
  );

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  function collapseAll() {
    function collectPaths(nodes: TreeNode<(typeof committed)[number]>[]): string[] {
      return nodes.flatMap((n) => (n.kind === "group" ? [n.fullPath, ...collectPaths(n.children)] : []));
    }
    const paths = collectPaths(buildTree(committed));
    setCollapsed((prev) => {
      const next = { ...prev };
      paths.forEach((p) => { next[p] = true; });
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
      if (e.altKey && e.key === "l") {
        e.preventDefault();
        collapseAll();
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || selectedIds.size === 0) return;
      if (e.key === "g" && e.shiftKey) {
        e.preventDefault();
        items.forEach((c, idx) => {
          if (c._id && selectedIds.has(c._id)) setName(idx, c.name.split("/").pop()!);
        });
        setSelectedIds(new Set());
      } else if (e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        const selectedNames = items.filter((c) => c._id && selectedIds.has(c._id)).map((c) => c.name);
        items.forEach((c, idx) => {
          if (c._id && selectedIds.has(c._id)) setName(idx, groupedName(c.name, selectedNames));
        });
        setSelectedIds(new Set());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, items, setName, committed]);

  // ── Visible IDs for SortableContext ─────────────────────────────────────────

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

  const allIds = useMemo(
    () => collectVisibleIds(tree, activeId !== null),
    [tree, collapsed, activeId],
  );

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const activeGroupPath = activeId?.startsWith("group::") ? activeId.slice(7) : null;

  function handleDragStart(e: DragStartEvent) {
    flushCommitted();
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: DragOverEvent) {
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
    const overId = over.id as string;

    // anything → root zone: strip group prefix entirely
    if (ROOT_ZONE_IDS.includes(overId as typeof ROOT_ZONE_IDS[number])) {
      if (activeIdStr.startsWith("group::")) {
        const srcPath = activeIdStr.slice(7);
        const srcSegment = srcPath.split("/").pop()!;
        items.forEach((c, idx) => {
          if (c.name === srcPath || c.name.startsWith(srcPath + "/"))
            setName(idx, srcSegment + c.name.slice(srcPath.length));
        });
      } else {
        const idsToMove = selectedIds.has(activeIdStr) ? [...selectedIds] : [activeIdStr];
        items.forEach((c, idx) => {
          if (!c._id || !idsToMove.includes(c._id)) return;
          setName(idx, c.name.split("/").pop()!);
        });
        setSelectedIds(new Set());
      }
      return;
    }

    // group → group: bulk rename, guard against self-nesting
    if (activeIdStr.startsWith("group::") && overId.startsWith("group::")) {
      const srcPath = activeIdStr.slice(7);
      const targetPath = overId.slice(7);
      if (targetPath === srcPath || targetPath.startsWith(srcPath + "/")) return;
      const srcSegment = srcPath.includes("/") ? srcPath.split("/").pop()! : srcPath;
      const newBase = `${targetPath}/${srcSegment}`;
      items.forEach((c, idx) => {
        if (c.name === srcPath || c.name.startsWith(srcPath + "/"))
          setName(idx, newBase + c.name.slice(srcPath.length));
      });
      return;
    }

    // leaf → group: move dragged item (+ all selected) into target group
    if (overId.startsWith("group::")) {
      const targetPath = overId.slice(7);
      const idsToMove = selectedIds.has(activeIdStr) ? [...selectedIds] : [activeIdStr];
      items.forEach((c, idx) => {
        if (!c._id || !idsToMove.includes(c._id)) return;
        setName(idx, `${targetPath}/${c.name.split("/").pop()!}`);
      });
      setSelectedIds(new Set());
      return;
    }

    // leaf → leaf: reorder or cross-group move
    if (!activeIdStr.startsWith("group::")) {
      const fromIdx = items.findIndex((c) => c._id === activeIdStr);
      const toIdx = items.findIndex((c) => c._id === overId);
      if (fromIdx < 0 || toIdx < 0) return;
      const fromGroup = items[fromIdx].name.split("/").slice(0, -1).join("/");
      const toGroup = items[toIdx].name.split("/").slice(0, -1).join("/");
      if (fromGroup === toGroup) {
        move(fromIdx, toIdx);
      } else {
        const idsToMove = selectedIds.has(activeIdStr) ? [...selectedIds] : [activeIdStr];
        items.forEach((c, idx) => {
          if (!c._id || !idsToMove.includes(c._id)) return;
          setName(idx, toGroup ? `${toGroup}/${c.name.split("/").pop()!}` : c.name.split("/").pop()!);
        });
        setSelectedIds(new Set());
      }
    }
  }

  // ── Group rename / ungroup ───────────────────────────────────────────────────

  function renameGroup(fullPath: string, newSegment: string) {
    const parentPath = fullPath.includes("/") ? fullPath.slice(0, fullPath.lastIndexOf("/")) : "";
    const newPath = parentPath ? `${parentPath}/${newSegment}` : newSegment;
    items.forEach((c, idx) => {
      if (c.name === fullPath || c.name.startsWith(fullPath + "/"))
        setName(idx, newPath + c.name.slice(fullPath.length));
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
    items.forEach((c, idx) => {
      if (c.name === fullPath || c.name.startsWith(fullPath + "/")) {
        const rest = c.name.slice(fullPath.length + 1);
        setName(idx, parentPath ? `${parentPath}/${rest}` : rest);
      }
    });
  }

  return {
    // DnD
    dndId,
    sensors,
    allIds,
    activeId,
    activeGroupPath,
    overGroupPath,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    // Tree data
    tree,
    committed,
    // Selection
    selectedIds,
    setSelectedIds,
    lastSelectedRef,
    containerRef,
    toggleSelect,
    handleGroup,
    handleUngroup,
    handleDelete,
    handleClear,
    handleSelectAll,
    // Group operations
    renameGroup,
    ungroup,
    addChild,
    // Collapse
    collapseAll,
  };
}
