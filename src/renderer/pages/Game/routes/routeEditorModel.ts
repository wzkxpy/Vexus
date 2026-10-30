import type {
  RouteTree,
  RouteTreeForkPoint,
  RouteTreePoint,
  RouteTreeRoutePoint
} from '@/shared/types'

export interface PointContext {
  point: RouteTreePoint
  parent: RouteTreePoint | null
  rootIndex: number
  index: number
}

const clampCoordinate = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100000, value)) : 0

export function findPointContext(tree: RouteTree, pointId: string): PointContext | null {
  const visit = (point: RouteTreePoint, parent: RouteTreePoint | null,
    rootIndex: number, index: number): PointContext | null => {
    if (point.id === pointId) return { point, parent, rootIndex, index }
    for (let childIndex = 0; childIndex < point.children.length; childIndex++) {
      const found = visit(point.children[childIndex], point, rootIndex, childIndex)
      if (found) return found
    }
    return null
  }
  for (let rootIndex = 0; rootIndex < tree.roots.length; rootIndex++) {
    const found = visit(tree.roots[rootIndex], null, rootIndex, -1)
    if (found) return found
  }
  return null
}

export function findPointContextInTree(tree: RouteTree, pointId: string): PointContext | null {
  return findPointContext(tree, pointId)
}

export function findRoutePointId(tree: RouteTree, routeId: string): string | null {
  const visit = (point: RouteTreePoint): string | null => {
    if (point.type === 'route' && point.routeId === routeId) return point.id
    for (const child of point.children) {
      const found = visit(child)
      if (found) return found
    }
    return null
  }
  for (const root of tree.roots) {
    const found = visit(root)
    if (found) return found
  }
  return null
}

export function pointSubtreeIds(point: RouteTreePoint, ids = new Set<string>()): Set<string> {
  ids.add(point.id)
  for (const child of point.children) pointSubtreeIds(child, ids)
  return ids
}

export function createRoutePoint(id: string, routeId: string, x: number, y: number,
  children: RouteTreePoint[] = []): RouteTreeRoutePoint {
  return {
    id,
    type: 'route',
    routeId,
    x: clampCoordinate(x),
    y: clampCoordinate(y),
    children
  }
}

export function createForkPoint(id: string, x: number, y: number,
  children: RouteTreePoint[] = []): RouteTreeForkPoint {
  return {
    id,
    type: 'fork',
    routeId: null,
    x: clampCoordinate(x),
    y: clampCoordinate(y),
    children
  }
}

export function clonePoint(point: RouteTreePoint): RouteTreePoint {
  return {
    ...point,
    children: point.children.map(clonePoint)
  }
}

export function cloneTree(tree: RouteTree): RouteTree {
  return { version: tree.version, roots: tree.roots.map(clonePoint) }
}

// 移出非根节点：children 提升到原位置；移出根节点会移除整棵子树。
export function removePoint(tree: RouteTree, pointId: string): boolean {
  const context = findPointContext(tree, pointId)
  if (!context) return false
  const { point, parent, rootIndex, index } = context
  if (!parent) {
    tree.roots.splice(rootIndex, 1)
    return true
  }
  parent.children.splice(index, 1, ...point.children)
  return true
}

export function removeRouteFromTree(tree: RouteTree, routeId: string): boolean {
  const pointId = findRoutePointId(tree, routeId)
  return pointId ? removePoint(tree, pointId) : false
}

export function movePoint(tree: RouteTree, pointId: string, x: number, y: number): boolean {
  const context = findPointContext(tree, pointId)
  if (!context) return false
  context.point.x = clampCoordinate(x)
  context.point.y = clampCoordinate(y)
  return true
}

// 连同子树一起平移，保持子节点与当前节点的相对位置。
export function movePointSubtree(tree: RouteTree, pointId: string, x: number, y: number): boolean {
  const context = findPointContext(tree, pointId)
  if (!context) return false
  const dx = clampCoordinate(x) - context.point.x
  const dy = clampCoordinate(y) - context.point.y
  const shift = (point: RouteTreePoint) => {
    point.x = clampCoordinate(point.x + dx)
    point.y = clampCoordinate(point.y + dy)
    for (const child of point.children) shift(child)
  }
  shift(context.point)
  return true
}

// 把一个节点挂到另一个节点下面；不能挂到自己或自己的子树里。
export function movePointTo(tree: RouteTree, pointId: string, targetId: string): boolean {
  const source = findPointContext(tree, pointId)
  const target = findPointContext(tree, targetId)
  if (!source || !target) return false
  if (source.point.id === target.point.id) return false
  if (source.parent?.id === target.point.id) return false
  if (pointSubtreeIds(source.point).has(target.point.id)) return false

  if (source.parent) source.parent.children.splice(source.index, 1)
  else tree.roots.splice(source.rootIndex, 1)
  target.point.children.push(source.point)
  return true
}

export function addRootRoute(tree: RouteTree, routeId: string, x: number, y: number,
  createId: () => string = () => crypto.randomUUID()): string | null {
  if (findRoutePointId(tree, routeId)) return null
  const point = createRoutePoint(createId(), routeId, x, y)
  tree.roots.push(point)
  return point.id
}

// 挂到节点下面，成为一条新的子线路。
export function addRouteAsChild(tree: RouteTree, targetId: string, routeId: string,
  createId: () => string = () => crypto.randomUUID()): string | null {
  const context = findPointContext(tree, targetId)
  if (!context || findRoutePointId(tree, routeId)) return null
  const x = context.point.x + 260
  const y = context.point.y + 88 * (context.point.children.length + 1)
  const point = createRoutePoint(createId(), routeId, x, y)
  context.point.children.push(point)
  return point.id
}

// 在连接线上插入分叉点：原边拆成 parent → fork → child。
export function addForkOnEdge(tree: RouteTree, parentId: string, childIndex: number,
  x: number, y: number, createId: () => string = () => crypto.randomUUID()): string | null {
  const context = findPointContext(tree, parentId)
  if (!context) return null
  const child = context.point.children[childIndex]
  if (!child) return null
  const fork = createForkPoint(createId(), x, y, [child])
  context.point.children[childIndex] = fork
  return fork.id
}
