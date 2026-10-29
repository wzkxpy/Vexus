import type { RouteTreeEdge, RouteTreeLayout } from './routeTree'

interface Point { x: number; y: number }
interface Rect { left: number; top: number; right: number; bottom: number }
interface Wire { id: string; points: Point[]; completed: boolean; arrow: boolean }

export function buildDependencyBus(edges: (RouteTreeEdge & { completed: boolean })[], layout: RouteTreeLayout, unlocked: boolean) {
  if (!edges.length) return { paths: [], obstacles: [] as Rect[] }
  const nodes = [...edges.map(edge => edge.from), edges[0].to]
  let best: { wires: Wire[]; hits: number; length: number } | undefined
  // 所有前置共用一条汇流线，只在目标入口显示箭头。
  for (const vertical of [true, false]) {
    const lanes = new Set<number>(vertical ? [6, layout.width - 6] : [6, layout.height - 6])
    for (const node of layout.nodes) {
      lanes.add(vertical ? node.x - 6 : node.y - 5)
      lanes.add(vertical ? node.x + node.width + 6 : node.y + node.height + 5)
    }
    for (const lane of lanes) {
      const ports = nodes.map(node => vertical
        ? { x: lane < node.x + node.width / 2 ? node.x : node.x + node.width, y: node.y + node.height / 2 }
        : { x: node.x + node.width / 2, y: lane < node.y + node.height / 2 ? node.y : node.y + node.height })
      const joins = ports.map(port => vertical ? { x: lane, y: port.y } : { x: port.x, y: lane })
      const coordinates = joins.map(point => vertical ? point.y : point.x)
      const low = Math.min(...coordinates), high = Math.max(...coordinates)
      const wires: Wire[] = [{ id: 'bus', completed: unlocked, arrow: false, points: vertical
        ? [{ x: lane, y: low }, { x: lane, y: high }]
        : [{ x: low, y: lane }, { x: high, y: lane }] }]
      edges.forEach((edge, index) => wires.push({ id: `source-${edge.from.id}`, completed: edge.completed, arrow: false, points: [ports[index], joins[index]] }))
      wires.push({ id: 'target', completed: unlocked, arrow: true, points: [joins[joins.length - 1], ports[ports.length - 1]] })
      let hits = 0, length = 0
      for (const wire of wires) {
        const [a, b] = wire.points
        length += Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
        for (const node of layout.nodes) {
          const crossing = a.x === b.x
            ? a.x > node.x && a.x < node.x + node.width && Math.max(a.y, b.y) > node.y && Math.min(a.y, b.y) < node.y + node.height
            : a.y > node.y && a.y < node.y + node.height && Math.max(a.x, b.x) > node.x && Math.min(a.x, b.x) < node.x + node.width
          if (crossing) hits++
        }
      }
      if (!best || hits < best.hits || (hits === best.hits && length < best.length)) best = { wires, hits, length }
    }
  }
  const wires = best!.wires.filter(wire => wire.points[0].x !== wire.points[1].x || wire.points[0].y !== wire.points[1].y)
  return {
    paths: wires.map(wire => ({ ...wire, path: wire.points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ') })),
    // 按各线段加安全间距避让弹框，不把整张关系图都视为障碍。
    obstacles: wires.map(({ points: [a, b] }) => ({ left: Math.min(a.x, b.x) - 8, top: Math.min(a.y, b.y) - 8, right: Math.max(a.x, b.x) + 8, bottom: Math.max(a.y, b.y) + 8 }))
  }
}
