import type { ProjectStore } from "../../types/state";
import { CardTitle, MicroText } from "../typography";
import { getInkMode, inkColor, normalizeHex, copyText } from "./previewUtils";

export interface SourceColorCardProps {
  color: ProjectStore["colors"][0];
  alphaValues?: number[];
  showAlphas?: boolean;
}

export function SourceColorCard({ color, alphaValues = [], showAlphas = false }: SourceColorCardProps) {
  const hex = normalizeHex(color.value);
  const swatchInk = getInkMode(hex);

  const alphas = showAlphas ? alphaValues : [];

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: hex }} />
        <CardTitle>{color.name}</CardTitle>
        <MicroText className="text-n-tx-dim ml-1">{hex.toUpperCase()}</MicroText>
      </div>

      {/* Swatch tile */}
      <div className="rounded-[10px] overflow-hidden border border-n-br-default cursor-pointer hover:opacity-90 transition-opacity" onClick={() => copyText(hex, color.name)} title={`${hex} — click to copy`}>
        <div className="h-16 flex items-end p-3" style={{ background: hex }}>
          <span className="text-[12px] font-bold font-mono tracking-widest" style={{ color: inkColor(swatchInk, 0.85), textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>
            {hex.toUpperCase()}
          </span>
        </div>
        <div className="px-3 py-2 flex items-center justify-between bg-n-sf-input border-t border-n-br-subtle">
          <span className="text-[11px] font-semibold text-n-tx-primary">{color.name}</span>
          {color.shorthand && <span className="text-[10px] font-mono text-n-tx-dim">{color.shorthand}</span>}
        </div>
      </div>

      {/* Alpha tint strip */}
      {alphas.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <MicroText className="text-n-tx-dim px-1">Alpha tints</MicroText>
          <div
            className="flex w-full h-12 rounded-[8px] overflow-hidden"
            style={{
              boxShadow: "0 0 0 1px rgba(128,128,128,0.12)",
              background: "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 12px 12px",
            }}
          >
            {alphas.map((alpha) => {
              const rgba = `rgba(${r},${g},${b},${(alpha / 100).toFixed(2)})`;
              return (
                <div key={alpha} className="flex-1 h-full relative cursor-pointer group" style={{ background: rgba }} title={`${alpha}% — click to copy`} onClick={() => copyText(rgba, `${color.name} ${alpha}%`)}>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: inkColor(swatchInk) }}>
                    {alpha}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex">
            {alphas.map((alpha) => (
              <div key={alpha} className="flex-1 text-center">
                <span className="text-[9px] font-mono text-n-tx-dim">{alpha}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
