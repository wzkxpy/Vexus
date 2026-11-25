// src/main/providers/manager.ts
import { BangumiClient } from './bangumi/client'
import type {
  GameCandidate,
  GameMetadataSection,
  NewGame,
  ProviderSectionResult,
  ProviderSource
} from '@/shared/types'
import {
  bangumiToBasicInfo,
  bangumiToCharacterDrafts,
  bangumiToDescription,
  bangumiToNewGame,
  bangumiToSearchResult,
  bangumiToStaff,
  bangumiToTags
} from './bangumi/mapper'
import { VndbApiError, VndbClient, VNDB_FIELDS } from './vndb/client'
import { normalizeVndbId } from '@/shared/utils/vndb'
import type { VndbVn } from './vndb/types'
import {
  vndbToBasicInfo,
  vndbToCharacterDrafts,
  vndbToDescription,
  vndbToNewGame,
  vndbToSearchResult,
  vndbToStaff,
  vndbToTags
} from './vndb/mapper'
import { getProxyAgent, getSetting } from '../settings'

function getBangumiToken() {
  const token = getSetting('bangumiToken')
  if (!token.trim()) {
    return undefined
  }
  return token
}

function createBangumiClient() {
  return new BangumiClient(getBangumiToken(), getProxyAgent())
}

function createVndbClient() {
  return new VndbClient(getProxyAgent())
}

function isProviderSource(value: string): value is ProviderSource {
  return value === 'bangumi' || value === 'vndb'
}

function requireSource(source: string): ProviderSource {
  if (!isProviderSource(source)) {
    throw new Error(`Unsupported source: ${source}`)
  }
  return source
}

// 按名称搜索游戏，返回候选列表
export async function searchGames(source: string, keyword: string): Promise<GameCandidate[]> {
  const provider = requireSource(source)
  const query = keyword.trim()
  if (!query) throw new Error('请输入搜索关键词')

  if (provider === 'bangumi') {
    const subjects = await createBangumiClient().searchGame(query)
    return subjects.map(bangumiToSearchResult)
  }

  try {
    const vns = await createVndbClient().searchVns(query)
    return vns.map(vndbToSearchResult)
  } catch (error) {
    throw mapVndbError(error)
  }
}

// 根据 ID 获取游戏，返回单个候选
export async function fetchGame(source: string, subjectId: string): Promise<GameCandidate> {
  const provider = requireSource(source)
  const id = subjectId.trim()
  if (!id) throw new Error('请输入数据源 ID')

  if (provider === 'bangumi') {
    if (!/^\d+$/.test(id)) {
      throw new Error('Bangumi ID 应为纯数字')
    }
    const subject = await createBangumiClient().getSubject(id)
    return bangumiToSearchResult(subject)
  }

  const normalizedId = normalizeVndbId(id)
  try {
    const vn = await createVndbClient().getVn(normalizedId, VNDB_FIELDS.search)
    if (!vn) throw new Error(`未找到 VNDB ID ${normalizedId} 对应的条目`)
    return vndbToSearchResult(vn)
  } catch (error) {
    throw mapVndbIdError(error)
  }
}

// 由主进程按 ID 重新拉取完整数据，渲染进程不再传递数据源原始对象。
export async function buildGame(source: string, sourceId: string): Promise<NewGame> {
  const provider = requireSource(source)
  const id = sourceId.trim()
  if (!id) throw new Error('缺少数据源 ID')

  if (provider === 'bangumi') {
    if (!/^\d+$/.test(id)) {
      throw new Error('Bangumi ID 应为纯数字')
    }
    const client = createBangumiClient()
    const [subject, characters] = await Promise.all([
      client.getSubject(id),
      client.getCharacters(id)
    ])
    return bangumiToNewGame(subject, characters)
  }

  const normalizedId = normalizeVndbId(id)
  try {
    const client = createVndbClient()
    const [vn, characterData] = await Promise.all([
      client.getVn(normalizedId, VNDB_FIELDS.details),
      client.getVn(normalizedId, VNDB_FIELDS.characters)
    ])
    if (!vn) throw new Error(`未找到 VNDB ID ${normalizedId} 对应的条目`)
    return vndbToNewGame(vn, characterData?.va ?? [])
  } catch (error) {
    throw mapVndbIdError(error)
  }
}

export async function fetchProviderSection(
  source: ProviderSource,
  sourceId: string,
  section: GameMetadataSection
): Promise<ProviderSectionResult> {
  if (source === 'bangumi') {
    return fetchBangumiSection(sourceId, section)
  }
  return fetchVndbSection(sourceId, section)
}

