// Run with system Node; verifies the overview renders route points and visible fork points.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { buildSync } = require('esbuild')
const { createSSRApp } = require('vue')
const { renderToString } = require('vue/server-renderer')
const { createPinia } = require('pinia')

global.window = { innerHeight: 800, innerWidth: 1200, addEventListener() {}, removeEventListener() {} }
global.document = { createElement: () => ({ getContext: () => null }), addEventListener() {}, removeEventListener() {} }
global.getComputedStyle = () => ({ fontFamily: 'sans-serif' })

async function main() {
  const root = path.resolve(__dirname, '..')
  const filename = path.join(root, 'src/renderer/pages/Game/routes/RouteTree.vue')
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
  const script = compileScript(descriptor, { id: 'route-tree-view-check', inlineTemplate: true })
  const output = buildSync({
    stdin: { contents: script.content, loader: 'ts', resolveDir: path.dirname(filename) },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['vue', 'pinia'], tsconfig: path.join(root, 'tsconfig.json')
  }).outputFiles[0].text
  const compiled = new Module(filename, module)
  compiled.paths = module.paths
  compiled._compile(output, filename)

  const route = (id, status = 'NotStarted') => ({ id, gameId: 'g', name: id, description: null, color: '#5d82d8',
    type: 'character', lockCondition: null, status, playtime: 0 })
  const routes = [route('a'), route('b'), route('c'), route('d'), route('unplaced-route')]
  const tree = {
    version: 4,
    roots: [
      {
        id: 'n-a', type: 'route', routeId: 'a', x: 24, y: 24,
        children: [{
          id: 'n-f', type: 'fork', routeId: null, x: 200, y: 40,
          children: [
            { id: 'n-b', type: 'route', routeId: 'b', x: 420, y: 40, children: [] },
            { id: 'n-c', type: 'route', routeId: 'c', x: 200, y: 180, children: [] }
          ]
        }]
      },
      { id: 'n-d', type: 'route', routeId: 'd', x: 24, y: 300, children: [] }
    ]
  }
  const app = createSSRApp(compiled.exports.default, { routes, tree })
  app.use(createPinia())
  const html = await renderToString(app)
  assert.match(html, /class="route-fork"/)
  assert.doesNotMatch(html, /unplaced-route/)
  assert.equal((html.match(/class="route-node type-character"/g) || []).length, 4)
  assert.match(html, /<path d="M /)
  console.log('Passed: overview renders multiple roots, fork points, child edges, and hides unplaced routes')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
