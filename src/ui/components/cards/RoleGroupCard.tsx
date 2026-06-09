import React, { useState } from "react";
import { Settings } from "lucide-react";
import type { Role, Variation } from "../../types/state";
import { CardToolbar } from "../CardToolbar";
import { useProjectStore, SCALE_ALGORITHM_OPTIONS, SOLVER_MODE_OPTIONS } from "../../store/projectStore";
import { useLocalField } from "../../hooks/useLocalField";
import { Input } from "../Input";
import { Button } from "../Button";
import { Collapsible } from "../Collapsible";
import { Select } from "../Select";
import { usePersistedToggle } from "../../hooks/usePersistedToggle";
import { VariationTable } from "./VariationTable";
import { RoleSettingsSheet } from "./RoleSettingsSheet";

interface RoleGroupCardProps {
  role: Role;
  idx: number;
  dragListeners?: Record<string, unknown>;
  dragAttributes?: Record<string, unknown>;
}

const EMPTY_VARIATIONS: Variation[] = [];

export const RoleGroupCard = React.memo(function RoleGroupCard({ role, idx, dragListeners, dragAttributes }: RoleGroupCardProps) {
  const [open, toggleOpen] = usePersistedToggle(`role_${role._id}`, false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);

  // Actions — stable references, never change
  const setRole = useProjectStore((s) => s.setRole);
  const removeRole = useProjectStore((s) => s.removeRole);

  // Scalar selectors — only re-render when the specific value changes
  const scaleLength = useProjectStore((s) => s.projectStore.scaleLength);
  const pluginMode = useProjectStore((s) => s.projectStore.pluginMode);
  const useUniformAlgo = useProjectStore((s) => s.projectStore.useUniformAlgorithm);
  const algoScope = useProjectStore((s) => s.projectStore.algorithmScopeLevel);
  const canEditNames = useProjectStore((s) => s.projectStore.canEditRoleVariants);
  const roleCount = useProjectStore((s) => s.projectStore.roles.length);

  // Role-level fields — subscribed directly to avoid stale-prop re-render issues
  const roleMappingMethod = useProjectStore((s) => s.projectStore.roles[idx]?.mappingMethod ?? "contrast");
  const roleScaleAlgorithm = useProjectStore((s) => s.projectStore.roles[idx]?.scaleAlgorithm);
  const roleSolverMode = useProjectStore((s) => s.projectStore.roles[idx]?.solverMode);
  const scopedIds = useProjectStore((s) => s.projectStore.roles[idx]?.scopedColorIds ?? null);
  const roleLocalBg = useProjectStore((s) => s.projectStore.roles[idx]?.localBg);

  const vars: Variation[] = useProjectStore((s) => s.projectStore.roles[idx]?.variations ?? EMPTY_VARIATIONS);

  const showAlgoRow = pluginMode === "scale" && !useUniformAlgo && algoScope === "role";
  const showSolverRow = pluginMode === "direct" && !useUniformAlgo && algoScope === "role";
  const algoOptions = SCALE_ALGORITHM_OPTIONS.map((a) => ({ value: a, label: a }));
  const solverOptions = SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }));

  const scopeLabel = scopedIds !== null ? (scopedIds.length === 0 ? "No colors" : `${scopedIds.length} colors`) : null;
  const hasLocalBg = roleLocalBg;
  const localBgLabel = roleLocalBg ? (roleLocalBg.kind === "token-dynamic" ? "BG: dynamic" : roleLocalBg.kind === "token-static" ? "BG: token" : roleLocalBg.kind === "color" ? "BG: color" : "BG: hex") : null;

  const [localName, onNameChange, onNameBlur] = useLocalField(role.name, (v) => setRole(idx, "name", v));
  const [localShort, onShortChange, onShortBlur] = useLocalField(role.shorthand ?? "", (v) => setRole(idx, "shorthand", v));

  return (
    <div className="group/card relative bg-bg-card rounded-[12px] border border-border-base hover:border-border-strong p-3 space-y-2 transition-colors">
      {/* Name row */}
      <div className="grid gap-2 items-end grid-cols-[1fr_148px]">
        <Input id={`role-${role._id}-name`} value={localName} onChange={onNameChange} onBlur={onNameBlur} label="Name" size="xl" />
        <Input id={`role-${role._id}-short`} value={localShort} onChange={onShortChange} onBlur={onShortBlur} label="Short" size="xl" />
      </div>

      {(scopeLabel || localBgLabel) && (
        <div className="flex gap-1.5 flex-wrap">
          {scopeLabel && <span className="text-[10px] font-semibold text-accent bg-accent-subtle border border-accent/30 rounded-full px-2 py-0.5">{scopeLabel}</span>}
          {localBgLabel && <span className="text-[10px] font-semibold text-accent bg-accent-subtle border border-accent/30 rounded-full px-2 py-0.5">{localBgLabel}</span>}
        </div>
      )}

      <Collapsible
        open={open}
        onToggle={toggleOpen}
        header={
          <>
            <span className="text-[12px] font-medium text-text-primary flex-1">Variations ({vars.length})</span>
          </>
        }
      >
        <div className="py-2">
          <VariationTable variations={vars} canEdit={canEditNames} mappingMethod={roleMappingMethod} idx={idx} scaleLength={scaleLength} />
        </div>
      </Collapsible>

      {showAlgoRow && (
        <div className="space-y-1 mt-2 pt-2 border-t border-border-base">
          <Select label="Algorithm" size="lg" options={algoOptions} value={roleScaleAlgorithm ?? "Natural"} onChange={(e) => setRole(idx, "scaleAlgorithm", e.target.value)} />
        </div>
      )}

      {showSolverRow && (
        <div className="space-y-1 mt-2 pt-2 border-t border-border-base">
          <Select label="Solver" size="lg" options={solverOptions} value={roleSolverMode ?? "natural"} onChange={(e) => setRole(idx, "solverMode", e.target.value)} />
        </div>
      )}

      <CardToolbar onDelete={() => removeRole(idx)} deleteDisabled={roleCount <= 1} deleteTitle="Delete role" dragListeners={dragListeners} dragAttributes={dragAttributes}>
        <Button
          variant="icon"
          size="sm"
          className={scopedIds !== null || hasLocalBg ? "text-accent bg-accent-subtle hover:text-accent-hover hover:bg-accent-subtle/80" : undefined}
          onClick={() => setShowSettingsSheet(true)}
          title="Role settings"
          icon={<Settings size={11} strokeWidth={1.75} />}
        />
      </CardToolbar>

      {showSettingsSheet && <RoleSettingsSheet roleIdx={idx} onClose={() => setShowSettingsSheet(false)} />}
    </div>
  );
});
