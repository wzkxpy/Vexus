// src/shared/types/search.ts


export interface GameCandidate {
  source: string
  sourceId: string

  originalTitle?: string
  localizedTitle?: string
  coverUrl?: string
  releaseDate?: string
  developer?: string
  score?: number

  raw?: unknown
}
