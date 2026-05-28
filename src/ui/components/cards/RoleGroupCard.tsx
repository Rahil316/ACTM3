import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { variableMaker } from '../../lib/colorEngine';
import { Settings, X, ChevronDown } from 'lucide-react';
import { Checkbox } from '../Checkbox';
import type { Color, Theme, RoleLocalBg, RoleLocalBgKind, Role, Variation } from '../../types/state';
import { CardToolbar } from '../CardToolbar';
import { useAppStore } from '../../store/appStore';
import { useLocalField } from '../../hooks/useLocalField';
import { Input } from '../Input';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { Collapsible } from '../Collapsible';
import { Select } from '../Select';
import { usePersistedToggle } from '../../hooks/usePersistedToggle';
import { SOLVER_MODE_OPTIONS } from '../../store/appStore';

interface RoleGroupCardProps {
  role: Role;
  idx: number;
  dragListeners?: Record<string, unknown>;
  dragAttributes?: Record<string, unknown>;
}

// ── FloatingDropdown ──────────────────────────────────────────────────────────
// Portals a dropdown list anchored to a ref element.
// Flips above the anchor when there isn't enough space below.

const DROPDOWN_MAX_H = 192; // px — max-h-48

function FloatingDropdown({
  anchorRef,
  open,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: React.ReactNode;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    function position() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openAbove = spaceBelow < DROPDOWN_MAX_H + 8 && spaceAbove > spaceBelow;
      setStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + 4, top: 'auto' }
          : { top: rect.bottom + 4, bottom: 'auto' }),
      });
    }
    position();
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    return () => {
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
    };
  }, [open, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      className="bg-bg-card border border-border-base rounded-[8px] shadow-xl overflow-y-auto"
      style={{ ...style, maxHeight: DROPDOWN_MAX_H }}
    >
      {children}
    </div>,
    document.body,
  );
}

// ── Local background sub-inputs ───────────────────────────────────────────────

