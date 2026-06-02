import { useState } from 'react';
import type { ScaleStepToken as ScaleStep } from '../../../shared/types';
import { getInkMode, inkColor, copyText } from './previewUtils';

export interface ScaleStepSliceProps {
  stepName: string;
  stepData: ScaleStep;
  themeKeys: string[];
  colorName: string;
}

export function ScaleStepSlice({ stepName, stepData, themeKeys, colorName }: ScaleStepSliceProps) {
  const [hovered, setHovered] = useState(false);
  const contrastStr = themeKeys
    .map((k) => {
      const c = stepData.contrast?.[k];
      return c ? `${k}: ${c.ratio}` : '';
    })
    .filter(Boolean)
    .join(' · ');

  const safeHex = stepData.value.startsWith('#') ? stepData.value : '#' + stepData.value;

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
          style={{ color: inkColor(getInkMode(safeHex)) }}
        >
          <span className="text-[10px] font-bold tracking-wider uppercase opacity-75 leading-none">
            {stepName}
          </span>
          <span
            className="text-[12px] font-mono font-bold px-2 py-0.5 rounded shadow-sm leading-none"
            style={{
              background: getInkMode(safeHex) === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.18)',
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
