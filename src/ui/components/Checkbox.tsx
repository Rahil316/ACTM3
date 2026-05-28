import { Check } from 'lucide-react';
import clsx from 'clsx';

interface CheckboxProps {
  checked: boolean;
  className?: string;
}

export function Checkbox({ checked, className }: CheckboxProps) {
  return (
    <div
      className={clsx(
        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
        checked ? 'bg-accent border-accent' : 'border-border-strong bg-bg-input',
        className,
      )}
    >
      {checked && <Check size={10} strokeWidth={3} className="text-text-on-accent" />}
    </div>
  );
}
