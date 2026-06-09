import clsx from 'clsx';
import type { Preset } from '../../presets/themeShop';

interface ShopCardProps {
  preset: Preset;
  isLoaded: boolean;
  onLoad: () => void;
}

export function ShopCard({ preset, isLoaded, onLoad }: ShopCardProps) {
  const isTW = preset.badge === 'TW';

  const swatches = preset.swatches
    ? preset.swatches
    : (preset.config.colors ?? []).map((c) => c.value.replace(/^#/, ''));

  return (
    <div
      className={clsx(
        'bg-bg-panel rounded-xl border flex flex-col gap-1.5 p-3',
        isLoaded ? 'border-accent' : 'border-border-base',
      )}
    >
      {/* Badge + name + action */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            {preset.badge && (
              <span
                className={clsx(
                  'text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded',
                  isTW ? 'bg-accent text-text-on-accent' : 'bg-bg-active text-text-muted',
                )}
              >
                {preset.badge}
              </span>
            )}
          </div>
          <p className="text-[13px] font-semibold text-text-primary leading-tight">{preset.name}</p>
        </div>

        {isLoaded ? (
          <div className="shrink-0 h-7 px-3 rounded-[7px] text-[11px] font-semibold flex items-center gap-1 bg-accent-subtle border border-accent text-accent">
            Loaded
          </div>
        ) : (
          <button
            onClick={onLoad}
            className={clsx(
              'shrink-0 h-7 px-3 rounded-[7px] text-[11px] font-semibold transition-colors cursor-pointer',
              isTW
                ? 'bg-accent hover:opacity-90 text-text-on-accent'
                : 'bg-bg-input border border-border-base text-text-primary hover:bg-bg-hover',
            )}
          >
            Load
          </button>
        )}
      </div>

      {/* Swatch strip */}
      {swatches.length > 0 && (
        <div className="flex gap-1 h-[18px]">
          {swatches.map((hex, i) => (
            <div
              key={i}
              className="flex-1 rounded-[4px]"
              style={{ background: `#${hex.replace(/^#/, '')}` }}
              title={(preset.config.colors ?? [])[i]?.name}
            />
          ))}
        </div>
      )}

      {/* Description */}
      {preset.description && (
        <p className="text-[11px] text-text-muted leading-relaxed">{preset.description}</p>
      )}

      {/* Tags */}
      {preset.tags && preset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {preset.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-bg-input text-text-muted border border-border-base"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-3 text-[10px] text-text-dim">
        {preset.config.colors && <span>{preset.config.colors.length} colors</span>}
        {preset.config.roles  && <span>{preset.config.roles.length} roles</span>}
        {preset.config.themes && <span>{preset.config.themes.length} themes</span>}
      </div>
    </div>
  );
}
