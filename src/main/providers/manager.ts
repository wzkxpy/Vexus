// src/main/providers/manager.ts
// import { ProxyAgent } from 'undici'
import { BangumiClient } from "./bangumi/client";
import type { NewGame, GameCandidate, GameMetadataSection, ProviderSectionResult } from "@/shared/types";
import type { BangumiSubject } from "./bangumi/types";
import {
  bangumiToBasicInfo,
  bangumiToCharacterDrafts,
  bangumiToDescription,
  bangumiToNewGame,
  bangumiToSearchResult,
  bangumiToStaff,
  bangumiToTags
} from "./bangumi/mapper";
import { getSetting, getProxyAgent } from '../settings'

// const bangumiToken = process.env.VEXUS_BANGUMI_TOKEN as string;

function getBangumiToken() {
  const token = getSetting('bangumiToken')
  if (!token.trim()) {
   return undefined
  }
  // console.log('Using Bangumi token:', token)
  return token
}

// 按名称搜索游戏，返回候选列表
export async function searchGames(source: string, keyword: string): Promise<GameCandidate[]> {
  if (source == 'bangumi') {
    const client = new BangumiClient(getBangumiToken(), getProxyAgent())
    const subjects = await client.searchGame(keyword)
    return subjects.map(bangumiToSearchResult)
  }
  throw new Error(`Unsupported source: ${source}`)
}

// 根据 ID 获取游戏，返回单个候选
export async function fetchGame(source: string, subjectId: string): Promise<GameCandidate> {
  if (source == 'bangumi') {
    const client = new BangumiClient(getBangumiToken(), getProxyAgent())
    const subject = await client.getSubject(subjectId)
    // const characters = await client.getCharacters(subjectId)
    return bangumiToSearchResult(subject)
  }
  throw new Error(`Unsupported source: ${source}`)
}

// 
export async function buildGameFromBangumi(subject: BangumiSubject): Promise<NewGame> {
  const client = new BangumiClient(getBangumiToken(), getProxyAgent())
  const characters = await client.getCharacters(subject.id.toString())
  return bangumiToNewGame(subject, characters)

  // throw new Error(`Unsupported source: ${source}`)
}

export async function fetchBangumiSection(
  sourceId: string,
  section: GameMetadataSection
): Promise<ProviderSectionResult> {
  if (!/^\d+$/.test(sourceId)) {
    throw new Error('Bangumi ID 应为纯数字')
  }

  const client = new BangumiClient(getBangumiToken(), getProxyAgent())
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
}

