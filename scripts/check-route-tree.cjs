// Run with system Node; the tree helpers are pure and do not touch native modules.
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const compiled = buildSync({
  stdin: {
    contents: `export { parseRouteTree, reconcileRouteTree, validateRouteTreeDraft } from './src/main/services/routeTree';
      export { orderRoutesByTree, treeRouteIds, unplacedRoutes } from './src/shared/routeTree';`,
    resolveDir: root
  },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  tsconfig: path.join(root, 'tsconfig.json')
}).outputFiles[0].text
const fixture = new Module(path.join(root, 'route-tree-fixture.cjs'), module)
fixture.paths = module.paths
fixture._compile(compiled, path.join(root, 'route-tree-fixture.cjs'))
const { parseRouteTree, reconcileRouteTree, validateRouteTreeDraft, orderRoutesByTree, treeRouteIds, unplacedRoutes } = fixture.exports

const route = id => ({ id, gameId: 'g', name: id, description: null, color: '#5d82d8',
  type: 'character', lockCondition: null, status: 'NotStarted', playtime: 0 })
const routePoint = (id, routeId, x, y, children = []) =>
  ({ id, type: 'route', routeId, x, y, children })
const forkPoint = (id, x, y, children = []) =>
  ({ id, type: 'fork', routeId: null, x, y, children })
const tree = roots => ({ version: 4, roots })

// 解析：多根、分叉点和 children。
const valid = tree([
  routePoint('n-a', 'a', 24, 24, [
    forkPoint('n-f', 180, 40, [routePoint('n-b', 'b', 420, 40), routePoint('n-c', 'c', 180, 160)])
  ]),
  routePoint('n-d', 'd', 24, 240)
])
const parsed = parseRouteTree(valid)
assert.equal(parsed.roots.length, 2)
assert.equal(parsed.roots[0].children[0].type, 'fork')
assert.deepEqual(parsed.roots[0].children[0].children.map(item => item.routeId), ['b', 'c'])
assert.throws(() => parseRouteTree({ version: 3, roots: [] }), /Unsupported/)
assert.throws(() => parseRouteTree(tree([forkPoint('n-f', 0, 0, [routePoint('n-a', 'a', 100, 0)])])), /root must be a route/)
assert.throws(() => parseRouteTree(tree([routePoint('n-a', 'a', 0, 0, [
  { ...forkPoint('n-f', 0, 0), routeId: 'a' }
])])), /cannot reference a route/)
assert.throws(() => parseRouteTree(tree([routePoint('n-a', 'a', -1, 0)])), /coordinates/)
assert.throws(() => parseRouteTree(tree([routePoint('n-a', 'a', 0, 0, [routePoint('n-a', 'b', 100, 0)])])), /Duplicate/)
assert.doesNotThrow(() => parseRouteTree(tree([])))

// 无文件：默认森林有一个根，其余线路作为子节点。
const defaultReconcile = reconcileRouteTree(null, [route('a'), route('b'), route('c')])
assert.equal(defaultReconcile.repaired, true)
assert.equal(defaultReconcile.tree.roots.length, 1)
assert.equal(defaultReconcile.tree.roots[0].routeId, 'a')
assert.deepEqual(defaultReconcile.tree.roots[0].children.map(item => item.routeId), ['b', 'c'])
assert.deepEqual(orderRoutesByTree([route('c'), route('b'), route('a')], defaultReconcile.tree).map(item => item.id), ['a', 'b', 'c'])

// 多根保持独立；悬空子线路移除后 children 提升。
const multi = reconcileRouteTree(tree([
  routePoint('n-a', 'a', 0, 0, [routePoint('n-gone', 'missing', 100, 0, [routePoint('n-b', 'b', 200, 0)])]),
  routePoint('n-c', 'c', 0, 200)
]), [route('a'), route('b'), route('c')])
assert.equal(multi.repaired, true)
assert.equal(multi.tree.roots.length, 2)
assert.equal(multi.tree.roots[0].routeId, 'a')
assert.deepEqual(multi.tree.roots[0].children.map(item => item.routeId), ['b'])
assert.equal(multi.tree.roots[1].routeId, 'c')

// 根线路缺失时移除这棵子树；其他根保留。
const missingRoot = reconcileRouteTree(tree([
  routePoint('n-gone', 'missing', 0, 0, [routePoint('n-b', 'b', 100, 0)]),
  routePoint('n-c', 'c', 0, 200)
]), [route('b'), route('c')])
assert.equal(missingRoot.repaired, true)
assert.deepEqual(missingRoot.tree.roots.map(root => root.routeId), ['c'])
assert.deepEqual(unplacedRoutes([route('b'), route('c')], missingRoot.tree).map(item => item.id), ['b'])

// 重复线路：跨根时保留第一个，后面的根丢弃。
const duplicateRoot = reconcileRouteTree(tree([
  routePoint('n-a1', 'a', 0, 0),
  routePoint('n-a2', 'a', 0, 200, [routePoint('n-b', 'b', 100, 200)])
]), [route('a'), route('b')])
assert.equal(duplicateRoot.repaired, true)
assert.deepEqual(duplicateRoot.tree.roots.map(root => root.routeId), ['a'])

// 空森林是有效状态；已有森林里的未引用线路保持未放入。
const empty = reconcileRouteTree(tree([]), [route('a')])
assert.equal(empty.repaired, false)
assert.equal(empty.tree.roots.length, 0)
const subset = reconcileRouteTree(tree([routePoint('n-a', 'a', 0, 0)]), [route('a'), route('b')])
assert.equal(subset.repaired, false)
assert.deepEqual(unplacedRoutes([route('a'), route('b')], subset.tree).map(item => item.id), ['b'])
assert.deepEqual([...treeRouteIds(subset.tree)], ['a'])

// 保存时严格校验。
validateRouteTreeDraft(tree([routePoint('n-a', 'a', 0, 0, [routePoint('n-b', 'b', 100, 100)]), routePoint('n-c', 'c', 0, 200)]),
  [route('a'), route('b'), route('c')], 'g')
validateRouteTreeDraft(tree([routePoint('n-a', 'a', 0, 0, [forkPoint('n-f', 100, 0)])]), [route('a')], 'g')
assert.throws(() => validateRouteTreeDraft(tree([forkPoint('n-f', 0, 0, [routePoint('n-a', 'a', 100, 0)])]), [route('a')], 'g'), /root must be a route/)
assert.throws(() => validateRouteTreeDraft(tree([routePoint('n-a', 'a', 0, 0, [routePoint('n-x', 'missing', 100, 0)])]), [route('a')], 'g'), /unknown route/)
assert.throws(() => validateRouteTreeDraft(tree([routePoint('n-a', 'a', 0, 0), routePoint('n-a2', 'a', 100, 0)]), [route('a')], 'g'), /more than once/)
assert.throws(() => validateRouteTreeDraft(tree([routePoint('n-a', 'a', 0, 0)]), [{ ...route('a'), gameId: 'other' }], 'g'), /game id mismatch/)

// 先序遍历：根按数组顺序展开。
assert.deepEqual(orderRoutesByTree([route('b'), route('c'), route('a'), route('d')],
  tree([
    routePoint('n-a', 'a', 0, 0, [routePoint('n-c', 'c', 200, 0), routePoint('n-b', 'b', 0, 100)]),
    routePoint('n-d', 'd', 0, 300)
  ])).map(item => item.id),
['a', 'c', 'b', 'd'])
console.log('Passed: v4 parse, multi-root validation, default forest, dangling repair, missing root, duplicate roots, empty/subset, save validation, pre-order')
