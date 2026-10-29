// Run with system Node; no native modules or real user data are involved.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { buildSync } = require('esbuild')
const { createSSRApp } = require('vue')
const { renderToString } = require('vue/server-renderer')
const { createPinia } = require('pinia')

async function main() {
  const root = path.resolve(__dirname, '..')
  const filename = path.join(root, 'src/renderer/pages/Game/routes/RouteEditorModal.vue')
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
  const script = compileScript(descriptor, { id: 'route-editor-check' })
  const output = buildSync({
    stdin: { contents: script.content, loader: 'ts', resolveDir: path.dirname(filename) },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['vue', 'pinia'], tsconfig: path.join(root, 'tsconfig.json')
  }).outputFiles[0].text
  const compiled = new Module(filename, module)
  compiled.paths = module.paths
  compiled._compile(output, filename)
  const route = (id, status = 'NotStarted') => ({ id, gameId: 'g', name: id, type: 'character',
    order: 1, description: null, color: '', playtime: 0, status, lockCondition: null })
  const routes = [route('a', 'Completed'), route('b'), route('c')]
  routes.forEach((item, index) => { item.order = index + 1 })
  routes[2].lockCondition = { mode: 'all', preRouteIds: ['a', 'b'], unlocked: true }
  let editor
  const app = createSSRApp({ setup(_, context) {
    editor = compiled.exports.default.setup({ gameId: 'g', routes }, context)
    return () => null
  } })
  app.use(createPinia())
  await renderToString(app)
  const target = editor.draftRoutes.value[2]
  assert.equal(editor.canResetLock(target), true)
  target.lockCondition.mode = 'any'
  assert.equal(editor.canResetLock(target), false)
  target.lockCondition.mode = 'all'
  editor.resetLock(target)
  assert.equal(editor.canResetLock(target), false)
  editor.resetLock(target)
  assert.deepEqual(editor.resetLockIds.value, ['c'])
  editor.cleanPrerequisites()
  assert.deepEqual(editor.resetLockIds.value, ['c'])
  editor.moveRoute(1, 2)
  assert.deepEqual(target.lockCondition.preRouteIds, ['a'])
  assert.equal(editor.canResetLock(target), false)
  assert.deepEqual(editor.resetLockIds.value, [])
  assert.equal(target.lockCondition.unlocked, true)
  editor.moveRoute(0, 2)
  assert.equal(target.lockCondition, null)
  assert.equal(editor.errorMessage.value, '')
  assert.deepEqual(editor.draftRoutes.value.map(item => item.order), [1, 2, 3])
  assert.deepEqual(routes[2].lockCondition.preRouteIds, ['a', 'b'])
  console.log('Passed: reset visibility for all/any, reorder pruning, empty lock removal, pending reset cleanup, draft isolation')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
