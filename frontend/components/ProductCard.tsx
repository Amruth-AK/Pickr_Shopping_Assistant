import Image from "next/image"
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
      className="glass-card p-4 flex gap-4"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Left: image + score */}
      <div className="shrink-0 flex flex-col items-center gap-3">
        <div
          className="w-24 h-24 rounded-lg relative overflow-hidden"
          style={{ background: "var(--bg-elevated)" }}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-contain p-1"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
          )}
        </div>
        <ScoreRing score={overall} size={56} strokeWidth={4} />
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
          style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
        >
          #{rank + 1}
        </span>
      </div>

      {/* Right: details */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
            {product.title}
          </h3>
          <span className="text-base font-bold shrink-0" style={{ color: "var(--text-primary)" }}>
            {formatPrice(product.price)}
          </span>
        </div>

        <StarRating rating={product.rating} reviews={product.reviews} />

        {/* Sub-scores */}
        <div className="flex flex-col gap-1.5 mt-1">
          {scores.quality !== undefined && <ScoreBar label="Quality" score={scores.quality} />}
          {scores.matching_requirements !== undefined && <ScoreBar label="Req. Match" score={scores.matching_requirements} />}
          {scores.value_for_money !== undefined && <ScoreBar label="Value" score={scores.value_for_money} />}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {features.slice(0, 4).map((f, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Pros / Cons */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          {pros.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent-teal)" }}>Pros</p>
              {pros.slice(0, 3).map((p, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  ✓ {p}
                </p>
              ))}
            </div>
          )}
          {cons.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--score-low)" }}>Cons</p>
              {cons.slice(0, 3).map((c, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  ✗ {c}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Recommendation reason */}
        {product.recommendation_reason && (
          <div
            className="mt-2 pl-3 py-1.5 rounded-r-md text-xs italic"
            style={{
              borderLeft: "3px solid var(--accent-teal)",
              color: "var(--text-secondary)",
              background: "var(--bg-elevated)",
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
            className="mt-1 text-xs self-start"
            style={{ color: "var(--accent-primary)" }}
          >
            View Product →
          </a>
        )}
      </div>
    </div>
  )
}
