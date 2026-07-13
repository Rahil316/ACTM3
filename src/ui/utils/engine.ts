export { variableMaker } from "../../shared/clrEngine";
export { contrastRatio, contrastRating, resolveTokenRefBgs } from "../../shared/clrUtils";
export { translateLocalBg } from "../../shared/clrUtils";

import { contrastRatio, contrastRating } from "../../shared/clrUtils";
import { ratingFromRatio } from "../types/state";
import type { ContrastRating } from "../types/state";

export function contrastRatingColor(rating: ContrastRating | null): string {
  switch (rating) {
    case "AAA": return "#34d399";
    case "AA": return "#86efac";
    case "AA Large Text": return "#fbbf24";
    case "Fail": return "#f87171";
    default: return "#52525b";
  }
}

export function contrastRatioColor(ratio: number | null): string {
  if (ratio == null) return "#52525b";
  return contrastRatingColor(ratingFromRatio(ratio));
}

export function formatContrastLabel(hex1: string, hex2: string): string {
  const ratio = contrastRatio(hex1, hex2);
  if (ratio == null) return "—";
  const rating = contrastRating(hex1, hex2);
  return `${ratio.toFixed(1)}:1${rating ? ` ${rating}` : ""}`.trim();
}
