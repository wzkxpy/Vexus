// Run with system Node; the alias helpers are pure and the file service only uses shell on open.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const { buildSync } = require('esbuild')

const root = path.resolve(__dirname, '..')
const compiled = buildSync({
  stdin: { contents: `export { parseVoiceActorAliasMap, resolveVoiceActorName, normalizeVoiceActorNames } from './src/shared/utils/voiceActor';
    export { VoiceActorAliasService } from './src/main/services/voiceActorAlias';`, resolveDir: root },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['electron'],
  tsconfig: path.join(root, 'tsconfig.json')
}).outputFiles[0].text
const fixture = new Module(path.join(root, 'voice-actor-alias-fixture.cjs'), module)
fixture.paths = module.paths
fixture._compile(compiled, path.join(root, 'voice-actor-alias-fixture.cjs'))
const {
  parseVoiceActorAliasMap,
  resolveVoiceActorName,
  normalizeVoiceActorNames,
  VoiceActorAliasService
} = fixture.exports

const aliases = parseVoiceActorAliasMap({
  ' みる ': ' 小野涼子 ',
  '小野 涼子': '小野涼子'
})
assert.equal(aliases.get('みる'), '小野涼子')
assert.equal(resolveVoiceActorName('みる', aliases), '小野涼子')
assert.equal(resolveVoiceActorName(' みる ', aliases), '小野涼子')
assert.equal(resolveVoiceActorName('小野 涼子', aliases), '小野涼子')
assert.equal(resolveVoiceActorName('未知', aliases), '未知')

// 支持链式映射，并保证解析到终点、重复执行结果不变。
const chain = parseVoiceActorAliasMap({ A: 'B', B: 'C' })
assert.equal(resolveVoiceActorName('A', chain), 'C')
assert.equal(resolveVoiceActorName('B', chain), 'C')
assert.equal(resolveVoiceActorName('C', chain), 'C')

// 自身映射视为无映射。
const selfMap = parseVoiceActorAliasMap({ A: ' A ' })
assert.equal(selfMap.size, 0)
assert.equal(resolveVoiceActorName('A', selfMap), 'A')

assert.throws(() => parseVoiceActorAliasMap(null), /JSON 对象/)
assert.throws(() => parseVoiceActorAliasMap([]), /JSON 对象/)
assert.throws(() => parseVoiceActorAliasMap({ A: 1 }), /必须是字符串/)
assert.throws(() => parseVoiceActorAliasMap({ ' ': 'A' }), /空别名/)
assert.throws(() => parseVoiceActorAliasMap({ A: ' ' }), /不能为空/)
assert.throws(() => parseVoiceActorAliasMap({ A: 'B', B: 'A' }), /循环/)

const characters = [{ name: '角色', voiceActor: 'みる', avatarPath: 'avatar.webp' }]
const normalized = normalizeVoiceActorNames(characters, aliases)
assert.deepEqual(normalized, [{ name: '角色', voiceActor: '小野涼子', avatarPath: 'avatar.webp' }])
assert.notEqual(normalized, characters)
assert.equal(normalizeVoiceActorNames(normalized, aliases)[0].voiceActor, '小野涼子')

const untouched = [{ name: '角色', voiceActor: '未知' }]
assert.equal(normalizeVoiceActorNames(untouched, aliases), untouched)
assert.equal(normalizeVoiceActorNames(untouched, new Map()), untouched)

// 文件服务的创建、BOM、脏文件与空角色短路。
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vexus-voice-actor-alias-'))
try {
  const filePath = path.join(tempDir, 'voice-actor-aliases.json')
  const service = new VoiceActorAliasService(filePath)
  assert.deepEqual(service.normalizeCharacters([{ name: '角色', voiceActor: 'みる' }]), [{ name: '角色', voiceActor: 'みる' }])
  assert.equal(fs.existsSync(filePath), true)
  assert.equal(fs.readFileSync(filePath, 'utf8'), '{}\n')

  fs.writeFileSync(filePath, `\uFEFF${JSON.stringify({ 'みる': '小野涼子' })}`, 'utf8')
  assert.deepEqual(service.normalizeCharacters([{ name: '角色', voiceActor: 'みる' }]), [{ name: '角色', voiceActor: '小野涼子' }])

  fs.writeFileSync(filePath, '{', 'utf8')
  assert.throws(() => service.normalizeCharacters([{ voiceActor: 'みる' }]), /格式错误/)
  assert.deepEqual(service.normalizeCharacters([]), [])
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}

console.log('Passed: alias parsing, trimming, chains, cycles, validation, normalization, idempotency and file handling')