function LocalBgTokenInput({ localBg, onChange }: { localBg: RoleLocalBg | null; onChange: (bg: RoleLocalBg | null) => void }) {
  const appState = useAppStore((s) => s.appState);
  const isDynamic = !!(localBg?.dynamic);
  const storeVal = typeof localBg?.value === 'string' ? localBg.value : '';
  const [query, setQuery] = useState(storeVal);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query when store value changes (kind switch, dynamic toggle)
  const prevStoreVal = useRef(storeVal);
  if (prevStoreVal.current !== storeVal) {
    prevStoreVal.current = storeVal;
    setQuery(storeVal);
  }

  // When dynamic, produce token list using a placeholder color name so suggestions
  // show the [color]-stripped suffix (e.g. "fill/base" instead of "gray/fill/base")
  const PLACEHOLDER_COLOR = appState.colors[0]?.name ?? '__color__';

  const allTokenNames = useMemo(() => {
    try {
      const result = variableMaker({
        colors: appState.colors.map((c) => ({ name: c.name, shorthand: c.shorthand, value: c.value, _id: c._id })),
        themes: (appState.themes ?? []).map((t) => ({ name: t.name, bg: t.bg })),
        roles: (appState.roles ?? []).map((r) => ({
          name: r.name, shorthand: r.shorthand,
          variationTargets: r.variationTargets, mappingMethod: r.mappingMethod,
          customVariationList: r.customVariationList, customVariations: r.customVariations,
        })),
        variations: appState.variations ?? [],
        scaleLength: appState.scaleLength ?? 11,
        pluginMode: appState.pluginMode ?? 'scale',
        scaleAlgorithm: appState.scaleAlgorithm ?? 'Natural',
        tokenGrouping: 'color',
        tokenNameSegments: ['color', 'role', 'variation'],
      } as Parameters<typeof variableMaker>[0]);
      const names = new Set<string>();
      for (const themeTokens of Object.values(result.tokens ?? {})) {
        for (const colorTokens of Object.values(themeTokens as object)) {
          for (const roleTokens of Object.values(colorTokens as object)) {
            for (const token of Object.values(roleTokens as object)) {
              const name = (token as any).tokenName;
              if (!name) continue;
              if (isDynamic) {
                // Strip the leading "<colorName>/" prefix so suggestions show color-agnostic paths
                const colorPrefix = PLACEHOLDER_COLOR.toLowerCase() + '/';
                const stripped = name.toLowerCase().startsWith(colorPrefix)
                  ? name.slice(PLACEHOLDER_COLOR.length + 1)
                  : name;
                names.add(stripped);
              } else {
                names.add(name);
              }
            }
          }
        }
      }
      return Array.from(names).sort();
    } catch {
      return [];
    }
  }, [appState, isDynamic, PLACEHOLDER_COLOR]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? allTokenNames.filter((n) => n.toLowerCase().includes(q)) : allTokenNames;
  }, [allTokenNames, query]);

  function select(name: string) {
    setQuery(name);
    onChange({ kind: 'token', value: name, dynamic: isDynamic });
    setOpen(false);
  }

  function toggleDynamic() {
    const next = !isDynamic;
    // Clear the value when switching modes — token names have different shapes
    onChange({ kind: 'token', value: '', dynamic: next });
    setQuery('');
  }

  return (
    <div className="px-4 pb-3 space-y-2">
      {/* Per-color toggle */}
      <button
        onClick={toggleDynamic}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <Checkbox checked={isDynamic} />
        <span className="text-[11px] text-text-muted group-hover:text-text-primary transition-colors">Per color</span>
      </button>

      {/* Input row */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Token ref</label>
        <div className="relative flex items-center">
          {isDynamic && (
            <span className="absolute left-2 text-[11px] font-mono text-accent select-none pointer-events-none">
              [color]/
            </span>
          )}
          <input
            ref={inputRef}
            className={[
              'w-full bg-bg-input border border-border-base rounded-[6px] py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-accent',
              isDynamic ? 'pl-[62px] pr-2' : 'px-2',
            ].join(' ')}
            placeholder={isDynamic ? 'fill/base…' : 'Search tokens…'}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          <FloatingDropdown anchorRef={inputRef} open={open && filtered.length > 0}>
            {filtered.map((name) => (
              <button
                key={name}
                className={[
                  'w-full text-left px-3 py-1.5 text-[11px] font-mono hover:bg-bg-hover transition-colors',
                  name === storeVal ? 'text-accent' : 'text-text-primary',
                ].join(' ')}
                onMouseDown={(e) => { e.preventDefault(); select(name); }}
              >
                {isDynamic ? <><span className="text-accent">[color]/</span>{name}</> : name}
              </button>
            ))}
          </FloatingDropdown>
        </div>
        <p className="text-[10px] text-text-dim">
          {isDynamic
            ? 'Resolved per color — e.g. gray/fill/base for gray, blue/fill/base for blue.'
            : 'Same token used as bg for all colors.'}
        </p>
      </div>
    </div>
  );
}

