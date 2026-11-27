// 验证退出时“静默落库”和“正常停止通知”两种会话结束路径。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const electronStub = path.join(os.tmpdir(), `vexus-monitor-electron-${process.pid}.cjs`)
const logRoot = path.join(os.tmpdir(), `vexus-monitor-test-${process.pid}`)
fs.writeFileSync(electronStub, `
globalThis.__vexusMonitorWindows = []
exports.app = {
  isPackaged: false,
  getPath: () => ${JSON.stringify(logRoot)}
}
exports.BrowserWindow = {
  getAllWindows: () => globalThis.__vexusMonitorWindows
}
`)

try {
  const compiled = buildSync({
    stdin: {
      contents: `export { GameMonitor } from './src/main/services/monitor';`,
      resolveDir: root
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    alias: { electron: electronStub },
    tsconfig: path.join(root, 'tsconfig.json')
  }).outputFiles[0].text

  const fixture = new Module(path.join(root, 'session-quit-fixture.cjs'), module)
  fixture.paths = module.paths
  fixture._compile(compiled, path.join(root, 'session-quit-fixture.cjs'))
  const { GameMonitor } = fixture.exports

  const sessions = []
  const sessionService = { addSession: session => sessions.push(session) }
  const routeRepo = { belongsToGame: () => true }
  const uiCalls = []
  globalThis.__vexusMonitorWindows = [{
    isDestroyed: () => false,
    show: () => uiCalls.push('show'),
    focus: () => uiCalls.push('focus'),
    webContents: { send: channel => uiCalls.push(channel) }
  }]

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

  ;(async () => {
    const finalized = new GameMonitor('finalized', 1000, 'route-a', sessionService, routeRepo)
    finalized.start()
    assert.equal(finalized.isActive(), true)
    await wait(10)
    finalized.finalize()
    assert.equal(finalized.isActive(), false)
    assert.equal(sessions.length, 1)
    assert.equal(sessions[0].gameId, 'finalized')
    assert.equal(sessions[0].routeId, 'route-a')
    assert.equal(sessions[0].source, 'auto')
    assert.deepEqual(uiCalls, [], 'finalize 不应触发窗口通知')
    finalized.finalize()
    assert.equal(sessions.length, 1, 'finalize 应幂等')

    const stopped = new GameMonitor('stopped', 1001, null, sessionService, routeRepo)
    stopped.start()
    await wait(10)
    stopped.stop()
    assert.equal(sessions.length, 2)
    assert.deepEqual(uiCalls, ['show', 'focus', 'game:stopped'], 'stop 应通知一次')
    stopped.stop()
    assert.equal(sessions.length, 2, 'stop 应幂等')

    const deletedRoute = new GameMonitor('deleted', 1002, 'gone', sessionService, {
      belongsToGame: () => false
    })
    deletedRoute.start()
    await wait(10)
    deletedRoute.finalize()
    assert.equal(sessions[2].routeId, null, '线路被删除后应保留时长但清空归属')

    console.log('session quit checks passed')
  })().catch(error => {
    console.error(error)
    process.exitCode = 1
  }).finally(() => {
    fs.rmSync(logRoot, { recursive: true, force: true })
  })
} finally {
  fs.rmSync(electronStub, { force: true })
}