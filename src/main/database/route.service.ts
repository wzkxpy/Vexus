import { ROUTE_STATUS_OPTIONS, type Route, type RouteLockCondition, type RouteStatus } from '@/shared/types'
import { getRouteLockState } from '@/shared/routeLocks'
import { RouteRepository } from './route.repo'

export class RouteService {
  constructor(private repo: RouteRepository) {}

  getGameRoutes(gameId: string): Route[] {
    if (!gameId) throw new Error('Game id required')
    return this.repo.transaction(() => this.refreshLocks(gameId))
  }

  // 变更时即持久化解锁，不能依赖用户是否打开线路图。
  private refreshLocks(gameId: string): Route[] {
    const routes = this.repo.getByGame(gameId)
    const byId = new Map(routes.map(route => [route.id, route]))
    for (const route of routes) {
      if (!route.lockCondition || route.type === 'common') continue
      const unlocked = getRouteLockState(route, byId)!.unlocked
      if (route.lockCondition.unlocked !== unlocked) {
        route.lockCondition.unlocked = unlocked
        this.repo.saveLock(route)
      }
    }
    return routes
  }

  updateRouteStatus(gameId: string, routeId: string, status: RouteStatus): Route[] {
    if (!gameId || !routeId) throw new Error('Game and route ids required')
    if (!ROUTE_STATUS_OPTIONS.some(option => option.value === status)) throw new Error('Invalid route status')
    return this.repo.transaction(() => {
    const routes = this.refreshLocks(gameId)
    const byId = new Map(routes.map(route => [route.id, route]))
    const route = byId.get(routeId)
    if (!route) throw new Error('Route not found')
    // 使用最新数据库记录判断，不能仅依赖界面的禁用状态。
    const lock = getRouteLockState(route, byId)
    if (lock && !lock.unlocked) throw new Error('Route is locked')
    this.repo.updateStatus(gameId, routeId, status)
    return this.refreshLocks(gameId)
    })
  }

  
  saveGameRoutes(gameId: string, routes: Route[], resetLockIds: string[] = []): Route[] {
    if (!gameId) throw new Error('Game id required')
    if (!Array.isArray(routes)) throw new Error('Routes must be an array')
    if (!Array.isArray(resetLockIds) || resetLockIds.some(id => typeof id !== 'string')) throw new Error('Invalid lock reset ids')
    if (resetLockIds.some(id => !routes.some(route => route.id === id))) throw new Error('Invalid lock reset target')
    return this.repo.transaction(() => {
    const current = new Map(this.refreshLocks(gameId).map(route => [route.id, route]))

    const ids = new Set<string>()
    const names = new Set<string>()
    // 提交数组的顺序是全局线路顺序的唯一来源，不信任客户端携带的旧 order。
    const normalized = routes.map((route, index): Route => {
      if (!route.id || ids.has(route.id)) throw new Error('Route ids must be unique')
      if (route.gameId !== gameId) throw new Error('Route game id mismatch')

      const name = route.name.trim()
      if (!name) throw new Error('Route name required')
      // 线路名作为导出/待绑定的标签，同名会导致无法区分归属。
      if (names.has(name)) throw new Error('Route names must be unique')
      ids.add(route.id)
      names.add(name)

      return {
        ...route,
        name,
        description: route.description?.trim() || null,
        color: route.color || '',
        order: index + 1,
        lockCondition: this.normalizeLockCondition(route.lockCondition)
      }
    })

    for (const route of normalized) {
      if (route.type === 'common') route.lockCondition = null
      if (route.lockCondition) route.lockCondition.unlocked = !resetLockIds.includes(route.id) && current.get(route.id)?.lockCondition?.unlocked === true
    }
    this.validateRouteDependencies(normalized)
    this.repo.saveForGame(gameId, normalized)
    return this.refreshLocks(gameId)
    })
  }


  // 校验线路依赖关系，确保不存在循环依赖、前置线路必须存在于同一游戏中、不能引用自身
  private validateRouteDependencies(routes: Route[]): void {
    // 按最终草稿校验，因此同时新增前置线路有效，删除仍被引用的线路会失败
    const byId = new Map(routes.map(route => [route.id, route]))
    // visiting 记录当前检查路径，visited 记录已完成检查的线路
    const visiting = new Set<string>()
    const visited = new Set<string>()
    const visit = (id: string) => {
      if (visiting.has(id)) throw new Error('Circular route prerequisites')
      if (visited.has(id)) return
      visiting.add(id)
      for (const preId of byId.get(id)!.lockCondition?.preRouteIds ?? []) {
        if (!byId.has(preId)) throw new Error('Prerequisite route must exist in the same game')
        if (preId === id) throw new Error('Route cannot require itself')
        visit(preId)
      }
      visiting.delete(id)
      visited.add(id)
    }
    for (const route of routes) visit(route.id)
  }


  // lockCondition 格式校验 & 整理 
  private normalizeLockCondition(value: unknown): RouteLockCondition | null {
    if (value === null) return null
    if (typeof value !== 'object' || Array.isArray(value) || !value) {
      throw new Error('Invalid route lock condition')
    }
    const condition = value as Record<string, unknown>
    if (typeof condition.unlocked !== 'boolean') throw new Error('Invalid unlock state')
    if ((condition.mode !== 'all' && condition.mode !== 'any') ||
        !Array.isArray(condition.preRouteIds) ||
        condition.preRouteIds.some(id => typeof id !== 'string' || !id.trim())) {
      throw new Error('Invalid route lock condition')
    }
    if (new Set(condition.preRouteIds).size !== condition.preRouteIds.length) {
      throw new Error('Duplicate prerequisite route ids')
    }
    // 没有前置线路时返回 null
    return condition.preRouteIds.length === 0 ? null : {
      mode: condition.mode,
      unlocked: false,
      preRouteIds: [...condition.preRouteIds]
    }
  }


}


