"use client"

import { motion } from "framer-motion"
import { ComparisonTable } from "./ComparisonTable"
import { ProductList } from "./ProductList"
import type { SearchResult } from "@/lib/types"

interface ResultsViewProps {
  results: SearchResult
  maxPrice?: number
}

export function ResultsView({ results, maxPrice }: ResultsViewProps) {
  const { recommendations, ranked_products, analysis_summary } = results

  return (
    <div className="flex flex-col gap-10">
      {/* Analysis summary card */}
      {analysis_summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="rounded-2xl px-6 py-5"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-mid)",
          }}
        >
          <h2
            className="text-sm font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-3)" }}
          >
            Analysis
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
            {analysis_summary}
          </p>
        </motion.div>
      )}

      {/* Top 3 comparison */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <ComparisonTable products={recommendations} maxPrice={maxPrice} />
        </motion.div>
      )}

      {/* Divider */}
      {ranked_products.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-dim)" }} />
      )}

      {/* All ranked products */}
      {ranked_products.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <ProductList products={ranked_products} />
        </motion.div>
      )}
    </div>
  )
}
