"use client"

import { useState } from "react"
import { ProductCard } from "./ProductCard"
import type { Product } from "@/lib/types"

interface ProductListProps {
  products: Product[]
}

export function ProductList({ products }: ProductListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (!products.length) return null

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        All Ranked Products
      </h2>
      <div className="flex flex-col gap-3">
        {products.map((product, i) => {
          const overall = product.analysis?.scores?.overall_score ?? 0
          const isOpen = openIndex === i

          return (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
              {/* Summary row */}
              <button
                className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5"
                style={{ background: "var(--bg-surface)" }}
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                <span
                  className="text-sm font-bold w-6 shrink-0 text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  #{i + 1}
                </span>
                <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {product.title}
                </span>
                <span className="text-sm font-semibold shrink-0" style={{ color: "var(--text-secondary)" }}>
                  {product.price ?? "N/A"}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: overall >= 8 ? "#064E3B" : overall >= 5 ? "#451A03" : "#450A0A",
                    color: overall >= 8 ? "#10B981" : overall >= 5 ? "#F59E0B" : "#EF4444",
                  }}
                >
                  {overall.toFixed(1)}
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded card */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <ProductCard product={product} rank={i} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
