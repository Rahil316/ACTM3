import { useState } from "react";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { Mono, MicroText, Caption } from "../../components/typography";
import { IconLayers } from "../../components/icons";
import { Button } from "../../components/Button";
import { SegmentedControl } from "../../components/SegmentedControl";
import type { SyncPreviewItem, SyncDecision, ChangedField } from "../../types/messages";
import { KIND_VARIANT, KIND_LABEL, FIELD_LABEL, COLLECTION_LABEL } from "./changeDisplay";

type FilterAction = "all" | "create" | "modify" | "delete";

export type { FilterAction };

interface SyncPreviewItemListProps {
  items: SyncPreviewItem[];
  decisions: Record<string, SyncDecision>;
  onDecision: (tokenRef: string, decision: SyncDecision) => void;
  initialFilter?: FilterAction;
}

const FILTER_TABS: { value: FilterAction; label: string }[] = [
  { value: "all", label: "All" },
  { value: "create", label: "New" },
  { value: "modify", label: "Modified" },
  { value: "delete", label: "Removed" },
];

export function SyncPreviewItemList({ items, decisions, onDecision, initialFilter = "all" }: SyncPreviewItemListProps) {
  const [filter, setFilter] = useState<FilterAction>(initialFilter);

  const counts = items.reduce(
    (acc, i) => {
      acc[i.kind]++;
      return acc;
    },
    { create: 0, modify: 0, delete: 0 },
  );

  const countFor = (f: FilterAction): number => (f === "all" ? items.length : counts[f]);

  const visible = filter === "all" ? items : items.filter((i) => i.kind === filter);

  const filterSegments = FILTER_TABS.map((tab) => ({ value: tab.value, label: tab.label, count: countFor(tab.value) }));

  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl segments={filterSegments} value={filter} onChange={setFilter} />

      {/* Item list */}
      <div className="bg-n-bg-card border border-n-card-border rounded-xl overflow-hidden h-full">
        {visible.length === 0 ? (
          <EmptyState icon={<IconLayers className="w-5 h-5" />} title="Nothing here" description="No changes in this category." />
        ) : (
          <div className="overflow-y-auto">
            {visible.map((item, idx) => {
              const isHeld = decisions[item.tokenRef] === "hold-delete";
              const isLast = idx === visible.length - 1;
              return (
                <div key={item.tokenRef} className={`px-3 py-2 ${!isLast ? "border-b border-n-br-hairline" : ""} ${isHeld ? "opacity-50" : ""}`}>
                  {/* Header row: kind, collection, name, hold-toggle */}
                  <div className="flex items-center gap-2">
                    <Badge variant={KIND_VARIANT[item.kind]} size="xs" className="shrink-0 w-[64px] justify-center">
                      {KIND_LABEL[item.kind]}
                    </Badge>
                    <Caption className="text-n-tx-dim shrink-0 w-[38px] text-center">{COLLECTION_LABEL[item.collection] ?? item.collection}</Caption>
                    <Mono className="flex-1 truncate text-n-tx-secondary text-[11px] min-w-0">{item.name}</Mono>
                    {item.kind === "modify" && (
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        {item.changedFields.map((f) => (
                          <FieldChip key={f} field={f} />
                        ))}
                      </div>
                    )}
                    {item.kind === "delete" && <Button variant={isHeld ? "secondary" : "ghost"} size="xs" label={isHeld ? "Held" : "Hold"} onClick={() => onDecision(item.tokenRef, isHeld ? "keep" : "hold-delete")} className="shrink-0" />}
                  </div>

                  {/* Detail body: every changed field, old → new, no omissions */}
                  {item.kind === "modify" && (
                    <div className="mt-1.5 ml-1 flex flex-col gap-1 pl-[72px]">
                      {item.nameDiff && <NameDiffRow diff={item.nameDiff} />}
                      {item.valueDiff && <ValueDiffRow diff={item.valueDiff} />}
                      {item.scopesDiff && <ScopesDiffRow diff={item.scopesDiff} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Field chip — compact "what changed" indicator in the header row ──────────

function FieldChip({ field }: { field: ChangedField }) {
  return (
    <Badge variant="outline" size="xs">
      {FIELD_LABEL[field]}
    </Badge>
  );
}

// ── Detail rows — one per changed field, always old → new, never hidden ──────

function DiffLabel({ children }: { children: React.ReactNode }) {
  return <MicroText className="text-n-tx-dim shrink-0 w-[72px]">{children}</MicroText>;
}

function NameDiffRow({ diff }: { diff: { old: string; new: string } }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <DiffLabel>Name</DiffLabel>
      <Mono className="text-n-tx-dim truncate line-through decoration-n-tx-dim/50 text-[10px]">{diff.old}</Mono>
      <MicroText className="text-n-tx-dim shrink-0">→</MicroText>
      <Mono className="text-n-tx-secondary truncate text-[10px]">{diff.new}</Mono>
    </div>
  );
}

function Swatch({ hex, title }: { hex: string; title: string }) {
  return <div className="w-3 h-3 rounded-[2px] border border-n-br-hairline shrink-0" style={hex ? { background: hex } : undefined} title={title} />;
}

function ValueDiffRow({ diff }: { diff: Extract<SyncPreviewItem, { kind: "modify" }>["valueDiff"] }) {
  if (!diff) return null;
  if (diff.kind === "color") {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <DiffLabel>Value</DiffLabel>
        <Swatch hex={diff.old} title={diff.old} />
        <MicroText className="text-n-tx-dim font-mono">{diff.old}</MicroText>
        <MicroText className="text-n-tx-dim shrink-0">→</MicroText>
        <Swatch hex={diff.new} title={diff.new} />
        <MicroText className="text-n-tx-secondary font-mono">{diff.new}</MicroText>
      </div>
    );
  }
  // Reference diff — show the alias target's name AND its resolved color, so a
  // reference is never shown as a bare, uncolored id.
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <DiffLabel>Value</DiffLabel>
      <Swatch hex={diff.oldHex} title={`${diff.oldRef}${diff.oldHex ? ` (${diff.oldHex})` : ""}`} />
      <MicroText className="text-n-tx-dim truncate max-w-[110px]">{diff.oldRef}</MicroText>
      <MicroText className="text-n-tx-dim shrink-0">→</MicroText>
      <Swatch hex={diff.newHex} title={`${diff.newRef}${diff.newHex ? ` (${diff.newHex})` : ""}`} />
      <MicroText className="text-n-tx-secondary truncate max-w-[110px]">{diff.newRef}</MicroText>
    </div>
  );
}

function ScopesDiffRow({ diff }: { diff: { old: string[]; new: string[] } }) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <DiffLabel>Scopes</DiffLabel>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <MicroText className="text-n-tx-dim line-through decoration-n-tx-dim/50 truncate">{diff.old.join(", ")}</MicroText>
        <MicroText className="text-n-tx-secondary truncate">{diff.new.join(", ")}</MicroText>
      </div>
    </div>
  );
}
