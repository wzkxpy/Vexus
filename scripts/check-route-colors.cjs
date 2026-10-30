// Run with system Node; the color helpers are pure.
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const compiled = buildSync({
  stdin: { contents: `export { ROUTE_COLOR_PALETTE, DEFAULT_ROUTE_COLOR, isRouteColor, getRouteColor, nextRouteColor } from './src/shared/routeColors';`, resolveDir: root },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  tsconfig: path.join(root, 'tsconfig.json')
}).outputFiles[0].text
const fixture = new Module(path.join(root, 'route-color-fixture.cjs'), module)
fixture.paths = module.paths
fixture._compile(compiled, path.join(root, 'route-color-fixture.cjs'))
const { ROUTE_COLOR_PALETTE, DEFAULT_ROUTE_COLOR, isRouteColor, getRouteColor, nextRouteColor } = fixture.exports

const valid = color => /^#[0-9a-f]{6}$/i.test(color)
assert.equal(isRouteColor('#5D82D8'), true)
assert.equal(isRouteColor('red'), false)
assert.equal(isRouteColor(''), false)
assert.equal(getRouteColor({ color: '#123abc' }), '#123abc')
assert.equal(getRouteColor({ color: '' }), DEFAULT_ROUTE_COLOR)
assert.equal(getRouteColor({ color: 'red' }), DEFAULT_ROUTE_COLOR)

// 默认颜色按调色板分配，互不重复；超出调色板后继续生成唯一的颜色。
assert.equal(nextRouteColor([]), ROUTE_COLOR_PALETTE[0])
assert.equal(nextRouteColor([ROUTE_COLOR_PALETTE[0]]), ROUTE_COLOR_PALETTE[1])
const used = []
for (let index = 0; index < ROUTE_COLOR_PALETTE.length + 8; index++) {
  const color = nextRouteColor(used)
  assert.equal(valid(color), true)
  assert.equal(used.includes(color.toLowerCase()), false)
  used.push(color.toLowerCase())
}
assert.equal(new Set(used).size, used.length)
assert.equal(ROUTE_COLOR_PALETTE.every(valid), true)
console.log('Passed: per-route palette assignment, unique overflow colors, color validation/fallback')
