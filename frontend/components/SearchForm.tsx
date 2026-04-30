"use client"

import { useState } from "react"
import type { SearchRequest } from "@/lib/types"

interface SearchFormProps {
  onSubmit: (req: SearchRequest) => void
  isLoading: boolean
}

export function SearchForm({ onSubmit, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [requirements, setRequirements] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    onSubmit({
      query: query.trim(),
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
      requirements: requirements.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
        {/* Query */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            What are you looking for?
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "gaming laptop 16GB RAM" or "wireless earbuds"'
            className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
            required
            disabled={isLoading}
          />
        </div>

        {/* Max price */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Max Price (USD)
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              $
            </span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any"
              min={0}
              className="w-full rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:ring-2 transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Additional Requirements <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </label>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder='e.g. "Must have at least 15hr battery life, lightweight, good microphone"'
          rows={2}
          className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 transition-all resize-none"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="self-start px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: isLoading ? "var(--bg-elevated)" : "var(--accent-primary)" }}
      >
        {isLoading ? "Searching…" : "Find Products"}
      </button>
    </form>
  )
}
