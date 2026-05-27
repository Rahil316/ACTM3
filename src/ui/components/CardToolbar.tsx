import React from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from './Button';

/**
 * Floating hover toolbar that appears below a card.
 * The parent card must have `group/card` and `relative` on its container.
 *
 * Children are slotted between the optional drag handle and the delete button.
 * A divider is rendered automatically before delete when children are present.
 */
export function CardToolbar({
  onDelete,
  deleteDisabled,
  deleteTitle,
  dragListeners,
  dragAttributes,
  children,
}: {
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteTitle?: string;
  dragListeners?: Record<string, unknown>;
  dragAttributes?: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  return (
    <div className="absolute -right-1 -top-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 pointer-events-none group-hover/card:pointer-events-auto">
      <div className="flex items-center gap-0.5 bg-bg-card border border-border-base rounded-[8px] shadow-lg p-0.5">
        {dragListeners && (
          <Button
            variant="icon"
            size="sm"
            className="cursor-grab touch-none"
            {...(dragAttributes as any)}
            {...(dragListeners as any)}
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
            icon={<GripVertical size={12} strokeWidth={1.75} />}
          />
        )}
        {children && <div className="h-4 w-px bg-border-base mx-0.5" />}
        {children}
        <Button
          variant="icon"
          size="sm"
          className="hover:text-danger hover:bg-danger-subtle"
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteTitle ?? 'Delete'}
          icon={<Trash2 size={11} strokeWidth={1.75} />}
        />
      </div>
    </div>
  );
}
