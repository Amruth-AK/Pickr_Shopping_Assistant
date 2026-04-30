import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scoreColor(score: number): string {
  if (score >= 8) return "#10B981"
  if (score >= 5) return "#F59E0B"
  return "#EF4444"
}

export function formatPrice(price: string | number | undefined): string {
  if (!price) return "N/A"
  return String(price)
}

export function parseList(raw: string | string[] | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  return raw
    .split("\n")
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
}
