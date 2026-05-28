import clsx from 'clsx';

interface ColorSwatchProps {
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'full';
  border?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
};

const RADIUS = {
  sm: 'rounded-[3px]',
  md: 'rounded-[6px]',
  full: 'rounded-full',
};

export function ColorSwatch({ color, size = 'sm', radius = 'md', border = true, className, style }: ColorSwatchProps) {
  return (
    <div
      className={clsx(SIZE[size], RADIUS[radius], border && 'border border-black/10', 'shrink-0', className)}
      style={{ background: color, ...style }}
    />
  );
}