function LocalBgColorInput({ localBg, colors, onChange }: { localBg: RoleLocalBg | null; colors: Color[]; onChange: (bg: RoleLocalBg | null) => void }) {
  const val = typeof localBg?.value === 'string' ? localBg.value : (colors[0]?.name ?? '');
  return (
    <div className="px-4 pb-3 space-y-1">
      <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Color</label>
      <div className="relative">
        <select
          className="w-full appearance-none bg-bg-input border border-border-base rounded-[6px] px-2 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-accent pr-6"
          value={val}
          onChange={(e) => onChange({ kind: 'color', value: e.target.value })}
        >
          {colors.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
      </div>
    </div>
  );
}

function LocalBgHexInput({ themeKey, themeName, value, onCommit }: { themeKey: string; themeName: string; value: string; onCommit: (key: string, val: string) => void }) {
  const [local, handleChange, handleBlur] = useLocalField(value, (v) => onCommit(themeKey, v));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-text-muted w-14 shrink-0">{themeName}</span>
      <input
        className="flex-1 bg-bg-input border border-border-base rounded-[6px] px-2 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-accent font-mono"
        placeholder="#ffffff"
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
}

function LocalBgHexInputs({ localBg, themes, onChange }: { localBg: RoleLocalBg | null; themes: Theme[]; onChange: (bg: RoleLocalBg | null) => void }) {
  const hexMap = (typeof localBg?.value === 'object' && localBg?.value !== null)
    ? (localBg.value as Record<string, string>)
    : {};
  function commitKey(key: string, val: string) {
    onChange({ kind: 'hex', value: { ...hexMap, [key]: val } });
  }
  return (
    <div className="px-4 pb-3 space-y-2">
      {themes.map((t) => (
        <LocalBgHexInput
          key={t._id}
          themeKey={t.name.toLowerCase()}
          themeName={t.name}
          value={hexMap[t.name.toLowerCase()] ?? ''}
          onCommit={commitKey}
        />
      ))}
    </div>
  );
}

// ── Role Settings Sheet ───────────────────────────────────────────────────────
// Defined at module level so React never remounts it as a "new" component type.

function RoleSettingsSheet({
  roleIdx,
  onClose,
}: {
  roleIdx: number;
  onClose: () => void;
}) {
  const colors       = useAppStore((s) => s.appState.colors);
  const themes       = useAppStore((s) => s.appState.themes ?? []);
  const role         = useAppStore((s) => s.appState.roles[roleIdx]);
  const setRoleScope = useAppStore((s) => s.setRoleScope);
  const setRoleLocalBg = useAppStore((s) => s.setRoleLocalBg);

  // ── Draft state — only committed to store on "Apply changes" ──────────────
  const [draftScopedIds, setDraftScopedIds] = useState<string[] | null>(role?.scopedColorIds ?? null);
  const [draftLocalBg, setDraftLocalBg] = useState<RoleLocalBg | null>(role?.localBg ?? null);

  const isAll = draftScopedIds === null;
  const effectiveIds: string[] = isAll ? colors.map((c) => c._id) : draftScopedIds;

  const bgKind: RoleLocalBgKind | 'none' = draftLocalBg?.kind ?? 'none';

  function toggleAll() {
    setDraftScopedIds(isAll ? [] : null);
  }
  function toggleColor(id: string) {
    const current: string[] = isAll ? colors.map((c) => c._id) : [...draftScopedIds!];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setDraftScopedIds(next.length === colors.length ? null : next);
  }

  function setBgKind(kind: RoleLocalBgKind | 'none') {
    if (kind === 'none') { setDraftLocalBg(null); return; }
    if (kind === 'token') { setDraftLocalBg({ kind: 'token', value: '' }); return; }
    if (kind === 'color') { setDraftLocalBg({ kind: 'color', value: colors[0]?.name ?? '' }); return; }
    if (kind === 'hex') {
      const map: Record<string, string> = {};
      (themes || []).forEach((t) => { map[t.name.toLowerCase()] = '#ffffff'; });
      setDraftLocalBg({ kind: 'hex', value: map });
    }
  }

  function applyChanges() {
    setRoleScope(roleIdx, draftScopedIds);
    setRoleLocalBg(roleIdx, draftLocalBg);
    onClose();
  }

  const kindOptions: { value: RoleLocalBgKind | 'none'; label: string }[] = [
    { value: 'none', label: 'Theme BG' },
    { value: 'token', label: 'Token' },
    { value: 'color', label: 'Color' },
    { value: 'hex', label: 'Hex' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0" style={{ background: 'var(--bg-scrim)' }} onClick={onClose} />
      <div className="relative z-10 max-h-[90%] flex flex-col bg-bg-panel rounded-t-[16px] border-t border-border-base overflow-y-auto">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Role Settings</span>
            <button className="text-text-dim hover:text-text-primary cursor-pointer" onClick={onClose}>
              <X size={13} />
            </button>
          </div>

          {/* ── Color Scope ── */}
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Color Scope</span>
          </div>
          <button
            onClick={toggleAll}
            className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle"
          >
            <Checkbox checked={isAll} />
            <span className="text-[12px] font-medium text-text-primary">All colors</span>
          </button>
          <div className="flex flex-col border-b border-border-base">
            {colors.map((c) => (
              <button
                key={c._id}
                onClick={() => toggleColor(c._id)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle last:border-0"
              >
                <Checkbox checked={effectiveIds.includes(c._id)} />
                <div className="w-5 h-5 rounded shrink-0 border border-black/10" style={{ background: c.value }} />
                <span className="text-[12px] text-text-primary">{c.name}</span>
              </button>
            ))}
          </div>

          {/* ── Local Background ── */}
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Local Background</span>
          </div>
          <div className="px-4 pb-1">
            <p className="text-[11px] text-text-dim">
              Contrast calculated against this background instead of the global theme background.
            </p>
          </div>

          {/* Kind selector */}
          <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
            {kindOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBgKind(opt.value)}
                className={[
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer',
                  bgKind === opt.value
                    ? 'bg-accent text-text-on-accent border-accent'
                    : 'bg-bg-input text-text-muted border-border-base hover:border-border-strong',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {bgKind === 'token' && <LocalBgTokenInput localBg={draftLocalBg} onChange={setDraftLocalBg} />}
          {bgKind === 'color' && <LocalBgColorInput localBg={draftLocalBg} colors={colors} onChange={setDraftLocalBg} />}
          {bgKind === 'hex'   && <LocalBgHexInputs  localBg={draftLocalBg} themes={themes}   onChange={setDraftLocalBg} />}

          {/* ── Apply ── */}
          <div className="px-4 py-3 border-t border-border-subtle shrink-0">
            <button
              onClick={applyChanges}
              className="w-full py-2 rounded-[8px] bg-accent hover:bg-accent-hover text-text-on-accent text-[12px] font-semibold transition-colors cursor-pointer"
            >
              Apply changes
            </button>
          </div>
      </div>
    </div>,
    document.body
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
  vars,
  useCustomVars,
  role,
  idx,
  scaleLength,
  setRole,
  setRoleVariation,
  addRoleVariation,
  removeRoleVariation,
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
          <span key={h} className="text-[10px] font-bold text-text-muted">
            {h}
          </span>
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
              <Input
                size="table"
                value={v.name ?? ''}
                onChange={(e) => setRoleVariation(idx, vi, 'name', e.target.value)}
              />
            ) : (
              <span className="text-[11px] px-1.5 text-text-muted truncate">
                {v.name}
                {v.shorthand ? ` (${v.shorthand})` : ''}
              </span>
            )}

            {useCustomVars && (
              <Input
                size="table"
                value={v.shorthand ?? ''}
                onChange={(e) => setRoleVariation(idx, vi, 'shorthand', e.target.value)}
              />
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
  role,
  idx,
  dragListeners,
  dragAttributes,
}: RoleGroupCardProps) {
  const [open, toggleOpen] = usePersistedToggle(`role_${role._id}`, false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);

  // Actions — stable references, never change
  const setRole = useAppStore((s) => s.setRole);
  const removeRole = useAppStore((s) => s.removeRole);
  const setRoleVariation = useAppStore((s) => s.setRoleVariation);
  const addRoleVariation = useAppStore((s) => s.addRoleVariation);
  const removeRoleVariation = useAppStore((s) => s.removeRoleVariation);
  const toggleRoleCustomVars = useAppStore((s) => s.toggleRoleCustomVariations);

  // Scalar selectors — only re-render when the specific value changes
  const sharedVariations = useAppStore((s) => s.appState.variations ?? []);
  const scaleLength = useAppStore((s) => s.appState.scaleLength);
  const pluginMode = useAppStore((s) => s.appState.pluginMode);
  const useUniformAlgo = useAppStore((s) => s.appState.useUniformAlgorithm);
  const algoScope = useAppStore((s) => s.appState.algorithmScopeLevel);
  const perRoleOverride = useAppStore((s) => s.appState.perRoleVariationOverride);
  const roleCount = useAppStore((s) => s.appState.roles.length);

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

  const scopedIds = role.scopedColorIds ?? null;
  const scopeLabel = scopedIds !== null
    ? (scopedIds.length === 0 ? 'No colors' : `${scopedIds.length} colors`)
    : null;
  const hasLocalBg = !!role.localBg;

  const [localName, onNameChange, onNameBlur] = useLocalField(role.name, (v) => setRole(idx, 'name', v));
  const [localShort, onShortChange, onShortBlur] = useLocalField(role.shorthand ?? '', (v) =>
    setRole(idx, 'shorthand', v),
  );

  return (
    <div className="group/card relative bg-bg-card rounded-[12px] border border-border-base hover:border-border-strong p-3 space-y-2 transition-colors">
      {/* Name row */}
      <div className="grid gap-2 items-end grid-cols-[1fr_148px]">
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
            <span className="text-[12px] font-medium text-text-primary flex-1">Variations ({vars.length})</span>
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
        <Button
          variant="icon"
          size="sm"
          className={scopedIds !== null || hasLocalBg
            ? 'text-accent bg-accent-subtle hover:text-accent-hover hover:bg-accent-subtle/80'
            : undefined}
          onClick={() => setShowSettingsSheet(true)}
          title="Role settings"
          icon={<Settings size={11} strokeWidth={1.75} />}
        />
      </CardToolbar>

      {showSettingsSheet && (
        <RoleSettingsSheet
          roleIdx={idx}
          onClose={() => setShowSettingsSheet(false)}
        />
      )}
    </div>
  );
});
