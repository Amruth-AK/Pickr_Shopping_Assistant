"use client"

import { useSearch } from "@/lib/useSearch"
import { SearchForm } from "@/components/SearchForm"
import { SearchProgress } from "@/components/SearchProgress"
import { ResultsView } from "@/components/ResultsView"

export default function Home() {
  const { search, isLoading, currentStep, currentLabel, results, error } = useSearch()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between"
        style={{
          background: "rgba(10,14,26,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="text-xl leading-none"
            style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--text-primary)" }}
          >
            AI Shopping Assistant
          </h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full hidden sm:inline-block"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
          >
            Powered by LangGraph
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>US only · No ads</span>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Hero */}
        {!results && !isLoading && (
          <div className="text-center py-6">
            <h2
              className="text-4xl md:text-5xl mb-3 leading-tight"
              style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--text-primary)" }}
            >
              Find the right product,
              <br />
              <span style={{ color: "var(--accent-primary)" }}>without the guesswork.</span>
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Describe what you need. We&apos;ll search, compare, and explain — so you don&apos;t have to.
            </p>
          </div>
        )}

        {/* Search form */}
        <SearchForm onSubmit={search} isLoading={isLoading} />

        {/* Progress */}
        {isLoading && (
          <SearchProgress currentStep={currentStep} currentLabel={currentLabel} />
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--cons-bg)", color: "var(--cons-text)", border: "1px solid var(--score-low)" }}
          >
            <strong>Search failed:</strong> {error}
          </div>
        )}

        {/* Results */}
        {results && !isLoading && (
          <ResultsView results={results} />
        )}
      </main>

      {/* Footer */}
      <footer
        className="py-4 text-center text-xs"
        style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}
      >
        AI-generated results · Prices may vary · US products only
      </footer>
    </div>
  )
}
