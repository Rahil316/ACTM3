import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Input } from '../Input';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { Collapsible } from '../Collapsible';
import { IconTrash } from '../icons';
import { Select } from '../Select';
import type { Role, Variation } from '../../types/state';
import { SOLVER_MODE_OPTIONS } from '../../store/appStore';

interface RoleGroupCardProps {
  role: Role;
  idx: number;
}

export function RoleGroupCard({ role, idx }: RoleGroupCardProps) {
  const [open, setOpen] = useState(false);

  const setRole                 = useAppStore((s) => s.setRole);
  const removeRole              = useAppStore((s) => s.removeRole);
  const setRoleVariation        = useAppStore((s) => s.setRoleVariation);
  const addRoleVariation        = useAppStore((s) => s.addRoleVariation);
  const removeRoleVariation     = useAppStore((s) => s.removeRoleVariation);
  const toggleRoleCustomVars    = useAppStore((s) => s.toggleRoleCustomVariations);
  const sharedVariations        = useAppStore((s) => s.appState.variations ?? []);
  const scaleLength             = useAppStore((s) => s.appState.scaleLength);
  const pluginMode              = useAppStore((s) => s.appState.pluginMode);
  const useUniformAlgo          = useAppStore((s) => s.appState.useUniformAlgorithm);
  const algoScope               = useAppStore((s) => s.appState.algorithmScopeLevel);
  const perRoleOverride         = useAppStore((s) => s.appState.perRoleVariationOverride);

  const useShorthandRoles = useAppStore((s) => s.appState.useShorthandRoles);
  const roleCount         = useAppStore((s) => s.appState.roles.length);

  const useCustomVars = role.customVariationList;
  const vars: Variation[] = useCustomVars
    ? (role.customVariations ?? [])
    : sharedVariations;

  // Solver row: direct mode, not uniform, scope is role
  const showSolverRow =
    pluginMode === 'direct' && !useUniformAlgo && algoScope === 'role';

  const solverOptions = SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }));

  // ── Variation table ──────────────────────────────────────────────────────

  function VariationTable() {
    const cols = useCustomVars
      ? '16px 1fr 56px 88px 24px'
      : '16px 1fr 88px';
    const headers = useCustomVars
      ? ['#', 'Name', 'Short', 'Target', '']
      : ['#', 'Variation', 'Target'];

    return (
      <div className="overflow-hidden">
        {/* Header */}
        <div
          className="grid px-2 py-1 bg-bg-app border-b border-border-base gap-1.5"
          style={{ gridTemplateColumns: cols }}
        >
          {headers.map((h) => (
            <span key={h} className="text-[10px] font-bold text-text-muted">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {vars.map((v, vi) => {
          const target = (role.variationTargets ?? [])[vi] ?? 4.5;
          return (
            <div
              key={v._id ?? vi}
              className={[
                'grid px-2 py-1 items-center gap-1.5',
                vi < vars.length - 1 ? 'border-b border-border-base/40' : '',
                vi % 2 ? 'bg-bg-input/20' : '',
              ].join(' ')}
              style={{ gridTemplateColumns: cols }}
            >
              <span className="text-[10px] text-text-muted tabular-nums">{vi + 1}</span>

              {/* Name cell */}
              {useCustomVars ? (
                <Input
                  size="table"
                  value={v.name ?? ''}
                  onChange={(e) => setRoleVariation(idx, vi, 'name', e.target.value)}
                />
              ) : (
                <span className="text-[11px] px-1.5 text-text-muted truncate">
                  {v.name}{v.shorthand ? ` (${v.shorthand})` : ''}
                </span>
              )}

              {/* Shorthand cell (custom only) */}
              {useCustomVars && (
                <Input
                  size="table"
                  value={v.shorthand ?? ''}
                  onChange={(e) => setRoleVariation(idx, vi, 'shorthand', e.target.value)}
                />
              )}

              {/* Target (contrast or index) */}
              <Input
                size="table"
                type="number"
                value={String(target)}
                min={role.mappingMethod === 'index' ? '0' : '1'}
                max={role.mappingMethod === 'index' ? String(scaleLength - 1) : '21'}
                step="0.1"
                onChange={(e) => setRole(idx, `variationTarget:${vi}`, e.target.value)}
              />

              {/* Remove (custom only) */}
              {useCustomVars && (
                <Button
                  variant="ghost"
                  size="xs"
                  square
                  label="−"
                  disabled={vars.length <= 1}
                  onClick={() => removeRoleVariation(idx, vi)}
                  className="hover:text-danger hover:bg-danger/10"
                />
              )}
            </div>
          );
        })}

        {/* Add row (custom only) */}
        {useCustomVars && (
          <div className="flex px-2 py-1.5 border-t border-border-base/40">
            <Button
              variant="ghost"
              size="sm"
              label="+ Add variation"
              onClick={() => addRoleVariation(idx)}
              className="text-accent hover:text-accent hover:bg-accent/10"
            />
          </div>
        )}
      </div>
    );
  }

  // ── Card assembly ────────────────────────────────────────────────────────

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

  return (
    <div className="bg-bg-card rounded-[12px] border border-border-base p-3 space-y-2">
      {/* Name row */}
      <div className="grid gap-2 items-end" style={{ gridTemplateColumns: useShorthandRoles ? '1fr 96px 36px' : '1fr 36px' }}>
        <Input
          id={`role-${role._id}-name`}
          value={role.name}
          onChange={(e) => setRole(idx, 'name', e.target.value)}
          label="Role Name"
          size="xl"
        />
        {useShorthandRoles && (
          <Input
            id={`role-${role._id}-short`}
            value={role.shorthand ?? ''}
            onChange={(e) => setRole(idx, 'shorthand', e.target.value)}
            label="Shorthand"
            size="xl"
          />
        )}
        <div className="self-end">
          <Button
            variant="danger"
            size="md"
            square
            icon={<IconTrash />}
            onClick={() => removeRole(idx)}
            disabled={roleCount <= 1}
            aria-label="Delete role"
          />
        </div>
      </div>

      {/* Collapsible variation section */}
      <Collapsible
        open={open}
        onToggle={() => setOpen((v) => !v)}
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
          <VariationTable />
        </div>
      </Collapsible>

      {/* Per-role solver (direct mode + role scope) */}
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
    </div>
  );
}
