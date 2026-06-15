import { type ReactNode } from 'react';
import clsx from 'clsx';

interface Tab<T extends string> {
  value: T;
  label: ReactNode;
  id?: string;
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (value: T) => void;
  className?: string;
}

// Horizontal pill-style tab bar. Used in Settings overlay and sidebar.
export function TabBar<T extends string>({ tabs, active, onChange, className }: TabBarProps<T>) {
  return (
    <div className={clsx('flex gap-1 overflow-x-auto', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          id={tab.id}
          type="button"
          onClick={() => onChange(tab.value)}
          className={clsx(
            'shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-full border cursor-pointer whitespace-nowrap transition-all duration-150',
            tab.value === active
              ? 'bg-b-fi-btn-default border-b-fi-btn-default text-b-tx-btn-default'
              : 'border-n-br-default bg-transparent text-n-tx-muted hover:bg-n-sf-hover hover:text-n-tx-primary',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
