// Run with ELECTRON_RUN_AS_NODE=1 using the project's Electron executable.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')
const Database = require('better-sqlite3')

const root = path.resolve(__dirname, '..')
const compiled = buildSync({
  stdin: {
    contents: `export { RouteRepository } from './src/main/database/route.repo';
      export { RouteService } from './src/main/database/route.service';
      export { initDatabase } from './src/main/database';
      export { RouteTreeFileStore } from './src/main/services/routeTreeFile';
      export { RouteTreeService } from './src/main/services/routeTree';
      export { unplacedRoutes } from './src/shared/routeTree';`,
    resolveDir: root
  },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['better-sqlite3'], tsconfig: path.join(root, 'tsconfig.json')
}).outputFiles[0].text
const fixture = new Module(path.join(root, 'route-tree-service-fixture.cjs'), module)
fixture.paths = module.paths
fixture._compile(compiled, path.join(root, 'route-tree-service-fixture.cjs'))
const { RouteRepository, RouteService, initDatabase, RouteTreeFileStore, RouteTreeService, unplacedRoutes } = fixture.exports

const route = id => ({ id, gameId: 'game', name: id, description: null, color: '#5d82d8',
  type: 'character', lockCondition: null, status: 'NotStarted', playtime: 0 })
const routePoint = (id, routeId, x, y, children = []) =>
  ({ id, type: 'route', routeId, x, y, children })
const forkPoint = (id, x, y, children = []) =>
  ({ id, type: 'fork', routeId: null, x, y, children })
const tree = roots => ({ version: 4, roots })

const db = new Database(':memory:')
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vexus-route-tree-'))
const dir = path.join(base, 'route-trees')
try {
  initDatabase(db)
  db.prepare('INSERT INTO games (id, original_title) VALUES (?, ?)').run('game', 'Test')
  const repo = new RouteRepository(db)
  const service = new RouteService(repo)
  const store = new RouteTreeFileStore(dir)
  const trees = new RouteTreeService(service, store)

  const initial = tree([routePoint('n-a', 'a', 24, 24, [routePoint('n-b', 'b', 320, 24)])])
  const saved = trees.save('game', [route('a'), route('b')], initial)
  assert.deepEqual(saved.routes.map(item => item.id), ['a', 'b'])
  const file = path.join(dir, 'game.json')
  assert.equal(fs.existsSync(file), true)
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.equal(raw.version, 4)
  assert.equal(raw.roots.length, 1)
  assert.equal(raw.roots[0].routeId, 'a')
  assert.equal(raw.roots[0].children[0].routeId, 'b')
  assert.equal(fs.readdirSync(dir).some(name => name.endsWith('.tmp')), false)

  const loaded = trees.get('game')
  assert.deepEqual(loaded.routes.map(item => item.id), ['a', 'b'])
  assert.equal(loaded.tree.roots[0].children[0].routeId, 'b')

  // 树允许只包含部分线路，其余线路保持“未放入”。
  const subset = trees.save('game', [route('a'), route('b')], tree([routePoint('n-a', 'a', 24, 24)]))
  assert.deepEqual(subset.routes.map(item => item.id), ['a', 'b'])
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).roots[0].children.length, 0)
  const withUnplaced = trees.get('game')
  assert.deepEqual(unplacedRoutes(withUnplaced.routes, withUnplaced.tree).map(item => item.id), ['b'])

  // 多根森林。
  const twoRoots = trees.save('game', [route('a'), route('b')],
    tree([routePoint('n-a', 'a', 24, 24), routePoint('n-b', 'b', 24, 240)]))
  assert.equal(twoRoots.tree.roots.length, 2)
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).roots.length, 2)
  const twoLoaded = trees.get('game')
  assert.deepEqual(twoLoaded.routes.map(item => item.id), ['a', 'b'])
  assert.deepEqual(unplacedRoutes(twoLoaded.routes, twoLoaded.tree).map(item => item.id), [])

  // 空森林：所有线路保持未放入。
  const empty = trees.save('game', [route('a'), route('b')], tree([]))
  assert.equal(empty.tree.roots.length, 0)
  assert.deepEqual(unplacedRoutes(empty.routes, empty.tree).map(item => item.id), ['a', 'b'])

  // 分叉点可以没有子节点，只要它确实是树上的点。
  const withFork = trees.save('game', [route('a')], tree([
    routePoint('n-a', 'a', 24, 24, [forkPoint('n-f', 200, 24)])
  ]))
  assert.equal(withFork.tree.roots[0].children[0].type, 'fork')

  // 树引用不存在的线路时必须在写文件与写库之前失败。
  assert.throws(() => trees.save('game', [route('a'), route('b')],
    tree([routePoint('n-a', 'a', 24, 24, [routePoint('n-x', 'missing', 320, 24)])])), /unknown route/)
  assert.deepEqual(repo.getByGame('game').map(item => item.id), ['a'])
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).roots[0].children[0].type, 'fork')

  // 根必须是线路点。
  assert.throws(() => trees.save('game', [route('a'), route('b')],
    tree([forkPoint('n-f', 24, 24, [routePoint('n-a', 'a', 200, 24)])])), /root must be a route/)
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).roots[0].routeId, 'a')

  // 删除线路后树文件同步更新。
  trees.save('game', [route('a')], tree([routePoint('n-a', 'a', 24, 24)]))
  assert.deepEqual(repo.getByGame('game').map(item => item.id), ['a'])
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).roots[0].children.length, 0)

  // 文件缺失：返回默认森林，不写回。
  fs.unlinkSync(file)
  const missing = trees.get('game')
  assert.equal(missing.tree.roots[0].routeId, 'a')
  assert.equal(fs.existsSync(file), false)

  // 文件损坏：返回默认森林，且不覆盖损坏文件。
  fs.writeFileSync(file, '{', 'utf8')
  const corrupt = trees.get('game')
  assert.equal(corrupt.tree.roots[0].routeId, 'a')
  assert.equal(fs.readFileSync(file, 'utf8'), '{')

  // 路径安全。
  assert.throws(() => store.read('../evil'), /Invalid game id/)
  assert.throws(() => store.read('a/b'), /Invalid game id/)
  console.log('Passed: v4 save ordering, multi-root forest, subset/empty trees, empty fork, invalid reference rollback, root rejection, delete sync, missing/corrupt fallback, path safety')
} finally {
  db.close()
  fs.rmSync(base, { recursive: true, force: true })
}
