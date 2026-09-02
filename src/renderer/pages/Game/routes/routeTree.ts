import { ROUTE_TYPE_OPTIONS, type Route } from '@/shared/types'

export interface RouteTreeNode extends Route {
  children: RouteTreeNode[]
}

export interface PositionedRouteNode extends RouteTreeNode {
  x: number
  y: number
  width: number
}

export interface RouteTreeEdge {
  from: PositionedRouteNode
  to: PositionedRouteNode
}

export interface RouteTreeLayout {
  nodes: PositionedRouteNode[]
  edges: RouteTreeEdge[]
  width: number
  height: number
}

const MIN_NODE_WIDTH = 110
const NODE_HEIGHT = 52
const COLUMN_GAP = 72
const ROW_GAP = 24
const PADDING = 18

// 中文按全角、其他字符按常见 UI 字体平均宽度估算，避免渲染后再测量造成画布跳动。
const getNodeWidth = (name: string) => {
  const textWidth = Array.from(name).reduce(
    (width, character) => width + (/[^\u0000-\u00ff]/.test(character) ? 13 : 7.2),
    0
  )
  return Math.max(MIN_NODE_WIDTH, Math.ceil(textWidth + 28))
}

const isMainRoute = (route: Route) =>
  ROUTE_TYPE_OPTIONS.some(option => option.value === route.type && option.isMain)

// 构建线路树
// 分支永远属于它之前最近出现的主干；新的主干与此前分支并列，并成为后续锚点。
export function buildRouteTree(routes: Route[]): RouteTreeNode | null {
  const sorted = [...routes].sort((a, b) => a.order - b.order)
  if (sorted.length === 0) return null

  const root: RouteTreeNode = { ...sorted[0], children: [] }
  let currentMain = root

  for (const route of sorted.slice(1)) {
    const node: RouteTreeNode = { ...route, children: [] }
    currentMain.children.push(node)
    if (isMainRoute(route)) currentMain = node
  }

  return root
}

// 叶节点依次占据纵向行，父节点居中于首尾子节点之间。
export function layoutRouteTree(root: RouteTreeNode | null): RouteTreeLayout {
  if (!root) return { nodes: [], edges: [], width: 0, height: 0 }

  const nodes: PositionedRouteNode[] = []
  const edges: RouteTreeEdge[] = []
  let nextLeafY = PADDING
  let maxRight = PADDING + MIN_NODE_WIDTH

  const visit = (node: RouteTreeNode, x: number): PositionedRouteNode => {
    const width = getNodeWidth(node.name)
    maxRight = Math.max(maxRight, x + width)
    const hasCharacterSibling = node.children.some(child => child.type === 'character')
    // 与个人线并列的后续主干跨两列，其他父子关系只前进一个标准列宽。
    const children = node.children.map(child => visit(
      child,
      x + width + COLUMN_GAP + (
        isMainRoute(child) && hasCharacterSibling ? MIN_NODE_WIDTH + COLUMN_GAP : 0
      )
    ))
    const y = children.length === 0
      ? nextLeafY
      : (children[0].y + children[children.length - 1].y) / 2

    if (children.length === 0) nextLeafY += NODE_HEIGHT + ROW_GAP

    const positioned: PositionedRouteNode = {
      ...node,
      x,
      y,
      width
    }
    nodes.push(positioned)
    for (const child of children) edges.push({ from: positioned, to: child })
    return positioned
  }

  visit(root, PADDING)
  return {
    nodes,
    edges,
    width: maxRight + PADDING,
    height: Math.max(nextLeafY - ROW_GAP + PADDING, NODE_HEIGHT + PADDING * 2)
  }
}

export const routeTreeNodeSize = { height: NODE_HEIGHT }
export const routeTreeColumnGap = COLUMN_GAP
