// src/shared/types/session.ts

type SessionBase = {
  id: string
  gameId: string
  routeId?: string | null

  playDate: string
  duration: number
}

interface RangeSession extends SessionBase {
  kind: 'range'

  startTime: string
  endTime: string
}

interface DateSession extends SessionBase {
  kind: 'date'

  startTime: null
  endTime: null
}

export type Session = RangeSession | DateSession