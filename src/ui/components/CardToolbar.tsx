import React from "react";
import { GripVertical, Trash2 } from "lucide-react";

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
    <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 pointer-events-none group-hover/card:pointer-events-auto">
      <div className="flex items-center gap-0.5 bg-bg-card border border-border-base rounded-[8px] shadow-lg px-1 py-1">
        {dragListeners && (
          <button
            className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-text-muted cursor-grab touch-none"
            {...(dragAttributes as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            {...(dragListeners as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={12} strokeWidth={1.75} />
          </button>
        )}
        {children}
        {children && <div className="w-px h-4 bg-border-base mx-0.5" />}
        <button
          className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-danger hover:bg-danger-subtle cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteTitle ?? "Delete"}
        >
          <Trash2 size={11} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
