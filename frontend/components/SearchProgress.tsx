"use client"

import { motion } from "framer-motion"

const STEPS = [
  { n: 1, label: "Query", icon: "✦" },
  { n: 2, label: "Search", icon: "⊙" },
  { n: 3, label: "Specs", icon: "≡" },
  { n: 4, label: "Rank", icon: "▲" },
]

interface SearchProgressProps {
  currentStep: number
  currentLabel: string
}

export function SearchProgress({ currentStep, currentLabel }: SearchProgressProps) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col items-center gap-6"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-dim)",
      }}
    >
      {/* Steps */}
      <div className="flex items-center w-full max-w-sm">
        {STEPS.map((step, i) => {
          const done = currentStep > step.n
          const active = currentStep === step.n
          const pending = currentStep < step.n

          return (
            <div key={step.n} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                {/* Circle */}
                <motion.div
                  animate={{
                    background: done
                      ? "var(--accent-green)"
                      : active
                      ? "var(--accent-blue)"
                      : "var(--bg-elevated)",
                    scale: active ? 1.12 : 1,
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold relative ${active ? "glow-pulse" : ""}`}
                  style={{
                    color: pending ? "var(--text-3)" : "#fff",
                    border: pending ? "1px solid var(--border-mid)" : "none",
                  }}
                >
                  {done ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      ✓
                    </motion.span>
                  ) : (
                    <span style={{ fontSize: "12px" }}>{step.icon}</span>
                  )}

                  {/* Active ripple */}
                  {active && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                      style={{ background: "var(--accent-blue)" }}
                    />
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className="text-xs font-medium"
                  style={{ color: done || active ? "var(--text-1)" : "var(--text-3)" }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2 mb-5">
                  <div
                    className="step-connector"
                    style={{ background: "var(--border-mid)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: currentStep > step.n ? "100%" : "0%" }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      style={{ background: "var(--accent-green)" }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current label */}
      <motion.div
        key={currentLabel}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--text-2)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: "var(--accent-blue)" }}
        />
        {currentLabel}
      </motion.div>
    </div>
  )
}
