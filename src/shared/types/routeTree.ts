// 线路树结构存放在每个游戏独立的 JSON 文件中，不进入 routes 表。

export const ROUTE_TREE_VERSION = 4

export type RouteTreePointType = 'route' | 'fork'

interface RouteTreePointBase {
  id: string
  x: number
  y: number
  // 从该点出发的所有连接线，按数组顺序展开。
  children: RouteTreePoint[]
}

export interface RouteTreeRoutePoint extends RouteTreePointBase {
  type: 'route'
  routeId: string
}

// 无路线名、只表示连接线上分叉位置的点。
export interface RouteTreeForkPoint extends RouteTreePointBase {
  type: 'fork'
  routeId: null
}

export type RouteTreePoint = RouteTreeRoutePoint | RouteTreeForkPoint

export interface RouteTree {
  version: number
  // 多棵独立的线路树；每个根都必须是线路点。
  roots: RouteTreePoint[]
}
