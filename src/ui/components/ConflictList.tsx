import { type NameConflict } from "../types/messages";
import { Sheet } from "./Sheet";
import { Backdrop } from "./Backdrop";
import { Button } from "./Button";
import { SegmentedControl } from "./SegmentedControl";
import { Mono, Caption, HelperText, SectionLabel } from "./typography";
import { LucideClose as X } from "./icons";

interface ConflictListProps {
  conflicts: NameConflict[];
  decisions: Record<string, string>;
  onChange: (ref: string, decision: "keep" | "revert") => void;
  onKeepAll: () => void;
  onOverrideAll: () => void;
  open: boolean;
  onClose: () => void;
}

export function ConflictList({ conflicts, decisions, onChange, onKeepAll, onOverrideAll, open, onClose }: ConflictListProps) {
  if (!conflicts || conflicts.length === 0) return null;

  const allKeep = conflicts.every((c) => (decisions[c.tokenRef] || "keep") === "keep");
  const allRevert = conflicts.every((c) => decisions[c.tokenRef] === "revert");
  const bulkValue = allKeep ? "keep" : allRevert ? "revert" : null;

  return (
    <>
      <Backdrop open={open} onClick={onClose} className="z-[70]" />
      <Sheet open={open} className="z-[80] min-h-[40%]">
        {/* Header: close | title | apply */}
        <div className="shrink-0 grid grid-cols-3 items-center px-2 py-2 border-b border-n-br-default">
          <div className="flex justify-start">
            <Button variant="icon" size="xs" icon={<X size={13} strokeWidth={2} />} onClick={onClose} />
          </div>
          <div className="flex flex-col items-center">
            <SectionLabel className="text-n-tx-secondary">Name Conflicts</SectionLabel>
            <Caption className="text-n-tx-dim">
              {conflicts.length} variable{conflicts.length !== 1 ? "s" : ""} renamed in Figma
            </Caption>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" label="Apply" onClick={onClose} />
          </div>
        </div>

        {/* Bulk actions */}
        <div className="shrink-0 flex items-center justify-between gap-1.5 px-3 py-2 border-b border-n-br-default">
          <HelperText className="text-n-tx-dim">{bulkValue === null ? "Mixed — some items differ" : bulkValue === "keep" ? "All keeping Figma names" : "Change Figma names with System names"}</HelperText>
          <SegmentedControl
            segments={[
              { value: "keep", label: "Keep Figma Names" },
              { value: "revert", label: "Change Names" },
            ]}
            value={bulkValue}
            onChange={(v) => (v === "keep" ? onKeepAll() : onOverrideAll())}
          />
        </div>

        {/* Conflict rows */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {conflicts.map((conflict, idx) => {
            const decision = (decisions[conflict.tokenRef] || "keep") as "keep" | "revert";
            const keeping = decision === "keep";
            const isLast = idx === conflicts.length - 1;
            return (
              <div key={conflict.tokenRef} className={`flex items-center gap-2 px-3 py-2.5 ${!isLast ? "border-b border-n-br-hairline" : ""}`}>
                {/* Names */}
                <div className="flex-1 flex flex-col gap-0.5 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Caption className="text-n-tx-dim shrink-0 w-9">Figma</Caption>
                    <Mono className={`truncate transition-all px-1 rounded min-w-0 ${keeping ? "bg-n-sf-active text-n-tx-primary" : "text-n-tx-dim"}`}>{conflict.figmaName}</Mono>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Caption className="text-n-tx-dim shrink-0 w-9">System</Caption>
                    <Mono className={`truncate transition-all px-1 rounded min-w-0 ${!keeping ? "bg-b-fi-subtle text-b-tx-muted" : "text-n-tx-dim"}`}>{conflict.suggestedName}</Mono>
                  </div>
                </div>

                <SegmentedControl
                  segments={[
                    { value: "keep", label: "Figma" },
                    { value: "revert", label: "System" },
                  ]}
                  value={decision}
                  onChange={(v) => onChange(conflict.tokenRef, v as "keep" | "revert")}
                  className="shrink-0 w-fit"
                />
              </div>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
