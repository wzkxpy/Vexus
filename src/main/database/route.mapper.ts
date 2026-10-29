import type { Route, RouteLockCondition, RouteType, RouteStatus } from '@/shared/types'

export interface RouteRow {
  id: string
  game_id: string
  name: string
  description: string | null
  color: string | null
  type: RouteType
  order: number
  lock_condition: string | null
  status: RouteStatus
  playtime: number | null
}


export function rowToRoute(row: RouteRow): Route {
  try {
    const lockCondition: RouteLockCondition | null = row.lock_condition === null ? null : JSON.parse(row.lock_condition)
    if (row.lock_condition !== null && (!lockCondition || typeof lockCondition.unlocked !== 'boolean')) {
      throw new Error('Invalid unlock state')
    }
    return {
      id: row.id,
      gameId: row.game_id,
      name: row.name,
      description: row.description,
      color: row.color ?? '',
      type: row.type,
      order: row.order,
      status: row.status,
      playtime: row.playtime ?? 0,
      lockCondition
    }
  } catch {
    throw new Error(`Invalid lock condition for route ${row.id}`)
  }
}
