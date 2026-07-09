interface FilterBarTab<T extends string> {
  key: T;
  label: string;
  count: number;
}

interface FilterBarProps<T extends string> {
  tabs: FilterBarTab<T>[];
  active: T;
  onChange: (value: T) => void;
}

export function FilterBar<T extends string>({ tabs, active, onChange }: FilterBarProps<T>) {
  return (
    <div className="flex gap-0.5 bg-n-sf-input border border-n-br-default rounded-[8px] p-0.5 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 h-7 px-2 text-[10px] font-semibold rounded-[6px] cursor-pointer transition-all duration-150 whitespace-nowrap min-w-0 ${
              isActive
                ? "bg-b-fi-btn-default border border-b-fi-btn-default text-b-tx-btn-default"
                : "bg-transparent border border-transparent text-n-tx-muted hover:bg-n-sf-hover hover:text-n-tx-primary"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[9px] tabular-nums leading-none rounded-[3px] px-0.5 ${isActive ? "opacity-70" : "opacity-50"}`}>
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
