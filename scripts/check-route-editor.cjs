// Run with system Node; structural helpers are pure and the editor is SSR-rendered.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { buildSync } = require('esbuild')
const { createSSRApp } = require('vue')
const { renderToString } = require('vue/server-renderer')
const { createPinia } = require('pinia')

const root = path.resolve(__dirname, '..')

function loadModule(file, exportNames) {
  const output = buildSync({
    stdin: { contents: `export { ${exportNames.join(', ')} } from './${file.replace(/\\/g, '/').replace(/\.ts$/, '')}';`, resolveDir: root },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    tsconfig: path.join(root, 'tsconfig.json')
  }).outputFiles[0].text
  const fixture = new Module(path.join(root, 'route-editor-model-fixture.cjs'), module)
  fixture.paths = module.paths
  fixture._compile(output, path.join(root, 'route-editor-model-fixture.cjs'))
  return fixture.exports
}

const model = loadModule('src/renderer/pages/Game/routes/routeEditorModel.ts', [
  'findPointContext', 'findRoutePointId', 'addRootRoute', 'addRouteAsChild',
  'addForkOnEdge', 'removePoint', 'removeRouteFromTree',
  'movePoint', 'movePointSubtree', 'movePointTo', 'pointSubtreeIds', 'cloneTree'
])

const routePoint = (id, routeId, x, y, children = []) =>
  ({ id, type: 'route', routeId, x, y, children })
const forkPoint = (id, x, y, children = []) =>
  ({ id, type: 'fork', routeId: null, x, y, children })
let seq = 0
const newId = () => `new-${++seq}`

// 多个根与重复线路。
let tree = { version: 4, roots: [] }
assert.ok(model.addRootRoute(tree, 'a', 24, 24, newId))
assert.ok(model.addRootRoute(tree, 'b', 24, 240, newId))
assert.deepEqual(tree.roots.map(root => root.routeId), ['a', 'b'])
assert.equal(model.addRootRoute(tree, 'a', 24, 400, newId), null)

// 拖到节点上：成为子线路。
tree = { version: 4, roots: [routePoint('na', 'a', 24, 24)] }
assert.ok(model.addRouteAsChild(tree, 'na', 'b', newId))
assert.ok(model.addRouteAsChild(tree, 'na', 'c', newId))
assert.deepEqual(tree.roots[0].children.map(point => point.routeId), ['b', 'c'])

// 拖分叉点到连接线上：原边拆成 parent → fork → child。
tree = { version: 4, roots: [routePoint('na', 'a', 24, 24, [routePoint('nb', 'b', 320, 24)])] }
const forkId = model.addForkOnEdge(tree, 'na', 0, 180, 24, newId)
assert.equal(tree.roots[0].children[0].id, forkId)
assert.equal(tree.roots[0].children[0].type, 'fork')
assert.equal(tree.roots[0].children[0].children[0].routeId, 'b')
assert.ok(model.addRouteAsChild(tree, forkId, 'c', newId))
assert.deepEqual(tree.roots[0].children[0].children.map(point => point.routeId), ['b', 'c'])

// 移动节点并夹紧到非负坐标。
assert.equal(model.movePoint(tree, forkId, -10, 40), true)
assert.equal(tree.roots[0].children[0].x, 0)
assert.equal(tree.roots[0].children[0].y, 40)

// 移出非根节点：children 提升到原位置；移出根移除整棵子树。
tree = { version: 4, roots: [routePoint('na', 'a', 0, 0, [routePoint('nb', 'b', 100, 0)])] }
const branchId = tree.roots[0].children[0].id
model.addRouteAsChild(tree, branchId, 'c', newId)
assert.equal(model.removePoint(tree, branchId), true)
assert.deepEqual(tree.roots[0].children.map(point => point.routeId), ['c'])
assert.equal(model.removePoint(tree, 'na'), true)
assert.equal(tree.roots.length, 0)

// 拖到另一个节点上改父级。
tree = {
  version: 4,
  roots: [
    routePoint('na', 'a', 0, 0, [routePoint('nb', 'b', 100, 0)]),
    routePoint('nc', 'c', 0, 200)
  ]
}
assert.equal(model.movePointTo(tree, 'nc', 'na'), true)
assert.equal(tree.roots.length, 1)
assert.deepEqual(tree.roots[0].children.map(point => point.routeId), ['b', 'c'])
assert.equal(model.findPointContext(tree, 'nc').parent.id, 'na')
assert.equal(model.movePointTo(tree, 'nb', 'nc'), true)
assert.deepEqual(tree.roots[0].children.map(point => point.routeId), ['c'])
assert.deepEqual(tree.roots[0].children[0].children.map(point => point.routeId), ['b'])
assert.equal(model.movePointTo(tree, 'na', 'nb'), false)
assert.equal(model.movePointTo(tree, 'nb', 'nc'), false)
assert.deepEqual([...model.pointSubtreeIds(tree.roots[0])].sort(), ['na', 'nb', 'nc'])

