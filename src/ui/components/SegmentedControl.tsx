import clsx from 'clsx';

interface Segment<T extends string> {
  value: T;
  label: string;
  id?: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

// Pill-style segmented control. Active segment gets accent styling via .active CSS class.
export function SegmentedControl<T extends string>({ segments, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={clsx('flex gap-1 bg-bg-input border border-border-base rounded-[8px] p-0.5', className)}>
      {segments.map((seg) => (
        <button
          key={seg.value}
          id={seg.id}
          type="button"
          onClick={() => onChange(seg.value)}
          className={clsx('seg-btn', seg.value === value && 'active')}
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}
