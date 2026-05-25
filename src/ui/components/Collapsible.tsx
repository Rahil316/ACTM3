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
    <div className={clsx("border border-border-base rounded-[10px] overflow-hidden", className)}>
      <div className={clsx("flex items-center gap-2 px-3 py-2 bg-bg-input cursor-pointer select-none", headerClassName)} onClick={onToggle}>
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
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCollapsible({ open, onToggle, label, badge, children, className }: SectionCollapsibleProps) {
  return (
    <div className={className}>
      <div className="flex items-center align-center justify-between cursor-pointer select-none py-1" onClick={onToggle}>
        <SectionLabel className="mb-0">{label}</SectionLabel>
        <div className="flex items-center gap-1">
          {badge}
          <span className="text-text-muted transition-transform duration-150 flex items-center" style={{ display: "inline-flex", transform: open ? "rotate(0deg)" : "rotate(180deg)" }}>
            <IconChevronDown className="w-3 h-3" />
          </span>
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}
