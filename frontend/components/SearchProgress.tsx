const STEPS = [
  { n: 1, label: "Query" },
  { n: 2, label: "Search" },
  { n: 3, label: "Specs" },
  { n: 4, label: "Ranking" },
]

interface SearchProgressProps {
  currentStep: number
  currentLabel: string
}

export function SearchProgress({ currentStep, currentLabel }: SearchProgressProps) {
  return (
    <div className="glass-card p-6 flex flex-col items-center gap-4">
      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = currentStep > step.n
          const active = currentStep === step.n

          return (
            <div key={step.n} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: done ? "var(--accent-teal)" : active ? "var(--accent-primary)" : "var(--bg-elevated)",
                    color: done || active ? "#fff" : "var(--text-muted)",
                    boxShadow: active ? "0 0 12px rgba(37,99,235,0.5)" : undefined,
                  }}
                >
                  {done ? "✓" : step.n}
                </div>
                <span
                  className="text-xs"
                  style={{ color: done || active ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-12 h-px mx-1 mb-4 transition-all"
                  style={{ background: currentStep > step.n ? "var(--accent-teal)" : "var(--border-subtle)" }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Current label */}
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        <span
          className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse"
          style={{ background: "var(--accent-primary)" }}
        />
        {currentLabel}
      </p>
    </div>
  )
}
