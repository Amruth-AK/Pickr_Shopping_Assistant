"use client"

import { useState, useEffect, useRef } from "react"
import { useSearch } from "@/lib/useSearch"
import { useHistory } from "@/lib/useHistory"
import { SearchForm } from "@/components/SearchForm"
import { SearchProgress } from "@/components/SearchProgress"
import { ResultsView } from "@/components/ResultsView"
import { HistoryDropdown } from "@/components/HistoryDropdown"
import { HeroBackground } from "@/components/ui/elegant-shapes"
import { motion, AnimatePresence } from "framer-motion"
import type { SearchResult } from "@/lib/types"

const LOGO_STYLES = {
  fontFamily: "var(--font-fraunces)",
  fontStyle: "italic",
  fontWeight: 700,
  fontVariationSettings: '"opsz" 144, "SOFT" 50',
  letterSpacing: "-0.02em",
  background: "linear-gradient(135deg, #0f0a1e 0%, #3b1fa8 50%, #5b21b6 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
}

const LOGO_STYLES_DARK_BG = {
  fontFamily: "var(--font-fraunces)",
  fontStyle: "italic",
  fontWeight: 700,
  fontVariationSettings: '"opsz" 144, "SOFT" 50',
  letterSpacing: "-0.02em",
  background: "linear-gradient(135deg, #f5f3ff 0%, #c4b5fd 60%, #a78bfa 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
}

export default function Home() {
  const { search, reset, isLoading, currentStep, currentLabel, results, error } = useSearch()
  const { entries, push, remove, clear } = useHistory()
  const [showSearch, setShowSearch] = useState(true)
  const [lastQuery, setLastQuery] = useState("")
  const [lastMaxPrice, setLastMaxPrice] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)
  const [displayedResults, setDisplayedResults] = useState<SearchResult | null>(null)
  const [navVisible, setNavVisible] = useState(true)
  const lastScrollY = useRef(0)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onScroll() {
      const current = window.scrollY
      if (current > lastScrollY.current) {
        setNavVisible(false)  // scrolling down — hide immediately
      }
      lastScrollY.current = current
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const isIdle = !displayedResults && !isLoading

  function handleSearch(req: { query: string; max_price?: number }) {
    setLastQuery(req.query)
    setLastMaxPrice(req.max_price != null ? String(req.max_price) : "")
    setShowSearch(false)
    setDisplayedResults(null)
    search(req)
  }

  function handleReset() {
    reset()
    setShowSearch(true)
    setLastQuery("")
    setLastMaxPrice("")
    setDisplayedResults(null)
    setHistoryOpen(false)
  }

  function handleHistorySelect(entry: import("@/lib/useHistory").HistoryEntry) {
    reset()
    setDisplayedResults(entry.results)
    setLastQuery(entry.query)
    setShowSearch(false)
    setHistoryOpen(false)
  }

  const activeResults = displayedResults ?? results

  useEffect(() => {
    if (results && !isLoading) {
      push(lastQuery, results)
      setDisplayedResults(results)
    }
  }, [results, isLoading])

  const hasResults = !!activeResults && !isLoading

  // Show nav only when the top edge of results scrolls back into view
  useEffect(() => {
    const el = resultsRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNavVisible(true)
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasResults])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      <HeroBackground />

      {/* Desktop nav — fixed top-left logo + top-right history */}
      <AnimatePresence>
        {(!isIdle || entries.length > 0) && (
          <motion.div
            className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6 py-5 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {!isIdle && (
              <motion.button
                layoutId="pickr-logo"
                onClick={handleReset}
                className="text-2xl font-bold leading-none cursor-pointer pointer-events-auto"
                style={LOGO_STYLES_DARK_BG}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                Pickr
              </motion.button>
            )}
            <div className={`pointer-events-auto ${isIdle ? "ml-auto" : ""}`}>
              <HistoryDropdown
                entries={entries}
                open={historyOpen}
                onClose={() => setHistoryOpen((v) => !v)}
                onSelect={handleHistorySelect}
                onRemove={remove}
                onClear={clear}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile nav — logo top-left, history top-right, no background */}
      <AnimatePresence>
        {(!isIdle || entries.length > 0) && (
          <motion.div
            className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: navVisible ? 1 : 0, y: navVisible ? 0 : -8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ pointerEvents: navVisible ? "auto" : "none" }}
          >
            {!isIdle && (
              <motion.button
                layoutId="pickr-logo-mobile"
                onClick={handleReset}
                className="text-2xl font-bold leading-none cursor-pointer select-none"
                style={LOGO_STYLES_DARK_BG}
                whileTap={{ scale: 0.93, opacity: 0.75 }}
                transition={{ duration: 0.12 }}
              >
                Pickr
              </motion.button>
            )}
            <div className={isIdle ? "ml-auto" : ""}>
              <HistoryDropdown
                entries={entries}
                open={historyOpen}
                onClose={() => setHistoryOpen((v) => !v)}
                onSelect={handleHistorySelect}
                onRemove={remove}
                onClear={clear}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main
        className={`relative z-10 flex-1 w-full mx-auto px-4 flex flex-col gap-5 ${
          hasResults ? "max-w-6xl" : "max-w-2xl"
        } ${isIdle ? "justify-center" : "pt-20 pb-10 md:py-10 gap-8"}`}
        style={{ isolation: "isolate" }}
      >
        {/* Hero — only when idle */}
        <AnimatePresence mode="wait">
          {isIdle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <div
                className="inline-flex flex-col items-center gap-3 px-10 py-8 rounded-3xl mb-1"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-mid)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                }}
              >
                <motion.h1
                  layoutId="pickr-logo"
                  className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-none"
                  style={LOGO_STYLES}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  Pickr
                </motion.h1>

                <p className="text-sm" style={{ color: "var(--text-2)" }}>
                  Tell us what you need. We handle the rest.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search form */}
        <AnimatePresence>
          {(showSearch || isLoading) && (
            <motion.div
              key="search-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              layout
              layoutId="search-form"
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
              {/* sentinel — nav reappears when this top edge scrolls back into view */}
              <div ref={resultsRef} style={{ height: 0 }} />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="hidden md:flex justify-end mb-6"
              >
                <motion.button
                  onClick={handleReset}
                  whileHover={{ background: "#15131c", color: "#e8e4f0", borderColor: "#e8e4f0" }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl"
                  style={{
                    background: "#e8e4f0",
                    color: "#15131c",
                    border: "1px solid #c4bdda",
                  }}
                >
                  <span className="hidden md:inline">← </span>New Search
                </motion.button>
              </motion.div>

              <ResultsView results={activeResults!} />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-end mt-6"
              >
                <motion.button
                  onClick={handleReset}
                  whileHover={{ background: "#15131c", color: "#e8e4f0", borderColor: "#e8e4f0" }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl"
                  style={{
                    background: "#e8e4f0",
                    color: "#15131c",
                    border: "1px solid #c4bdda",
                  }}
                >
                  <span className="hidden md:inline">← </span>New Search
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  )
}
