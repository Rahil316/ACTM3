import React from "react";
import type { Variation } from "../../types/state";
import { useProjectStore } from "../../store/projectStore";
import { useLocalField } from "../../hooks/useLocalField";
import { Input } from "../Input";
import { Button } from "../Button";

export interface VariationTableProps {
  variations: Variation[];
  canEdit: boolean;
  idx: number;
  scaleLength: number;
  highlightRows?: Set<number>;
  globalVariations?: Variation[];
}

const EMPTY_VARIATIONS: Variation[] = [];

function VariationRow({
  v, vi, idx, highlight, canEditNames, globalTarget,
}: {
  v: Variation; vi: number; idx: number;
  highlight: boolean; canEditNames: boolean;
  globalTarget?: number;
}) {
  const setRoleVariation = useProjectStore((s) => s.setRoleVariation);
  const removeRoleVariation = useProjectStore((s) => s.removeRoleVariation);
  const vars = useProjectStore((s) => s.projectStore.roles[idx]?.variations ?? EMPTY_VARIATIONS);

  const [localName, onNameChange, onNameBlur] = useLocalField(v.name ?? "", (val) => setRoleVariation(idx, vi, "name", val), { allowEmpty: true });
  const [localShort, onShortChange, onShortBlur] = useLocalField(v.shorthand ?? "", (val) => setRoleVariation(idx, vi, "shorthand", val), { allowEmpty: true });
  const [localTarget, onTargetChange, onTargetBlur] = useLocalField(String(v.target ?? 4.5), (val) => setRoleVariation(idx, vi, "target", val));

  const cols = canEditNames ? "16px 1fr 56px 88px 24px" : "16px 1fr 88px";
  const isFallback = /^\d+$/.test((v.shorthand ?? "").trim());
  const isNameFallback = /^\d+$/.test((v.name ?? "").trim());

  return (
    <div
      className={["grid px-2 py-1 items-center gap-1.5", vi < vars.length - 1 ? "border-b border-n-br-subtle" : "", highlight ? "bg-w-fi-subtle" : vi % 2 ? "bg-n-bg-app" : ""].join(" ")}
      style={{ gridTemplateColumns: cols }}
    >
      <span className="text-[10px] text-n-tx-muted tabular-nums">{vi + 1}</span>

      {canEditNames ? (
        <Input size="table" value={localName} onChange={onNameChange} onBlur={onNameBlur} inputState={isNameFallback ? "error" : "default"} />
      ) : (
        <span className="text-[11px] px-1.5 text-n-tx-muted truncate">
          {v.name}{v.shorthand ? ` (${v.shorthand})` : ""}
        </span>
      )}

      {canEditNames && (
        <Input size="table" value={localShort} onChange={onShortChange} onBlur={onShortBlur} inputState={isFallback ? "error" : "default"} />
      )}

      <div className="relative flex items-center">
        <Input size="table" type="number" value={localTarget} min="1" max="21" step="0.1" onChange={onTargetChange} onBlur={onTargetBlur} />
        {canEditNames && globalTarget != null && v.target != null && Math.abs(v.target - globalTarget) > 0.001 && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-w-fi-strong pointer-events-none" title="Differs from global default" />
        )}
      </div>

      {canEditNames && (
        <Button variant="ghost" size="xs" square label="−" disabled={vars.length <= 1} onClick={() => removeRoleVariation(idx, vi)} className="hover:text-d-tx-muted hover:bg-d-fi-subtle" />
      )}
    </div>
  );
}

export const VariationTable = React.memo(function VariationTable({ variations: vars, canEdit: canEditNames, idx, highlightRows, globalVariations }: VariationTableProps) {
  const addRoleVariation = useProjectStore((s) => s.addRoleVariation);
  const cols = canEditNames ? "16px 1fr 56px 88px 24px" : "16px 1fr 88px";
  const headers = canEditNames ? ["#", "Name", "Short", "Target", ""] : ["#", "Variation", "Target"];

  return (
    <div>
      <div className="grid px-2 py-1 bg-n-bg-app border-b border-n-br-default gap-1.5" style={{ gridTemplateColumns: cols }}>
        {headers.map((h) => (
          <span key={h} className="text-[10px] font-bold text-n-tx-muted">{h}</span>
        ))}
      </div>

      {vars.map((v, vi) => (
        <VariationRow
          key={v._id ?? vi}
          v={v} vi={vi} idx={idx}
          highlight={highlightRows?.has(vi) ?? false}
          canEditNames={canEditNames}
          globalTarget={globalVariations?.[vi]?.target}
        />
      ))}

      {canEditNames && (
        <div className="flex px-2 py-1.5 border-t border-n-br-subtle">
          <Button variant="ghost" size="sm" label="+ Add variation" onClick={() => addRoleVariation(idx)} className="text-b-tx-muted hover:text-b-tx-muted hover:bg-b-fi-subtle" />
        </div>
      )}
    </div>
  );
});
