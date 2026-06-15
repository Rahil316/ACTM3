import React, { useState } from "react";
import { LucideSettings as Settings, LucidePalette as Palette, LucideLayers2 as Layers2, LucideVariable as Variable } from "../icons";
import type { Role, Variation } from "../../types/state";
import { CardToolbar } from "../CardToolbar";
import { useProjectStore, SCALE_ALGORITHM_OPTIONS, SOLVER_MODE_OPTIONS, SCALE_ALGORITHM_DESCRIPTIONS, SOLVER_MODE_DESCRIPTIONS } from "../../store/projectStore";
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
  isDragging?: boolean;
}

const EMPTY_VARIATIONS: Variation[] = [];

const ALGO_OPTIONS = SCALE_ALGORITHM_OPTIONS.map((a) => ({ value: a, label: a }));
const SOLVER_OPTIONS = SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }));

export const SCOPE_SHORT: Record<string, string> = {
  FRAME_FILL: "Frame",
  SHAPE_FILL: "Shape",
  TEXT_FILL: "Text",
  STROKE_COLOR: "Stroke",
  EFFECT_COLOR: "Effects",
};

function truncateLabels(labels: string[]): string {
  if (labels.length <= 3) return labels.join(" · ");
  return labels.slice(0, 3).join(" · ") + ` +${labels.length - 3}`;
}

export const RoleGroupCard = React.memo(function RoleGroupCard({ role, idx, dragListeners, dragAttributes, isDragging = false }: RoleGroupCardProps) {
  const [open, toggleOpen] = usePersistedToggle(`role_${role._id}`, false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"colors" | "contrast" | "scope">("colors");

  function openSettings(tab: "colors" | "contrast" | "scope") {
    setSettingsTab(tab);
    setShowSettingsSheet(true);
  }

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
  const roleScopes = useProjectStore((s) => s.projectStore.roles[idx]?.scopes ?? null);
  const colors = useProjectStore((s) => s.projectStore.colors);

  const vars: Variation[] = useProjectStore((s) => s.projectStore.roles[idx]?.variations ?? EMPTY_VARIATIONS);

  const showAlgoRow = pluginMode === "scale" && !useUniformAlgo && algoScope === "role";
  const showSolverRow = pluginMode === "direct" && !useUniformAlgo && algoScope === "role";

  // Color scope tag — shorthands truncated at 3
  const colorScopeLabel = (() => {
    if (scopedIds === null) return null;
    if (scopedIds.length === 0) return "No colors";
    const labels = scopedIds.map((id) => {
      const c = colors.find((c) => c._id === id);
      return c?.shorthand || c?.name || id;
    });
    return truncateLabels(labels);
  })();

  // BG contrast tag — show actual value
  const bgLabel = (() => {
    if (!roleLocalBg) return null;
    const { kind, value } = roleLocalBg;
    if (kind === "token-dynamic") return typeof value === "string" && value ? value : "dynamic";
    if (kind === "token-static") return typeof value === "string" && value ? value : "token";
    if (kind === "color") return typeof value === "string" && value ? value : "color";
    return "hex";
  })();

  // Variable scope tag — summarise restricted scopes
  const varScopeLabel = (() => {
    if (roleScopes === null) return null;
    if (roleScopes.length === 0) return "No scopes";
    return truncateLabels(roleScopes.map((s) => SCOPE_SHORT[s] ?? s));
  })();

  const [localName, onNameChange, onNameBlur] = useLocalField(role.name, (v) => setRole(idx, "name", v));
  const [localShort, onShortChange, onShortBlur] = useLocalField(role.shorthand ?? "", (v) => setRole(idx, "shorthand", v));

  return (
    <div className="group/card relative bg-n-bg-panel rounded-[12px] border border-n-br-default hover:border-n-br-strong p-3 space-y-2 transition-colors">
      {/* Name row */}
      <div className="grid gap-2 items-end grid-cols-[1fr_148px]">
        <Input id={`role-${role._id}-name`} value={localName} onChange={onNameChange} onBlur={onNameBlur} label="Name" size="xl" />
        <Input id={`role-${role._id}-short`} value={localShort} onChange={onShortChange} onBlur={onShortBlur} label="Short" size="xl" />
      </div>

      {!isDragging && (colorScopeLabel || bgLabel || varScopeLabel) && (
        <div className="flex gap-1.5 flex-wrap">
          {colorScopeLabel && (
            <button
              onClick={() => openSettings("colors")}
              title="Color scope"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/25 rounded-full pl-1.5 pr-2 py-0.5 hover:bg-violet-500/20 transition-colors cursor-pointer max-w-[220px] truncate"
            >
              <Palette size={12} strokeWidth={2} className="shrink-0" />
              {colorScopeLabel}
            </button>
          )}
          {bgLabel && (
            <button
              onClick={() => openSettings("contrast")}
              title="Local background"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/25 rounded-full pl-1.5 pr-2 py-0.5 hover:bg-sky-500/20 transition-colors cursor-pointer max-w-[220px] truncate"
            >
              <Layers2 size={12} strokeWidth={2} className="shrink-0" />
              {bgLabel}
            </button>
          )}
          {varScopeLabel && (
            <button
              onClick={() => openSettings("scope")}
              title="Variable scope"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full pl-1.5 pr-2 py-0.5 hover:bg-amber-500/20 transition-colors cursor-pointer max-w-[220px] truncate"
            >
              <Variable size={12} strokeWidth={2} className="shrink-0" />
              {varScopeLabel}
            </button>
          )}
        </div>
      )}

      {!isDragging && (
        <Collapsible
          open={open}
          onToggle={toggleOpen}
          header={<span className="text-[12px] font-medium text-n-tx-primary flex-1">Variations ({vars.length})</span>}
        >
          <div className="py-2">
            <VariationTable variations={vars} canEdit={canEditNames} mappingMethod={roleMappingMethod} idx={idx} scaleLength={scaleLength} />
          </div>
        </Collapsible>
      )}

      {!isDragging && showAlgoRow && (
        <div className="space-y-1 mt-2 pt-2 border-t border-n-br-default">
          <Select label="Algorithm" size="lg" options={ALGO_OPTIONS} value={roleScaleAlgorithm ?? "Natural"} tooltip={SCALE_ALGORITHM_DESCRIPTIONS[roleScaleAlgorithm ?? "Natural"]} onChange={(e) => setRole(idx, "scaleAlgorithm", e.target.value)} />
        </div>
      )}

      {!isDragging && showSolverRow && (
        <div className="space-y-1 mt-2 pt-2 border-t border-n-br-default">
          <Select label="Solver" size="lg" options={SOLVER_OPTIONS} value={roleSolverMode ?? "natural"} tooltip={SOLVER_MODE_DESCRIPTIONS[roleSolverMode ?? "natural"]} onChange={(e) => setRole(idx, "solverMode", e.target.value)} />
        </div>
      )}

      <CardToolbar onDelete={() => removeRole(idx)} deleteDisabled={roleCount <= 1} deleteTitle="Delete role" dragListeners={dragListeners} dragAttributes={dragAttributes}>
        <Button variant="icon" size="sm" className={scopedIds !== null || roleLocalBg != null ? "text-b-tx-muted bg-b-fi-subtle hover:text-b-tx-secondary hover:bg-b-fi-default" : undefined} onClick={() => openSettings("colors")} title="Role settings" icon={<Settings size={11} strokeWidth={1.75} />} />
      </CardToolbar>

      {showSettingsSheet && <RoleSettingsSheet roleIdx={idx} onClose={() => setShowSettingsSheet(false)} initialTab={settingsTab} />}
    </div>
  );
});
