// src/main/providers/manager.ts
// import { ProxyAgent } from 'undici'
import { BangumiClient } from "./bangumi/client";
import { NewGame, GameCandidate } from "@/shared/types";
import { bangumiToNewGame, bangumiToSearchResult } from "./bangumi/mapper";
import { BangumiSubject } from "./bangumi/types";
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



// 如果你愿意，我还能进一步帮你把 manager.ts 升级成：
// registerProvider('bangumi')
// registerProvider('vndb')
// 插件式架构，以后加数据源几乎零改动。