// src/main/scraper/manager.ts
import { BangumiClient } from "./bangumi/client";
import { NewGame } from "@/shared/types";
import { bangumiToNewGame } from "./bangumi/mapper";

// 临时直接使用全局变量存储 token
let bangumiToken: string = '6o1H3zRciYAqsERmtEDUP6lrcPnnsIV29xH9QaYp'



export async function fetchGameFromBangumi(subjectId: string): Promise<NewGame> {

  const client = new BangumiClient(bangumiToken)
  const subject = await client.getSubject(subjectId)
  const characters = await client.getCharacters(subjectId)

  return bangumiToNewGame(subject, characters)
}