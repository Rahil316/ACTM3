import { SyncPreviewItemList, type FilterAction } from "../SyncPreviewItemList";
import { EmptyState } from "../../../components/EmptyState";
import { Callout } from "../../../components/Callout";
import { LucideCheck } from "../../../components/icons";
import type { SyncPreviewItem, NameConflict, SyncDecision } from "../../../types/messages";

interface ChangesTabProps {
  previewItems: SyncPreviewItem[];
  conflicts: NameConflict[];
  decisions: Record<string, SyncDecision>;
  setDecision: (ref: string, val: SyncDecision) => void;
  total: number;
  isChecking: boolean;
  initialFilter?: FilterAction;
}

export function ChangesTab({ previewItems, conflicts, decisions, setDecision, total, isChecking, initialFilter }: ChangesTabProps) {
  if (isChecking) {
    return (
      <div className="flex flex-col gap-0 animate-pulse">
        {[80, 60, 72, 55, 68].map((w, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-n-br-hairline last:border-0">
            <div className="w-5 h-5 rounded-md bg-n-sf-hover shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-2.5 rounded bg-n-sf-hover" style={{ width: `${w}%` }} />
              <div className="h-2 rounded bg-n-sf-hover w-1/3" />
            </div>
            <div className="w-14 h-5 rounded-md bg-n-sf-hover shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  const isEmpty = total === 0 && conflicts.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon={<LucideCheck className="w-5 h-5" strokeWidth={2.5} />}
        title="Everything is in sync"
        description="All Figma variables already match the current configuration. Nothing to publish."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {conflicts.length > 0 && (
        <Callout variant="warning">
          {conflicts.length} naming conflict{conflicts.length !== 1 ? "s" : ""} detected. Review and resolve them in the Summary tab.
        </Callout>
      )}
      {previewItems.length > 0 && <SyncPreviewItemList items={previewItems} decisions={decisions} onDecision={setDecision} initialFilter={initialFilter} />}
    </div>
  );
}
