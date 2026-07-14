import { type ReactNode } from "react";
import clsx from "clsx";
import { CardTitle, Subtitle, LabelText, HelperText } from "./typography";
import { Checkbox } from "./Checkbox";

interface SettingsCardProps {
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ children, className }: SettingsCardProps) {
  return <div className={clsx("px-3 py-2 bg-n-bg-card rounded-xl border border-n-card-border space-y-1", className)}>{children}</div>;
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
    <div className={clsx("flex items-center justify-between gap-3 py-2", className)}>
      <div>
        <CardTitle className="font-medium">{label}</CardTitle>
        {description && <Subtitle>{description}</Subtitle>}
      </div>
      {control}
    </div>
  );
}

// Compact row: muted label left, control right. No subtitle.
export function SmallRow({ label, control, className }: { label: string; control: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-center py-2 justify-between gap-3", className)}>
      <LabelText className="font-medium w-[50%]">{label}</LabelText>
      <div className="w-1/2 min-w-0">{control}</div>
    </div>
  );
}

interface CollectionRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  control: ReactNode;
  className?: string;
}

// Row for a Figma collection: checkbox + label (+ optional description) on the
// left enable/disable and identify the collection, name input on the right is
// disabled when unchecked. Only the checkbox dims when locked/off — the label
// stays full-opacity so it's still legible which collection this row is.
export function CollectionRow({ label, description, checked, onToggle, disabled, control, className }: CollectionRowProps) {
  const isLocked = disabled || !onToggle;
  return (
    <div className={clsx("flex items-center py-2 justify-between gap-3", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        disabled={isLocked}
        className={clsx("flex items-center gap-2 shrink-0", isLocked ? "cursor-not-allowed" : "cursor-pointer")}
      >
        <Checkbox checked={checked} disabled={isLocked} />
        <div className="text-left">
          <LabelText className="font-medium whitespace-nowrap">{label}</LabelText>
          {description && <HelperText className="text-n-tx-dim whitespace-nowrap">{description}</HelperText>}
        </div>
      </button>
      <div className="w-1/2 min-w-0">{control}</div>
    </div>
  );
}
