"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScoreRing } from "./ScoreRing"
import { ScoreBar } from "./ScoreBar"
import { StarRating } from "./StarRating"
import { parseList, formatPrice, scoreColor } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ComparisonTableProps {
  products: Product[]
  maxPrice?: number
}

const RANK = [
  { label: "Best Pick",     bg: "var(--rank-1-bg)", color: "var(--rank-1-text)", border: "rgba(52,211,153,0.25)" },
  { label: "Runner-Up",     bg: "var(--rank-2-bg)", color: "var(--rank-2-text)", border: "rgba(96,165,250,0.20)" },
  { label: "Also Consider", bg: "var(--rank-3-bg)", color: "var(--rank-3-text)", border: "rgba(163,163,163,0.15)" },
]

/* ── Expandable list ─────────────────────────────────────────── */
function ExpandableList({
  items,
  max = 4,
  check,
}: {
  items: string[]
  max?: number
  check?: "pro" | "con"
}) {
  const [open, setOpen] = useState(false)
  const shown = open ? items : items.slice(0, max)
  const extra = items.length - max

  return (
    <div className="flex flex-col gap-1.5">
      {shown.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs leading-relaxed">
          {check === "pro" && (
            <span className="shrink-0 mt-0.5 font-bold" style={{ color: "var(--accent-green)" }}>✓</span>
          )}
          {check === "con" && (
            <span className="shrink-0 mt-0.5 font-bold" style={{ color: "var(--score-low)" }}>✗</span>
          )}
          {!check && (
            <span className="shrink-0 mt-0.5" style={{ color: "var(--text-3)" }}>·</span>
          )}
          <span style={{ color: "var(--text-1)" }}>{item}</span>
        </div>
      ))}
      {!open && extra > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-left mt-0.5 font-medium"
          style={{ color: "var(--accent-blue)" }}
        >
          +{extra} more
        </button>
      )}
    </div>
  )
}

/* ── Row-based layout ────────────────────────────────────────── */

interface RowProps {
  label: string
  cells: React.ReactNode[]   
  isFirst?: boolean          
}

function Row({ label, cells, isFirst }: RowProps) {
  const borderTop = isFirst ? undefined : "1px solid var(--border-dim)"

  return (
    <>
      {/* Label cell */}
      <div
        className="sticky left-0 z-10 px-4 flex items-center"
        style={{
          background: "var(--bg-surface)",
          borderTop,
          paddingTop: "14px",
          paddingBottom: "14px",
        }}
      >
        <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
          {label}
        </span>
      </div>

      {/* Product cells */}
      {cells.map((cell, i) => (
        <div
          key={i}
          className="px-5 flex items-start"
          style={{
            background: i === 0 ? "rgba(16,185,129,0.03)" : undefined,
            borderTop,
            borderLeft: "1px solid var(--border-dim)",
            paddingTop: "14px",
            paddingBottom: "14px",
          }}
        >
          {cell}
        </div>
      ))}
    </>
  )
}

