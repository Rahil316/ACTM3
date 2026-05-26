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
import { variableMaker, contrastRatio, type EngineConfig, type EngineResult } from '../lib/colorEngine';
import { CardTitle, MicroText } from '../components/typography';
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

// ── Ink utilities ─────────────────────────────────────────────────────────────
// ink = 'light' (white text) when bg is dark, 'dark' (black text) when bg is light

function getInkMode(hex: string): 'light' | 'dark' {
  const ratio = contrastRatio(hex, '#ffffff');
  return (ratio ?? 0) >= 3 ? 'light' : 'dark';
}

function inkColor(mode: 'light' | 'dark', opacity = 1): string {
  const base = mode === 'light' ? '255,255,255' : '0,0,0';
  return opacity >= 1 ? `rgb(${base})` : `rgba(${base},${opacity})`;
}

function normalizeHex(raw: string): string {
  const h = raw.replace(/^#/, '');
  return (
    '#' +
    (h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
    )
      .toUpperCase()
      .padEnd(6, '0')
  );
}

// ── WCAG rating badge ─────────────────────────────────────────────────────────

const RATING_VARIANT: Record<string, BadgeVariant> = {
  AAA: 'success',
  AA: 'accent',
  'AA Large': 'warning',
  Fail: 'danger',
};

function RatingBadge({ rating }: { rating: string }) {
  return (
    <Badge variant={RATING_VARIANT[rating] ?? 'danger'} size="xs">
      {rating === 'AA Large' ? 'AA Lg' : rating}
    </Badge>
  );
}

// ── Token tile card ───────────────────────────────────────────────────────────
// Upper zone (swatch, 72px) → click copies hex.
// Lower footer zone → click copies token name.

interface TokenTileProps {
  hex: string;
  ratio: number | null;
  rating: string;
  varLabel: string;
  tokenName?: string;
  ink: 'light' | 'dark';
}

function TokenTile({ hex, ratio, rating, varLabel, tokenName, ink }: TokenTileProps) {
  const [swatchHovered, setSwatchHovered] = useState(false);
  const swatchInk = getInkMode(hex.startsWith('#') ? hex : '#' + hex);
  const swatchTextColor = inkColor(swatchInk);
  const ratioStr = typeof ratio === 'number' ? ratio.toFixed(1) : '—';
  const safeHex = hex.startsWith('#') ? hex : '#' + hex;

  return (
    <div className="flex flex-col min-w-0">
      {/* Swatch zone — click copies hex */}
      <div
        className="relative h-[72px] rounded-t-[10px] p-1.5 flex flex-col justify-between cursor-pointer overflow-hidden transition-transform hover:scale-[1.03]"
        style={{ backgroundColor: safeHex }}
        onClick={() => copyText(safeHex, 'hex')}
        title={`${safeHex.toUpperCase()} — click to copy hex`}
        onMouseEnter={() => setSwatchHovered(true)}
        onMouseLeave={() => setSwatchHovered(false)}
      >
        {/* Rating pill — top right */}
        <div className="flex justify-end">
          <RatingBadge rating={rating} />
        </div>

        {/* Contrast ratio hero — bottom left */}
        <div className="flex items-baseline gap-px">
          <span
            className="text-[20px] font-extrabold leading-none tabular-nums"
            style={{ color: swatchTextColor, textShadow: '0 1px 4px rgba(0,0,0,0.20)' }}
          >
            {ratioStr}
          </span>
          <span className="text-[10px] font-bold opacity-70 mb-px" style={{ color: swatchTextColor }}>
            :1
          </span>
        </div>

        {/* Hex overlay on hover */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-t-[10px] pointer-events-none transition-opacity"
          style={{ background: 'rgba(0,0,0,0.18)', opacity: swatchHovered ? 1 : 0 }}
        >
          <span
            className="text-[12px] font-bold font-mono tracking-widest"
            style={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
          >
            {safeHex.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Footer zone — click copies token name */}
      <div
        className={`px-2 pb-2 pt-1.5 flex flex-col gap-0.5 rounded-b-[10px] border-t-0 transition-colors ${tokenName ? 'cursor-pointer' : ''}`}
        style={{ border: `1px solid ${inkColor(ink, 0.1)}`, background: inkColor(ink, 0.04) }}
        onClick={tokenName ? () => copyText(tokenName, 'token name') : undefined}
        title={tokenName ? `${tokenName} — click to copy` : undefined}
      >
        <span className="text-[11px] font-semibold leading-snug truncate" style={{ color: inkColor(ink, 0.8) }}>
          {varLabel}
        </span>
        {tokenName && (
          <span className="text-[9px] leading-snug truncate tracking-[0.03em]" style={{ color: inkColor(ink, 0.4) }}>
            {tokenName}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Color section (grid mode) ─────────────────────────────────────────────────

interface ColorSectionProps {
  colorName: string;
  srcHex: string;
  roles: Record<number, Record<number, import('../../shared/clrEngine').TokenEntry>>;
  appState: AppState;
  ink: 'light' | 'dark';
}

function ColorSection({ colorName, srcHex, roles, appState, ink }: ColorSectionProps) {
  const variations = appState.variations ?? [];

  return (
    <div
      className="rounded-[14px] p-4"
      style={{ border: `1px solid ${inkColor(ink, 0.1)}`, background: inkColor(ink, 0.03) }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-3 h-3 rounded-[3px] shrink-0"
          style={{ background: srcHex, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }}
        />
        <span className="text-[13px] font-bold" style={{ color: inkColor(ink) }}>
          {colorName}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(roles).map(([roleIdxStr, vars]) => {
          const roleIdx = parseInt(roleIdxStr);
          const role = appState.roles[roleIdx];
          if (!role) return null;
          const roleVars =
            role.customVariationList && role.customVariations?.length ? role.customVariations : variations;

          return (
            <div key={roleIdx} className="flex flex-col gap-2">
              <span className="text-[12px] font-bold truncate" style={{ color: inkColor(ink, 0.9) }}>
                {role.name}
              </span>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))' }}>
                {Object.entries(vars).map(([varIdxStr, token]) => {
                  const varIdx = parseInt(varIdxStr);
                  const v = roleVars[varIdx];
                  const varLabel = v ? v.shorthand || v.name : String(varIdx);
                  return (
                    <TokenTile
                      key={varIdxStr}
                      hex={token.value}
                      ratio={token.contrast?.ratio ?? null}
                      rating={token.contrast?.rating ?? 'Fail'}
                      varLabel={varLabel}
                      tokenName={token.tokenName}
                      ink={ink}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Table section ─────────────────────────────────────────────────────────────

interface TableSectionProps {
  colorName: string;
  srcHex: string;
  roles: Record<number, Record<number, import('../../shared/clrEngine').TokenEntry>>;
  appState: AppState;
  ink: 'light' | 'dark';
}

function TableSection({ srcHex, roles, appState, ink }: TableSectionProps) {
  const variations = appState.variations ?? [];
  const hdrInk = getInkMode(srcHex);
  const COL = 'minmax(80px,1fr) 64px 56px 48px minmax(120px,2fr)';

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${inkColor(ink, 0.1)}` }}>
      {/* Section header — uses source color as bg */}
      <div className="grid items-center h-8 sticky top-0 z-10" style={{ background: srcHex, gridTemplateColumns: COL }}>
        {(['Token', 'Hex', 'Ratio', 'WCAG', 'Token Name'] as const).map((h, i) => (
          <div
            key={h}
            className="px-2 text-[10px] font-bold tracking-[0.07em] uppercase truncate"
            style={{ color: inkColor(hdrInk, 0.75), paddingLeft: i === 0 ? 12 : undefined }}
          >
            {h}
          </div>
        ))}
      </div>

      {Object.entries(roles).map(([roleIdxStr, vars]) => {
        const roleIdx = parseInt(roleIdxStr);
        const role = appState.roles[roleIdx];
        if (!role) return null;
        const roleVars = role.customVariationList && role.customVariations?.length ? role.customVariations : variations;

        return (
          <div key={roleIdx}>
            <div
              className="h-[26px] flex items-center px-4"
              style={{ background: inkColor(ink, 0.05), borderTop: `1px solid ${inkColor(ink, 0.08)}` }}
            >
              <span
                className="text-[10px] font-bold tracking-[0.06em] uppercase truncate"
                style={{ color: inkColor(ink, 0.5) }}
              >
                {role.name}
              </span>
            </div>

            {Object.entries(vars).map(([varIdxStr, token]) => {
              const varIdx = parseInt(varIdxStr);
              const v = roleVars[varIdx];
              const varLabel = v ? v.shorthand || v.name : String(varIdx);
              const ratio = typeof token.contrast?.ratio === 'number' ? token.contrast.ratio.toFixed(1) : '—';

              return (
                <div
                  key={varIdxStr}
                  className="grid items-center h-9 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ gridTemplateColumns: COL, borderTop: `1px solid ${inkColor(ink, 0.06)}` }}
                  onClick={() => copyText(token.value, 'hex')}
                  title={`${token.value.toUpperCase()} — click to copy hex`}
                >
                  <div className="px-3 flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-[3px] shrink-0"
                      style={{ background: token.value, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }}
                    />
                    <span className="text-[11px] font-semibold truncate" style={{ color: inkColor(ink, 0.85) }}>
                      {varLabel}
                    </span>
                  </div>
                  <div className="px-2 min-w-0">
                    <span
                      className="text-[10px] font-mono font-semibold tracking-[0.04em]"
                      style={{ color: token.value }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(token.value, 'hex');
                      }}
                    >
                      {token.value.toUpperCase()}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: inkColor(ink, 0.8) }}>
                      {ratio}
                    </span>
                  </div>
                  <div className="px-2">
                    <RatingBadge rating={token.contrast?.rating ?? 'Fail'} />
                  </div>
                  <div className="px-2 min-w-0">
                    {token.tokenName ? (
                      <span
                        className="text-[10px] font-mono truncate block cursor-pointer hover:underline"
                        style={{ color: inkColor(ink, 0.45) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyText(token.tokenName, 'token name');
                        }}
                        title={`${token.tokenName} — click to copy`}
                      >
                        {token.tokenName}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: inkColor(ink, 0.2) }}>
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Role-group table section ──────────────────────────────────────────────────
// Like TableSection but role is the top-level header, colors are sub-headers.

interface RoleTableSectionProps {
  roleName: string;
  colorMap: Record<string, Record<number, import('../../shared/clrEngine').TokenEntry>>;
  appState: AppState;
  ink: 'light' | 'dark';
}

function RoleTableSection({ roleName, colorMap, appState, ink }: RoleTableSectionProps) {
  const COL = 'minmax(80px,1fr) 64px 56px 48px minmax(120px,2fr)';
  const role = appState.roles.find((r) => r.name === roleName);
  const roleVars =
    role?.customVariationList && role.customVariations?.length ? role.customVariations : (appState.variations ?? []);

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${inkColor(ink, 0.1)}` }}>
      {/* Role header row */}
      <div
        className="grid items-center h-8 sticky top-0 z-10"
        style={{ background: inkColor(ink, 0.12), gridTemplateColumns: COL }}
      >
        {(['Role / Color', 'Hex', 'Ratio', 'WCAG', 'Token Name'] as const).map((h, i) => (
          <div
            key={h}
            className="px-2 text-[10px] font-bold tracking-[0.07em] uppercase truncate"
            style={{ color: inkColor(ink, 0.75), paddingLeft: i === 0 ? 12 : undefined }}
          >
            {i === 0 ? roleName : h}
          </div>
        ))}
      </div>

      {Object.entries(colorMap).map(([colorName, vars]) => {
        const colorEntry = appState.colors.find((c) => c.name === colorName);
        const cHex = normalizeHex(colorEntry?.value ?? '888888');
        return (
          <div key={colorName}>
            {/* Color sub-header */}
            <div
              className="h-[26px] flex items-center gap-2 px-4"
              style={{ background: inkColor(ink, 0.05), borderTop: `1px solid ${inkColor(ink, 0.08)}` }}
            >
              <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: cHex }} />
              <span
                className="text-[10px] font-bold tracking-[0.06em] uppercase truncate"
                style={{ color: inkColor(ink, 0.5) }}
              >
                {colorName}
              </span>
            </div>

            {Object.entries(vars).map(([varIdxStr, token]) => {
              const varIdx = parseInt(varIdxStr);
              const v = roleVars[varIdx];
              const varLabel = v ? v.shorthand || v.name : String(varIdx);
              const contrastRatioStr =
                typeof token.contrast?.ratio === 'number' ? token.contrast.ratio.toFixed(1) : '—';

              return (
                <div
                  key={varIdxStr}
                  className="grid items-center h-9 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ gridTemplateColumns: COL, borderTop: `1px solid ${inkColor(ink, 0.06)}` }}
                  onClick={() => copyText(token.value, 'hex')}
                >
                  <div className="px-3 flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-[3px] shrink-0"
                      style={{ background: token.value, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }}
                    />
                    <span className="text-[11px] font-semibold truncate" style={{ color: inkColor(ink, 0.85) }}>
                      {varLabel}
                    </span>
                  </div>
                  <div className="px-2 min-w-0">
                    <span
                      className="text-[10px] font-mono font-semibold tracking-[0.04em]"
                      style={{ color: token.value }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(token.value, 'hex');
                      }}
                    >
                      {token.value.toUpperCase()}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: inkColor(ink, 0.8) }}>
                      {contrastRatioStr}
                    </span>
                  </div>
                  <div className="px-2">
                    <RatingBadge rating={token.contrast?.rating ?? 'Fail'} />
                  </div>
                  <div className="px-2 min-w-0">
                    {token.tokenName ? (
                      <span
                        className="text-[10px] font-mono truncate block cursor-pointer hover:underline"
                        style={{ color: inkColor(ink, 0.45) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyText(token.tokenName, 'token name');
                        }}
                      >
                        {token.tokenName}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: inkColor(ink, 0.2) }}>
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Scale table view ──────────────────────────────────────────────────────────

interface ScaleTableViewProps {
  result: EngineResult;
  appState: AppState;
}

function ScaleTableView({ result, appState }: ScaleTableViewProps) {
  const COL = '80px 1fr 64px 56px 48px';
  const themes = appState.themes;

  if (Object.keys(result.scales).length === 0) {
    return <p className="text-[12px] text-text-muted p-4 text-center">No scale in Direct mode.</p>;
  }

  return (
    <div className="flex flex-col gap-4 p-3 pb-6">
      {appState.colors.map((color) => {
        const scale = result.scales[color.name];
        if (!scale) return null;
        const srcHex = normalizeHex(color.value);
        const hdrInk = getInkMode(srcHex);

        return (
          <div key={color._id} className="rounded-[10px] overflow-hidden border border-border-base">
            {/* Color header */}
            <div
              className="grid items-center h-8 sticky top-0 z-10"
              style={{ background: srcHex, gridTemplateColumns: COL }}
            >
              {(['Step', 'Hex', 'Ratio', 'WCAG', ''].concat(themes.map((t) => t.name)) as string[])
                .slice(0, 4 + themes.length)
                .map((h, i) => (
                  <div
                    key={i}
                    className="px-2 text-[10px] font-bold tracking-[0.07em] uppercase truncate"
                    style={{ color: inkColor(hdrInk, 0.75), paddingLeft: i === 0 ? 12 : undefined }}
                  >
                    {i === 0 ? color.name : h}
                  </div>
                ))}
            </div>

            {Object.entries(scale).map(([stepName, stepData]) => {
              const firstTheme = themes[0];
              const contrast = firstTheme ? stepData.contrast?.[firstTheme.name.toLowerCase()] : null;
              const ratioStr = typeof contrast?.ratio === 'number' ? contrast.ratio.toFixed(1) : '—';

              return (
                <div
                  key={stepName}
                  className="grid items-center h-9 border-t border-border-subtle cursor-pointer hover:bg-bg-hover transition-colors"
                  style={{ gridTemplateColumns: COL }}
                  onClick={() => copyText(stepData.value, `${color.name}/${stepName}`)}
                >
                  <div className="px-3 flex items-center gap-1.5">
                    <div
                      className="w-3.5 h-3.5 rounded-[3px] shrink-0 border border-border-subtle"
                      style={{ background: stepData.value }}
                    />
                    <span className="text-[11px] font-semibold text-text-primary">{stepName}</span>
                  </div>
                  <div className="px-2">
                    <span
                      className="text-[10px] font-mono font-semibold"
                      style={{ color: stepData.value }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(stepData.value, 'hex');
                      }}
                    >
                      {stepData.value.toUpperCase()}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className="text-[12px] font-bold tabular-nums text-text-primary">{ratioStr}</span>
                  </div>
                  <div className="px-2">{contrast?.rating && <RatingBadge rating={contrast.rating} />}</div>
                  <div className="px-2 text-[10px] text-text-dim font-mono truncate">
                    {themes
                      .slice(1)
                      .map((t) => {
                        const c = stepData.contrast?.[t.name.toLowerCase()];
                        return c ? `${t.name}: ${c.ratio?.toFixed(1)}` : '';
                      })
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Theme panel (one per theme tab) ──────────────────────────────────────────

type GroupBy = 'color' | 'role';
type ViewMode = 'grid' | 'table';

interface ThemePanelProps {
  result: EngineResult;
  appState: AppState;
  themeIdx: number;
  groupBy: GroupBy;
  viewMode: ViewMode;
}

function ThemePanel({ result, appState, themeIdx, groupBy, viewMode }: ThemePanelProps) {
  const theme = appState.themes[themeIdx];
  if (!theme) return null;

  const bgHex = normalizeHex(theme.bg || '#FFFFFF');
  const ink = getInkMode(bgHex);
  const themeKey = theme.name.toLowerCase();
  const themeTokens = result.tokens[themeKey] ?? {};

  // Re-group by role if needed: role → { colorName → { varIdx → token } }
  type VarMap = Record<number, import('../../shared/clrEngine').TokenEntry>;
  type ByRole = Record<number, Record<string, VarMap>>;

  function buildByRole(): ByRole {
    const out: ByRole = {};
    for (const [colorName, roles] of Object.entries(themeTokens)) {
      for (const [roleIdxStr, vars] of Object.entries(roles)) {
        const roleIdx = parseInt(roleIdxStr);
        if (!out[roleIdx]) out[roleIdx] = {};
        out[roleIdx][colorName] = vars as VarMap;
      }
    }
    return out;
  }

  const colorEntries = Object.entries(themeTokens) as [string, Record<number, VarMap>][];
  const byRole = groupBy === 'role' ? buildByRole() : null;

  if (colorEntries.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-[12px] opacity-60" style={{ color: inkColor(ink) }}>
          No tokens for this theme.
        </p>
      </div>
    );
  }

  const showAlphas = appState.includeAlphaTints && (appState.alphaValues ?? '').trim().length > 0;

  return (
    <div className="flex flex-col gap-4 p-3 pb-6">
      {groupBy === 'color'
        ? colorEntries.map(([colorName, roles]) => {
            const colorEntry = appState.colors.find((c) => c.name === colorName);
            const srcHex = normalizeHex(colorEntry?.value ?? '888888');
            return viewMode === 'grid' ? (
              <ColorSection
                key={colorName}
                colorName={colorName}
                srcHex={srcHex}
                roles={roles}
                appState={appState}
                ink={ink}
              />
            ) : (
              <TableSection
                key={colorName}
                colorName={colorName}
                srcHex={srcHex}
                roles={roles}
                appState={appState}
                ink={ink}
              />
            );
          })
        : Object.entries(byRole!).map(([roleIdxStr, colorMap]) => {
            const roleIdx = parseInt(roleIdxStr);
            const role = appState.roles[roleIdx];
            if (!role) return null;

            if (viewMode === 'table') {
              return (
                <RoleTableSection
                  key={roleIdxStr}
                  roleName={role.name}
                  colorMap={colorMap}
                  appState={appState}
                  ink={ink}
                />
              );
            }

            return (
              <div
                key={roleIdxStr}
                className="rounded-[14px] p-4"
                style={{ border: `1px solid ${inkColor(ink, 0.1)}`, background: inkColor(ink, 0.03) }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[13px] font-bold" style={{ color: inkColor(ink) }}>
                    {role.name}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {Object.entries(colorMap).map(([colorName, vars]) => {
                    const colorEntry = appState.colors.find((c) => c.name === colorName);
                    const cHex = normalizeHex(colorEntry?.value ?? '888888');
                    const roleVarsArr =
                      role.customVariationList && role.customVariations?.length
                        ? role.customVariations
                        : (appState.variations ?? []);

                    return (
                      <div key={colorName}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div
                            className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                            style={{ background: cHex, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }}
                          />
                          <span className="text-[11px] font-bold" style={{ color: inkColor(ink, 0.7) }}>
                            {colorName}
                          </span>
                        </div>
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))' }}
                        >
                          {Object.entries(vars).map(([varIdxStr, token]) => {
                            const varIdx = parseInt(varIdxStr);
                            const v = roleVarsArr[varIdx];
                            const varLabel = v ? v.shorthand || v.name : String(varIdx);
                            return (
                              <TokenTile
                                key={varIdxStr}
                                hex={token.value}
                                ratio={token.contrast?.ratio ?? null}
                                rating={token.contrast?.rating ?? 'Fail'}
                                varLabel={varLabel}
                                tokenName={token.tokenName}
                                ink={ink}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

      {/* Source colors */}
      <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: inkColor(ink, 0.1) }}>
        <span className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: inkColor(ink, 0.45) }}>
          Source
        </span>
        <div className="flex gap-2 flex-wrap">
          {appState.colors.map((color) => {
            const hex = normalizeHex(color.value);
            return (
              <div
                key={color._id}
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={() => copyText(hex, color.name)}
                title={`${hex} — click to copy`}
              >
                <div
                  className="w-5 h-5 rounded-[4px] shrink-0"
                  style={{ background: hex, boxShadow: `0 0 0 1px ${inkColor(ink, 0.15)}` }}
                />
                <span className="text-[10px] font-mono" style={{ color: inkColor(ink, 0.6) }}>
                  {color.name}
                </span>
                <span className="text-[10px] font-mono" style={{ color: inkColor(ink, 0.35) }}>
                  {hex}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alpha tints */}
      {showAlphas && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: inkColor(ink, 0.45) }}>
            Alpha
          </span>
          {appState.colors.map((color) => (
            <AlphaTintRow key={color._id} color={color} alphaValues={appState.alphaValues ?? ''} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Color scale section ───────────────────────────────────────────────────────

interface ScaleSectionProps {
  result: EngineResult;
  appState: AppState;
  groupByStep?: boolean;
  viewMode?: ViewMode;
}

function ScaleSection({ result, appState, groupByStep = false, viewMode = 'grid' }: ScaleSectionProps) {
  const colors = appState.colors;
  const themes = appState.themes;
  const themeKeys = themes.map((t) => t.name.toLowerCase());

  if (Object.keys(result.scales).length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-[12px] text-text-muted">
          No scale in Direct mode — colors are solved directly per variation target.
        </p>
      </div>
    );
  }

  if (groupByStep) {
    const firstScale = result.scales[colors[0]?.name];
    const stepNames = firstScale ? Object.keys(firstScale) : [];

    return (
      <div className="flex flex-col gap-4 p-3 pb-6">
        {stepNames.map((stepName) => (
          <div key={stepName} className="flex flex-col gap-2">
            <div className="px-1">
              <CardTitle>{stepName}</CardTitle>
            </div>

            {viewMode === 'table' ? (
              // Table: one row per color at this step
              <div className="rounded-[10px] overflow-hidden border border-border-base">
                {colors.map((color) => {
                  const stepData = result.scales[color.name]?.[stepName];
                  if (!stepData) return null;
                  const srcHex = normalizeHex(color.value);
                  const contrast = themeKeys.length > 0 ? stepData.contrast?.[themeKeys[0]] : null;
                  const ratioStr = typeof contrast?.ratio === 'number' ? contrast.ratio.toFixed(1) : '—';
                  return (
                    <div
                      key={color._id}
                      className="grid items-center h-9 border-t border-border-subtle first:border-0 cursor-pointer hover:bg-bg-hover transition-colors"
                      style={{ gridTemplateColumns: '1fr 64px 56px 48px' }}
                      onClick={() => copyText(stepData.value, `${color.name}/${stepName}`)}
                    >
                      <div className="px-3 flex items-center gap-2 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-[3px] shrink-0"
                          style={{ background: stepData.value, boxShadow: '0 0 0 1px rgba(0,0,0,0.10)' }}
                        />
                        <div
                          className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                          style={{ background: srcHex, boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
                        />
                        <span className="text-[11px] font-semibold text-text-primary truncate">{color.name}</span>
                      </div>
                      <div className="px-2">
                        <span className="text-[10px] font-mono font-semibold" style={{ color: stepData.value }}>
                          {stepData.value.toUpperCase()}
                        </span>
                      </div>
                      <div className="px-2">
                        <span className="text-[12px] font-bold tabular-nums text-text-primary">{ratioStr}</span>
                      </div>
                      <div className="px-2">{contrast?.rating && <RatingBadge rating={contrast.rating} />}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Strip: all colors at this step as a horizontal spectrum
              <div
                className="flex w-full h-24 rounded-[10px] overflow-hidden cursor-crosshair"
                style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.12)', border: '1px solid rgba(136,136,136,0.10)' }}
              >
                {colors.map((color) => {
                  const stepData = result.scales[color.name]?.[stepName];
                  if (!stepData) return null;
                  return (
                    <ScaleStepSlice
                      key={color._id}
                      stepName={color.name}
                      stepData={stepData}
                      themeKeys={themeKeys}
                      colorName={color.name}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'table') {
    return <ScaleTableView result={result} appState={appState} />;
  }

  return (
    <div className="flex flex-col gap-5 p-3 pb-6">
      {colors.map((color) => {
        const scale = result.scales[color.name];
        if (!scale) return null;
        const steps = Object.entries(scale);
        const srcHex = normalizeHex(color.value);

        return (
          <div key={color._id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: srcHex }} />
              <CardTitle>{color.name}</CardTitle>
              <MicroText className="text-text-dim ml-1">{srcHex.toUpperCase()}</MicroText>
            </div>

            <div
              className="flex w-full h-24 rounded-[10px] overflow-hidden cursor-crosshair"
              style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.12)', border: '1px solid rgba(136,136,136,0.10)' }}
            >
              {steps.map(([stepName, stepData]) => (
                <ScaleStepSlice
                  key={stepName}
                  stepName={stepName}
                  stepData={stepData}
                  themeKeys={themeKeys}
                  colorName={color.name}
                />
              ))}
            </div>

            {appState.includeAlphaTints && (appState.alphaValues ?? '').trim() && (
              <AlphaTintRow color={color} alphaValues={appState.alphaValues ?? ''} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Scale step slice (expandable on hover) ────────────────────────────────────

interface ScaleStepSliceProps {
  stepName: string;
  stepData: import('../../shared/clrEngine').ScaleStep;
  themeKeys: string[];
  colorName: string;
}

function ScaleStepSlice({ stepName, stepData, themeKeys, colorName }: ScaleStepSliceProps) {
  const [hovered, setHovered] = useState(false);
  const contrastStr = themeKeys
    .map((k) => {
      const c = stepData.contrast?.[k];
      return c ? `${k}: ${c.ratio}` : '';
    })
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="relative h-full transition-all duration-150 cursor-pointer"
      style={{
        background: stepData.value,
        flex: hovered ? 5.5 : 1,
        borderRadius: hovered ? 8 : 0,
        zIndex: hovered ? 10 : undefined,
      }}
      title={`${stepName} · ${stepData.value} — click to copy`}
      onClick={() => copyText(stepData.value, `${colorName}/${stepName}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div
          className="absolute px-2.5 inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none"
          style={{
            color: inkColor(getInkMode(stepData.value.startsWith('#') ? stepData.value : '#' + stepData.value)),
          }}
        >
          <span className="text-[10px] font-bold tracking-wider uppercase opacity-75 leading-none">
            {stepName}
          </span>
          <span
            className="text-[12px] font-mono font-bold px-2 py-0.5 rounded shadow-sm leading-none"
            style={{
              background: getInkMode(stepData.value.startsWith('#') ? stepData.value : '#' + stepData.value) === 'light'
                ? 'rgba(0,0,0,0.06)'
                : 'rgba(255,255,255,0.18)',
            }}
          >
            {stepData.value.toUpperCase()}
          </span>
          {contrastStr && (
            <span className="text-[10px] font-bold leading-none opacity-80 whitespace-nowrap">
              {contrastStr}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Alpha tint row ────────────────────────────────────────────────────────────

function AlphaTintRow({ color, alphaValues }: { color: AppState['colors'][0]; alphaValues: string }) {
  const hex = normalizeHex(color.value);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const alphas = alphaValues
    .split(',')
    .map((v) => parseInt(v.trim()))
    .filter((v) => !isNaN(v) && v >= 0 && v <= 100);

  if (!alphas.length) return null;

  return (
    <div className="flex gap-0.5 items-center">
      <div className="w-16 shrink-0">
        <MicroText className="text-text-muted truncate">{color.name} α</MicroText>
      </div>
      {alphas.map((alpha) => {
        const rgba = `rgba(${r},${g},${b},${(alpha / 100).toFixed(2)})`;
        return (
          <div
            key={alpha}
            className="flex-1 h-6 rounded cursor-pointer"
            style={{ background: rgba, boxShadow: 'inset 0 0 0 1px rgba(128,128,128,0.2)' }}
            title={`${alpha}% — click to copy`}
            onClick={() => copyText(rgba, `${alpha}% alpha`)}
          />
        );
      })}
    </div>
  );
}

// ── Accessibility warnings ────────────────────────────────────────────────────

function reportAccessibilityWarnings(result: EngineResult, pluginMode: string): void {
  const { warnings } = result.errors;
  // In direct mode the solver always produces the closest achievable color —
  // "can't hit exact target" is expected and not actionable for the user.
  // Contrast warnings only apply in scale mode where steps are discrete.
  if (!warnings || warnings.length === 0 || pluginMode !== 'scale') {
    banner.remove('preview-contrast-warnings');
    return;
  }
  const msg = `${warnings.length} contrast warning${warnings.length > 1 ? 's' : ''}: some tokens may not meet their contrast targets.`;
  banner.show({ id: 'preview-contrast-warnings', type: 'warning', title: 'Contrast Warnings', message: msg });
}

// ── Preview content ───────────────────────────────────────────────────────────

type TabId = 'scale' | `theme-${number}`;

function PreviewContent() {
  const appState = useAppStore((s) => s.appState);
  const deferred = useDeferredValue(appState);

  const [result, setResult] = useState<EngineResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('scale');
  const [groupBy, setGroupBy] = useState<GroupBy>('color');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const compute = useCallback((state: AppState) => {
    setComputing(true);
    const r = runEngine(state);
    setResult(r);
    setComputing(false);
    if (r) reportAccessibilityWarnings(r, state.pluginMode);
  }, []);

  useEffect(() => {
    compute(deferred);
  }, [deferred, compute]);

  // Default to first theme tab in direct mode
  useEffect(() => {
    if (appState.pluginMode === 'direct' && activeTab === 'scale' && appState.themes.length > 0) {
      setActiveTab('theme-0');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.pluginMode, appState.themes.length]);

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

  const tabs: { id: TabId; label: string; bg?: string }[] = [
    ...(isScaleMode ? [{ id: 'scale' as TabId, label: 'Scale' }] : []),
    ...appState.themes.map((t, i) => ({
      id: `theme-${i}` as TabId,
      label: t.name,
      bg: normalizeHex(t.bg || '#FFFFFF'),
    })),
  ];

  const activeThemeMatch = activeTab.match(/^theme-(\d+)$/);
  const activeThemeIdx = activeThemeMatch ? parseInt(activeThemeMatch[1]) : -1;
  const activeTheme = activeThemeIdx >= 0 ? appState.themes[activeThemeIdx] : null;
  const panelBg = activeTheme ? normalizeHex(activeTheme.bg || '#FFFFFF') : undefined;
  const isScaleTab = activeTab === 'scale';

  function cycleTab(dir: 1 | -1) {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    const next = tabs[(idx + dir + tabs.length) % tabs.length];
    if (next) setActiveTab(next.id);
  }

  function onTabBarKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      cycleTab(1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      cycleTab(-1);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar + toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-border-subtle flex-wrap gap-y-2">
        {/* Tabs — arrow-key navigable */}
        <div className="flex items-center gap-1 flex-wrap" role="tablist" onKeyDown={onTabBarKeyDown}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-accent text-text-on-accent'
                    : 'bg-bg-input text-text-muted hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {tab.bg && (
                  <span
                    className="w-2.5 h-2.5 rounded-[2px] shrink-0 inline-block"
                    style={{ background: tab.bg, boxShadow: '0 0 0 1px rgba(128,128,128,0.2)' }}
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Toolbar — always visible */}
        <div className="flex items-center gap-2">
          {computing && <MicroText className="text-text-dim">Computing…</MicroText>}
          <SegmentedControl
            segments={
              isScaleTab
                ? [
                    { value: 'color', label: 'Color' },
                    { value: 'role', label: 'Step' },
                  ]
                : [
                    { value: 'color', label: 'Color' },
                    { value: 'role', label: 'Role' },
                  ]
            }
            value={groupBy}
            onChange={(v) => setGroupBy(v as GroupBy)}
          />
          <SegmentedControl
            segments={
              isScaleTab
                ? [
                    { value: 'grid', label: 'Strip' },
                    { value: 'table', label: 'Table' },
                  ]
                : [
                    { value: 'grid', label: 'Grid' },
                    { value: 'table', label: 'Table' },
                  ]
            }
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
          />
        </div>
      </div>

      {/* Panel */}
      {computing ? (
        <div className="flex-1 flex items-center justify-center">
          <SectionSpinner message="Computing tokens…" />
        </div>
      ) : result ? (
        <div className="flex-1 overflow-y-auto" style={panelBg ? { backgroundColor: panelBg } : undefined}>
          {isScaleTab && (
            <ScaleSection result={result} appState={appState} groupByStep={groupBy === 'role'} viewMode={viewMode} />
          )}
          {activeThemeIdx >= 0 && (
            <ThemePanel
              result={result}
              appState={appState}
              themeIdx={activeThemeIdx}
              groupBy={groupBy}
              viewMode={viewMode}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 p-3">
          <EmptyState
            icon="⚠"
            title="Engine error"
            description="Could not compute tokens. Check color values and settings."
          />
        </div>
      )}
    </div>
  );
}

export function PreviewScreen() {
  const isOpen = useUiStore((s) => s.activeOverlay === 'preview');
  const closeOverlay = useUiStore((s) => s.closeOverlay);

  if (!isOpen) return null;

  return (
    <Modal open layer="overlay">
      <ModalHeader
        title="Preview"
        subtitle="Live token and color scale preview."
        actions={<Button variant="secondary" size="md" label="Close" onClick={closeOverlay} />}
      />
      <div className="flex-1 overflow-hidden flex flex-col">
        <PreviewContent />
      </div>
    </Modal>
  );
}
