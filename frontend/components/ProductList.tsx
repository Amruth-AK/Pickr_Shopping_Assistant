"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProductCard } from "./ProductCard"
import { scoreColor } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ProductListProps {
  products: Product[]
}

export function ProductList({ products }: ProductListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (!products.length) return null

  return (
    <section className="mt-2">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold" style={{ color: "#f0f0f0" }}>
          All Ranked Products
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#a3a3a3",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {products.length} results
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {products.map((product, i) => {
          const overall = product.analysis?.scores?.overall_score ?? 0
          const color = scoreColor(overall)
          const isOpen = openIndex === i

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--border-mid)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
              }}
            >
              {/* Collapsed row */}
              <motion.button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors"
                style={{ background: isOpen ? "var(--bg-muted)" : "var(--bg-surface)" }}
                whileHover={{ background: "var(--bg-hover-light)" }}
                transition={{ duration: 0.15 }}
              >
                {/* Rank number */}
                <span
                  className="text-sm font-bold w-6 text-center shrink-0"
                  style={{ color: "var(--text-3)" }}
                >
                  {i + 1}
                </span>

                {/* Title */}
                <span
                  className="flex-1 text-sm font-medium truncate"
                  style={{ color: "var(--text-1)" }}
                >
                  {product.title}
                </span>

                {/* Price */}
                <span className="text-sm shrink-0 hidden sm:block" style={{ color: "var(--text-2)" }}>
                  {product.price ?? "N/A"}
                </span>

                {/* Score badge */}
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 font-mono"
                  style={{
                    background: `${color}18`,
                    color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {overall.toFixed(1)}
                </span>

                {/* Chevron */}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs shrink-0"
                  style={{ color: "var(--text-3)" }}
                >
                  ▼
                </motion.span>
              </motion.button>

              {/* Expanded card */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: "hidden", borderTop: "1px solid var(--border-dim)" }}
                  >
                    <ProductCard product={product} rank={i} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
