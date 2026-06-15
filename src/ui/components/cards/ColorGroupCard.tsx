import React from "react";
import { useProjectStore } from "../../store/projectStore";
import { useLocalField } from "../../hooks/useLocalField";
import { Input } from "../Input";
import { ColorInput } from "../ColorInput";
import { Select } from "../Select";
import { CardToolbar } from "../CardToolbar";
import type { Color } from "../../types/state";
import { SCALE_ALGORITHM_OPTIONS, SOLVER_MODE_OPTIONS, SCALE_ALGORITHM_DESCRIPTIONS, SOLVER_MODE_DESCRIPTIONS } from "../../store/projectStore";
import { ControlLabel } from "../typography";

interface ColorGroupCardProps {
  color: Color;
  idx: number;
  dragListeners?: Record<string, unknown>;
  dragAttributes?: Record<string, unknown>;
}

export const ColorGroupCard = React.memo(function ColorGroupCard({ color, idx, dragListeners, dragAttributes }: ColorGroupCardProps) {
  const setColor = useProjectStore((s) => s.setColor);
  const removeColor = useProjectStore((s) => s.removeColor);
  const colorCount = useProjectStore((s) => s.projectStore.colors.length);
  const pluginMode = useProjectStore((s) => s.projectStore.pluginMode);
  const useUniformAlgo = useProjectStore((s) => s.projectStore.useUniformAlgorithm);
  const algoScope = useProjectStore((s) => s.projectStore.algorithmScopeLevel);
  const includeDescriptions = useProjectStore((s) => s.projectStore.includeDescriptions);
  const colorScaleAlgorithm = useProjectStore((s) => s.projectStore.colors[idx]?.scaleAlgorithm);
  const colorSolverMode = useProjectStore((s) => s.projectStore.colors[idx]?.solverMode);

  const showAlgoRow = pluginMode === "scale" && !useUniformAlgo && algoScope !== "role";
  const showSolverRow = pluginMode === "direct" && !useUniformAlgo && algoScope !== "role";

  const algoOptions = SCALE_ALGORITHM_OPTIONS.map((a) => ({ value: a, label: a }));
  const solverOptions = SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }));

  const [localName, onNameChange, onNameBlur] = useLocalField(color.name, (v) => setColor(idx, "name", v));
  const [localShort, onShortChange, onShortBlur] = useLocalField(color.shorthand ?? "", (v) => setColor(idx, "shorthand", v));
  const [localDesc, onDescChange, onDescBlur] = useLocalField(color.description ?? "", (v) => setColor(idx, "description", v));

  return (
    <div className="group/card relative bg-n-bg-panel rounded-[12px] border border-n-br-default hover:border-n-br-strong p-3 space-y-2 transition-colors">
      {/* Main row: name / shorthand / color value */}
      <div className="grid gap-2 items-end grid-cols-[1fr_120px_120px]">
        <Input id={`clr-${color._id}-name`} value={localName} onChange={onNameChange} onBlur={onNameBlur} label="Name" size="xl" />
        <Input id={`clr-${color._id}-short`} value={localShort} onChange={onShortChange} onBlur={onShortBlur} label="Short" size="xl" />
        <div className="space-y-1">
          <ControlLabel className="ml-1">Value</ControlLabel>
          <ColorInput value={color.value} onUpdate={(hex) => setColor(idx, "value", hex)} idPrefix={`clr-${color._id}`} size="xl" />
        </div>
      </div>

      {showAlgoRow && <Select label="Scale Algorithm" size="lg" options={algoOptions} value={colorScaleAlgorithm ?? "Natural"} tooltip={SCALE_ALGORITHM_DESCRIPTIONS[colorScaleAlgorithm ?? "Natural"]} onChange={(e) => setColor(idx, "scaleAlgorithm", e.target.value)} />}
      {showSolverRow && <Select label="Color Solver" size="xl" options={solverOptions} value={colorSolverMode ?? "natural"} tooltip={SOLVER_MODE_DESCRIPTIONS[colorSolverMode ?? "natural"]} onChange={(e) => setColor(idx, "solverMode", e.target.value)} />}
      {includeDescriptions && <Input value={localDesc} placeholder="Optional…" onChange={onDescChange} onBlur={onDescBlur} label="Description" size="lg" />}

      <CardToolbar onDelete={() => removeColor(idx)} deleteDisabled={colorCount <= 1} deleteTitle="Delete color" dragListeners={dragListeners} dragAttributes={dragAttributes} />
    </div>
  );
});
