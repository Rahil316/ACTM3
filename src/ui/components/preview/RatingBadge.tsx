import { Badge, type BadgeVariant } from '../Badge';

const RATING_VARIANT: Record<string, BadgeVariant> = {
  AAA: 'success',
  AA: 'accent',
  'AA Large': 'warning',
  Fail: 'danger',
};

export function RatingBadge({ rating }: { rating: string }) {
  return (
    <Badge variant={RATING_VARIANT[rating] ?? 'danger'} size="xs">
      {rating === 'AA Large' ? 'AA Lg' : rating}
    </Badge>
  );
}
