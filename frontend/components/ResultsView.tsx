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
  const { processed_query, recommendations, ranked_products, analysis_summary } = results
  const query = processed_query?.restructured ?? results.query

  return (
    <div className="flex flex-col gap-10">
      {/* Query banner */}
      {query && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-dim)",
            color: "var(--text-2)",
          }}
        >
          <span style={{ color: "var(--text-3)" }}>✦</span>
          Showing results for{" "}
          <strong style={{ color: "var(--text-1)", fontWeight: 600 }}>{query}</strong>
        </motion.div>
      )}

      {/* Analysis summary */}
      {analysis_summary && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-2)" }}
        >
          {analysis_summary}
        </motion.p>
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
