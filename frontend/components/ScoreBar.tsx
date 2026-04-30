import { scoreColor } from "@/lib/utils"

interface ScoreBarProps {
  label: string
  score: number
}

export function ScoreBar({ label, score }: ScoreBarProps) {
  const clampedScore = Math.min(10, Math.max(0, score ?? 0))
  const pct = (clampedScore / 10) * 100
  const color = scoreColor(clampedScore)

  return (
    <div className="flex items-center gap-2 w-full">
      <span
        className="text-xs shrink-0 w-28 truncate"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 rounded-full h-1.5"
        style={{ background: "#1E2D40" }}
      >
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold w-6 text-right" style={{ color }}>
        {clampedScore.toFixed(1)}
      </span>
    </div>
  )
}
