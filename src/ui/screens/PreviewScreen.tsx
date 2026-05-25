import { useState, useEffect, useDeferredValue, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useUiStore } from '../store/uiStore';
import { banner } from '../store/bannerStore';
import { toast } from '../store/toastStore';
import { SectionSpinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { Modal, ModalHeader } from '../components/Modal';
import { Button } from '../components/Button';
import { SegmentedControl } from '../components/SegmentedControl';
import { Badge, type BadgeVariant } from '../components/Badge';
import { variableMaker, type EngineConfig, type EngineResult } from '../lib/colorEngine';
import type { AppState } from '../types/state';

// ── Engine call ───────────────────────────────────────────────────────────────

function buildEngineConfig(appState: AppState): EngineConfig {
  return {
    colors: appState.colors.map((c) => ({
      name: c.name,
      value: c.value,
      shorthand: c.shorthand ?? '',
      description: c.description ?? '',
      scaleAlgorithm: c.scaleAlgorithm,
      solverMode: c.solverMode,
    })),
    themes: appState.themes.map((t) => ({ name: t.name, bg: t.bg })),
    scaleLength: appState.scaleLength,
    scaleStepNames: appState.scaleStepNames?.map((s) => s.name) ?? undefined,
    scaleAlgorithm: appState.scaleAlgorithm,
    pluginMode: appState.pluginMode,
    roles: appState.roles.map((r) => ({
      name: r.name,
      shorthand: r.shorthand ?? '',
      mappingMethod: r.mappingMethod,
      minContrast: r.minContrast,
      variationTargets: r.variationTargets,
      customVariationList: r.customVariationList,
      customVariations: r.customVariations,
      solverMode: r.solverMode,
      description: r.description,
    })),
    variations: (appState.variations ?? []).map((v) => ({ name: v.name, shorthand: v.shorthand })),
    useUniformAlgorithm: appState.useUniformAlgorithm,
    algorithmScopeLevel: appState.algorithmScopeLevel,
    solverMode: appState.solverMode,
  };
}

function runEngine(appState: AppState): EngineResult | null {
  if (!appState.colors.length || !appState.roles.length || !appState.themes.length) return null;
  try {
    return variableMaker(buildEngineConfig(appState));
  } catch {
    return null;
  }
}

// ── Clipboard helper ──────────────────────────────────────────────────────────

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`Copied ${label}`),
    () => toast.error('Copy failed'),
  );
}

// ── WCAG rating badge ─────────────────────────────────────────────────────────

const RATING_VARIANT: Record<string, BadgeVariant> = {
  AAA:        'success',
  AA:         'accent',
  'AA Large': 'warning',
  Fail:       'danger',
};

function RatingBadge({ rating }: { rating: string }) {
  return (
    <Badge variant={RATING_VARIANT[rating] ?? 'danger'} size="xs">
      {rating}
    </Badge>
  );
}

// ── Swatch cell ───────────────────────────────────────────────────────────────

interface SwatchCellProps {
  hex: string;
  ratio: number;
  rating: string;
  label: string;
  tokenName?: string;
}

function SwatchCell({ hex, ratio, rating, label, tokenName }: SwatchCellProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center gap-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Swatch — click copies hex */}
      <div
        className="w-10 h-10 rounded-md border border-border-subtle shrink-0 cursor-pointer hover:ring-2 hover:ring-accent transition-shadow"
        style={{ backgroundColor: hex }}
        onClick={() => copyText(hex, 'hex')}
        title="Click to copy hex"
      />

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-bg-panel border border-border-base rounded-md px-2 py-1.5 z-10 whitespace-nowrap shadow-sm pointer-events-none">
          <p className="text-[10px] font-mono text-text-primary">{hex}</p>
          <p className="text-[9px] text-text-muted">{ratio.toFixed(2)}:1</p>
          <RatingBadge rating={rating} />
        </div>
      )}

      {/* Label — click copies token name if available */}
      <span
        className={`text-[9px] text-text-muted truncate w-10 text-center ${tokenName ? 'cursor-pointer hover:text-accent' : ''}`}
        onClick={tokenName ? () => copyText(tokenName, 'token name') : undefined}
        title={tokenName ? 'Click to copy token name' : undefined}
      >
        {label}
      </span>
    </div>
  );
}

// ── Alpha tint strip ──────────────────────────────────────────────────────────

interface AlphaTintStripProps {
  colors: AppState['colors'];
  alphaValues: string;
}

