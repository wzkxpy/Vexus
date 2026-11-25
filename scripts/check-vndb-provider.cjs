// Run with system Node; the VNDB mapper and ID helper are pure and don't touch Electron/native modules.
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const compiled = buildSync({
  stdin: {
    contents: `
      export {
        vndbToBasicInfo,
        vndbToStaff,
        vndbToTags,
        vndbToDescription,
        vndbToCharacterDrafts,
        vndbToNewGame,
        vndbToSearchResult,
        vndbRatingToScore,
        normalizeReleased,
        minutesToEstimatedTime,
        stripVndbFormatting
      } from './src/main/providers/vndb/mapper';
      export { normalizeVndbId } from './src/shared/utils/vndb';
      export { mapWithConcurrency } from './src/main/utils/async';
      export { isTransientNetworkError } from './src/main/utils/network';
    `,
    resolveDir: root
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  tsconfig: path.join(root, 'tsconfig.json')
}).outputFiles[0].text

const fixture = new Module(path.join(root, 'vndb-provider-fixture.cjs'), module)
fixture.paths = module.paths
fixture._compile(compiled, path.join(root, 'vndb-provider-fixture.cjs'))

const {
  vndbToBasicInfo,
  vndbToStaff,
  vndbToTags,
  vndbToDescription,
  vndbToCharacterDrafts,
  vndbToNewGame,
  vndbToSearchResult,
  vndbRatingToScore,
  normalizeReleased,
  minutesToEstimatedTime,
  stripVndbFormatting,
  normalizeVndbId,
  mapWithConcurrency,
  isTransientNetworkError
} = fixture.exports

const vn = {
  id: 'v17',
  title: 'Ever17',
  alttitle: 'Ever17 -the out of infinity-',
  titles: [
    { lang: 'ja', title: 'Ever17 -the out of infinity-', main: true },
    { lang: 'zh-Hans', title: '时空轮回' }
  ],
  image: {
    url: 'https://t.vndb.org/cv/12/79412.jpg',
    thumbnail: 'https://t.vndb.org/cv.t/12/79412.jpg'
  },
  released: '2002-08-29',
  developers: [
    { id: 'p8', name: 'KID', original: 'キッド', type: 'co' },
    { id: 'p19579', name: 'SDR Project', original: null, type: 'co' },
    { id: 'p3', name: 'Test', original: 'テスト 会社', type: 'co' }
  ],
  rating: 84.5,
  length_minutes: 1984,
  description: 'A story.\n\n[spoiler]Hidden twist.[/spoiler]\n[From [url=http://en.wikipedia.org/wiki/Ever_17]Wikipedia[/url]]',
  tags: [
    { id: 'g19', name: 'Mystery', rating: 1.5, spoiler: 0, lie: false, category: 'cont' },
    { id: 'g2', name: 'Fantasy', rating: 2.7, spoiler: 0, lie: false, category: 'cont' },
    { id: 'g9', name: 'Identity Crisis', rating: 2.1, spoiler: 1, lie: false, category: 'cont' },
    { id: 'gX', name: 'Fake Tag', rating: 3, spoiler: 0, lie: true, category: 'cont' }
  ],
  staff: [
    { id: 's1', name: 'Nakazawa Takumi', original: '中澤 工', role: 'director' },
    { id: 's1', name: 'Nakazawa Takumi', original: '中澤 工', role: 'scenario' },
    { id: 's2', name: 'Uchikoshi Koutarou', original: '打越 鋼太郎', role: 'scenario' },
    { id: 's3', name: 'Abo Takeshi', original: '阿保 剛', role: 'music' },
    { id: 's4', name: 'Kawamura Toshie', original: '川村 敏江', role: 'art' },
    { id: 's5', name: 'Designer', original: null, role: 'chardesign' },
    { id: 's6', name: 'Takeshi Abo', original: null, role: 'music' }
  ],
  va: [
    {
      note: 'Re-release',
      staff: { id: 's10', name: 'New VA', original: '新 声優' },
      character: {
        id: 'c1',
        name: 'Sora',
        original: '茜ヶ崎 空',
        image: { url: 'https://t.vndb.org/ch/1.jpg' },
        vns: [{ id: 'v17', role: 'primary', spoiler: 0 }]
      }
    },
    {
      note: null,
      staff: { id: 's11', name: 'Old VA', original: '旧 声優' },
      character: {
        id: 'c1',
        name: 'Sora',
        original: '茜ヶ崎 空',
        image: { url: 'https://t.vndb.org/ch/1.jpg' },
        vns: [{ id: 'v17', role: 'primary', spoiler: 0 }]
      }
    },
    {
      note: null,
      staff: { id: 's12', name: 'Side VA', original: '脇 役' },
      character: {
        id: 'c2',
        name: 'Cameo',
        original: '客 串',
        image: null,
        vns: [{ id: 'v17', role: 'appears', spoiler: 0 }]
      }
    },
    {
      note: null,
      staff: { id: 's13', name: 'Side VA', original: '脇 役' },
      character: {
        id: 'c3',
        name: 'Side',
        original: '配 角',
        image: { url: 'https://t.vndb.org/ch/3.jpg' },
        vns: [{ id: 'v17', role: 'side', spoiler: 0 }]
      }
    },
    {
      note: null,
      staff: { id: 's14', name: 'Nakata Jouji', original: null },
      character: {
        id: 'c4',
        name: 'Kotomine Kirei',
        original: null,
        image: null,
        vns: [{ id: 'v17', role: 'side', spoiler: 0 }]
      }
    }
  ]
}

assert.equal(normalizeVndbId('17'), 'v17')
assert.equal(normalizeVndbId('v17'), 'v17')
assert.equal(normalizeVndbId(' V17 '), 'v17')
assert.throws(() => normalizeVndbId('abc'), /VNDB ID/)
assert.throws(() => normalizeVndbId('v'), /VNDB ID/)

assert.equal(vndbRatingToScore(84.5), 8.5)
assert.equal(vndbRatingToScore(76.8), 7.7)
assert.equal(vndbRatingToScore(null), undefined)

assert.equal(normalizeReleased('2002-08-29'), '2002-08-29')
assert.equal(normalizeReleased('2002-08'), '2002-08')
assert.equal(normalizeReleased('2002'), '2002')
assert.equal(normalizeReleased('TBA'), undefined)
assert.equal(normalizeReleased('unknown'), undefined)
assert.equal(normalizeReleased(null), undefined)

assert.equal(minutesToEstimatedTime(1984), '33h4m')
assert.equal(minutesToEstimatedTime(60), '1h')
assert.equal(minutesToEstimatedTime(59), '59m')
assert.equal(minutesToEstimatedTime(45), '45m')
assert.equal(minutesToEstimatedTime(61), '1h1m')
assert.equal(minutesToEstimatedTime(null), undefined)

const basicInfo = vndbToBasicInfo(vn)
assert.equal(basicInfo.developer, 'キッド、SDR Project、テスト会社')
assert.equal(basicInfo.publisher, undefined)
assert.equal(basicInfo.releaseDate, '2002-08-29')
assert.equal(basicInfo.estimatedTime, '33h4m')

const staff = vndbToStaff(vn)
assert.equal(staff.planner, '中澤工')
assert.equal(staff.scenario, '中澤工、打越鋼太郎')
assert.equal(staff.artist, '川村敏江、Designer')
assert.equal(staff.music, '阿保剛、Takeshi Abo')

assert.deepEqual(vndbToTags(vn), ['Fantasy', 'Mystery'])

const manyTags = {
  ...vn,
  tags: Array.from({ length: 25 }, (_, index) => ({
    id: `g${index}`,
    name: `Tag ${index}`,
    rating: 3 - index / 100,
    spoiler: 0,
    lie: false,
    category: 'cont'
  }))
}
const cappedTags = vndbToTags(manyTags)
assert.equal(cappedTags.length, 20)
assert.equal(cappedTags[0], 'Tag 0')
assert.equal(cappedTags[19], 'Tag 19')
assert.equal(vndbToDescription(vn), 'A story.\n\n[From Wikipedia]')
assert.equal(stripVndbFormatting('[b]Bold[/b] and [i]italic[/i]'), 'Bold and italic')
assert.equal(stripVndbFormatting('[quote]Quote[/quote]\n\n\n\nNext'), 'Quote\n\nNext')
assert.equal(stripVndbFormatting('[url=/v]List[/url]'), 'List')
assert.equal(stripVndbFormatting(null), undefined)

const characters = vndbToCharacterDrafts(vn.va, 'v17')
assert.equal(characters.length, 3)
assert.equal(characters[0].name, '茜ヶ崎空')
assert.equal(characters[0].voiceActor, '旧声優')
assert.equal(characters[0].avatarUrl, 'https://t.vndb.org/ch/1.jpg')
assert.equal(characters[1].name, '配角')
assert.equal(characters[1].voiceActor, '脇役')
assert.equal(characters[2].name, 'Kotomine Kirei')
assert.equal(characters[2].voiceActor, 'Nakata Jouji')

const noVnsCharacter = vndbToCharacterDrafts([
  {
    note: null,
    staff: { id: 's20', name: 'A', original: null },
    character: { id: 'c9', name: 'NoVns', original: null, image: null }
  }
], 'v17')
assert.equal(noVnsCharacter.length, 1)

const search = vndbToSearchResult(vn)
assert.equal(search.source, 'vndb')
assert.equal(search.sourceId, 'v17')
assert.equal(search.originalTitle, 'Ever17 -the out of infinity-')
assert.equal(search.localizedTitle, '时空轮回')
assert.equal(search.coverUrl, 'https://t.vndb.org/cv.t/12/79412.jpg')
assert.equal(search.releaseDate, '2002-08-29')
assert.equal(search.developer, 'キッド')
assert.equal(search.score, 8.5)

const englishDeveloper = vndbToSearchResult({
  ...vn,
  developers: [{ id: 'p9', name: 'SDR Project', original: null, type: 'co' }]
})
assert.equal(englishDeveloper.developer, 'SDR Project')

const noAlt = vndbToSearchResult({ ...vn, alttitle: null })
assert.equal(noAlt.originalTitle, 'Ever17')

const zhHant = vndbToSearchResult({
  ...vn,
  alttitle: null,
  titles: [{ lang: 'zh-Hant', title: '時空輪迴' }]
})
assert.equal(zhHant.localizedTitle, '時空輪迴')

const sameTitle = vndbToSearchResult({
  ...vn,
  alttitle: null,
  title: 'Same',
  titles: [{ lang: 'zh-Hans', title: 'Same' }]
})
assert.equal(sameTitle.localizedTitle, undefined)

const newGame = vndbToNewGame(vn, vn.va)
assert.match(newGame.id, /^[0-9a-f-]{36}$/)
assert.equal(newGame.externalIds.vndbId, 'v17')
assert.equal(newGame.externalScore.vndb, 8.5)
assert.equal(newGame.media.coverUrl, 'https://t.vndb.org/cv/12/79412.jpg')
assert.equal(newGame.settings.nsfw, false)
assert.equal(newGame.description, 'A story.\n\n[From Wikipedia]')
assert.deepEqual(newGame.tags, ['Fantasy', 'Mystery'])
assert.equal(newGame.characters.length, 3)
assert.match(newGame.characters[0].uuid, /^[0-9a-f-]{36}$/)
assert.equal(newGame.characters[0].voiceActor, '旧声優')
assert.equal(newGame.characters[2].name, 'Kotomine Kirei')

assert.equal(isTransientNetworkError(new TypeError('fetch failed')), true)
assert.equal(
  isTransientNetworkError(new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } })),
  true
)
assert.equal(isTransientNetworkError(new Error('Download failed: 404')), false)
assert.equal(isTransientNetworkError('fetch failed'), false)

;(async () => {
  let active = 0
  let maxActive = 0
  const values = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active++
    maxActive = Math.max(maxActive, active)
    await new Promise(resolve => setTimeout(resolve, 5))
    active--
    return value * 2
  })
  assert.deepEqual(values, [2, 4, 6, 8, 10])
  assert.ok(maxActive <= 2)

  let started = 0
  await assert.rejects(
    mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
      started++
      if (value === 2) throw new Error('boom')
      await new Promise(resolve => setTimeout(resolve, 5))
      return value
    }),
    /boom/
  )
  assert.ok(started <= 3)

  console.log('VNDB provider checks passed')
})().catch(error => {
  console.error(error)
  process.exit(1)
})