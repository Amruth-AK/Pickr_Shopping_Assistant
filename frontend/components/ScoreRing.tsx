"use client"

import { useEffect, useRef } from "react"
import { scoreColor } from "@/lib/utils"

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
}

export function ScoreRing({ score, size = 64, strokeWidth = 4, showLabel = true }: ScoreRingProps) {
  const r = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.min(10, Math.max(0, score ?? 0))
  const offset = circumference * (1 - clamped / 10)
  const color = scoreColor(clamped)
  const fillRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const el = fillRef.current
    if (!el) return
    el.style.setProperty("--circumference", String(circumference))
    el.style.setProperty("--target-offset", String(offset))
  }, [circumference, offset])

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--border-dim)"
          strokeWidth={strokeWidth}
        />
        {/* Glow behind fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          opacity={0.12}
          className="score-ring-fill"
          style={{ filter: "blur(2px)" } as React.CSSProperties}
        />
        {/* Fill */}
        <circle
          ref={fillRef}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="score-ring-fill"
        />
      </svg>

      {/* Centered text overlay */}
      {showLabel && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          <span className="font-bold leading-none" style={{ color, fontSize: size * 0.28 }}>
            {clamped.toFixed(1)}
          </span>
          <span style={{ color: "var(--text-3)", fontSize: size * 0.14, lineHeight: 1 }}>/ 10</span>
        </div>
      )}
    </div>
  )
}
