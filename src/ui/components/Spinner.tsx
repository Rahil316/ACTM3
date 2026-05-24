import clsx from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

// Circular accent-colored spinner. Uses Tailwind animate-spin.
export function Spinner({ size = 'lg', className }: SpinnerProps) {
  return (
    <div
      className={clsx(
        SIZE[size],
        'border-accent border-t-transparent rounded-full animate-spin',
        className,
      )}
    />
  );
}

// Full-section loading placeholder — spinner centred in a padded area.
// Use for card-level or panel-level loading (not the full screen).
export function SectionSpinner({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 py-10', className)}>
      <Spinner size="md" />
      {message && <p className="text-[12px] text-text-muted">{message}</p>}
    </div>
  );
}
