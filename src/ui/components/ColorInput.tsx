import { useRef } from 'react';
import clsx from 'clsx';

// Sanitizes a hex string: strips #, keeps only hex chars, returns uppercase, max 6 chars.
function sanitizeHex(raw: string): string {
  return raw.replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
}

// Pads a 3-char hex to 6 (#ABC → #AABBCC) for the native color picker.
function normalizeHex(hex: string): string {
  const h = hex.replace(/^#/, '');
  if (h.length === 3) return '#' + h.split('').map((c) => c + c).join('');
  if (h.length === 6) return '#' + h;
  return '';
}

export type ColorInputSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<ColorInputSize, { wrap: string; swatch: string; text: string }> = {
  sm: { wrap: 'h-[28px] rounded-[5px]', swatch: 'w-7',  text: 'text-[11px]' },
  md: { wrap: 'h-[32px] rounded-[6px]', swatch: 'w-8',  text: 'text-[12px]' },
  lg: { wrap: 'h-[36px] rounded-[7px]', swatch: 'w-9',  text: 'text-[12px]' },
  xl: { wrap: 'h-[40px] rounded-[8px]', swatch: 'w-10', text: 'text-[13px]' },
};

interface ColorInputProps {
  value: string;
  onUpdate: (cleanHex: string) => void;
  idPrefix?: string | null;
  size?: ColorInputSize;
  className?: string;
}

// Picker + hex text input. Handles all internal sync automatically.
// onUpdate fires with a sanitized uppercase 6-char hex string on any change.
export function ColorInput({ value, onUpdate, idPrefix = null, size = 'xl', className }: ColorInputProps) {
  const s = SIZE[size];
  const initial = sanitizeHex(value);
  const hexRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace('#', '').toUpperCase();
    if (hexRef.current) hexRef.current.value = clean;
    onUpdate(clean);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = sanitizeHex(e.target.value);
    if (clean.length === 6 && pickerRef.current) pickerRef.current.value = '#' + clean;
    if (clean.length === 6) onUpdate(clean);
  };

  return (
    <div className={clsx(
      'flex items-center w-full bg-bg-input border border-border-input overflow-hidden',
      s.wrap,
      className,
    )}>
      <input
        ref={pickerRef}
        type="color"
        defaultValue={normalizeHex(initial) || '#000000'}
        id={idPrefix ? `${idPrefix}-picker` : undefined}
        onChange={handlePickerChange}
        className={clsx('cursor-pointer h-full shrink-0 bg-transparent border-none rounded-none p-0.5', s.swatch)}
      />
      <input
        ref={hexRef}
        type="text"
        defaultValue={initial}
        id={idPrefix ? `${idPrefix}-hex` : undefined}
        maxLength={6}
        onChange={handleHexChange}
        className={clsx('w-full bg-transparent uppercase outline-none text-text-primary pr-2', s.text)}
      />
    </div>
  );
}
