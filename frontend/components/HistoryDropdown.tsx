"use client"

import { useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { HistoryEntry } from "@/lib/useHistory"

interface HistoryDropdownProps {
  entries: HistoryEntry[]
  open: boolean
  onClose: () => void
  onSelect: (entry: HistoryEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

export function HistoryDropdown({ entries, open, onClose, onSelect, onRemove, onClear }: HistoryDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <motion.button
        onClick={() => onClose()}
        whileHover={{ background: "rgba(255,255,255,0.10)" }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl"
        style={{
          background: open ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#d6d3e2",
          backdropFilter: "blur(8px)",
        }}
        aria-label="Search history"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7.5 4.5V7.5L9.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        History
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden z-50"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-mid)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-dim)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                Recent Searches
              </span>
              {entries.length > 0 && (
                <button
                  onClick={onClear}
                  className="text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent-rose)" }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* List */}
            {entries.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs" style={{ color: "var(--text-3)" }}>No searches yet</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    className="group flex items-center gap-3 px-4 py-3 cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border-dim)" }}
                    whileHover={{ background: "var(--bg-muted)" }}
                    transition={{ duration: 0.12 }}
                    onClick={() => onSelect(entry)}
                  >
                    {/* Clock icon */}
                    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" className="shrink-0" style={{ color: "var(--text-3)" }}>
                      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M7.5 4.5V7.5L9.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>

                    {/* Query + time */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>
                        {entry.query}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                        {timeAgo(entry.timestamp)}
                      </p>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(entry.id) }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70 text-xs"
                      style={{ color: "var(--text-3)" }}
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
