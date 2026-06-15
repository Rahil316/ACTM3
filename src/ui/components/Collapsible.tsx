import { type ReactNode } from "react";
import clsx from "clsx";
import { IconChevronDown } from "./icons";
import { SectionLabel } from "./typography";

interface CollapsibleProps {
  open: boolean;
  onToggle: () => void;
  header: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}

// Collapsible section with animated chevron. open/onToggle are controlled externally.
// Used in: role variation panel, project profile section, versions section.
export function Collapsible({ open, onToggle, header, children, className, headerClassName }: CollapsibleProps) {
  return (
    <div className={clsx("border border-n-br-default rounded-[10px] overflow-hidden", className)}>
      <div className={clsx("flex items-center gap-2 px-3 py-2 bg-n-sf-input cursor-pointer select-none", headerClassName)} onClick={onToggle}>
        <span className="flex items-center justify-center w-3 shrink-0 transition-transform duration-150" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>
          <IconChevronDown />
        </span>
        {header}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

// Collapsible with a card-level section header (used in project screen sections).
// The header row shows an uppercase label + chevron and optionally an action badge.
interface SectionCollapsibleProps {
  open: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCollapsible({ open, onToggle, label, description, badge, children, className }: SectionCollapsibleProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between cursor-pointer select-none py-1 gap-2" onClick={onToggle}>
        <div className="flex flex-col min-w-0">
          <SectionLabel className="mb-0">{label}</SectionLabel>
          {description && <span className="text-[10px] text-n-tx-dim mt-0.5 leading-tight">{description}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <span className="text-n-tx-muted transition-transform duration-150 flex items-center" style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <IconChevronDown className="w-3 h-3" />
          </span>
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}
