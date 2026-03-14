// src/shared/types/session.ts

type SessionBase = {
  id: string
  gameId: string
  routeId?: string | null

  playDate: string
  duration: number
}

interface RangeSession extends SessionBase {
  startTime: string
  endTime: string
}

interface DateSession extends SessionBase {
  startTime: null
  endTime: null
}

// export type Session = RangeSession | DateSession

export interface Session {
  id: string
  gameId: string
  routeId: string | null

  playDate: string
  startTime: string | null
  endTime: string | null
  duration: number
  autoRecord: boolean
}