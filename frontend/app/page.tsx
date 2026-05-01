"use client"

import { useState } from "react"
import { useSearch } from "@/lib/useSearch"
import { SearchForm } from "@/components/SearchForm"
import { SearchProgress } from "@/components/SearchProgress"
import { ResultsView } from "@/components/ResultsView"
import { motion, AnimatePresence } from "framer-motion"

export default function Home() {
  const { search, isLoading, currentStep, currentLabel, results, error } = useSearch()
  const [showSearch, setShowSearch] = useState(true)
  const [lastQuery, setLastQuery] = useState("")
  const [lastMaxPrice, setLastMaxPrice] = useState("")

  function handleSearch(req: { query: string; max_price?: number }) {
    setLastQuery(req.query)
    setLastMaxPrice(req.max_price != null ? String(req.max_price) : "")
    setShowSearch(false)
    search(req)
  }

  const hasResults = !!results && !isLoading

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-5 py-3"
        style={{
          background: "rgba(13,13,13,0.8)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: "var(--accent-blue)" }}
            >
              ✦
            </div>
            <span
              className="font-semibold tracking-tight"
              style={{ color: "var(--text-1)", fontFamily: "var(--font-inter)" }}
            >
              ShopAdvisor
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full hidden sm:inline"
              style={{
                background: "rgba(59,130,246,0.1)",
                color: "var(--accent-blue)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              AI-powered
            </span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>US only</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Hero — only when idle with no results */}
        <AnimatePresence>
          {!results && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center pt-4 pb-2"
            >
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-[1.1]"
                style={{ color: "var(--text-1)", fontFamily: "var(--font-instrument-serif)" }}
              >
                Find the right product,{" "}
                <span
                  className="relative inline-block"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  without the noise.
                </span>
              </h1>
              <p className="text-base max-w-lg mx-auto" style={{ color: "var(--text-2)" }}>
                Describe what you need. We search, compare, and explain — so you pick with confidence.
              </p>

              {/* Feature pills */}
              <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                {["Real-time search", "Side-by-side compare", "AI-scored"].map((tag, i) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-2)",
                      border: "1px solid var(--border-mid)",
                    }}
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search form — shown when idle or when user toggles it back */}
        <AnimatePresence>
          {(showSearch || isLoading) && (
            <motion.div
              key="search-form"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              layout
            >
              <SearchForm
                key={lastQuery + lastMaxPrice}
                onSubmit={handleSearch}
                isLoading={isLoading}
                initialQuery={lastQuery}
                initialMaxPrice={lastMaxPrice}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <SearchProgress currentStep={currentStep} currentLabel={currentLabel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl px-5 py-4 text-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5",
              }}
            >
              <strong className="font-semibold">Search failed — </strong>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {hasResults && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              layout
            >
              {/* Search again button */}
              {!showSearch && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6"
                >
                  <button
                    onClick={() => setShowSearch(true)}
                    className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all hover:opacity-80"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-mid)",
                      color: "var(--text-2)",
                    }}
                  >
                    <span style={{ color: "var(--accent-blue)" }}>✦</span>
                    Search again
                  </button>
                </motion.div>
              )}

              <ResultsView results={results} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-5 text-center text-xs" style={{ color: "var(--text-3)", borderTop: "1px solid var(--border-dim)" }}>
        AI-generated results · Prices may vary · US products only
      </footer>
    </div>
  )
}
