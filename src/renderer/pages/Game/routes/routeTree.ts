import type { Route, RouteTree, RouteTreePoint } from '@/shared/types'

export const FORK_NODE_SIZE = 20
export const ROUTE_FONT_SIZE = 13
export const ROUTE_PADDING = 10

const CANVAS_PADDING = 24
const ROUTE_MIN_WIDTH = 96
const ROUTE_MAX_WIDTH = 240
const AUTO_COLUMN_GAP = 72
const AUTO_ROW_GAP = 24
const AUTO_ROOT_GAP = 48
const AUTO_PADDING = 24

export interface RouteLayoutNode {
  id: string
  point: RouteTreePoint
  route: Route | null
  isFork: boolean
  x: number
  y: number
  width: number
  height: number
  nameLines: string[]
}

export interface RouteTreeEdge {
  from: RouteLayoutNode
  to: RouteLayoutNode
  childIndex: number
}

export interface RouteTreeLayout {
  nodes: RouteLayoutNode[]
  edges: RouteTreeEdge[]
  width: number
  height: number
  fontSize: number
  padding: number
}

interface NodeSize {
  width: number
  height: number
  nameLines: string[]
}

export function measureRouteNode(route: Route, measure: (text: string, size: number) => number,
  fontSize = ROUTE_FONT_SIZE): NodeSize {
  const label = route.name.trim() ? route.name : '未命名线路'
  const extra = ROUTE_PADDING * 2 + 5 + (route.type !== 'common' && route.lockCondition ? 25 : 0)
  const width = Math.max(ROUTE_MIN_WIDTH,
    Math.min(ROUTE_MAX_WIDTH, Math.ceil(measure(label, fontSize) + extra)))
  const nameLines: string[] = []
  let line = ''
  for (const character of Array.from(label)) {
    if (character === '\n') { nameLines.push(line); line = ''; continue }
    if (line && measure(line + character, fontSize) > width - extra) {
      nameLines.push(line)
      line = ''
    }
    line += character
  }
  nameLines.push(line)
  const height = Math.max(44, nameLines.length * (fontSize + 4) + 30)
  return { width, height, nameLines }
}

const pointSize = (point: RouteTreePoint, routesById: Map<string, Route>,
  measure: (text: string, size: number) => number): NodeSize => {
  if (point.type === 'route') {
    const route = routesById.get(point.routeId)
    return route ? measureRouteNode(route, measure) : { width: 120, height: 44, nameLines: [] }
  }
  return { width: FORK_NODE_SIZE, height: FORK_NODE_SIZE, nameLines: [] }
}

// 每个点都保存坐标；这里只把结构解析为可渲染节点和边。
export function buildRouteLayout(tree: RouteTree, routesById: Map<string, Route>,
  measure: (text: string, size: number) => number): RouteTreeLayout {
  const nodes: RouteLayoutNode[] = []
  const edges: RouteTreeEdge[] = []

  const visit = (point: RouteTreePoint | null): RouteLayoutNode | null => {
    if (!point) return null
    if (point.type === 'route') {
      const route = routesById.get(point.routeId)
      // 主进程读取时会清理悬空线路；这里不再渲染缺失的节点。
      if (!route) return null
      const size = pointSize(point, routesById, measure)
      const node: RouteLayoutNode = {
        id: point.id, point, route, isFork: false,
        x: point.x, y: point.y, width: size.width, height: size.height, nameLines: size.nameLines
      }
      nodes.push(node)
      point.children.forEach((child, index) => {
        const childNode = visit(child)
        if (childNode) edges.push({ from: node, to: childNode, childIndex: index })
      })
      return node
    }

    const node: RouteLayoutNode = {
      id: point.id, point, route: null, isFork: true,
      x: point.x, y: point.y, width: FORK_NODE_SIZE, height: FORK_NODE_SIZE, nameLines: []
    }
    nodes.push(node)
    point.children.forEach((child, index) => {
      const childNode = visit(child)
      if (childNode) edges.push({ from: node, to: childNode, childIndex: index })
    })
    return node
  }

  for (const root of tree.roots) visit(root)
  let maxRight = 0
  let maxBottom = 0
  for (const node of nodes) {
    maxRight = Math.max(maxRight, node.x + node.width)
    maxBottom = Math.max(maxBottom, node.y + node.height)
  }
  return {
    nodes,
    edges,
    width: nodes.length ? maxRight + CANVAS_PADDING : 0,
    height: nodes.length ? maxBottom + CANVAS_PADDING : 0,
    fontSize: ROUTE_FONT_SIZE,
    padding: ROUTE_PADDING
  }
}

