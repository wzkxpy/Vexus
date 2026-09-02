import type { Route } from '@/shared/types'
import { RouteRepository } from './route.repo'

export class RouteService {
  constructor(private repo: RouteRepository) {}

  getGameRoutes(gameId: string): Route[] {
    if (!gameId) throw new Error('Game id required')
    return this.repo.getByGame(gameId)
  }

  saveGameRoutes(gameId: string, routes: Route[]): Route[] {
    if (!gameId) throw new Error('Game id required')
    if (!Array.isArray(routes)) throw new Error('Routes must be an array')

    const ids = new Set<string>()
    // 提交数组的顺序是全局线路顺序的唯一来源，不信任客户端携带的旧 order。
    const normalized = routes.map((route, index): Route => {
      if (!route.id || ids.has(route.id)) throw new Error('Route ids must be unique')
      if (route.gameId !== gameId) throw new Error('Route game id mismatch')

      const name = route.name.trim()
      if (!name) throw new Error('Route name required')
      ids.add(route.id)

      return {
        ...route,
        name,
        description: route.description?.trim() || undefined,
        color: route.color || '',
        order: index + 1,
        playtime: Number.isFinite(route.playtime) ? route.playtime : 0
      }
    })

    return this.repo.saveForGame(gameId, normalized)
  }
}
