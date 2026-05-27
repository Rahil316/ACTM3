import { useState } from 'react';
import { getInkMode, inkColor, copyText } from './previewUtils';
import { RatingBadge } from './RatingBadge';

export interface TokenTileProps {
  hex: string;
  ratio: number | null;
  rating: string;
  varLabel: string;
  tokenName?: string;
  ink: 'light' | 'dark';
}

export function TokenTile({ hex, ratio, rating, varLabel, tokenName, ink }: TokenTileProps) {
  const [swatchHovered, setSwatchHovered] = useState(false);
  const safeHex = hex.startsWith('#') ? hex : '#' + hex;
  const swatchInk = getInkMode(safeHex);
  const swatchTextColor = inkColor(swatchInk);
  const ratioStr = typeof ratio === 'number' ? ratio.toFixed(1) : '—';

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
        <div className="flex justify-end">
          <RatingBadge rating={rating} />
        </div>

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
