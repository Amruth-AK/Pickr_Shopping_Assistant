import { ComparisonTable } from "./ComparisonTable"
import { ProductList } from "./ProductList"
import type { SearchResult } from "@/lib/types"

interface ResultsViewProps {
  results: SearchResult
  maxPrice?: number
}

export function ResultsView({ results, maxPrice }: ResultsViewProps) {
  const { processed_query, recommendations, ranked_products } = results
  const query = processed_query?.restructured ?? results.query

  return (
    <div className="flex flex-col gap-8">
      {/* Query banner */}
      {query && (
        <div
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          Searching for:{" "}
          <strong style={{ color: "var(--text-primary)" }}>{query}</strong>
        </div>
      )}

      {/* Top 3 comparison */}
      {recommendations.length > 0 && (
        <ComparisonTable products={recommendations} maxPrice={maxPrice} />
      )}

      {/* All ranked products */}
      {ranked_products.length > 0 && (
        <ProductList products={ranked_products} />
      )}

      {/* Footer note */}
      <p className="text-xs text-center pb-4" style={{ color: "var(--text-muted)" }}>
        Results are AI-generated · Prices may vary · US products only
      </p>
    </div>
  )
}
