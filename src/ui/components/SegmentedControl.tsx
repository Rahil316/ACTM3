import clsx from "clsx";

interface Segment<T extends string> {
  value: T;
  label: string;
  id?: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ segments, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={clsx("flex gap-0.5 bg-n-sf-input border border-n-br-default rounded-[8px] p-0.5 overflow-hidden", className)}>
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
              active ? "bg-b-fi-btn-default border border-b-fi-btn-default text-b-tx-btn-default" : "bg-transparent border border-transparent text-n-tx-muted hover:bg-n-sf-hover hover:text-n-tx-primary",
            )}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