/* ── Desktop table ────────────────────────────────────────────── */
function DesktopTable({ products, maxPrice }: { products: Product[]; maxPrice?: number }) {
  const data = products.map((p) => {
    const scores  = p.analysis?.scores ?? {}
    const features = parseList(p.analysis?.key_features)
    const pros     = parseList(p.analysis?.pros)
    const cons     = parseList(p.analysis?.cons)
    const overall  = scores.overall_score ?? 0
    const priceNum = parseFloat(String(p.price ?? "").replace(/[^0-9.]/g, ""))
    const nearBudget = maxPrice && !isNaN(priceNum) && priceNum >= maxPrice * 0.9
    return { p, scores, features, pros, cons, overall, nearBudget }
  })

  return (
    <div
      className="rounded-2xl overflow-hidden overflow-x-auto"
      style={{ border: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}
    >
      {/*
        Single CSS grid — every Row uses display:contents so its cells
        participate directly in this grid's row-sizing algorithm.
        Result: cells in the same row are always the same height.
      */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "148px 1fr 1fr 1fr",
          minWidth: "680px",
        }}
      >

        {/* ── Header row (product cards) ─────────────────────── */}
        {/* Label corner */}
        <div
          className="sticky left-0 z-10 px-4 py-5 flex items-end"
          style={{ background: "var(--bg-surface)" }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Compare
          </span>
        </div>

        {/* Product header cells */}
        {data.map(({ p, overall }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
            className="px-5 py-5 flex flex-col items-center gap-3 text-center"
            style={{
              borderLeft: "1px solid var(--border-dim)",
              borderTop: `2px solid ${RANK[i].border}`,
              background: i === 0 ? "rgba(16,185,129,0.03)" : undefined,
            }}
          >
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: RANK[i].bg, color: RANK[i].color }}
            >
              #{i + 1} {RANK[i].label}
            </span>

            <div
              className="w-20 h-20 rounded-xl overflow-hidden relative flex-shrink-0"
              style={{ background: "var(--bg-elevated)" }}
            >
              {p.image ? (
                <Image src={p.image} alt={p.title} fill className="object-contain p-2" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
              )}
            </div>

            <p className="text-xs font-semibold leading-snug line-clamp-3" style={{ color: "var(--text-1)" }}>
              {p.title}
            </p>
          </motion.div>
        ))}

        {/* ── Score ─────────────────────────────────────────────── */}
        <Row
          label="Score"
          isFirst
          cells={data.map(({ overall }) => (
            <div className="flex w-full justify-center">
              <ScoreRing score={overall} size={72} strokeWidth={4} />
            </div>
          ))}
        />

        {/* ── Price ─────────────────────────────────────────────── */}
        <Row
          label="Price"
          cells={data.map(({ p, nearBudget }) => (
            <div className="flex flex-col gap-1">
              <span className="text-base font-bold" style={{ color: "var(--text-1)" }}>
                {formatPrice(p.price)}
              </span>
              {nearBudget && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full w-fit"
                  style={{ background: "rgba(245,158,11,0.12)", color: "var(--accent-amber)" }}
                >
                  Near budget
                </span>
              )}
            </div>
          ))}
        />

        {/* ── Rating ────────────────────────────────────────────── */}
        <Row
          label="Rating"
          cells={data.map(({ p }) => (
            <StarRating rating={p.rating} reviews={p.reviews} />
          ))}
        />

        {/* ── Breakdown ─────────────────────────────────────────── */}
        <Row
          label="Breakdown"
          cells={data.map(({ scores }) => (
            <div className="flex flex-col gap-2 w-full">
              {scores.quality             !== undefined && <ScoreBar label="Quality"    score={scores.quality} />}
              {scores.matching_requirements !== undefined && <ScoreBar label="Req. Match" score={scores.matching_requirements} />}
              {scores.value_for_money     !== undefined && <ScoreBar label="Value"      score={scores.value_for_money} />}
            </div>
          ))}
        />

        {/* ── Key Features ──────────────────────────────────────── */}
        <Row
          label="Key Features"
          cells={data.map(({ features }) =>
            features.length > 0 ? (
              <ExpandableList items={features} max={5} />
            ) : (
              <span className="text-xs" style={{ color: "var(--text-3)" }}>—</span>
            )
          )}
        />

        {/* ── Pros ──────────────────────────────────────────────── */}
        <Row
          label="Pros"
          cells={data.map(({ pros }) =>
            pros.length > 0 ? (
              <ExpandableList items={pros} max={4} check="pro" />
            ) : (
              <span className="text-xs" style={{ color: "var(--text-3)" }}>—</span>
            )
          )}
        />

        {/* ── Cons ──────────────────────────────────────────────── */}
        <Row
          label="Cons"
          cells={data.map(({ cons }) =>
            cons.length > 0 ? (
              <ExpandableList items={cons} max={4} check="con" />
            ) : (
              <span className="text-xs" style={{ color: "var(--text-3)" }}>—</span>
            )
          )}
        />

        {/* ── Why Buy ───────────────────────────────────────────── */}
        <Row
          label="Why Buy"
          cells={data.map(({ p }) =>
            p.recommendation_reason ? (
              <p className="text-xs italic leading-relaxed" style={{ color: "var(--text-2)" }}>
                {p.recommendation_reason}
              </p>
            ) : (
              <span className="text-xs" style={{ color: "var(--text-3)" }}>—</span>
            )
          )}
        />

        {/* ── Action row ────────────────────────────────────────── */}
        {/* Label corner */}
        <div
          className="sticky left-0 z-10 px-4 py-4 flex items-center"
          style={{
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--border-dim)",
          }}
        />
        {data.map(({ p }, i) => (
          <div
            key={i}
            className="px-5 py-4"
            style={{
              background: i === 0 ? "rgba(16,185,129,0.03)" : undefined,
              borderTop: "1px solid var(--border-dim)",
              borderLeft: "1px solid var(--border-dim)",
            }}
          >
            {p.url ? (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs font-semibold py-2 px-3 rounded-lg transition-all hover:opacity-80"
                style={{
                  background: i === 0 ? "var(--accent-green)" : "var(--bg-elevated)",
                  color: i === 0 ? "#fff" : "var(--text-1)",
                  border: i === 0 ? "none" : "1px solid var(--border-mid)",
                }}
              >
                View Product →
              </a>
            ) : (
              <span className="text-xs" style={{ color: "var(--text-3)" }}>No link</span>
            )}
          </div>
        ))}

      </div>
    </div>
  )
}

