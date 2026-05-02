"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ScoreRing } from "./ScoreRing"
import { ScoreBar } from "./ScoreBar"
import { StarRating } from "./StarRating"
import { parseList, formatPrice } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
  rank: number
}

export function ProductCard({ product, rank }: ProductCardProps) {
  const scores = product.analysis?.scores ?? {}
  const features = parseList(product.analysis?.key_features)
  const pros = parseList(product.analysis?.pros)
  const cons = parseList(product.analysis?.cons)
  const overall = scores.overall_score ?? 0

  return (
    <div
      className="p-5 flex gap-5"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Left: image + score */}
      <div className="shrink-0 flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-xl overflow-hidden relative"
          style={{ background: "var(--bg-elevated)" }}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-contain p-2"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
          )}
        </div>
        <ScoreRing score={overall} size={56} strokeWidth={4} />
      </div>

      {/* Right: details */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
            {product.title}
          </h3>
          <span className="text-base font-bold shrink-0" style={{ color: "var(--text-1)" }}>
            {formatPrice(product.price)}
          </span>
        </div>

        <StarRating rating={product.rating} reviews={product.reviews} />

        {/* Sub-scores */}
        <div className="flex flex-col gap-1.5">
          {scores.quality !== undefined && <ScoreBar label="Quality" score={scores.quality} />}
          {scores.matching_requirements !== undefined && <ScoreBar label="Req. Match" score={scores.matching_requirements} />}
          {scores.value_for_money !== undefined && <ScoreBar label="Value" score={scores.value_for_money} />}
        </div>

        {/* Feature pills */}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {features.slice(0, 5).map((f, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-md"
                style={{ background: "var(--bg-muted)", color: "var(--text-2)", border: "1px solid var(--border-dim)" }}
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Pros / Cons */}
        {(pros.length > 0 || cons.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pros.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--accent-green)" }}>Pros</p>
                <div className="flex flex-col gap-1">
                  {pros.slice(0, 5).map((p, i) => (
                    <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
                      <span style={{ color: "var(--accent-green)" }}>✓ </span>{p}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {cons.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--score-low)" }}>Cons</p>
                <div className="flex flex-col gap-1">
                  {cons.slice(0, 5).map((c, i) => (
                    <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
                      <span style={{ color: "var(--score-low)" }}>✗ </span>{c}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Why recommendation */}
        {product.recommendation_reason && (
          <div
            className="px-3 py-2 rounded-lg text-xs italic"
            style={{
              background: "rgba(79,70,229,0.07)",
              borderLeft: "2px solid var(--accent-blue)",
              color: "var(--text-2)",
            }}
          >
            {product.recommendation_reason}
          </div>
        )}

        {/* Link */}
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium self-start"
            style={{ color: "var(--accent-blue)" }}
          >
            View on retailer →
          </a>
        )}
      </div>
    </div>
  )
}
