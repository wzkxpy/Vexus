// src/main/providers/manager.ts
import { BangumiClient } from "./bangumi/client";
import { NewGame, GameCandidate } from "@/shared/types";
import { bangumiToNewGame, bangumiToSearchResult } from "./bangumi/mapper";
import { BangumiSubject } from "./bangumi/types";

const bangumiToken = process.env.VEXUS_BANGUMI_TOKEN as string;


export async function searchGames(source: string, keyword: string): Promise<GameCandidate[]> {
  if (source == 'bangumi') {
    const client = new BangumiClient(bangumiToken)
    const subjects = await client.searchGame(keyword)
    return subjects.map(bangumiToSearchResult)
  }
  throw new Error(`Unsupported source: ${source}`)
}

export async function fetchGame(source: string, subjectId: string): Promise<GameCandidate> {
  if (source == 'bangumi') {
    const client = new BangumiClient(bangumiToken)
    const subject = await client.getSubject(subjectId)
    // const characters = await client.getCharacters(subjectId)
    return bangumiToSearchResult(subject)
  }
  throw new Error(`Unsupported source: ${source}`)
}

export async function buildGameFromBangumi(subject: BangumiSubject): Promise<NewGame> {
  const client = new BangumiClient(bangumiToken)
  const characters = await client.getCharacters(subject.id.toString())
  return bangumiToNewGame(subject, characters)

  // throw new Error(`Unsupported source: ${source}`)
}



// 如果你愿意，我还能进一步帮你把 manager.ts 升级成：
// registerProvider('bangumi')
// registerProvider('vndb')
// 插件式架构，以后加数据源几乎零改动。