import { type ReactNode } from "react";
import clsx from "clsx";
import { CardTitle, Subtitle, LabelText } from "./typography";

interface SettingsCardProps {
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ children, className }: SettingsCardProps) {
  return <div className={clsx("px-3 py-2 bg-n-bg-card rounded-xl border border-n-card-border space-y-3", className)}>{children}</div>;
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
      {control}
    </div>
  );
}