/* ── Mobile tabs ─────────────────────────────────────────────── */
function MobileSingleProduct({ p, rank, maxPrice }: { p: Product; rank: number; maxPrice?: number }) {
  const scores   = p.analysis?.scores ?? {}
  const features = parseList(p.analysis?.key_features)
  const pros     = parseList(p.analysis?.pros)
  const cons     = parseList(p.analysis?.cons)
  const overall  = scores.overall_score ?? 0
  const priceNum = parseFloat(String(p.price ?? "").replace(/[^0-9.]/g, ""))
  const nearBudget = maxPrice && !isNaN(priceNum) && priceNum >= maxPrice * 0.9

  const rows: { label: string; content: React.ReactNode }[] = [
    {
      label: "Score",
      content: (
        <div className="flex justify-center py-2">
          <ScoreRing score={overall} size={72} strokeWidth={4} />
        </div>
      ),
    },
    {
      label: "Price",
      content: (
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold" style={{ color: "var(--text-1)" }}>{formatPrice(p.price)}</span>
          {nearBudget && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full w-fit"
              style={{ background: "rgba(245,158,11,0.12)", color: "var(--accent-amber)" }}>
              Near budget
            </span>
          )}
        </div>
      ),
    },
    { label: "Rating",   content: <StarRating rating={p.rating} reviews={p.reviews} /> },
    {
      label: "Breakdown",
      content: (
        <div className="flex flex-col gap-2 w-full">
          {scores.quality !== undefined && <ScoreBar label="Quality" score={scores.quality} />}
          {scores.matching_requirements !== undefined && <ScoreBar label="Req. Match" score={scores.matching_requirements} />}
          {scores.value_for_money !== undefined && <ScoreBar label="Value" score={scores.value_for_money} />}
        </div>
      ),
    },
    {
      label: "Key Features",
      content: features.length > 0 ? <ExpandableList items={features} max={5} /> : <span className="text-xs" style={{ color: "var(--text-3)" }}>—</span>,
    },
    {
      label: "Pros",
      content: pros.length > 0 ? <ExpandableList items={pros} max={4} check="pro" /> : <span className="text-xs" style={{ color: "var(--text-3)" }}>—</span>,
    },
    {
      label: "Cons",
      content: cons.length > 0 ? <ExpandableList items={cons} max={4} check="con" /> : <span className="text-xs" style={{ color: "var(--text-3)" }}>—</span>,
    },
    {
      label: "Why Buy",
      content: p.recommendation_reason
        ? <p className="text-xs italic leading-relaxed" style={{ color: "var(--text-2)" }}>{p.recommendation_reason}</p>
        : <span className="text-xs" style={{ color: "var(--text-3)" }}>—</span>,
    },
  ]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${RANK[rank].border}`, borderTopWidth: "2px", background: "var(--bg-surface)" }}>
      {/* Header */}
      <div className="px-5 py-5 flex flex-col items-center gap-3 text-center" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: RANK[rank].bg, color: RANK[rank].color }}>
          #{rank + 1} {RANK[rank].label}
        </span>
        <div className="w-20 h-20 rounded-xl overflow-hidden relative" style={{ background: "var(--bg-elevated)" }}>
          {p.image
            ? <Image src={p.image} alt={p.title} fill className="object-contain p-2" unoptimized />
            : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
          }
        </div>
        <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-1)" }}>{p.title}</p>
      </div>
      {/* Attribute rows */}
      {rows.map((row, i) => (
        <div key={row.label} className="grid" style={{ gridTemplateColumns: "108px 1fr", borderTop: "1px solid var(--border-dim)" }}>
          <div className="px-4 py-3.5 flex items-center" style={{ background: "var(--bg-elevated)" }}>
            <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>{row.label}</span>
          </div>
          <div className="px-4 py-3.5 flex items-start">{row.content}</div>
        </div>
      ))}
      {/* Action */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border-dim)" }}>
        {p.url
          ? <a href={p.url} target="_blank" rel="noopener noreferrer"
              className="block text-center text-xs font-semibold py-2 px-3 rounded-lg"
              style={{ background: rank === 0 ? "var(--accent-green)" : "var(--bg-elevated)", color: rank === 0 ? "#fff" : "var(--text-1)", border: rank === 0 ? "none" : "1px solid var(--border-mid)" }}>
              View Product →
            </a>
          : <span className="text-xs" style={{ color: "var(--text-3)" }}>No link</span>
        }
      </div>
    </div>
  )
}

function MobileTabs({ products, maxPrice }: { products: Product[]; maxPrice?: number }) {
  return (
    <Tabs defaultValue="0">
      <TabsList className="w-full mb-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        {products.map((_, i) => (
          <TabsTrigger key={i} value={String(i)} className="flex-1 text-xs" style={{ color: "var(--text-2)" }}>
            #{i + 1} {RANK[i].label}
          </TabsTrigger>
        ))}
      </TabsList>
      {products.map((p, i) => (
        <TabsContent key={i} value={String(i)}>
          <MobileSingleProduct p={p} rank={i} maxPrice={maxPrice} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

/* ── Export ──────────────────────────────────────────────────── */
export function ComparisonTable({ products, maxPrice }: ComparisonTableProps) {
  if (!products.length) return null
  const top3 = products.slice(0, 3)

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>
          Top Recommendations
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: "rgba(16,185,129,0.1)", color: "var(--accent-green)", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          {top3.length} compared
        </span>
      </div>

      <div className="hidden md:block">
        <DesktopTable products={top3} maxPrice={maxPrice} />
      </div>
      <div className="md:hidden">
        <MobileTabs products={top3} maxPrice={maxPrice} />
      </div>
    </section>
  )
}
