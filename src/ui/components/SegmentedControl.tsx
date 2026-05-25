import clsx from "clsx";

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

export function SegmentedControl<T extends string>({ segments, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={clsx("flex gap-0.5 bg-bg-input border border-border-base rounded-[8px] p-0.5", className)}>
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <button
            key={seg.value}
            id={seg.id}
            type="button"
            onClick={() => onChange(seg.value)}
            className={clsx(
              "flex-1 h-7 px-2.5 text-[11px] font-semibold rounded-[6px] cursor-pointer transition-all duration-150 whitespace-nowrap",
              active ? "bg-accent border border-accent text-text-on-accent" : "bg-transparent border border-transparent text-text-muted hover:bg-bg-hover hover:text-text-primary",
            )}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
