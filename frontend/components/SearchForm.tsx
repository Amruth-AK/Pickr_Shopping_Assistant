"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { SearchRequest } from "@/lib/types"

interface SearchFormProps {
  onSubmit: (req: SearchRequest) => void
  isLoading: boolean
}

export function SearchForm({ onSubmit, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [focused, setFocused] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!query.trim() || isLoading) return
    onSubmit({
      query: query.trim(),
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
    })
  }

  const inputBase: React.CSSProperties = {
    background: "var(--bg-elevated)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-dim)",
    borderRadius: "10px",
    color: "var(--text-1)",
    fontSize: "14px",
    width: "100%",
    padding: "10px 14px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  }

  const inputFocused: React.CSSProperties = {
    borderColor: "var(--accent-blue)",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.12)",
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
        }}
      >
        {/* Query — full width */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            What are you looking for?
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused("query")}
            onBlur={() => setFocused(null)}
            placeholder='e.g. "I am looking for a gaming laptop with at least 16GB RAM and a good display"'
            rows={3}
            style={{
              ...inputBase,
              resize: "none",
              ...(focused === "query" ? inputFocused : {}),
            }}
            required
            disabled={isLoading}
          />
        </div>

        {/* Max Budget */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            Max budget{" "}
            <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span>
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none pointer-events-none"
              style={{ color: "var(--text-3)" }}
            >
              $
            </span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onFocus={() => setFocused("price")}
              onBlur={() => setFocused(null)}
              placeholder="Any"
              min={0}
              style={{
                ...inputBase,
                paddingLeft: "28px",
                ...(focused === "price" ? inputFocused : {}),
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between gap-4">
          <motion.button
            type="submit"
            disabled={isLoading || !query.trim()}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isLoading
                ? "var(--bg-elevated)"
                : "linear-gradient(135deg, #3b82f6, #6366f1)",
              boxShadow: isLoading ? "none" : "0 0 20px rgba(99,102,241,0.3)",
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Searching…
              </span>
            ) : (
              "Find Products →"
            )}
          </motion.button>

          {query && !isLoading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs"
              style={{ color: "var(--text-3)" }}
            >
              Press Enter or click Find
            </motion.p>
          )}
        </div>
      </div>
    </form>
  )
}
