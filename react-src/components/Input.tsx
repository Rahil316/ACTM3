import { type InputHTMLAttributes, type ReactNode, useId } from 'react';
import clsx from 'clsx';

// ── Size tokens ───────────────────────────────────────────────────────────────
// table 26px — inline table cells
// sm    28px — compact
// md    32px — medium
// lg    36px — default labeled inputs
// xl    40px — primary inputs, header-level

export type InputSize = 'table' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<InputSize, { h: string; text: string; px: string; r: string }> = {
  table: { h: 'h-[26px]', text: 'text-[11px]', px: 'px-1.5', r: 'rounded-[4px]' },
  sm:    { h: 'h-[28px]', text: 'text-[11px]', px: 'px-2',   r: 'rounded-[6px]' },
  md:    { h: 'h-[32px]', text: 'text-[12px]', px: 'px-2',   r: 'rounded-[7px]' },
  lg:    { h: 'h-[36px]', text: 'text-[13px]', px: 'px-3',   r: 'rounded-[8px]' },
  xl:    { h: 'h-[40px]', text: 'text-[13px]', px: 'px-3',   r: 'rounded-[8px]' },
};

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  size?: InputSize;
  width?: 'full' | 'flex' | null;
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  infoIcon?: ReactNode;
}

export function Input({
  size = 'lg',
  width = 'full',
  label,
  hint,
  error,
  mono = false,
  leadingIcon,
  trailingIcon,
  infoIcon,
  disabled,
  className,
  id: idProp,
  ...rest
}: InputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  const s = SIZE[size];
  const widthCls = width === 'full' ? 'w-full' : width === 'flex' ? 'flex-1' : '';
  const hasDecor = !!(label || hint || error || leadingIcon || trailingIcon);

  const inputCls = clsx(
    s.h, s.text, s.px, s.r,
    leadingIcon  ? 'pl-7' : '',
    trailingIcon ? 'pr-7' : '',
    !hasDecor ? widthCls : 'w-full',
    'bg-bg-input border border-border-base text-text-primary',
    'outline-none focus:border-border-focus transition-colors',
    mono    ? 'font-mono uppercase' : '',
    disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
    className,
  );

  const inputEl = <input id={id} disabled={disabled} className={inputCls} {...rest} />;

  if (!hasDecor) return inputEl;

  const mkIcon = (node: ReactNode, side: 'left' | 'right') => (
    <span className={`absolute ${side}-2 flex items-center justify-center w-3.5 h-3.5 text-text-muted pointer-events-none`}>
      {node}
    </span>
  );

  const boundary = (leadingIcon || trailingIcon) ? (
    <div className="relative flex items-center">
      {leadingIcon  && mkIcon(leadingIcon,  'left')}
      {inputEl}
      {trailingIcon && mkIcon(trailingIcon, 'right')}
    </div>
  ) : inputEl;

  return (
    <div className={clsx('space-y-1', widthCls)}>
      {label && (
        <div className="flex items-center gap-1">
          <label htmlFor={id} className="text-[12px] text-text-muted font-medium ml-1">{label}</label>
          {infoIcon}
        </div>
      )}
      {boundary}
      {(error || hint) && (
        <p className={clsx('text-[11px] ml-1', error ? 'text-red-400' : 'text-text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