// 根绑定到另一棵树的节点。
tree = {
  version: 4,
  roots: [
    routePoint('na', 'a', 0, 0),
    routePoint('nc', 'c', 0, 200, [routePoint('nd', 'd', 100, 200)])
  ]
}
assert.equal(model.movePointTo(tree, 'na', 'nd'), true)
assert.deepEqual(tree.roots.map(root => root.routeId), ['c'])
assert.deepEqual(tree.roots[0].children[0].children.map(point => point.routeId), ['a'])

// 平移子树，保持子节点相对位置。
tree = {
  version: 4,
  roots: [routePoint('na', 'a', 0, 0, [
    routePoint('nb', 'b', 100, 0, [routePoint('nc', 'c', 200, 0)])
  ])]
}
assert.equal(model.movePointSubtree(tree, 'nb', 300, 100), true)
assert.equal(tree.roots[0].children[0].x, 300)
assert.equal(tree.roots[0].children[0].y, 100)
assert.equal(tree.roots[0].children[0].children[0].x, 400)
assert.equal(tree.roots[0].children[0].children[0].y, 100)

// 深拷贝。
const original = { version: 4, roots: [routePoint('na', 'a', 0, 0, [routePoint('nb', 'b', 100, 0)]), routePoint('nc', 'c', 0, 200)] }
const clone = model.cloneTree(original)
clone.roots[0].children[0].x = 999
assert.equal(original.roots[0].children[0].x, 100)

// SSR：多根渲染；空森林显示画布拖放提示。
async function loadEditor() {
  const filename = path.join(root, 'src/renderer/pages/Game/routes/RouteEditorModal.vue')
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
  const script = compileScript(descriptor, { id: 'route-editor-check', inlineTemplate: true })
  const output = buildSync({
    stdin: { contents: script.content, loader: 'ts', resolveDir: path.dirname(filename) },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['vue', 'pinia'], tsconfig: path.join(root, 'tsconfig.json')
  }).outputFiles[0].text
  const compiled = new Module(filename, module)
  compiled.paths = module.paths
  compiled._compile(output, filename)
  return compiled.exports.default
}

const route = (id, type = 'character', color = '#5d82d8') => ({ id, gameId: 'g', name: id, description: null, color,
  type, lockCondition: null, status: 'NotStarted', playtime: 0 })
const routes = [route('route-a', 'common', '#5d82d8'), route('route-b', 'character', '#4f9b82'),
  route('route-c', 'character', '#d77e9c'), route('route-d', 'character', '#7b70c9'),
  route('unplaced-route', 'character', '#c58a4f')]

async function render(component, tree) {
  const app = createSSRApp(component, { gameId: 'g', routes, tree, initialTab: 'tree' })
  app.use(createPinia())
  return renderToString(app)
}

global.window = { innerHeight: 800, innerWidth: 1200, addEventListener() {}, removeEventListener() {} }
global.document = { createElement: () => ({ getContext: () => null }), addEventListener() {}, removeEventListener() {} }

loadEditor().then(async component => {
  const populated = await render(component, {
    version: 4,
    roots: [
      routePoint('na', 'route-a', 24, 24, [
        routePoint('nb', 'route-b', 320, 24),
        routePoint('nc', 'route-c', 320, 160)
      ]),
      routePoint('nd', 'route-d', 24, 320)
    ]
  })
  assert.match(populated, /线路树/)
  assert.match(populated, /未放入线路/)
  assert.match(populated, /分叉点/)
  assert.match(populated, /自动整理/)
  assert.match(populated, /unplaced-route/)
  assert.match(populated, /route-a/)
  assert.match(populated, /route-d/)
  assert.match(populated, /添加线路/)
  assert.match(populated, /清空线路树/)
  assert.match(populated, /拖节点到这里移出树/)
  assert.doesNotMatch(populated, /设为主线/)
  assert.doesNotMatch(populated, /structure-panel/)
  assert.doesNotMatch(populated, /class="canvas-empty"/)

  const empty = await render(component, { version: 4, roots: [] })
  assert.match(empty, /class="canvas-empty"/)
  assert.match(empty, /把线路拖到这里作为根节点/)
  assert.match(empty, /根节点/)
  assert.match(empty, /route-a/)
  assert.match(empty, /unplaced-route/)
  console.log('Passed: v4 multi-root child/fork/move/reparent/remove/clone helpers, editor SSR')
}).catch(error => { console.error(error); process.exitCode = 1 })
