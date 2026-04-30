export interface Scores {
  quality?: number
  matching_requirements?: number
  value_for_money?: number
  rating_score?: number
  overall_score?: number
  [key: string]: number | undefined
}

export interface Analysis {
  key_features?: string | string[]
  pros?: string | string[]
  cons?: string | string[]
  summary?: string
  scores?: Scores
}

export interface Product {
  title: string
  price?: string
  rating?: number | string
  reviews?: number | string
  url?: string
  image?: string
  snippet?: string
  recommendation_reason?: string
  analysis?: Analysis
}

export interface ProcessedQuery {
  translated?: string
  restructured?: string
  original_requirements?: string
}

export interface SearchResult {
  query: string
  processed_query: ProcessedQuery
  recommendations: Product[]
  ranked_products: Product[]
  analysis_summary?: string
  durations_ms: Record<string, number>
}

export interface ProgressEvent {
  step: number | "done"
  label?: string
  results?: SearchResult
}

export interface SearchRequest {
  query: string
  max_price?: number
  requirements: string
}
