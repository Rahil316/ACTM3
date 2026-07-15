import { EmptyState } from "../../../components/EmptyState";
import { Callout } from "../../../components/Callout";
import { SegmentedControl } from "../../../components/SegmentedControl";
import { Badge } from "../../../components/Badge";
import { Mono, MicroText, Caption } from "../../../components/typography";
import { LucideCheck } from "../../../components/icons";
import type { ValueDriftItem, DriftDecision } from "../../../types/messages";
import { COLLECTION_LABEL } from "../changeDisplay";

interface ValueDriftTabProps {
  items: ValueDriftItem[];
  decisions: Record<string, DriftDecision>;
  setDecision: (ref: string, val: DriftDecision) => void;
  isChecking: boolean;
}

export function ValueDriftTab({ items, decisions, setDecision, isChecking }: ValueDriftTabProps) {
  if (isChecking) {
    return (
      <div className="flex flex-col gap-0 animate-pulse">
        {[80, 60, 72].map((w, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-n-br-hairline last:border-0">
            <div className="w-5 h-5 rounded-md bg-n-sf-hover shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-2.5 rounded bg-n-sf-hover" style={{ width: `${w}%` }} />
              <div className="h-2 rounded bg-n-sf-hover w-1/3" />
            </div>
            <div className="w-24 h-5 rounded-md bg-n-sf-hover shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<LucideCheck className="w-5 h-5" strokeWidth={2.5} />}
        title="No edits found in Figma"
        description="Nothing was changed directly in Figma's variables panel since the last sync."
      />
    );
  }

  const conflicts = items.filter((i) => i.kind === "conflict");
  const drifted = items.filter((i) => i.kind === "drift");
  const allDecided = items.every((i) => !!decisions[i.tokenRef]);

  return (
    <div className="flex flex-col gap-3">
      <Callout variant="warning">
        {items.length} variable{items.length !== 1 ? "s were" : " was"} edited directly in Figma since the last sync
        {conflicts.length > 0 && <> — {conflicts.length} of these {conflicts.length !== 1 ? "also change" : "also changes"} in your current config (conflict)</>}.
        {!allDecided && " Choose Figma or Plugin for each before syncing."}
      </Callout>

      <div className="bg-n-bg-card border border-n-card-border rounded-xl overflow-hidden h-full">
        <div className="overflow-y-auto">
          {items.map((item, idx) => {
            const decision = decisions[item.tokenRef];
            const isLast = idx === items.length - 1;
            return (
              <div key={item.tokenRef} className={`flex items-center gap-2 px-3 py-2 ${!isLast ? "border-b border-n-br-hairline" : ""}`}>
                {/* Kind badge */}
                <Badge variant={item.kind === "conflict" ? "danger" : "warning"} size="xs" className="shrink-0 w-[60px] justify-center">
                  {item.kind === "conflict" ? "Conflict" : "Drifted"}
                </Badge>

                {/* Collection tag */}
                <Caption className="text-n-tx-dim shrink-0 w-[38px] text-center">{COLLECTION_LABEL[item.collection] ?? item.collection}</Caption>

                {/* Name */}
                <Mono className="flex-1 truncate text-n-tx-secondary text-[11px] min-w-0">{item.name}</Mono>

                {/* Value comparison: Figma's current value vs. what the plugin would write */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  <div className="w-3 h-3 rounded-[2px] border border-n-br-hairline" style={{ background: item.figmaValue }} title={`Figma: ${item.figmaValue}`} />
                  <MicroText className="text-n-tx-dim">vs</MicroText>
                  <div className="w-3 h-3 rounded-[2px] border border-n-br-hairline" style={{ background: item.configValue }} title={`Plugin: ${item.configValue}`} />
                </div>

                <SegmentedControl
                  segments={[
                    { value: "keep-figma", label: "Figma" },
                    { value: "use-plugin", label: "Plugin" },
                  ]}
                  value={decision ?? null}
                  onChange={(v) => setDecision(item.tokenRef, v as DriftDecision)}
                  className="shrink-0 w-fit"
                />
              </div>
            );
          })}
        </div>
      </div>

      {drifted.length > 0 && conflicts.length > 0 && <MicroText className="text-n-tx-dim">"Drifted" = only Figma changed since last sync. "Conflict" = both Figma and your current config changed it differently.</MicroText>}
    </div>
  );
}
