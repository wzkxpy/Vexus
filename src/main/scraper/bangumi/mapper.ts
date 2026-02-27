// src/main/services/bangumi/transform.ts
import { NewGame, CastItem } from "@/shared/types"
import { BangumiCharacter, BangumiSubject } from "./types"
import { randomUUID } from "crypto";


export function bangumiToNewGame(
  subject: BangumiSubject,
  characters: BangumiCharacter[]
  ): NewGame {
  return {
    id: randomUUID(),

    originalTitle: subject.name,
    localizedTitle: subject.name_cn || undefined,
    description: subject.summary,
    tags: subject.tags?.map((tag: any) => tag.name) || [],

    basicInfo: {
      developer: getInfoboxValue(subject.infobox, '开发') || undefined,
      publisher: getInfoboxValue(subject.infobox, '发行') || undefined,
      releaseDate: subject.date || undefined,
      estimatedTime: undefined,
      
      externalScore: {
        bgm: subject.rating?.score || undefined,
      },
    },

    externalIds: {
      bgmId: subject.id.toString(),
    },

    media: {
      coverPath: subject.images?.large || undefined,
    },

    staff: {
      planner: getInfoboxValue(subject.infobox, '企画') || undefined,
      scenario: getInfoboxValue(subject.infobox, '剧本') || undefined,
      artist: getInfoboxValue(subject.infobox, '原画') || undefined,
      music: getInfoboxValue(subject.infobox, '音乐') || undefined,
    },

    cast: characters
    // .filter(character => character.relation !== '客串')
    .map(c => ({
      character: c.name,
      voiceActor: c.actors?.[0]?.name || '未知'
    })) as CastItem[] || [],

    settings: {
      nsfw: subject.nsfw || false
    }
  }
}



function getInfoboxValue(
  infobox: { key: string; value: any }[] | undefined,
  targetKey: string
) {
  if (!infobox) return undefined

  return infobox.find(item => item.key === targetKey)?.value
}