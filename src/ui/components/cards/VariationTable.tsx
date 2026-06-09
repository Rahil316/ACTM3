import React from "react";
import type { Variation } from "../../types/state";
import { useProjectStore } from "../../store/projectStore";
import { Input } from "../Input";
import { Button } from "../Button";

export interface VariationTableProps {
  variations: Variation[];
  canEdit: boolean;
  mappingMethod: "contrast" | "index";
  idx: number;
  scaleLength: number;
}

export const VariationTable = React.memo(function VariationTable({ variations: vars, canEdit: canEditNames, mappingMethod, idx, scaleLength }: VariationTableProps) {
  const setRoleVariation = useProjectStore((s) => s.setRoleVariation);
  const addRoleVariation = useProjectStore((s) => s.addRoleVariation);
  const removeRoleVariation = useProjectStore((s) => s.removeRoleVariation);
  const cols = canEditNames ? "16px 1fr 56px 88px 24px" : "16px 1fr 88px";
  const headers = canEditNames ? ["#", "Name", "Short", "Target", ""] : ["#", "Variation", "Target"];

  return (
    <div>
      <div className="grid px-2 py-1 bg-bg-app border-b border-border-base gap-1.5" style={{ gridTemplateColumns: cols }}>
        {headers.map((h) => (
          <span key={h} className="text-[10px] font-bold text-text-muted">
            {h}
          </span>
        ))}
      </div>

      {vars.map((v, vi) => {
        const isIndex = mappingMethod === "index";
        return (
          <div key={v._id ?? vi} className={["grid px-2 py-1 items-center gap-1.5", vi < vars.length - 1 ? "border-b border-border-subtle" : "", vi % 2 ? "bg-bg-app" : ""].join(" ")} style={{ gridTemplateColumns: cols }}>
            <span className="text-[10px] text-text-muted tabular-nums">{vi + 1}</span>

            {canEditNames ? (
              <Input size="table" value={v.name ?? ""} onChange={(e) => setRoleVariation(idx, vi, "name", e.target.value)} />
            ) : (
              <span className="text-[11px] px-1.5 text-text-muted truncate">
                {v.name}
                {v.shorthand ? ` (${v.shorthand})` : ""}
              </span>
            )}

            {canEditNames && <Input size="table" value={v.shorthand ?? ""} onChange={(e) => setRoleVariation(idx, vi, "shorthand", e.target.value)} />}

            <Input size="table" type="number" value={String(v.target ?? 4.5)} min={isIndex ? "0" : "1"} max={isIndex ? String(scaleLength - 1) : "21"} step="0.1" onChange={(e) => setRoleVariation(idx, vi, "target", e.target.value)} />

            {canEditNames && <Button variant="ghost" size="xs" square label="−" disabled={vars.length <= 1} onClick={() => removeRoleVariation(idx, vi)} className="hover:text-danger hover:bg-danger-subtle" />}
          </div>
        );
      })}

      {canEditNames && (
        <div className="flex px-2 py-1.5 border-t border-border-subtle">
          <Button variant="ghost" size="sm" label="+ Add variation" onClick={() => addRoleVariation(idx)} className="text-accent hover:text-accent hover:bg-accent-subtle" />
        </div>
      )}
    </div>
  );
});
