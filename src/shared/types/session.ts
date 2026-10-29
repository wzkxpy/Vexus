// src/shared/types/session.ts

export type SessionSource = 'auto' | 'manual' | 'import'

export interface Session {
  id: string
  gameId: string
  routeId: string | null
  // 可移植的线路标签；仅在记录未绑定线路时保留，用于导入/删线后重新关联。
  routeTag: string | null

  playDate: string
  startedAt: string | null
  endedAt: string | null
  duration: number
  source: SessionSource
}
