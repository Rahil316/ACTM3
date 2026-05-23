import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../store/appStore';
import { ColorGroupCard } from '../components/cards/ColorGroupCard';
import { ActionButton } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import type { Color } from '../types/state';

function SortableColorCard({ color, idx }: { color: Color; idx: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: color._id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
      }}
      {...attributes}
      {...listeners}
    >
      <ColorGroupCard color={color} idx={idx} />
    </div>
  );
}

export function ColorsScreen() {
  const colors   = useAppStore((s) => s.appState.colors);
  const addColor = useAppStore((s) => s.addColor);
  const moveColor = useAppStore((s) => s.moveColor);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = colors.findIndex((c) => c._id === active.id);
    const to   = colors.findIndex((c) => c._id === over.id);
    if (from !== -1 && to !== -1) moveColor(from, to);
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {colors.length === 0 ? (
        <EmptyState
          icon="🎨"
          title="No colors yet"
          description="Add a color to start building your scale."
          action={<ActionButton label="+ Add Color" onClick={addColor} />}
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={colors.map((c) => c._id)} strategy={verticalListSortingStrategy}>
            {colors.map((color, idx) => (
              <SortableColorCard key={color._id} color={color} idx={idx} />
            ))}
          </SortableContext>
          <ActionButton label="+ Add Color" onClick={addColor} />
        </DndContext>
      )}
    </div>
  );
}
