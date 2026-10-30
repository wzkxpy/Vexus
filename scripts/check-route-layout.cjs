// Run with system Node; layout consumes only plain data.
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const compiled = buildSync({
  stdin: { contents: `export { buildRouteLayout, autoLayoutRouteTree, routeTreeEdgePath, measureRouteNode, findChildSlot, FORK_NODE_SIZE } from './src/renderer/pages/Game/routes/routeTree';`, resolveDir: root },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  tsconfig: path.join(root, 'tsconfig.json')
}).outputFiles[0].text
const fixture = new Module(path.join(root, 'route-layout-fixture.cjs'), module)
fixture.paths = module.paths
fixture._compile(compiled, path.join(root, 'route-layout-fixture.cjs'))
const { buildRouteLayout, autoLayoutRouteTree, routeTreeEdgePath, measureRouteNode, findChildSlot, FORK_NODE_SIZE } = fixture.exports

const route = id => ({ id, gameId: 'g', name: id, description: null, color: '#5d82d8',
  type: 'character', lockCondition: null, status: 'NotStarted', playtime: 0 })
const routePoint = (id, routeId, x, y, children = []) =>
  ({ id, type: 'route', routeId, x, y, children })
const forkPoint = (id, x, y, children = []) =>
  ({ id, type: 'fork', routeId: null, x, y, children })
const measure = (text, size) => Array.from(text).length * size

const routes = ['a', 'b', 'c', 'd', 'e'].map(route)
const routesById = new Map(routes.map(item => [item.id, item]))
const tree = {
  version: 4,
  roots: [
    routePoint('n-a', 'a', 24, 24, [
      forkPoint('n-f', 200, 40, [
        routePoint('n-b', 'b', 420, 40),
        routePoint('n-c', 'c', 200, 180)
      ])
    ]),
    routePoint('n-d', 'd', 24, 360, [
      routePoint('n-e', 'e', 320, 360)
    ])
  ]
}

const layout = buildRouteLayout(tree, routesById, measure)
assert.equal(layout.nodes.length, 6)
assert.equal(layout.nodes.filter(item => item.isFork).length, 1)
assert.equal(layout.edges.length, 4)
assert.equal(layout.nodes.find(item => item.id === 'n-f').width, FORK_NODE_SIZE)
assert.ok(layout.width > 420 && layout.height > 360)
assert.match(routeTreeEdgePath(layout.edges[0]), /^M /)

const wrapped = measureRouteNode({ ...route('long'), name: '一个很长很长很长很长很长很长的线路名称' }, measure)
assert.ok(wrapped.nameLines.length > 1)
assert.ok(wrapped.width <= 240)

autoLayoutRouteTree(tree, routesById, measure)
for (const rootPoint of tree.roots) {
  assert.ok(rootPoint.x >= 0 && rootPoint.y >= 0)
  assert.equal(rootPoint.x, 24)
}
assert.ok(tree.roots[1].y > tree.roots[0].y)
assert.ok(tree.roots[0].children[0].x > tree.roots[0].x)
assert.ok(tree.roots[0].children[0].children[0].x > tree.roots[0].children[0].x)

// 默认子节点位置：优先同高直线位，被占用时上下错开。
const targetNode = { id: 'target', x: 24, y: 24, width: 100, height: 44 }
const straight = findChildSlot(targetNode, 100, 44, [targetNode])
assert.deepEqual(straight, { x: 196, y: 24, straight: true })
const obstacle = { id: 'obstacle', x: 196, y: 24, width: 100, height: 44 }
const arc = findChildSlot(targetNode, 100, 44, [targetNode, obstacle])
assert.equal(arc.straight, false)
assert.notEqual(arc.y, 24)
const excluded = findChildSlot(targetNode, 100, 44, [targetNode, obstacle], new Set(['obstacle']))
assert.deepEqual(excluded, { x: 196, y: 24, straight: true })
console.log('Passed: multi-root manual layout, fork nodes, child edges, edge path, name wrapping, stacked auto layout, straight-first child slots')
