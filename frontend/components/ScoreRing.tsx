"use client"

import { useEffect, useRef } from "react"
import { scoreColor } from "@/lib/utils"

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
}

export function ScoreRing({ score, size = 64, strokeWidth = 5 }: ScoreRingProps) {
  const r = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const clampedScore = Math.min(10, Math.max(0, score))
  const offset = circumference * (1 - clampedScore / 10)
  const color = scoreColor(clampedScore)

  const fillRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const el = fillRef.current
    if (!el) return
    el.style.setProperty("--circumference", String(circumference))
    el.style.setProperty("--target-offset", String(offset))
  }, [circumference, offset])

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1E2D40"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          ref={fillRef}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="score-ring-fill"
        />
      </svg>
      <span
        className="text-xl font-bold leading-none -mt-12"
        style={{ color }}
      >
        {clampedScore.toFixed(1)}
      </span>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>/ 10</span>
    </div>
  )
}
