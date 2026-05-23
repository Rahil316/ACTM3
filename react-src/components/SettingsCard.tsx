import { type ReactNode } from 'react';
import clsx from 'clsx';

interface SettingsCardProps {
  children: ReactNode;
  className?: string;
}

// Rounded card wrapper matching vanilla .settings-card — consistent padding + border.
export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <div className={clsx('p-[14px] bg-bg-panel rounded-[12px] border border-border-base space-y-3', className)}>
      {children}
    </div>
  );
}

interface PanelRowProps {
  label: string;
  description?: string | null;
  control: ReactNode;
  className?: string;
}

// Two-column settings row: label+description left, control right.
export function PanelRow({ label, description, control, className }: PanelRowProps) {
  return (
    <div className={clsx('flex items-center justify-between gap-3', className)}>
      <div>
        <p className="text-[13px] font-medium text-text-primary">{label}</p>
        {description && <p className="text-[11px] text-text-muted mt-0.5">{description}</p>}
      </div>
      {control}
    </div>
  );
}

// Compact row: muted label left, control right. No subtitle.
export function SmallRow({ label, control, className }: { label: string; control: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <p className="text-[12px] text-text-muted font-medium">{label}</p>
      {control}
    </div>
  );
}
