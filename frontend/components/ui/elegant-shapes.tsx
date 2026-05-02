"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string
  delay?: number
  width?: number
  height?: number
  rotate?: number
  gradient?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute pointer-events-none", className)}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border border-white/[0.10]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.06)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  )
}

export function HeroBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Subtle gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] via-transparent to-violet-500/[0.04] blur-3xl" />

      <ElegantShape
        delay={0.2}
        width={480}
        height={110}
        rotate={12}
        gradient="from-indigo-500/[0.12]"
        className="left-[-4%] top-[15%]"
      />
      <ElegantShape
        delay={0.4}
        width={360}
        height={85}
        rotate={-14}
        gradient="from-violet-500/[0.12]"
        className="right-[-2%] top-[52%]"
      />
      <ElegantShape
        delay={0.35}
        width={200}
        height={55}
        rotate={-8}
        gradient="from-blue-500/[0.10]"
        className="left-[10%] bottom-[12%]"
      />
      <ElegantShape
        delay={0.5}
        width={150}
        height={42}
        rotate={20}
        gradient="from-indigo-400/[0.10]"
        className="right-[12%] top-[6%]"
      />
      <ElegantShape
        delay={0.6}
        width={110}
        height={32}
        rotate={-22}
        gradient="from-violet-400/[0.10]"
        className="left-[18%] top-[3%]"
      />

    </div>
  )
}