function AlphaTintStrip({ colors, alphaValues }: AlphaTintStripProps) {
  const parsedAlphas = alphaValues
    .split(',')
    .map((v) => parseInt(v.trim()))
    .filter((v) => !isNaN(v) && v >= 0 && v <= 100);

  if (parsedAlphas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {colors.map((color) => (
        <div key={color._id} className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-text-primary px-1">{color.name} / Alpha</p>
          <div className="flex gap-0.5 flex-wrap">
            {parsedAlphas.map((alpha) => {
              const hex = color.value.startsWith('#') ? color.value : `#${color.value}`;
              // Render swatch with opacity
              return (
                <div key={alpha} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-10 h-10 rounded-md border border-border-subtle shrink-0 cursor-pointer hover:ring-2 hover:ring-accent transition-shadow"
                    style={{ backgroundColor: hex, opacity: alpha / 100 }}
                    onClick={() => copyText(`${hex}${Math.round(alpha * 2.55).toString(16).padStart(2, '0')}`, `${alpha}% alpha`)}
                    title={`${alpha}% — click to copy`}
                  />
                  <span className="text-[9px] text-text-muted">{alpha}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Token grid (grid view) ───────────────────────────────────────────────────

interface TokenGridProps {
  result: EngineResult;
  appState: AppState;
}

function TokenGridView({ result, appState }: TokenGridProps) {
  const themes    = appState.themes;
  const roles     = appState.roles;
  const colors    = appState.colors;
  const variations = appState.variations ?? [];

  return (
    <div className="flex flex-col gap-4">
      {colors.map((color) => (
        <div key={color._id} className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-text-primary px-1">{color.name}</p>

          {roles.map((role, ri) => {
            const vars = role.customVariationList && role.customVariations?.length
              ? role.customVariations
              : variations;

            return (
              <div key={role._id} className="bg-bg-card border border-border-base rounded-[10px] p-2">
                <p className="text-[10px] text-text-muted font-medium mb-2">{role.name}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {vars.map((variation, vi) => {
                    const themeEntries = themes.map((theme) => {
                      const themeName = theme.name.toLowerCase();
                      const tokenData = result.tokens?.[themeName]?.[color.name]?.[ri]?.[vi];
                      return { theme, tokenData };
                    });

                    return themeEntries.map(({ theme, tokenData }) => {
                      if (!tokenData) return null;
                      const varLabel = variation.shorthand || variation.name;
                      const tokenName = [color.name, role.name, varLabel].join('/');
                      return (
                        <div key={`${theme._id}-${vi}`} className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] text-text-dim">{theme.name}</span>
                          <SwatchCell
                            hex={tokenData.value}
                            ratio={tokenData.contrast?.ratio ?? 0}
                            rating={tokenData.contrast?.rating ?? 'Fail'}
                            label={varLabel}
                            tokenName={tokenName}
                          />
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Token table (table view) ─────────────────────────────────────────────────

function TokenTableView({ result, appState }: TokenGridProps) {
  const themes    = appState.themes;
  const roles     = appState.roles;
  const colors    = appState.colors;
  const variations = appState.variations ?? [];

  const rows: Array<{
    color: string;
    role: string;
    variation: string;
    entries: Array<{ theme: string; hex: string; ratio: number; rating: string }>;
  }> = [];

  colors.forEach((color) => {
    roles.forEach((role, ri) => {
      const vars = role.customVariationList && role.customVariations?.length
        ? role.customVariations
        : variations;
      vars.forEach((variation, vi) => {
        const entries = themes.map((theme) => {
          const themeName = theme.name.toLowerCase();
          const tokenData = result.tokens?.[themeName]?.[color.name]?.[ri]?.[vi];
          return {
            theme: theme.name,
            hex: tokenData?.value ?? '',
            ratio: tokenData?.contrast?.ratio ?? 0,
            rating: tokenData?.contrast?.rating ?? 'Fail',
          };
        }).filter((e) => e.hex);

        if (entries.length > 0) {
          rows.push({
            color: color.name,
            role: role.name,
            variation: variation.shorthand || variation.name,
            entries,
          });
        }
      });
    });
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-border-base">
            <th className="text-left px-2 py-1.5 text-text-muted font-medium">Token</th>
            {themes.map((t) => (
              <th key={t._id} className="text-left px-2 py-1.5 text-text-muted font-medium">{t.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border-subtle hover:bg-bg-hover transition-colors">
              <td className="px-2 py-1.5">
                <span
                  className="font-mono text-text-primary cursor-pointer hover:text-accent"
                  onClick={() => copyText(`${row.color}/${row.role}/${row.variation}`, 'token name')}
                >
                  {row.color}/{row.role}/{row.variation}
                </span>
              </td>
              {row.entries.map((entry) => (
                <td key={entry.theme} className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded border border-border-subtle shrink-0 cursor-pointer hover:ring-1 hover:ring-accent"
                      style={{ backgroundColor: entry.hex }}
                      onClick={() => copyText(entry.hex, 'hex')}
                      title="Click to copy hex"
                    />
                    <span className="font-mono text-text-muted text-[10px]">{entry.hex}</span>
                    <RatingBadge rating={entry.rating} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Scale preview ─────────────────────────────────────────────────────────────

interface ScalePreviewProps {
  result: EngineResult;
  appState: AppState;
}

function ScalePreview({ result, appState }: ScalePreviewProps) {
  const colors = appState.colors;
  const themes = appState.themes;

  return (
    <div className="flex flex-col gap-3">
      {colors.map((color) => {
        const scale = result.scales?.[color.name];
        if (!scale) return null;
        const steps = Object.entries(scale);

        return (
          <div key={color._id} className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold text-text-primary px-1">{color.name}</p>
            <div className="flex gap-0.5 flex-wrap">
              {steps.map(([stepName, stepData]) => {
                const firstTheme = themes[0];
                const themeName  = firstTheme?.name.toLowerCase() ?? 'light';
                const contrast   = stepData.contrast?.[themeName];
                return (
                  <SwatchCell
                    key={stepName}
                    hex={stepData.value}
                    ratio={contrast?.ratio ?? 0}
                    rating={contrast?.rating ?? 'Fail'}
                    label={stepName}
                    tokenName={`${color.name}/${stepName}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Accessibility warnings ────────────────────────────────────────────────────

function reportAccessibilityWarnings(result: EngineResult): void {
  const { warnings } = result.errors;
  if (!warnings || warnings.length === 0) return;
  const msg = `${warnings.length} contrast warning${warnings.length > 1 ? 's' : ''}: some tokens may not meet their contrast targets.`;
  banner.show({ id: 'preview-contrast-warnings', type: 'warning', title: 'Contrast Warnings', message: msg });
}

// ── Preview overlay ───────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'table';

function PreviewContent() {
  const appState = useAppStore((s) => s.appState);
  const deferred = useDeferredValue(appState);

  const [result, setResult]       = useState<EngineResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [viewMode, setViewMode]   = useState<ViewMode>('grid');

  const compute = useCallback((state: AppState) => {
    setComputing(true);
    const r = runEngine(state);
    setResult(r);
    setComputing(false);
    if (r) reportAccessibilityWarnings(r);
  }, []);

  useEffect(() => {
    compute(deferred);
  }, [deferred, compute]);

  const isScaleMode    = appState.pluginMode === 'scale';
  const showAlphaTints = appState.includeAlphaTints && (appState.alphaValues ?? '').trim().length > 0;
  const isEmpty        = !appState.colors.length || !appState.roles.length;

  if (isEmpty) {
    return (
      <div className="p-3">
        <EmptyState
          icon="👁"
          title="Nothing to preview"
          description="Add at least one color and one role to see a preview."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">
          {isScaleMode ? 'Token Preview' : 'Solved Colors'}
        </p>
        <div className="flex items-center gap-2">
          {computing && <span className="text-[10px] text-text-dim">Computing…</span>}
          <SegmentedControl
            segments={[{ value: 'grid', label: 'Grid' }, { value: 'table', label: 'Table' }]}
            value={viewMode}
            onChange={(v) => setViewMode(v as 'grid' | 'table')}
          />
        </div>
      </div>

      {computing ? (
        <SectionSpinner message="Computing tokens…" />
      ) : result ? (
        <>
          {isScaleMode && <ScalePreview result={result} appState={appState} />}
          {viewMode === 'grid'
            ? <TokenGridView result={result} appState={appState} />
            : <TokenTableView result={result} appState={appState} />
          }
          {showAlphaTints && (
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Alpha Tints</p>
              <AlphaTintStrip colors={appState.colors} alphaValues={appState.alphaValues ?? ''} />
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="⚠"
          title="Engine error"
          description="Could not compute tokens. Check color values and settings."
        />
      )}
    </div>
  );
}

export function PreviewScreen() {
  const isOpen       = useUiStore((s) => s.activeOverlay === 'preview');
  const closeOverlay = useUiStore((s) => s.closeOverlay);

  if (!isOpen) return null;

  return (
    <Modal open layer="overlay">
      <ModalHeader
        title="Preview"
        subtitle="Live token and color scale preview."
        actions={<Button variant="secondary" size="md" label="Close" onClick={closeOverlay} />}
      />
      <div className="flex-1 overflow-y-auto">
        <PreviewContent />
      </div>
    </Modal>
  );
}
