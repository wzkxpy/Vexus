// Run with system Node; the Bangumi mapper and link parsing are pure and don't touch Electron/native modules.
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const compiled = buildSync({
  stdin: {
    contents: `export { bangumiToBasicInfo, bangumiToLinkedIds, bangumiToNewGame } from './src/main/providers/bangumi/mapper';`,
    resolveDir: root
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  tsconfig: path.join(root, 'tsconfig.json')
}).outputFiles[0].text

const fixture = new Module(path.join(root, 'bangumi-links-fixture.cjs'), module)
fixture.paths = module.paths
fixture._compile(compiled, path.join(root, 'bangumi-links-fixture.cjs'))

const { bangumiToBasicInfo, bangumiToLinkedIds, bangumiToNewGame } = fixture.exports

const baseSubject = {
  id: 123456,
  name: '测试游戏',
  name_cn: '',
  summary: '',
  date: '2024-01-01',
  images: { large: 'https://example.com/cover.jpg' },
  tags: [],
  rating: { score: 8.1 },
  nsfw: false,
  infobox: []
}

const subject = {
  ...baseSubject,
  infobox: [
    {
      key: '链接',
      value: [
        {
          k: 'ErogameScape',
          v: 'https://erogamescape.org/~ap2/ero/toukei_kaiseki/game.php?game=35435'
        },
        { k: 'VNDB', v: 'https://vndb.org/v47937' },
        { k: 'Steam', v: 'https://store.steampowered.com/app/488392/' },
        { k: 'Getchu', v: 'http://www.getchu.com/soft.phtml?id=1343226' }
      ]
    }
  ]
}

const linked = bangumiToLinkedIds(subject)
assert.equal(linked.vndbId, 'v47937')
assert.equal(linked.erogameId, '35435')
assert.equal(linked.steamId, '488392')

const basicInfo = bangumiToBasicInfo({
  ...baseSubject,
  infobox: [
    { key: '游戏开发商', value: [{ v: 'ゆずソフト' }, { v: 'NekoNyan' }] },
    { key: '发行', value: 'ゆずソフト' }
  ]
})
assert.equal(basicInfo.developer, 'ゆずソフト、NekoNyan')
assert.equal(basicInfo.publisher, 'ゆずソフト')
assert.equal(
  bangumiToBasicInfo({ ...baseSubject, infobox: [{ key: '开发', value: 'Key' }] }).developer,
  'Key'
)

const game = bangumiToNewGame(subject, [])
assert.equal(game.externalIds.bgmId, '123456')
assert.equal(game.externalIds.vndbId, 'v47937')
assert.equal(game.externalIds.erogameId, '35435')
assert.equal(game.externalIds.steamId, '488392')

const variants = bangumiToLinkedIds({
  ...baseSubject,
  infobox: [
    {
      key: '链接',
      value: [
        {
          k: 'ErogameScape',
          v: 'http://erogamescape.dyndns.org/~ap2/ero/toukei_kaiseki/game.php?game=31547'
        },
        { k: 'vndb', v: 'https://vndb.org/v20264/' },
        {
          k: 'Steam',
          v: 'https://store.steampowered.com/app/1230140/ATRI_My_Dear_Moments/'
        }
      ]
    }
  ]
})
assert.equal(variants.vndbId, 'v20264')
assert.equal(variants.erogameId, '31547')
assert.equal(variants.steamId, '1230140')

const bareIds = bangumiToLinkedIds({
  ...baseSubject,
  infobox: [{
    key: '链接',
    value: [
      { k: 'VNDB', v: 'v9069' },
      { k: 'ErogameScape', v: '4199' },
      { k: 'Steam', v: '983150' }
    ]
  }]
})
assert.equal(bareIds.vndbId, 'v9069')
assert.equal(bareIds.erogameId, '4199')
assert.equal(bareIds.steamId, '983150')

const singleLink = bangumiToLinkedIds({
  ...baseSubject,
  infobox: [{ key: '链接', value: { k: 'VNDB', v: 'https://vndb.org/v1' } }]
})
assert.equal(singleLink.vndbId, 'v1')
assert.equal(singleLink.erogameId, undefined)

const invalidLinks = bangumiToLinkedIds({
  ...baseSubject,
  infobox: [
    {
      key: '链接',
      value: [
        { k: 'VNDB', v: 'https://vndb.org/r123' },
        { k: 'ErogameScape', v: 'https://erogamescape.org/game.php?game=abc' },
        { k: 'Steam', v: 'https://store.steampowered.com/developer/example/' }
      ]
    }
  ]
})
assert.equal(invalidLinks.vndbId, undefined)
assert.equal(invalidLinks.erogameId, undefined)
assert.equal(invalidLinks.steamId, undefined)

const noLinks = bangumiToLinkedIds(baseSubject)
assert.equal(noLinks.vndbId, undefined)
assert.equal(noLinks.erogameId, undefined)
assert.equal(noLinks.steamId, undefined)

console.log('Passed: Bangumi basic info and linked VNDB, ErogameScape and Steam ID extraction')