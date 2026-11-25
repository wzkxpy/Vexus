// src/shared/types/search.ts

export type ProviderSource = 'bangumi' | 'vndb'

export interface GameCandidate {
  source: ProviderSource
  sourceId: string

  originalTitle?: string
  localizedTitle?: string
  coverUrl?: string
  releaseDate?: string
  developer?: string
  score?: number
}
