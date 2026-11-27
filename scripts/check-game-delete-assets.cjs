// 验证删除游戏时的媒体目录和线路树文件清理，以及路径逃逸防护。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vexus-delete-assets-'))
const userData = path.join(tempRoot, 'userData')
const electronStub = path.join(tempRoot, 'electron.cjs')
const sharpStub = path.join(tempRoot, 'sharp.cjs')

fs.writeFileSync(electronStub, `
exports.app = {
  isPackaged: false,
  getPath: () => ${JSON.stringify(userData)}
}
`)
fs.writeFileSync(sharpStub, 'module.exports = {}\n')

try {
  const compiled = buildSync({
    stdin: {
      contents: `export { MediaService } from './src/main/services/media';
        export { RouteTreeFileStore } from './src/main/services/routeTreeFile';`,
      resolveDir: root
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    alias: {
      electron: electronStub,
      sharp: sharpStub
    },
    tsconfig: path.join(root, 'tsconfig.json')
  }).outputFiles[0].text

  const fixture = new Module(path.join(root, 'game-delete-assets-fixture.cjs'), module)
  fixture.paths = module.paths
  fixture._compile(compiled, path.join(root, 'game-delete-assets-fixture.cjs'))
  const { MediaService, RouteTreeFileStore } = fixture.exports

  const mediaDir = path.join(userData, 'media')
  const gameA = path.join(mediaDir, 'game-a')
  const gameB = path.join(mediaDir, 'game-b')
  fs.mkdirSync(path.join(gameA, 'temp'), { recursive: true })
  fs.writeFileSync(path.join(gameA, 'cover.webp'), 'cover')
  fs.writeFileSync(path.join(gameA, 'temp', 'avatar.webp'), 'avatar')
  fs.mkdirSync(gameB, { recursive: true })
  fs.writeFileSync(path.join(gameB, 'cover.webp'), 'other')

  const media = new MediaService(() => undefined)
  media.deleteGameMedia('game-a')
  assert.equal(fs.existsSync(gameA), false, '应删除游戏媒体目录')
  assert.equal(fs.existsSync(gameB), true, '不应影响其他游戏媒体')
  media.deleteGameMedia('game-a')
  assert.throws(() => media.deleteGameMedia('..'), /Invalid game id/)
  assert.throws(() => media.deleteGameMedia('other/game'), /Invalid game id/)

  const treeDir = path.join(userData, 'route-trees')
  fs.mkdirSync(treeDir, { recursive: true })
  fs.writeFileSync(path.join(treeDir, 'game-a.json'), '{}')
  fs.writeFileSync(path.join(treeDir, 'game-a.json.tmp'), '{}')
  fs.writeFileSync(path.join(treeDir, 'game-b.json'), '{}')

  const trees = new RouteTreeFileStore(treeDir)
  trees.remove('game-a')
  assert.equal(fs.existsSync(path.join(treeDir, 'game-a.json')), false, '应删除线路树文件')
  assert.equal(fs.existsSync(path.join(treeDir, 'game-a.json.tmp')), false, '应删除线路树临时文件')
  assert.equal(fs.existsSync(path.join(treeDir, 'game-b.json')), true, '不应影响其他线路树')
  trees.remove('game-a')

  console.log('game delete asset checks passed')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}