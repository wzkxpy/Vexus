// Run with ELECTRON_RUN_AS_NODE=1 using the project's Electron executable.
const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const { buildSync } = require('esbuild')
const Database = require('better-sqlite3')

const root = path.resolve(__dirname, '..')
const compiled = buildSync({
  stdin: { contents: `export { RouteRepository } from './src/main/database/route.repo';
    export { RouteService } from './src/main/database/route.service';
    export { initDatabase } from './src/main/database';`, resolveDir: root },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['better-sqlite3'], tsconfig: path.join(root, 'tsconfig.json')
}).outputFiles[0].text
const fixtureModule = new Module(path.join(root, 'route-status-fixture.cjs'), module)
fixtureModule.paths = module.paths
fixtureModule._compile(compiled, path.join(root, 'route-status-fixture.cjs'))
const { RouteRepository, RouteService, initDatabase } = fixtureModule.exports
const db = new Database(':memory:')
try {
  initDatabase(db)
  db.prepare('INSERT INTO games (id, original_title) VALUES (?, ?)').run('game', 'Test')
  db.prepare('INSERT INTO games (id, original_title) VALUES (?, ?)').run('other', 'Other')
  const repo = new RouteRepository(db)
  const service = new RouteService(repo)
  const palette = ['#5d82d8', '#4f9b82', '#d77e9c', '#7b70c9', '#d99a4e', '#4f9bb8', '#c96f6f', '#8fa94e']
  let colorIndex = 0
  const route = (id, type, gameId = 'game') => ({
    id, gameId, type, name: id, description: null,
    color: palette[colorIndex++ % palette.length],
    lockCondition: null, status: 'NotStarted', playtime: 0
  })
  service.saveGameRoutes('game', [route('a', 'character'), route('b', 'character'),
    route('common', 'common'), route('chapter', 'chapter'), route('main', 'main')])
  service.saveGameRoutes('other', [route('other-route', 'character', 'other')])
  // 每条线路保存时都必须带自己的颜色。
  const colors = repo.getByGame('game').map(item => item.color)
  assert.equal(colors.every(color => /^#[0-9a-f]{6}$/i.test(color)), true)
  assert.equal(new Set(colors.map(color => color.toLowerCase())).size, colors.length)
  service.updateRouteStatus('other', 'other-route', 'Playing')
  const status = id => repo.getByGame('game').find(item => item.id === id).status
  service.updateRouteStatus('game', 'a', 'Playing')
  const staleDraft = repo.getByGame('game')
  service.updateRouteStatus('game', 'b', 'Playing')
  assert.equal(status('a'), 'OnHold')
  assert.equal(status('b'), 'Playing')
  service.saveGameRoutes('game', staleDraft)
  assert.equal(status('a'), 'OnHold')
  assert.equal(status('b'), 'Playing')
  for (const type of ['common', 'chapter', 'main']) {
    service.updateRouteStatus('game', type, 'Playing')
    service.updateRouteStatus('game', 'b', 'Playing')
    assert.equal(status(type), 'Completed')
  }
  assert.equal(repo.getByGame('other')[0].status, 'Playing')
  service.updateRouteStatus('game', 'b', 'Playing')
  assert.equal(status('b'), 'Playing')
  assert.throws(() => repo.updateStatus('game', 'missing', 'Playing'))
  assert.equal(status('b'), 'Playing')
  // Failure after settling the old route must roll back the entire handoff.
  db.exec(`CREATE TRIGGER reject_start BEFORE UPDATE OF status ON routes
    WHEN NEW.id = 'a' AND NEW.status = 'Playing'
    BEGIN SELECT RAISE(ABORT, 'test failure'); END`)
  assert.throws(() => service.updateRouteStatus('game', 'a', 'Playing'))
  assert.equal(status('b'), 'Playing')
  assert.equal(status('a'), 'OnHold')
  db.exec('DROP TRIGGER reject_start')
  const draft = repo.getByGame('game')
  draft.find(item => item.id === 'a').lockCondition = { mode: 'all', preRouteIds: ['b'], unlocked: false }
  service.saveGameRoutes('game', draft)
  assert.throws(() => service.updateRouteStatus('game', 'a', 'Playing'), /locked/)
  assert.equal(status('b'), 'Playing')
  assert.equal(repo.getByGame('game').filter(item => item.status === 'Playing').length, 1)
  service.updateRouteStatus('game', 'b', 'Completed')
  const staleLocked = repo.getByGame('game').map(item => ({ ...item, lockCondition: item.lockCondition ? { ...item.lockCondition, unlocked: false } : null }))
  service.updateRouteStatus('game', 'b', 'NotStarted')
  const unlocked = () => repo.getByGame('game').find(item => item.id === 'a').lockCondition.unlocked
  assert.equal(unlocked(), true)
  service.saveGameRoutes('game', staleLocked)
  assert.equal(unlocked(), true)
  service.saveGameRoutes('game', repo.getByGame('game'), ['a'])
  assert.equal(unlocked(), false)
  assert.throws(() => service.updateRouteStatus('game', 'a', 'Playing'), /locked/)
  service.updateRouteStatus('game', 'b', 'Completed')
  service.saveGameRoutes('game', repo.getByGame('game'), ['a'])
  assert.equal(unlocked(), true)
  assert.throws(() => service.saveGameRoutes('game', repo.getByGame('game'), ['other-route']))
  assert.throws(() => service.saveGameRoutes('game', repo.getByGame('game'), 'a'))
  service.updateRouteStatus('game', 'b', 'NotStarted')
  initDatabase(db)
  assert.equal(unlocked(), true)
  const invalidFormat = repo.getByGame('game')
  delete invalidFormat.find(item => item.id === 'a').lockCondition.unlocked
  assert.throws(() => service.saveGameRoutes('game', invalidFormat), /Invalid unlock state/)
  console.log('Passed: persistent unlock, stale JSON, manual reset, satisfied reset, invalid reset, strict JSON format, repeated startup')
  const extra = [route('pre1', 'character'), route('pre2', 'character'),
    { ...route('all-lock', 'character'), lockCondition: { mode: 'all', preRouteIds: ['pre1', 'pre2'], unlocked: true } },
    { ...route('any-lock', 'character'), lockCondition: { mode: 'any', preRouteIds: ['pre1', 'pre2'], unlocked: false } }]
  service.saveGameRoutes('game', [...repo.getByGame('game'), ...extra])
  const flag = id => repo.getByGame('game').find(item => item.id === id).lockCondition.unlocked
  assert.equal(flag('all-lock'), false) // A client cannot grant itself an unlock.
  db.exec(`CREATE TRIGGER reject_unlock BEFORE UPDATE OF lock_condition ON routes
    WHEN NEW.id = 'any-lock' AND json_extract(NEW.lock_condition, '$.unlocked') = 1
    BEGIN SELECT RAISE(ABORT, 'unlock failure'); END`)
  assert.throws(() => service.updateRouteStatus('game', 'pre1', 'Completed'))
  assert.equal(status('pre1'), 'NotStarted')
  assert.equal(flag('any-lock'), false)
  db.exec('DROP TRIGGER reject_unlock')
  service.updateRouteStatus('game', 'pre1', 'Completed')
  assert.equal(flag('any-lock'), true)
  assert.equal(flag('all-lock'), false)
  service.updateRouteStatus('game', 'pre2', 'Completed')
  assert.equal(flag('all-lock'), true)
  service.updateRouteStatus('game', 'pre1', 'NotStarted')
  assert.equal(flag('all-lock'), true)
  const withoutLock = repo.getByGame('game')
  withoutLock.find(item => item.id === 'all-lock').lockCondition = null
  service.saveGameRoutes('game', withoutLock)
  assert.equal(repo.getByGame('game').find(item => item.id === 'all-lock').lockCondition, null)
  console.log('Passed: all/any, forged unlock ignored, atomic unlock rollback, removing conditions')
  console.log('Passed: personal/main handoff, game isolation, stale drafts, same-route updates, rollback, locks')
} finally {
  db.close()
}
