import { useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "../store/appStore";
import { RoleGroupCard } from "../components/cards/RoleGroupCard";
import { SplitActionButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Sheet } from "../components/Sheet";
import type { Role } from "../types/state";

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

// ── Sortable role card ────────────────────────────────────────────────────────

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

// ── Screen ────────────────────────────────────────────────────────────────────

export function RolesScreen() {
  const roles       = useAppStore((s) => s.appState.roles);
  const addRole     = useAppStore((s) => s.addRole);
  const addRoleWith = useAppStore((s) => s.addRoleWith);
  const moveRole    = useAppStore((s) => s.moveRole);

  const [showSuggest, setShowSuggest] = useState(false);

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
    <div className="flex flex-col gap-2 p-3 relative">
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
