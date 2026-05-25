import { useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "../store/appStore";
import { ColorGroupCard } from "../components/cards/ColorGroupCard";
import { SplitActionButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Sheet } from "../components/Sheet";
import type { Color } from "../types/state";

// ── Suggested colors ──────────────────────────────────────────────────────────

const SUGGESTED_COLORS: { name: string; value: string; shorthand: string; description: string }[] = [
  { name: "Brand/Primary",   value: "#0066FF", shorthand: "bp",  description: "Primary brand color" },
  { name: "Brand/Accent",    value: "#8B5CF6", shorthand: "ba",  description: "Accent — violet" },
  { name: "Brand/Warning",   value: "#F59E0B", shorthand: "bw",  description: "Warning — amber" },
  { name: "Brand/Danger",    value: "#EF4444", shorthand: "bd",  description: "Danger — red" },
  { name: "Brand/Success",   value: "#22C55E", shorthand: "bs",  description: "Success — green" },
  { name: "Neutral/Gray",    value: "#6B7280", shorthand: "ng",  description: "Neutral gray" },
  { name: "Neutral/Warm",    value: "#78716C", shorthand: "nw",  description: "Warm stone gray" },
  { name: "Neutral/Cool",    value: "#64748B", shorthand: "nc",  description: "Cool slate gray" },
  { name: "Color/Sky",       value: "#0EA5E9", shorthand: "cs",  description: "Sky blue" },
  { name: "Color/Teal",      value: "#14B8A6", shorthand: "ct",  description: "Teal" },
  { name: "Color/Indigo",    value: "#6366F1", shorthand: "ci",  description: "Indigo" },
  { name: "Color/Pink",      value: "#EC4899", shorthand: "cp",  description: "Pink" },
  { name: "Color/Orange",    value: "#F97316", shorthand: "co",  description: "Orange" },
  { name: "Color/Rose",      value: "#F43F5E", shorthand: "cr",  description: "Rose" },
  { name: "Color/Emerald",   value: "#10B981", shorthand: "ce",  description: "Emerald" },
  { name: "Color/Amber",     value: "#F59E0B", shorthand: "cam", description: "Amber" },
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
            <button className="text-[11px] text-accent cursor-pointer hover:underline" onClick={onBlank}>+ Custom</button>
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
                  <div className="w-7 h-7 rounded-[6px] shrink-0 border border-black/10" style={{ background: s.value }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-semibold text-text-primary truncate">{s.name}</span>
                    <span className="text-[10px] text-text-muted font-mono">{s.value.toUpperCase()} · {s.description}</span>
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

// ── Sortable color card ───────────────────────────────────────────────────────

function SortableColorCard({ color, idx }: { color: Color; idx: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: color._id });

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
      <ColorGroupCard color={color} idx={idx} />
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ColorsScreen() {
  const colors      = useAppStore((s) => s.appState.colors);
  const addColor    = useAppStore((s) => s.addColor);
  const addColorWith = useAppStore((s) => s.addColorWith);
  const moveColor   = useAppStore((s) => s.moveColor);

  const [showSuggest, setShowSuggest] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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

  const addBtn = (
    <SplitActionButton
      label="+ Add Color"
      onAdd={addColor}
      onPick={() => setShowSuggest(true)}
    />
  );

  return (
    <div className="flex flex-col gap-2 p-3 relative">
        {showSuggest && (
          <ColorSuggestSheet
            existingNames={colors.map((c) => c.name)}
            onPick={handlePick}
            onBlank={() => { addColor(); setShowSuggest(false); }}
            onClose={() => setShowSuggest(false)}
          />
        )}
        {colors.length === 0 ? (
          <EmptyState icon="🎨" title="No colors yet" description="Add a color to start building your scale." action={addBtn} />
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {addBtn}
            <SortableContext items={colors.map((c) => c._id)} strategy={verticalListSortingStrategy}>
              {colors.map((color, idx) => (
                <SortableColorCard key={color._id} color={color} idx={idx} />
              ))}
            </SortableContext>
          </DndContext>
        )}
    </div>
  );
}
