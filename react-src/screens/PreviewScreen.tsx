import { useState, useEffect, useDeferredValue, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { banner } from '../store/bannerStore';
import { SectionSpinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
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
    scaleStepNames: appState.scaleStepNames?.map((s) => s.name) ?? null,
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

// ── Swatch cell ───────────────────────────────────────────────────────────────

interface SwatchCellProps {
  hex: string;
  ratio: number;
  rating: string;
  label: string;
}

function SwatchCell({ hex, ratio, rating, label }: SwatchCellProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center gap-0.5 cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-10 h-10 rounded-md border border-border-base/40 shrink-0"
        style={{ backgroundColor: hex }}
      />
      {hovered ? (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-bg-panel border border-border-base rounded-md px-2 py-1 z-10 whitespace-nowrap shadow-sm text-[10px] text-text-primary">
          <p className="font-mono">{hex}</p>
          <p className="text-text-muted">{ratio.toFixed(2)}:1 · {rating}</p>
        </div>
      ) : (
        <span className="text-[9px] text-text-muted truncate w-10 text-center">{label}</span>
      )}
    </div>
  );
}

// ── Token grid (scale mode) ───────────────────────────────────────────────────

interface TokenGridProps {
  result: EngineResult;
  appState: AppState;
}

function TokenGrid({ result, appState }: TokenGridProps) {
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
                    // Gather data across all themes for this cell
                    const themeEntries = themes.map((theme) => {
                      const themeName = theme.name.toLowerCase();
                      const tokenData = result.tokens?.[themeName]?.[color.name]?.[ri]?.[vi];
                      return { theme, tokenData };
                    });

                    // Show one swatch per theme
                    return themeEntries.map(({ theme, tokenData }) => {
                      if (!tokenData) return null;
                      return (
                        <div key={`${theme._id}-${vi}`} className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] text-text-dim">{theme.name}</span>
                          <SwatchCell
                            hex={tokenData.value}
                            ratio={tokenData.contrast?.ratio ?? 0}
                            rating={tokenData.contrast?.rating ?? 'Fail'}
                            label={variation.shorthand || variation.name}
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

// ── Scale preview (scale mode scale rows) ────────────────────────────────────

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

// ── Main screen ───────────────────────────────────────────────────────────────

export function PreviewScreen() {
  const appState = useAppStore((s) => s.appState);
  const deferred = useDeferredValue(appState);

  const [result, setResult] = useState<EngineResult | null>(null);
  const [computing, setComputing] = useState(false);

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

  const isScaleMode = appState.pluginMode === 'scale';
  const isEmpty = !appState.colors.length || !appState.roles.length;

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
      {/* Mode label */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">
          {isScaleMode ? 'Token Preview' : 'Solved Colors'}
        </p>
        {computing && <span className="text-[10px] text-text-dim">Computing…</span>}
      </div>

      {computing ? (
        <SectionSpinner message="Computing tokens…" />
      ) : result ? (
        <>
          {isScaleMode && <ScalePreview result={result} appState={appState} />}
          <TokenGrid result={result} appState={appState} />
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
