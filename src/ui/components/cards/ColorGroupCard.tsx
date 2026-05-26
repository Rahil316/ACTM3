import React from "react";
import { useAppStore } from "../../store/appStore";
import { useLocalField } from "../../hooks/useLocalField";
import { Input } from "../Input";
import { ColorInput } from "../ColorInput";
import { Button } from "../Button";
import { Select } from "../Select";
import { IconTrash } from "../icons";
import type { Color } from "../../types/state";
import { SCALE_ALGORITHM_OPTIONS, SOLVER_MODE_OPTIONS } from "../../store/appStore";
import { ControlLabel } from "../typography";

interface ColorGroupCardProps {
  color: Color;
  idx: number;
}

export const ColorGroupCard = React.memo(function ColorGroupCard({ color, idx }: ColorGroupCardProps) {
  const setColor    = useAppStore((s) => s.setColor);
  const removeColor = useAppStore((s) => s.removeColor);
  const colorCount  = useAppStore((s) => s.appState.colors.length);
  const pluginMode  = useAppStore((s) => s.appState.pluginMode);
  const useUniformAlgo      = useAppStore((s) => s.appState.useUniformAlgorithm);
  const algoScope           = useAppStore((s) => s.appState.algorithmScopeLevel);
  const includeDescriptions = useAppStore((s) => s.appState.includeDescriptions);

  const showAlgoRow   = pluginMode === "scale"  && !useUniformAlgo && algoScope !== "role";
  const showSolverRow = pluginMode === "direct" && !useUniformAlgo && algoScope !== "role";

  const algoOptions   = SCALE_ALGORITHM_OPTIONS.map((a) => ({ value: a, label: a }));
  const solverOptions = SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }));

  const [localName,  onNameChange,  onNameBlur]  = useLocalField(color.name,            (v) => setColor(idx, "name", v));
  const [localShort, onShortChange, onShortBlur] = useLocalField(color.shorthand ?? "", (v) => setColor(idx, "shorthand", v));

  return (
    <div className="group/card bg-bg-card rounded-[12px] border border-border-base hover:border-border-strong p-3 space-y-2 transition-colors">
      {/* Main row: name / shorthand / color value / delete */}
      <div className="grid gap-2 items-end" style={{ gridTemplateColumns: "1fr 72px 116px 40px" }}>
        <Input id={`clr-${color._id}-name`} value={localName} onChange={onNameChange} onBlur={onNameBlur} label="Name" size="xl" />
        <Input id={`clr-${color._id}-short`} value={localShort} onChange={onShortChange} onBlur={onShortBlur} label="Short" size="xl" />
        <div className="space-y-1">
          <ControlLabel className="ml-1">Value</ControlLabel>
          <ColorInput value={color.value} onUpdate={(hex) => setColor(idx, "value", hex)} idPrefix={`clr-${color._id}`} size="xl" />
        </div>
        <div className="self-end opacity-0 group-hover/card:opacity-100 transition-opacity">
          <Button variant="danger" size="xl" square icon={<IconTrash />} onClick={() => removeColor(idx)} disabled={colorCount <= 1} aria-label="Delete color" />
        </div>
      </div>

      {showAlgoRow && <Select label="Scale Algorithm" size="lg" options={algoOptions} value={color.scaleAlgorithm ?? "Natural"} onChange={(e) => setColor(idx, "scaleAlgorithm", e.target.value)} />}
      {showSolverRow && <Select label="Color Solver" size="xl" options={solverOptions} value={color.solverMode ?? "natural"} onChange={(e) => setColor(idx, "solverMode", e.target.value)} />}
      {includeDescriptions && <Input value={color.description ?? ""} placeholder="Optional…" onChange={(e) => setColor(idx, "description", e.target.value)} label="Description" size="lg" />}
    </div>
  );
});
