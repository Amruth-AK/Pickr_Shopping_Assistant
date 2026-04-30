"use client"

import { useState } from "react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScoreRing } from "./ScoreRing"
import { ScoreBar } from "./ScoreBar"
import { StarRating } from "./StarRating"
import { parseList, formatPrice } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ComparisonTableProps {
  products: Product[]
  maxPrice?: number
}

const RANK_LABELS = ["Best Pick", "Runner-Up", "Also Consider"]
const RANK_COLORS = ["#0D9488", "#1E40AF", "#374151"]

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
      style={{ background: RANK_COLORS[rank] }}
    >
      #{rank + 1} {RANK_LABELS[rank]}
    </span>
  )
}

interface ExpandableListProps {
  items: string[]
  max?: number
  icon?: React.ReactNode
  itemStyle?: React.CSSProperties
}

function ExpandableList({ items, max = 4, icon, itemStyle }: ExpandableListProps) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, max)
  const extra = items.length - max

  return (
    <div className="flex flex-col gap-1">
      {shown.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs leading-relaxed">
          {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
          <span style={itemStyle}>{item}</span>
        </div>
      ))}
      {extra > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-left mt-0.5"
          style={{ color: "var(--accent-primary)" }}
        >
          Show {extra} more
        </button>
      )}
    </div>
  )
}

function ProductColumn({ product, rank, maxPrice }: { product: Product; rank: number; maxPrice?: number }) {
  const scores = product.analysis?.scores ?? {}
  const features = parseList(product.analysis?.key_features)
  const pros = parseList(product.analysis?.pros)
  const cons = parseList(product.analysis?.cons)
  const overall = scores.overall_score ?? 0

  const priceNum = parseFloat(String(product.price ?? "").replace(/[^0-9.]/g, ""))
  const nearBudget = maxPrice && !isNaN(priceNum) && priceNum >= maxPrice * 0.9

  return (
    <div className="flex flex-col divide-y" style={{ borderColor: "var(--border-subtle)" }}>
      {/* Header */}
      <div className="p-4 flex flex-col items-center gap-2 text-center">
        <div className="relative">
          {product.image ? (
            <div className="w-20 h-20 relative rounded-lg overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <Image
                src={product.image}
                alt={product.title}
                fill
                className="object-contain p-1"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
              <span className="text-2xl">📦</span>
            </div>
          )}
        </div>
        <RankBadge rank={rank} />
        <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>
          {product.title}
        </p>
      </div>

      {/* Overall Score */}
      <div className="p-4 flex justify-center">
        <ScoreRing score={overall} size={72} />
      </div>

      {/* Price */}
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {formatPrice(product.price)}
          </span>
          {nearBudget && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "#92400E", color: "#FCD34D" }}
            >
              Near Budget
            </span>
          )}
        </div>
      </div>

      {/* Rating */}
      <div className="p-4">
        <StarRating rating={product.rating} reviews={product.reviews} />
      </div>

      {/* Sub-scores */}
      <div className="p-4 flex flex-col gap-2">
        {scores.quality !== undefined && <ScoreBar label="Quality" score={scores.quality} />}
        {scores.matching_requirements !== undefined && <ScoreBar label="Req. Match" score={scores.matching_requirements} />}
        {scores.value_for_money !== undefined && <ScoreBar label="Value" score={scores.value_for_money} />}
      </div>

      {/* Key Features */}
      <div className="p-4">
        {features.length > 0 ? (
          <ExpandableList
            items={features}
            max={5}
            icon={<span style={{ color: "var(--text-muted)" }}>·</span>}
            itemStyle={{ color: "var(--text-primary)" }}
          />
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </div>

      {/* Pros */}
      <div className="p-4">
        {pros.length > 0 ? (
          <ExpandableList
            items={pros}
            max={4}
            icon={<span style={{ color: "var(--accent-teal)" }}>✓</span>}
            itemStyle={{ color: "var(--text-primary)" }}
          />
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </div>

      {/* Cons */}
      <div className="p-4">
        {cons.length > 0 ? (
          <ExpandableList
            items={cons}
            max={4}
            icon={<span style={{ color: "var(--score-low)" }}>✗</span>}
            itemStyle={{ color: "var(--text-primary)" }}
          />
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </div>

      {/* Why Buy */}
      <div className="p-4">
        {product.recommendation_reason ? (
          <p className="text-xs italic leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {product.recommendation_reason}
          </p>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </div>

      {/* Action */}
      <div className="p-4">
        {product.url ? (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium px-3 py-1.5 rounded-md border transition-colors hover:bg-white/5 flex items-center gap-1"
            style={{ color: "var(--accent-primary)", borderColor: "var(--accent-primary)" }}
          >
            View Product →
          </a>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>No link</span>
        )}
      </div>
    </div>
  )
}

const ROW_LABELS = [
  "Product",
  "Overall Score",
  "Price",
  "Rating",
  "Sub-scores",
  "Key Features",
  "Pros",
  "Cons",
  "Why Buy",
  "Action",
]

function DesktopTable({ products, maxPrice }: { products: Product[]; maxPrice?: number }) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[700px]"
        style={{ gridTemplateColumns: "160px 1fr 1fr 1fr" }}
      >
        {/* Label column */}
        <div
          className="comparison-label-col divide-y flex flex-col rounded-l-xl"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
        >
          {ROW_LABELS.map((label) => (
            <div
              key={label}
              className="p-4 flex items-center"
              style={{
                minHeight: label === "Product" ? "168px" :
                  label === "Overall Score" ? "112px" :
                  label === "Sub-scores" ? "96px" : "80px",
              }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Product columns */}
        {products.map((product, i) => (
          <div
            key={i}
            className={`glass-card divide-y ${i === products.length - 1 ? "rounded-r-xl" : ""} ${i === 0 ? "" : ""}`}
            style={{
              borderRadius: i === 0 ? "0 0 0 0" : undefined,
              borderColor: "var(--border-subtle)",
              borderLeft: i > 0 ? `1px solid var(--border-subtle)` : undefined,
            }}
          >
            <ProductColumn product={product} rank={i} maxPrice={maxPrice} />
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileTabs({ products, maxPrice }: { products: Product[]; maxPrice?: number }) {
  return (
    <Tabs defaultValue="0">
      <TabsList className="w-full mb-4" style={{ background: "var(--bg-elevated)" }}>
        {products.map((p, i) => (
          <TabsTrigger key={i} value={String(i)} className="flex-1 text-xs">
            #{i + 1} {RANK_LABELS[i]}
          </TabsTrigger>
        ))}
      </TabsList>
      {products.map((p, i) => (
        <TabsContent key={i} value={String(i)}>
          <div className="glass-card">
            <ProductColumn product={p} rank={i} maxPrice={maxPrice} />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}

export function ComparisonTable({ products, maxPrice }: ComparisonTableProps) {
  if (!products.length) return null
  const top3 = products.slice(0, 3)

  return (
    <section>
      <h2
        className="text-xl font-semibold mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        Top Recommendations
      </h2>

      {/* Desktop */}
      <div className="hidden md:block">
        <DesktopTable products={top3} maxPrice={maxPrice} />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <MobileTabs products={top3} maxPrice={maxPrice} />
      </div>
    </section>
  )
}
