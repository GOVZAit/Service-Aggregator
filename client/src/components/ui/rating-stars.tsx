import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  reviews?: number;
  showCount?: boolean;
  size?: "sm" | "md";
}

export function RatingStars({ rating, reviews, showCount = true, size = "md" }: RatingStarsProps) {
  const starSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-1">
      <Star className={`${starSize} fill-amber-400 text-amber-400`} />
      <span className={`font-semibold ${textSize} tabular-nums`}>{rating.toFixed(1)}</span>
      {showCount && reviews !== undefined && (
        <span className={`text-muted-foreground ${textSize}`}>({reviews})</span>
      )}
    </div>
  );
}
