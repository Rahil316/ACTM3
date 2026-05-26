import React, { useState } from 'react';
import { Settings, Check, X } from 'lucide-react';
import { CardToolbar } from '../CardToolbar';
import { useAppStore } from '../../store/appStore';
import { useLocalField } from '../../hooks/useLocalField';
import { Input } from '../Input';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { Collapsible } from '../Collapsible';
import { Select } from '../Select';
import { Sheet } from '../Sheet';
import { usePersistedToggle } from '../../hooks/usePersistedToggle';
import type { Role, Variation } from '../../types/state';
import { SOLVER_MODE_OPTIONS } from '../../store/appStore';

interface RoleGroupCardProps {
  role: Role;
  idx: number;
  dragListeners?: Record<string, unknown>;
  dragAttributes?: Record<string, unknown>;
}

// ── Scope Sheet ───────────────────────────────────────────────────────────────
// Defined at module level so React never remounts it as a "new" component type.

function RoleScopeSheet({
  scopedIds,
  onChange,
  onClose,
}: {
  scopedIds: string[] | null;
  onChange: (ids: string[] | null) => void;
  onClose: () => void;
}) {
  // Only subscribed when the sheet is actually open — cheap.
  const colors = useAppStore((s) => s.appState.colors);
  const isAll = scopedIds === null;
  const effectiveIds = isAll ? colors.map((c) => c._id) : scopedIds;

  function toggleAll() { onChange(null); }

  function toggleColor(id: string) {
    const current = isAll ? colors.map((c) => c._id) : [...scopedIds];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange(next.length === 0 || next.length === colors.length ? null : next);
  }

  return (
    <div className="fixed inset-0 z-40" style={{ background: 'var(--bg-scrim)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <Sheet open className="overflow-y-auto">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Scope to colors</span>
            <button className="text-text-dim hover:text-text-primary cursor-pointer" onClick={onClose}><X size={13} /></button>
          </div>
          <button
            onClick={toggleAll}
            className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle"
          >
            <ScopeCheckbox checked={isAll} />
            <span className="text-[12px] font-medium text-text-primary">All colors</span>
          </button>
          <div className="flex flex-col">
            {colors.map((c) => (
              <button
                key={c._id}
                onClick={() => toggleColor(c._id)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle last:border-0"
              >
                <ScopeCheckbox checked={effectiveIds.includes(c._id)} />
                <div className="w-5 h-5 rounded shrink-0 border border-black/10" style={{ background: c.value }} />
                <span className="text-[12px] text-text-primary">{c.name}</span>
              </button>
            ))}
          </div>
        </Sheet>
      </div>
    </div>
  );
}

function ScopeCheckbox({ checked }: { checked: boolean }) {
  return (
    <div className={['w-4 h-4 rounded border flex items-center justify-center shrink-0', checked ? 'bg-accent border-accent' : 'border-border-strong bg-bg-input'].join(' ')}>
      {checked && <Check size={10} strokeWidth={3} className="text-white" />}
    </div>
  );
}

// ── Variation table ───────────────────────────────────────────────────────────
// Extracted to module level so React doesn't treat it as a new component type
// on each render of RoleGroupCard (which would force full remount every keystroke).

interface VariationTableProps {
  vars: Variation[];
  useCustomVars: boolean;
  role: Role;
  idx: number;
  scaleLength: number;
  setRole: (idx: number, key: string, value: string) => void;
  setRoleVariation: (roleIdx: number, varIdx: number, field: string, value: string) => void;
  addRoleVariation: (roleIdx: number) => void;
  removeRoleVariation: (roleIdx: number, varIdx: number) => void;
}

const VariationTable = React.memo(function VariationTable({
  vars, useCustomVars, role, idx, scaleLength,
  setRole, setRoleVariation, addRoleVariation, removeRoleVariation,
}: VariationTableProps) {
  const cols = useCustomVars ? '16px 1fr 56px 88px 24px' : '16px 1fr 88px';
  const headers = useCustomVars ? ['#', 'Name', 'Short', 'Target', ''] : ['#', 'Variation', 'Target'];

  return (
    <div>
      <div
        className="grid px-2 py-1 bg-bg-app border-b border-border-base gap-1.5"
        style={{ gridTemplateColumns: cols }}
      >
        {headers.map((h) => (
          <span key={h} className="text-[10px] font-bold text-text-muted">{h}</span>
        ))}
      </div>

      {vars.map((v, vi) => {
        const target = (role.variationTargets ?? [])[vi] ?? 4.5;
        return (
          <div
            key={v._id ?? vi}
            className={[
              'grid px-2 py-1 items-center gap-1.5',
              vi < vars.length - 1 ? 'border-b border-border-subtle' : '',
              vi % 2 ? 'bg-bg-app' : '',
            ].join(' ')}
            style={{ gridTemplateColumns: cols }}
          >
            <span className="text-[10px] text-text-muted tabular-nums">{vi + 1}</span>

            {useCustomVars ? (
              <Input size="table" value={v.name ?? ''} onChange={(e) => setRoleVariation(idx, vi, 'name', e.target.value)} />
            ) : (
              <span className="text-[11px] px-1.5 text-text-muted truncate">
                {v.name}{v.shorthand ? ` (${v.shorthand})` : ''}
              </span>
            )}

            {useCustomVars && (
              <Input size="table" value={v.shorthand ?? ''} onChange={(e) => setRoleVariation(idx, vi, 'shorthand', e.target.value)} />
            )}

            <Input
              size="table"
              type="number"
              value={String(target)}
              min={role.mappingMethod === 'index' ? '0' : '1'}
              max={role.mappingMethod === 'index' ? String(scaleLength - 1) : '21'}
              step="0.1"
              onChange={(e) => setRole(idx, `variationTarget:${vi}`, e.target.value)}
            />

            {useCustomVars && (
              <Button
                variant="ghost"
                size="xs"
                square
                label="−"
                disabled={vars.length <= 1}
                onClick={() => removeRoleVariation(idx, vi)}
                className="hover:text-danger hover:bg-danger-subtle"
              />
            )}
          </div>
        );
      })}

      {useCustomVars && (
        <div className="flex px-2 py-1.5 border-t border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            label="+ Add variation"
            onClick={() => addRoleVariation(idx)}
            className="text-accent hover:text-accent hover:bg-accent-subtle"
          />
        </div>
      )}
    </div>
  );
});

// ── Card ──────────────────────────────────────────────────────────────────────

export const RoleGroupCard = React.memo(function RoleGroupCard({
  role, idx, dragListeners, dragAttributes,
}: RoleGroupCardProps) {
  const [open, toggleOpen] = usePersistedToggle(`role_${role._id}`, false);
  const [showScopeSheet, setShowScopeSheet] = useState(false);

  // Actions — stable references, never change
  const setRole              = useAppStore((s) => s.setRole);
  const setRoleScope         = useAppStore((s) => s.setRoleScope);
  const removeRole           = useAppStore((s) => s.removeRole);
  const setRoleVariation     = useAppStore((s) => s.setRoleVariation);
  const addRoleVariation     = useAppStore((s) => s.addRoleVariation);
  const removeRoleVariation  = useAppStore((s) => s.removeRoleVariation);
  const toggleRoleCustomVars = useAppStore((s) => s.toggleRoleCustomVariations);

  // Scalar selectors — only re-render when the specific value changes
  const sharedVariations = useAppStore((s) => s.appState.variations ?? []);
  const scaleLength      = useAppStore((s) => s.appState.scaleLength);
  const pluginMode       = useAppStore((s) => s.appState.pluginMode);
  const useUniformAlgo   = useAppStore((s) => s.appState.useUniformAlgorithm);
  const algoScope        = useAppStore((s) => s.appState.algorithmScopeLevel);
  const perRoleOverride  = useAppStore((s) => s.appState.perRoleVariationOverride);
  const roleCount        = useAppStore((s) => s.appState.roles.length);

  const useCustomVars = role.customVariationList;
  const vars: Variation[] = useCustomVars ? (role.customVariations ?? []) : sharedVariations;

  const showSolverRow = pluginMode === 'direct' && !useUniformAlgo && algoScope === 'role';
  const solverOptions = SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }));

  const canOverride = !!perRoleOverride;
  const scopeBadge = (
    <Badge
      variant={useCustomVars ? 'accent' : 'default'}
      onClick={canOverride ? () => toggleRoleCustomVars(idx) : undefined}
      disabled={!canOverride}
      title={
        !canOverride
          ? 'Enable Role-specific Variations in Settings → Roles to override per role'
          : useCustomVars
          ? 'Click to use global variations'
          : 'Click to use role-specific variations'
      }
    >
      {useCustomVars ? 'Role' : 'Global'}
    </Badge>
  );

  const scopedIds  = role.scopedColorIds ?? null;
  const scopeLabel = scopedIds !== null ? `${scopedIds.length} colors` : null;

  const [localName,  onNameChange,  onNameBlur]  = useLocalField(role.name,            (v) => setRole(idx, 'name', v));
  const [localShort, onShortChange, onShortBlur] = useLocalField(role.shorthand ?? '', (v) => setRole(idx, 'shorthand', v));

  return (
    <div className="group/card relative bg-bg-card rounded-[12px] border border-border-base hover:border-border-strong p-3 space-y-2 transition-colors">
      {/* Name row */}
      <div className="grid gap-2 items-end" style={{ gridTemplateColumns: '1fr 72px' }}>
        <Input
          id={`role-${role._id}-name`}
          value={localName}
          onChange={onNameChange}
          onBlur={onNameBlur}
          label="Name"
          size="xl"
        />
        <Input
          id={`role-${role._id}-short`}
          value={localShort}
          onChange={onShortChange}
          onBlur={onShortBlur}
          label="Short"
          size="xl"
        />
      </div>

      {scopeLabel && (
        <div className="flex">
          <span className="text-[10px] font-semibold text-accent bg-accent-subtle border border-accent/30 rounded-full px-2 py-0.5">
            {scopeLabel}
          </span>
        </div>
      )}

      <Collapsible
        open={open}
        onToggle={toggleOpen}
        header={
          <>
            <span className="text-[12px] font-medium text-text-primary flex-1">
              Variations ({vars.length})
            </span>
            {scopeBadge}
          </>
        }
      >
        <div className="py-2">
          <VariationTable
            vars={vars}
            useCustomVars={useCustomVars}
            role={role}
            idx={idx}
            scaleLength={scaleLength}
            setRole={setRole}
            setRoleVariation={setRoleVariation}
            addRoleVariation={addRoleVariation}
            removeRoleVariation={removeRoleVariation}
          />
        </div>
      </Collapsible>

      {showSolverRow && (
        <div className="space-y-1 mt-2 pt-2 border-t border-border-base">
          <Select
            label="Solver"
            size="lg"
            options={solverOptions}
            value={role.solverMode ?? 'natural'}
            onChange={(e) => setRole(idx, 'solverMode', e.target.value)}
          />
        </div>
      )}

      <CardToolbar
        onDelete={() => removeRole(idx)}
        deleteDisabled={roleCount <= 1}
        deleteTitle="Delete role"
        dragListeners={dragListeners}
        dragAttributes={dragAttributes}
      >
        <button
          className={['w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer', scopedIds !== null ? 'text-accent bg-accent-subtle' : 'text-text-dim hover:text-text-muted hover:bg-bg-hover'].join(' ')}
          onClick={() => setShowScopeSheet(true)}
          title="Scope to colors"
        >
          <Settings size={11} strokeWidth={1.75} />
        </button>
      </CardToolbar>

      {showScopeSheet && (
        <RoleScopeSheet
          scopedIds={scopedIds}
          onChange={(ids) => setRoleScope(idx, ids)}
          onClose={() => setShowScopeSheet(false)}
        />
      )}
    </div>
  );
});
