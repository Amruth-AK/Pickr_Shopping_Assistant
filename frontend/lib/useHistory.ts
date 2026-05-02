"use client"

import { useState, useEffect, useCallback } from "react"
import type { SearchResult } from "./types"

export interface HistoryEntry {
  id: string
  query: string
  timestamp: number
  results: SearchResult
}

const KEY = "pickr_history"
const MAX = 20

function load(): HistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

function save(entries: HistoryEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    setEntries(load())
  }, [])

  const push = useCallback((query: string, results: SearchResult) => {
    setEntries((prev) => {
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        query,
        timestamp: Date.now(),
        results,
      }
      const filtered = prev.filter((e) => e.query.toLowerCase() !== query.toLowerCase())
      const next = [entry, ...filtered].slice(0, MAX)
      save(next)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id)
      save(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    save([])
    setEntries([])
  }, [])

  return { entries, push, remove, clear }
}
