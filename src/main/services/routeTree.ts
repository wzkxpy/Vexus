import {
  ROUTE_TREE_VERSION,
  type Route,
  type RouteTree,
  type RouteTreePoint,
  type RouteTreeRoutePoint
} from '@/shared/types'
import { flattenRoutePoints, orderRoutesByTree } from '@/shared/routeTree'
import type { RouteService } from '../database/route.service'
import type { RouteTreeFileStore } from './routeTreeFile'

const MAX_NODES = 5000
const MAX_DEPTH = 256
const MAX_COORDINATE = 100000

const DEFAULT_ROOT_X = 24
const DEFAULT_ROOT_Y = 24
const DEFAULT_BRANCH_X = 320
const DEFAULT_BRANCH_Y = 24
const DEFAULT_BRANCH_GAP = 88

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_COORDINATE

const isPointType = (value: unknown): value is RouteTreePoint['type'] =>
  value === 'route' || value === 'fork'

function parsePoint(value: unknown, depth: number, ids: Set<string>, count: { value: number }): RouteTreePoint {
  if (depth > MAX_DEPTH) throw new Error('Route tree is too deep')
  if (!isRecord(value)) throw new Error('Invalid route tree point')
  if (++count.value > MAX_NODES) throw new Error('Route tree is too large')

  const id = value.id
  if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid route tree point id')
  if (ids.has(id)) throw new Error('Duplicate route tree point id')
  ids.add(id)

  const type = value.type
  if (!isPointType(type)) throw new Error('Invalid route tree point type')

  const routeId = value.routeId
  if (type === 'route') {
    if (typeof routeId !== 'string' || !routeId.trim()) throw new Error('Invalid route tree route reference')
  } else if (routeId !== null) {
    throw new Error('Fork point cannot reference a route')
  }

  if (!isCoordinate(value.x) || !isCoordinate(value.y)) {
    throw new Error('Invalid route tree coordinates')
  }
  if (!Array.isArray(value.children)) throw new Error('Invalid route tree point')

  const children = value.children.map(child => parsePoint(child, depth + 1, ids, count))
  if (type === 'route') {
    return { id, type, routeId: routeId as string, x: value.x, y: value.y, children }
  }
  return { id, type: 'fork', routeId: null, x: value.x, y: value.y, children }
}

export function parseRouteTree(value: unknown): RouteTree {
  if (!isRecord(value) || value.version !== ROUTE_TREE_VERSION) {
    throw new Error('Unsupported route tree version')
  }
  if (!Array.isArray(value.roots)) throw new Error('Invalid route tree')
  const ids = new Set<string>()
  const count = { value: 0 }
  const roots = value.roots.map(root => parsePoint(root, 0, ids, count))
  for (const root of roots) {
    if (root.type !== 'route') throw new Error('Route tree root must be a route point')
  }
  return { version: ROUTE_TREE_VERSION, roots }
}

// 保存时严格要求线路与森林一一对应；根只能是线路点。
export function validateRouteTreeDraft(tree: RouteTree, routes: Route[], gameId: string): void {
  if (!tree || tree.version !== ROUTE_TREE_VERSION) throw new Error('Unsupported route tree version')
  if (!Array.isArray(tree.roots)) throw new Error('Invalid route tree')
  const routesById = new Map(routes.map(route => [route.id, route]))
  for (const route of routes) {
    if (route.gameId !== gameId) throw new Error('Route game id mismatch')
  }
  for (const root of tree.roots) {
    if (root.type !== 'route') throw new Error('Route tree root must be a route point')
  }

  const seen = new Set<string>()
  for (const point of flattenRoutePoints(tree)) {
    if (point.type !== 'route') continue
    if (!routesById.has(point.routeId)) throw new Error('Route tree references an unknown route')
    if (seen.has(point.routeId)) throw new Error('Route appears more than once in the route tree')
    seen.add(point.routeId)
  }
}

const autoRoutePoint = (route: Route, x: number, y: number,
  children: RouteTreePoint[] = []): RouteTreeRoutePoint => ({
  id: `auto-${route.id}`,
  type: 'route',
  routeId: route.id,
  x,
  y,
  children
})