interface PreparedPoint {
  point: RouteTreePoint
  size: NodeSize
  children: PreparedPoint[]
  childrenHeight: number
  subtreeHeight: number
}

// 自动整理只给没有手工排布的树提供一个可用的初始布局。
export function autoLayoutRouteTree(tree: RouteTree, routesById: Map<string, Route>,
  measure: (text: string, size: number) => number): void {
  if (!tree.roots.length) return

  const prepare = (point: RouteTreePoint): PreparedPoint => {
    const size = pointSize(point, routesById, measure)
    const children = point.children.map(prepare)
    const childrenHeight = children.reduce((sum, child) => sum + child.subtreeHeight, 0) +
      Math.max(0, children.length - 1) * AUTO_ROW_GAP
    return { point, size, children, childrenHeight, subtreeHeight: Math.max(size.height, childrenHeight) }
  }

  const visit = (prepared: PreparedPoint, x: number, top: number) => {
    prepared.point.x = x
    prepared.point.y = top + (prepared.subtreeHeight - prepared.size.height) / 2
    let childTop = top + (prepared.subtreeHeight - prepared.childrenHeight) / 2
    const childX = x + prepared.size.width + AUTO_COLUMN_GAP
    for (const child of prepared.children) {
      visit(child, childX, childTop)
      childTop += child.subtreeHeight + AUTO_ROW_GAP
    }
  }

  let top = AUTO_PADDING
  for (const root of tree.roots) {
    const prepared = prepare(root)
    visit(prepared, AUTO_PADDING, top)
    top += prepared.subtreeHeight + AUTO_ROOT_GAP
  }
}

export function routeTreeEdgePath({ from, to }: RouteTreeEdge): string {
  const startX = from.x + from.width
  const startY = from.y + from.height / 2
  const endX = to.x
  const endY = to.y + to.height / 2
  const middleX = (startX + endX) / 2
  return `M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX} ${endY}`
}

const CHILD_GAP_X = 72
const CHILD_GAP_Y = 24

export interface ChildSlot {
  x: number
  y: number
  straight: boolean
}

// 优先放在目标右侧同一中线，得到直线连接；该位置被占用时上下错开，连接自然变成弧线。
export function findChildSlot(target: RouteLayoutNode, width: number, height: number,
  nodes: RouteLayoutNode[], excludeIds: Set<string> = new Set()): ChildSlot {
  const x = target.x + target.width + CHILD_GAP_X
  const centerY = target.y + target.height / 2
  const baseY = centerY - height / 2
  const collides = (y: number) => nodes.some(node => {
    if (node.id === target.id || excludeIds.has(node.id)) return false
    return x < node.x + node.width && x + width > node.x &&
      y < node.y + node.height && y + height > node.y
  })

  if (baseY >= 0 && !collides(baseY)) return { x, y: baseY, straight: true }

  const step = height + CHILD_GAP_Y
  for (let index = 1; index <= 20; index++) {
    const below = baseY + index * step
    if (below >= 0 && !collides(below)) return { x, y: below, straight: false }
    const above = baseY - index * step
    if (above >= 0 && !collides(above)) return { x, y: above, straight: false }
  }
  return { x, y: Math.max(0, baseY + step), straight: false }
}
