import React from 'react';
import { LucideGripVertical as GripVertical, LucideTrash as Trash2 } from './icons';
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
      <div className="flex items-center gap-0.5 bg-n-sf-raised border border-n-br-default rounded-[8px] shadow-lg p-0.5">
        {dragListeners && (
          <Button
            variant="icon"
            size="sm"
            className="cursor-grab touch-none"
            {...(dragAttributes as React.HTMLAttributes<HTMLButtonElement>)}
            {...(dragListeners as React.HTMLAttributes<HTMLButtonElement>)}
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
            icon={<GripVertical size={12} strokeWidth={2} />}
          />
        )}
        {dragListeners && children && <div className="h-4 w-px bg-n-br-default mx-0.5" />}
        {children}
        {children && <div className="h-4 w-px bg-n-br-default mx-0.5" />}
        <Button
          variant="icon"
          size="sm"
          className="hover:text-d-tx-muted hover:bg-d-fi-subtle"
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteTitle ?? 'Delete'}
          icon={<Trash2 size={11} strokeWidth={2} />}
        />
      </div>
    </div>
  );
}
