// src/main/providers/manager.ts
import { BangumiClient } from "./bangumi/client";
import { NewGame } from "@/shared/types";
import { bangumiToNewGame } from "./bangumi/mapper";

const bangumiToken = process.env.VEXUS_BANGUMI_TOKEN as string;



export async function fetchGameFromBangumi(subjectId: string): Promise<NewGame> {

  const client = new BangumiClient(bangumiToken)
  const subject = await client.getSubject(subjectId)
  const characters = await client.getCharacters(subjectId)

  return bangumiToNewGame(subject, characters)
}