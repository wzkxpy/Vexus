import type { Route, RouteTree, RouteTreePoint } from './types'

// 先序遍历：根按数组顺序，父节点在前，子节点按数组顺序展开。
export function flattenRoutePoints(tree: RouteTree): RouteTreePoint[] {
  const points: RouteTreePoint[] = []
  const visit = (point: RouteTreePoint) => {
    points.push(point)
    for (const child of point.children) visit(child)
  }
  for (const root of tree.roots) visit(root)
  return points
}

// 返回的数组用于展示；未被树引用的线路追加在末尾，避免线路从界面上消失。
export function orderRoutesByTree(routes: Route[], tree: RouteTree): Route[] {
  const byId = new Map(routes.map(route => [route.id, route]))
  const ordered: Route[] = []
  const seen = new Set<string>()
  for (const point of flattenRoutePoints(tree)) {
    if (point.type !== 'route' || seen.has(point.routeId)) continue
    const route = byId.get(point.routeId)
    if (!route) continue
    ordered.push(route)
    seen.add(route.id)
  }
  for (const route of routes) {
    if (!seen.has(route.id)) ordered.push(route)
  }
  return ordered
}

export function treeRouteIds(tree: RouteTree): Set<string> {
  const ids = new Set<string>()
  for (const point of flattenRoutePoints(tree)) {
    if (point.type === 'route') ids.add(point.routeId)
  }
  return ids
}

export function unplacedRoutes(routes: Route[], tree: RouteTree): Route[] {
  const placed = treeRouteIds(tree)
  return routes.filter(route => !placed.has(route.id))
}
