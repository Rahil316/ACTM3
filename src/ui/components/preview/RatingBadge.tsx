const RATING_STYLE: Record<string, { bg: string; color: string }> = {
  AAA:       { bg: '#16a34a', color: '#fff' },
  AA:        { bg: '#2563eb', color: '#fff' },
  'AA Large':{ bg: '#d97706', color: '#fff' },
  Fail:      { bg: '#dc2626', color: '#fff' },
};

const FALLBACK = { bg: '#6b7280', color: '#fff' };

export function RatingBadge({ rating }: { rating: string }) {
  const { bg, color } = RATING_STYLE[rating] ?? FALLBACK;
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-bold leading-none tracking-wide"
      style={{ background: bg, color }}
    >
      {rating === 'AA Large' ? 'AA Lg' : rating}
    </span>
  );
}