// 文件缺失或无效时生成一个默认根；已有森林里的未引用线路保持未放入。
function defaultTree(routes: Route[]): RouteTree {
  if (!routes.length) return { version: ROUTE_TREE_VERSION, roots: [] }
  const [first, ...rest] = routes
  return {
    version: ROUTE_TREE_VERSION,
    roots: [autoRoutePoint(first, DEFAULT_ROOT_X, DEFAULT_ROOT_Y,
      rest.map((route, index) =>
        autoRoutePoint(route, DEFAULT_BRANCH_X, DEFAULT_BRANCH_Y + index * DEFAULT_BRANCH_GAP)))]
  }
}

interface CleanResult {
  point: RouteTreePoint | null
  extraChildren: RouteTreePoint[]
}

// 轻量自愈：只处理文件缺失、崩溃或外部改动。正常保存路径保证结构完整。
export function reconcileRouteTree(tree: RouteTree | null, routes: Route[]): { tree: RouteTree; repaired: boolean } {
  if (!tree) return { tree: defaultTree(routes), repaired: routes.length > 0 }
  if (!tree.roots.length) return { tree, repaired: false }

  const routesById = new Map(routes.map(route => [route.id, route]))
  const seen = new Set<string>()
  let repaired = false

  const clean = (point: RouteTreePoint | null, localSeen: Set<string>): CleanResult => {
    if (!point) return { point: null, extraChildren: [] }

    // 被移除节点的 children 提升给父节点。
    const children: RouteTreePoint[] = []
    const extra: RouteTreePoint[] = []
    for (const child of point.children) {
      const result = clean(child, localSeen)
      if (result.point) children.push(result.point)
      extra.push(...result.extraChildren)
    }

    const cleanedPoint: RouteTreePoint = { ...point, children: [...children, ...extra] }
    if (cleanedPoint.type === 'route') {
      if (!routesById.has(cleanedPoint.routeId) || localSeen.has(cleanedPoint.routeId)) {
        repaired = true
        return { point: null, extraChildren: cleanedPoint.children }
      }
      localSeen.add(cleanedPoint.routeId)
    }
    return { point: cleanedPoint, extraChildren: [] }
  }

  const roots: RouteTreePoint[] = []
  for (const root of tree.roots) {
    const localSeen = new Set(seen)
    const cleaned = clean(root, localSeen)
    if (cleaned.point && cleaned.point.type === 'route') {
      roots.push(cleaned.point)
      for (const id of localSeen) seen.add(id)
    } else {
      repaired = true
    }
  }
  return { tree: { version: ROUTE_TREE_VERSION, roots }, repaired }
}

export class RouteTreeService {
  constructor(private routeService: RouteService, private store: RouteTreeFileStore) {}

  get(gameId: string): { routes: Route[]; tree: RouteTree } {
    if (!gameId) throw new Error('Game id required')
    const routes = this.routeService.getGameRoutes(gameId)
    let parsed: RouteTree | null = null
    let raw: unknown = null
    try {
      raw = this.store.read(gameId)
      parsed = raw === null ? null : parseRouteTree(raw)
    } catch (error) {
      console.warn(`Invalid route tree for game ${gameId}; using default structure.`, error)
    }
    const { tree, repaired } = reconcileRouteTree(parsed, routes)
    // 文件不存在时生成默认树是正常路径；只有已有文件被修复时才提示。
    if (repaired && raw !== null) console.warn(`Route tree for game ${gameId} was repaired in memory.`)
    return { routes: orderRoutesByTree(routes, tree), tree }
  }

  save(gameId: string, routes: Route[], tree: RouteTree, resetLockIds: string[] = []): {
    routes: Route[]
    tree: RouteTree
  } {
    if (!gameId) throw new Error('Game id required')
    if (!Array.isArray(routes)) throw new Error('Routes must be an array')
    if (!Array.isArray(resetLockIds) || resetLockIds.some(id => typeof id !== 'string')) {
      throw new Error('Invalid lock reset ids')
    }
    const normalizedTree = parseRouteTree(tree)
    validateRouteTreeDraft(normalizedTree, routes, gameId)

    // 先落临时文件：目录不可写会在数据库变更之前失败。
    this.store.stage(gameId, normalizedTree)
    try {
      const saved = this.routeService.saveGameRoutes(gameId, routes, resetLockIds)
      this.store.commit(gameId)
      return { routes: orderRoutesByTree(saved, normalizedTree), tree: normalizedTree }
    } catch (error) {
      try {
        this.store.discard(gameId)
      } catch (cleanupError) {
        console.warn(`Failed to clean route tree temp file for game ${gameId}.`, cleanupError)
      }
      throw error
    }
  }
}
