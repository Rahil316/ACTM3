import { useRef, useEffect } from 'react';
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
  label?: string;
  size?: ColorInputSize;
  className?: string;
}

// Picker + hex text input. Handles all internal sync automatically.
// onUpdate fires with a sanitized uppercase 6-char hex string on any change.
export function ColorInput({ value, onUpdate, idPrefix = null, label, size = 'xl', className }: ColorInputProps) {
  const s = SIZE[size];
  const initial = sanitizeHex(value);
  const hexRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  // Sync inputs when the value prop changes externally (e.g. preset load, undo).
  useEffect(() => {
    const clean = sanitizeHex(value);
    if (hexRef.current && hexRef.current !== document.activeElement) hexRef.current.value = clean;
    if (pickerRef.current && pickerRef.current !== document.activeElement) pickerRef.current.value = normalizeHex(clean) || '#000000';
  }, [value]);

  // Buffer picker drags — update the hex text immediately for visual feedback,
  // but only commit to the store on pointerup to avoid ~60 store writes/sec.
  const pendingPickerHex = useRef<string | null>(null);

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace('#', '').toUpperCase();
    if (hexRef.current) hexRef.current.value = clean;
    pendingPickerHex.current = clean;
  };

  const handlePickerPointerUp = () => {
    if (pendingPickerHex.current !== null) {
      onUpdate(pendingPickerHex.current);
      pendingPickerHex.current = null;
    }
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = sanitizeHex(e.target.value);
    if (clean.length === 6 && pickerRef.current) pickerRef.current.value = '#' + clean;
    if (clean.length === 6) onUpdate(clean);
  };

  const handleHexBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const clean = sanitizeHex(e.target.value);
    // Expand 3-char shorthand (e.g. FFF → FFFFFF, A3C → AA33CC)
    if (clean.length === 3) {
      const expanded = clean.split('').map((c) => c + c).join('');
      if (hexRef.current) hexRef.current.value = expanded;
      if (pickerRef.current) pickerRef.current.value = '#' + expanded;
      onUpdate(expanded);
    }
  };

  const picker = (
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
        aria-label="Color picker"
        onChange={handlePickerChange}
        onPointerUp={handlePickerPointerUp}
        onBlur={handlePickerPointerUp}
        className={clsx('cursor-pointer h-full shrink-0 bg-transparent border-none rounded-none p-0.5', s.swatch)}
      />
      <input
        ref={hexRef}
        type="text"
        defaultValue={initial}
        id={idPrefix ? `${idPrefix}-hex` : undefined}
        aria-label="Hex color value"
        maxLength={6}
        onChange={handleHexChange}
        onBlur={handleHexBlur}
        className={clsx('w-full bg-transparent uppercase outline-none text-text-primary pr-2', s.text)}
      />
    </div>
  );

  if (!label) return picker;

  return (
    <div className="flex flex-col gap-1 w-full">
      <label htmlFor={idPrefix ? `${idPrefix}-hex` : undefined} className="text-[12px] font-medium text-text-muted ml-0.5">
        {label}
      </label>
      {picker}
    </div>
  );
}
