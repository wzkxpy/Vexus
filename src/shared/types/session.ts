// src/shared/types/session.ts

export type SessionSource = 'auto' | 'manual' | 'import'

export interface Session {
  id: string
  gameId: string
  routeId: string | null

  playDate: string
  startedAt: string | null
  endedAt: string | null
  duration: number
  source: SessionSource
}
