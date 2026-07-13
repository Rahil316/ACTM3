import { useState } from "react";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { Mono, MicroText, Caption } from "../../components/typography";
import { IconLayers } from "../../components/icons";
import { Button } from "../../components/Button";
import { SegmentedControl } from "../../components/SegmentedControl";
import type { SyncPreviewItem, SyncDecision } from "../../types/messages";
import { ACTION_VARIANT, ACTION_LABEL, COLLECTION_LABEL } from "./changeDisplay";

type FilterAction = "all" | "create" | "update" | "rename" | "delete";

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
  { value: "update", label: "Updated" },
  { value: "rename", label: "Renamed" },
  { value: "delete", label: "Removed" },
];

export function SyncPreviewItemList({ items, decisions, onDecision, initialFilter = "all" }: SyncPreviewItemListProps) {
  const [filter, setFilter] = useState<FilterAction>(initialFilter);

  const counts = items.reduce(
    (acc, i) => {
      if (i.action === "create") acc.create++;
      else if (i.action === "update") acc.update++;
      else if (i.action === "rename" || i.action === "rename+update") acc.rename++;
      else if (i.action === "delete") acc.delete++;
      return acc;
    },
    { create: 0, update: 0, rename: 0, delete: 0 },
  );

  const countFor = (f: FilterAction): number => {
    if (f === "all") return items.length;
    if (f === "rename") return counts.rename;
    return counts[f as keyof typeof counts] ?? 0;
  };

  const visible = filter === "all" ? items : filter === "rename" ? items.filter((i) => i.action === "rename" || i.action === "rename+update") : items.filter((i) => i.action === filter);

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
                <div key={item.tokenRef} className={`flex items-center gap-2 px-3 py-1.5 ${!isLast ? "border-b border-n-br-hairline" : ""} ${isHeld ? "opacity-50" : ""}`}>
                  {/* Action badge */}
                  <Badge variant={ACTION_VARIANT[item.action]} size="xs" className="shrink-0 w-[52px] justify-center">
                    {ACTION_LABEL[item.action]}
                  </Badge>

                  {/* Collection tag */}
                  <Caption className="text-n-tx-dim shrink-0 w-[38px] text-center">{COLLECTION_LABEL[item.collection] ?? item.collection}</Caption>

                  {/* Name — main content */}
                  <Mono className="flex-1 truncate text-n-tx-secondary text-[11px] min-w-0">{item.name}</Mono>

                  {/* From-name for renames */}
                  {(item.action === "rename" || item.action === "rename+update") && item.fromName && <MicroText className="text-n-tx-dim truncate max-w-[100px] shrink-0 hidden xs:block">← {item.fromName}</MicroText>}

                  {/* Hold toggle for deletes */}
                  {item.action === "delete" && <Button variant={isHeld ? "secondary" : "ghost"} size="xs" label={isHeld ? "Held" : "Hold"} onClick={() => onDecision(item.tokenRef, isHeld ? "keep" : "hold-delete")} className="shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
