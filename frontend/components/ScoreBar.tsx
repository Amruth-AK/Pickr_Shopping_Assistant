"use client"

import { motion } from "framer-motion"
import { scoreColor } from "@/lib/utils"

interface ScoreBarProps {
  label: string
  score: number
}

export function ScoreBar({ label, score }: ScoreBarProps) {
  const clamped = Math.min(10, Math.max(0, score ?? 0))
  const pct = (clamped / 10) * 100
  const color = scoreColor(clamped)

  return (
    <div className="flex items-center gap-2.5 w-full">
      <span className="text-xs shrink-0 w-24 truncate" style={{ color: "var(--text-2)" }}>
        {label}
      </span>
      <div className="flex-1 rounded-full h-1.5" style={{ background: "var(--border-dim)" }}>
        <motion.div
          className="h-1.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
          style={{ background: color }}
        />
      </div>
      <span className="text-xs font-bold w-6 text-right shrink-0" style={{ color }}>
        {clamped.toFixed(1)}
      </span>
    </div>
  )
}
