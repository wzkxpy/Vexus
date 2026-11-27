// 验证主进程的单游戏启动兜底，包括并发启动请求。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vexus-launch-guard-'))
const electronStub = path.join(tempRoot, 'electron.cjs')
const childProcessStub = path.join(tempRoot, 'child-process.cjs')
const logRoot = path.join(tempRoot, 'logs')

fs.writeFileSync(electronStub, `
globalThis.__vexusMonitorWindows = []
exports.app = {
  isPackaged: false,
  getPath: () => ${JSON.stringify(logRoot)}
}
exports.BrowserWindow = {
  getAllWindows: () => globalThis.__vexusMonitorWindows
}
exports.shell = {
  openPath: async () => ''
}
`)

fs.writeFileSync(childProcessStub, `
const { EventEmitter } = require('node:events')
globalThis.__vexusSpawnCount = 0
exports.spawn = () => {
  globalThis.__vexusSpawnCount += 1
  const child = new EventEmitter()
  child.pid = 424242
  child.unref = () => {}
  setImmediate(() => child.emit('spawn'))
  return child
}
exports.execFile = () => {}
`)

const originalKill = process.kill
process.kill = () => true

try {
  const compiled = buildSync({
    stdin: {
      contents: `export { launchGame, quitActiveGame, isGameRunning } from './src/main/services/launch';
        export { container } from './src/main/container';`,
      resolveDir: root
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    alias: {
      electron: electronStub,
      child_process: childProcessStub
    },
    tsconfig: path.join(root, 'tsconfig.json')
  }).outputFiles[0].text

  const fixture = new Module(path.join(root, 'launch-guard-fixture.cjs'), module)
  fixture.paths = module.paths
  fixture._compile(compiled, path.join(root, 'launch-guard-fixture.cjs'))
  const { launchGame, quitActiveGame, isGameRunning, container } = fixture.exports

  const sessions = []
  container.register('sessionService', { addSession: session => sessions.push(session) })
  container.register('routeRepo', {
    getPlayingRouteId: () => null,
    belongsToGame: () => true
  })

  ;(async () => {
    const first = await launchGame('game-a', process.execPath)
    assert.equal(first.success, true)
    assert.equal(first.pid, 424242)
    assert.equal(isGameRunning(), true)
    assert.equal(isGameRunning('game-a'), true)
    assert.equal(isGameRunning('game-b'), false)
    assert.equal(globalThis.__vexusSpawnCount, 1)

    await assert.rejects(
      () => launchGame('game-b', process.execPath),
      /已有游戏在运行中/
    )
    assert.equal(globalThis.__vexusSpawnCount, 1, '运行中不应再 spawn')

    await quitActiveGame()
    assert.equal(isGameRunning(), false)
    assert.equal(isGameRunning('game-a'), false)
    assert.equal(sessions.length, 1)

    const results = await Promise.allSettled([
      launchGame('game-c', process.execPath),
      launchGame('game-d', process.execPath)
    ])
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal(results.filter(result => result.status === 'rejected').length, 1)
    assert.equal(globalThis.__vexusSpawnCount, 2, '并发启动只应 spawn 一次')

    await quitActiveGame()
    assert.equal(sessions.length, 2)

    await launchGame('game-e', process.execPath)
    await quitActiveGame()
    assert.equal(sessions.length, 3)

    console.log('launch guard checks passed')
  })().catch(error => {
    console.error(error)
    process.exitCode = 1
  }).finally(() => {
    process.kill = originalKill
    fs.rmSync(tempRoot, { recursive: true, force: true })
  })
} catch (error) {
  process.kill = originalKill
  fs.rmSync(tempRoot, { recursive: true, force: true })
  throw error
}