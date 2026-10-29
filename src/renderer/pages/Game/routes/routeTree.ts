import { ROUTE_TYPE_OPTIONS, type Route } from '@/shared/types'

export interface RouteTreeNode extends Route {
  children: RouteTreeNode[]
}

export interface PositionedRouteNode extends RouteTreeNode {
  x: number
  y: number
  width: number
  height: number
  nameLines: string[]
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
  columnGap: number
  fontSize: number
  padding: number
}

const PADDING = 18

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

const densities = [
  { minWidth: 110, maxWidth: 240, height: 52, columnGap: 72, rowGap: 24, fontSize: 13, padding: 10 },
  { minWidth: 96, maxWidth: 210, height: 46, columnGap: 44, rowGap: 14, fontSize: 12, padding: 8 },
  { minWidth: 88, maxWidth: 180, height: 42, columnGap: 28, rowGap: 10, fontSize: 11, padding: 7 }
]

export function layoutRouteTree(root: RouteTreeNode | null, density = 0,
  measure: (text: string, size: number) => number = (text, size) => Array.from(text).length * size,
  verticalCompression = 0
): RouteTreeLayout {
  const level = Math.max(0, Math.min(densities.length - 1, density))
  const lower = densities[Math.floor(level)]!
  const upper = densities[Math.ceil(level)]!
  const fraction = level - Math.floor(level)
  const interpolate = (key: keyof typeof lower) => lower[key] + (upper[key] - lower[key]) * fraction
  const config = {
    minWidth: interpolate('minWidth'), maxWidth: interpolate('maxWidth'),
    height: interpolate('height'), columnGap: interpolate('columnGap'),
    rowGap: interpolate('rowGap') + (10 - interpolate('rowGap')) * verticalCompression,
    fontSize: interpolate('fontSize'), padding: interpolate('padding')
  }
  const nodes: PositionedRouteNode[] = []
  const edges: RouteTreeEdge[] = []
  const empty = { nodes, edges, width: 0, ...config }
  if (!root) return { ...empty, height: 0 }
  // 按实际字体宽度换行，完整保留名称；高度随行数增加，不裁切文字。
  const prepare = (node: RouteTreeNode): {
    node: RouteTreeNode; width: number; height: number; nameLines: string[];
    children: ReturnType<typeof prepare>[]; subtreeHeight: number
  } => {
    const extra = config.padding * 2 + 5 + (node.type !== 'common' && node.lockCondition ? 25 : 0)
    const width = Math.max(config.minWidth, Math.min(config.maxWidth, Math.ceil(measure(node.name, config.fontSize) + extra)))
    const nameLines: string[] = []
    let line = ''
    for (const character of Array.from(node.name)) {
      if (character === '\n') { nameLines.push(line); line = ''; continue }
      if (line && measure(line + character, config.fontSize) > width - extra) {
        nameLines.push(line)
        line = ''
      }
      line += character
    }
    nameLines.push(line)
    const height = Math.max(config.height, nameLines.length * (config.fontSize + 4) + 30)
    const children = node.children.map(prepare)
    const subtreeHeight = Math.max(height, children.reduce((sum, child) => sum + child.subtreeHeight, 0) + Math.max(0, children.length - 1) * config.rowGap)
    return { node, width, height, nameLines, children, subtreeHeight }
  }
  let maxRight = 0
  const visit = (item: ReturnType<typeof prepare>, x: number, top: number): PositionedRouteNode => {
    const positioned = { ...item.node, x, y: top + (item.subtreeHeight - item.height) / 2,
      width: item.width, height: item.height, nameLines: item.nameLines }
    nodes.push(positioned)
    maxRight = Math.max(maxRight, x + item.width)
    const childrenHeight = item.children.reduce((sum, child) => sum + child.subtreeHeight, 0) + Math.max(0, item.children.length - 1) * config.rowGap
    let childTop = top + (item.subtreeHeight - childrenHeight) / 2
    const hasBranch = item.children.some(child => child.node.type === 'character')
    for (const child of item.children) {
      const childX = x + item.width + config.columnGap + (isMainRoute(child.node) && hasBranch ? config.minWidth + config.columnGap : 0)
      const target = visit(child, childX, childTop)
      edges.push({ from: positioned, to: target })
      childTop += child.subtreeHeight + config.rowGap
    }
    return positioned
  }
  const prepared = prepare(root)
  visit(prepared, PADDING, PADDING)
  return { ...empty, width: maxRight + PADDING, height: prepared.subtreeHeight + PADDING * 2 }
}

/** Width determines node density; excess height only tightens the vertical gaps. */
export function fitRouteTree(root: RouteTreeNode | null, width: number, height: number,
  measure?: (text: string, size: number) => number): RouteTreeLayout {
  let density = 0
  let result = layoutRouteTree(root, density, measure)
  if (result.width > width) {
    let low = 0
    let high = 2
    result = layoutRouteTree(root, high, measure)
    if (result.width <= width) {
      // Find the least compression that fits instead of jumping to the next preset.
      for (let step = 0; step < 20; step++) {
        const middle = (low + high) / 2
        if (layoutRouteTree(root, middle, measure).width > width) low = middle
        else high = middle
      }
    }
    density = high
    result = layoutRouteTree(root, density, measure)
  }
  if (result.height > height) {
    let low = 0
    let high = 1
    for (let step = 0; step < 16; step++) {
      const middle = (low + high) / 2
      if (layoutRouteTree(root, density, measure, middle).height > height) low = middle
      else high = middle
    }
    result = layoutRouteTree(root, density, measure, high)
  }
  return result
}
