"use client"

import { useState, useCallback } from "react"
import type { SearchResult, ProgressEvent, SearchRequest } from "./types"

export interface SearchState {
  isLoading: boolean
  currentStep: number
  currentLabel: string
  results: SearchResult | null
  error: string | null
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    isLoading: false,
    currentStep: 0,
    currentLabel: "",
    results: null,
    error: null,
  })

  const search = useCallback(async (req: SearchRequest) => {
    setState({ isLoading: true, currentStep: 0, currentLabel: "Starting...", results: null, error: null })

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Search failed: ${response.status} — ${text}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data:")) continue
          const json = line.slice(5).trim()
          if (!json) continue

          let event: ProgressEvent
          try {
            event = JSON.parse(json)
          } catch {
            continue
          }

          if (event.step === "done" && event.results) {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              currentStep: 4,
              currentLabel: "Done",
              results: event.results!,
            }))
          } else if (typeof event.step === "number") {
            setState((prev) => ({
              ...prev,
              currentStep: event.step as number,
              currentLabel: event.label ?? "",
            }))
          }
        }
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "An unexpected error occurred",
      }))
    }
  }, [])

  return { ...state, search }
}
