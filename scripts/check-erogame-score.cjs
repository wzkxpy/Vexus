// Run with system Node; the ErogameScape HTML parser is pure and doesn't reach the network.
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const compiled = buildSync({
  stdin: {
    contents: `export { parseMedianScore } from './src/main/providers/erogame/client';`,
    resolveDir: root
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  tsconfig: path.join(root, 'tsconfig.json')
}).outputFiles[0].text

const fixture = new Module(path.join(root, 'erogame-score-fixture.cjs'), module)
fixture.paths = module.paths
fixture._compile(compiled, path.join(root, 'erogame-score-fixture.cjs'))

const { parseMedianScore } = fixture.exports

const standard = `
<table>
  <tr><th>median</th><th>count2</th></tr>
  <tr><td>82</td><td>1,234</td></tr>
</table>`
assert.equal(parseMedianScore(standard), 82)

const nestedHeader = `
<table>
  <tr><th><a href="game.php?game=1">median</a></th><th>count2</th></tr>
  <tr><td align="right">85.5</td><td>12</td></tr>
</table>`
assert.equal(parseMedianScore(nestedHeader), 85.5)

const noVotes = `
<table>
  <tr><td>median</td><td>count2</td></tr>
  <tr><td>0</td><td>0</td></tr>
</table>`
assert.equal(parseMedianScore(noVotes), undefined)

const noRows = `
<table>
  <tr><td>median</td><td>count2</td></tr>
</table>`
assert.equal(parseMedianScore(noRows), undefined)

assert.throws(
  () => parseMedianScore('<html><body>SQL error</body></html>'),
  /无法解析批评空间评分/
)

console.log('ErogameScape score parser checks passed')