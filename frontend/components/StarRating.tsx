interface StarRatingProps {
  rating: number | string | undefined
  reviews?: number | string | undefined
  size?: number
}

export function StarRating({ rating, reviews, size = 14 }: StarRatingProps) {
  const value = parseFloat(String(rating ?? 0))
  const clamped = Math.min(5, Math.max(0, isNaN(value) ? 0 : value))
  const full = Math.floor(clamped)
  const half = clamped - full >= 0.4 ? 1 : 0
  const empty = 5 - full - half

  const Star = ({ type }: { type: "full" | "half" | "empty" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {type === "full" && (
        <polygon
          points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
          fill="#D97706"
        />
      )}
      {type === "half" && (
        <>
          <defs>
            <linearGradient id="half-grad">
              <stop offset="50%" stopColor="#D97706" />
              <stop offset="50%" stopColor="#1E2D40" />
            </linearGradient>
          </defs>
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill="url(#half-grad)"
          />
        </>
      )}
      {type === "empty" && (
        <polygon
          points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
          fill="#1E2D40"
        />
      )}
    </svg>
  )

  if (!rating || isNaN(value)) {
    return <span className="text-xs" style={{ color: "var(--text-muted)" }}>No rating</span>
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => <Star key={`f${i}`} type="full" />)}
        {half > 0 && <Star key="h" type="half" />}
        {Array.from({ length: empty }).map((_, i) => <Star key={`e${i}`} type="empty" />)}
      </div>
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {clamped.toFixed(1)}
        {reviews && (
          <span style={{ color: "var(--text-muted)" }}> ({Number(reviews).toLocaleString()})</span>
        )}
      </span>
    </div>
  )
}
