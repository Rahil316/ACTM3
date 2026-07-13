import { type ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from './Button';
import { IconClose } from './icons';

interface ListRowProps {
  children: ReactNode;
  onRemove: () => void;
  // Drag-and-drop wiring — pass handlers from useDragList hook when ready.
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  isDragOver?: boolean;
  className?: string;
  removeDisabled?: boolean;
  removeAriaLabel?: string;
}

// Reusable row for any editable list: drag handle ⠿ + content + remove button.
// Used in: step-labels list, variations list, themes list in settings.
export function ListRow({
  children,
  onRemove,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragOver,
  className,
  removeDisabled,
  removeAriaLabel = 'Remove',
}: ListRowProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={clsx(
        'flex items-center gap-1.5 px-0.5',
        isDragOver && 'border-t-2 border-t-b-br-default',
        className,
      )}
    >
      {draggable && (
        <span className="text-n-tx-muted cursor-grab active:cursor-grabbing px-0.5 shrink-0 select-none text-[14px]">
          ⠿
        </span>
      )}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">{children}</div>
      <Button
        variant="danger"
        size="md"
        square
        icon={<IconClose />}
        onClick={onRemove}
        disabled={removeDisabled}
        aria-label={removeAriaLabel}
      />
    </div>
  );
}

// Column header row that labels the fields above a ListRow list.
// Pass the same column widths/labels as used in the rows below.
interface ListHeaderProps {
  columns: string[];
  className?: string;
  withDragHandle?: boolean;
  withRemoveButton?: boolean;
}

export function ListHeader({ columns, className, withDragHandle, withRemoveButton }: ListHeaderProps) {
  return (
    <div className={clsx('flex items-center gap-1.5 px-0.5', className)}>
      {withDragHandle && <span className="w-[18px] shrink-0" />}
      {columns.map((col, i) => (
        <span key={i} className="flex-1 text-[10px] font-bold text-n-tx-muted px-1">
          {col}
        </span>
      ))}
      {withRemoveButton && <span className="w-[30px] shrink-0" />}
    </div>
  );
}