async function fetchBangumiSection(
  sourceId: string,
  section: GameMetadataSection
): Promise<ProviderSectionResult> {
  if (!/^\d+$/.test(sourceId)) {
    throw new Error('Bangumi ID 应为纯数字')
  }

  const client = createBangumiClient()
  try {
    if (section === 'characters') {
      const characters = await client.getCharacters(sourceId)
      return {
        section,
        source: 'bangumi',
        sourceId,
        value: bangumiToCharacterDrafts(characters)
      }
    }

    const subject = await client.getSubject(sourceId)
    switch (section) {
      case 'basicInfo':
        return { section, source: 'bangumi', sourceId, value: bangumiToBasicInfo(subject) }
      case 'staff':
        return { section, source: 'bangumi', sourceId, value: bangumiToStaff(subject) }
      case 'tags':
        return { section, source: 'bangumi', sourceId, value: bangumiToTags(subject) }
      case 'description':
        return { section, source: 'bangumi', sourceId, value: bangumiToDescription(subject) }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Bangumi API 错误 404')) {
      throw new Error(`未找到 Bangumi ID ${sourceId} 对应的条目`)
    }
    if (message.includes('Bangumi API 错误 401') || message.includes('Bangumi API 错误 403')) {
      throw new Error('Bangumi 认证失败，请检查访问 Token')
    }
    throw error
  }

  throw new Error('不支持的信息分区')
}

async function fetchVndbSection(
  sourceId: string,
  section: GameMetadataSection
): Promise<ProviderSectionResult> {
  const normalizedId = normalizeVndbId(sourceId)
  const client = createVndbClient()

  try {
    switch (section) {
      case 'basicInfo': {
        const vn = await getVndbVn(client, normalizedId, VNDB_FIELDS.basicInfo)
        return { section, source: 'vndb', sourceId: normalizedId, value: vndbToBasicInfo(vn) }
      }
      case 'staff': {
        const vn = await getVndbVn(client, normalizedId, VNDB_FIELDS.staff)
        return { section, source: 'vndb', sourceId: normalizedId, value: vndbToStaff(vn) }
      }
      case 'tags': {
        const vn = await getVndbVn(client, normalizedId, VNDB_FIELDS.tags)
        return { section, source: 'vndb', sourceId: normalizedId, value: vndbToTags(vn) }
      }
      case 'description': {
        const vn = await getVndbVn(client, normalizedId, VNDB_FIELDS.description)
        return { section, source: 'vndb', sourceId: normalizedId, value: vndbToDescription(vn) }
      }
      case 'characters': {
        const vn = await getVndbVn(client, normalizedId, VNDB_FIELDS.characters)
        return {
          section,
          source: 'vndb',
          sourceId: normalizedId,
          value: vndbToCharacterDrafts(vn.va ?? [], normalizedId)
        }
      }
    }
  } catch (error) {
    throw mapVndbIdError(error)
  }

  throw new Error('不支持的信息分区')
}

async function getVndbVn(client: VndbClient, sourceId: string, fields: string): Promise<VndbVn> {
  const vn = await client.getVn(sourceId, fields)
  if (!vn) throw new Error(`未找到 VNDB ID ${sourceId} 对应的条目`)
  return vn
}

function mapVndbIdError(error: unknown): Error {
  // 越界或不存在的 ID 会被 VNDB 以 400 拒绝，需要比通用参数错误更明确的提示。
  if (error instanceof VndbApiError && error.status === 400) {
    return new Error('VNDB ID 不存在或格式无效')
  }
  return mapVndbError(error)
}

function mapVndbError(error: unknown): Error {
  if (error instanceof VndbApiError) {
    if (error.status === 429) return new Error('VNDB 请求过于频繁，请稍后重试')
    if (error.status === 400) return new Error('VNDB 请求参数有误')
    if (error.status >= 500) return new Error('VNDB 服务暂时不可用，请稍后重试')
    return new Error(`VNDB API 错误 ${error.status}：${error.message}`)
  }
  if (error instanceof Error) {
    if (/(fetch failed|ECONN|ENOTFOUND|ETIMEDOUT|proxy)/i.test(error.message)) {
      return new Error('无法连接 VNDB，请检查网络或代理设置')
    }
    return error
  }
  return new Error('VNDB 请求失败，请稍后重试')
}
