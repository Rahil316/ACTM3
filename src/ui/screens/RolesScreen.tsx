import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "../store/appStore";
import { RoleGroupCard } from "../components/cards/RoleGroupCard";
import { ActionButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import type { Role } from "../types/state";

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

export function RolesScreen() {
  const roles = useAppStore((s) => s.appState.roles);
  const addRole = useAppStore((s) => s.addRole);
  const moveRole = useAppStore((s) => s.moveRole);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = roles.findIndex((r) => r._id === active.id);
    const to = roles.findIndex((r) => r._id === over.id);
    if (from !== -1 && to !== -1) moveRole(from, to);
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {roles.length === 0 ? (
        <EmptyState icon="🎯" title="No roles yet" description="Add a role to define how colors are applied." action={<ActionButton label="+ Add Role" onClick={addRole} />} />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <ActionButton label="+ Add Role" onClick={addRole} />
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
