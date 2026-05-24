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
          className={clsx('settings-tab shrink-0', tab.value === active && 'active')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
