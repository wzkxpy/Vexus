// src/shared/types/session.ts

export interface Session {
  id: string
  gameId: string
  routeId: string | null

  playDate: string
  startedAt: string | null
  endedAt: string | null
  duration: number
  autoRecord: boolean
}
