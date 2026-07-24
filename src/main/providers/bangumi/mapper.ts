// src/main/providers/bangumi/mapper.ts
import type { NewGame, GameCandidate } from "@/shared/types"
import type { BangumiCharacter, BangumiSubject } from "./types"
import { randomUUID } from "crypto";
import { computeTitleSplit } from '@/shared/utils/title'

export function bangumiToNewGame(
  subject: BangumiSubject,
  characters: BangumiCharacter[]
  ): NewGame {
  const originalTitle = subject.name
  const localizedTitle = subject.name_cn || undefined

  return {
    id: randomUUID(),

    originalTitle,
    localizedTitle,
    titleSplit: computeTitleSplit(originalTitle, localizedTitle),
    description: subject.summary,
    tags: subject.tags?.map((tag: any) => tag.name) || [],

    basicInfo: {
      developer: getInfoboxValue(subject.infobox, '开发') || undefined,
      publisher: getInfoboxValue(subject.infobox, '发行') || undefined,
      releaseDate: subject.date || undefined,
      estimatedTime: undefined,
    },

    externalScore: {
      bgm: subject.rating?.score || undefined,
    },

    externalIds: {
      bgmId: subject.id.toString(),
    },

    media: {
      coverUrl: subject.images?.large || undefined,
    },

    staff: {
      planner: getInfoboxValue(subject.infobox, '企画') || undefined,
      scenario: getInfoboxValue(subject.infobox, '剧本') || undefined,
      artist: getInfoboxValue(subject.infobox, '原画') || undefined,
      music: getInfoboxValue(subject.infobox, '音乐') || undefined,
    },

    characters: characters
    .filter(character => character.relation !== '客串')
    .map(c => ({
      uuid: randomUUID(),
      name: c.name,
      voiceActor: c.actors?.[0]?.name || '未知',
      avatarUrl: c.images?.grid || undefined
    })) || [],

    settings: {
      nsfw: subject.nsfw || false
    }
  }
}

export function bangumiToSearchResult(
    subject: BangumiSubject
): GameCandidate {
  return {
    source: 'bangumi',
    sourceId: subject.id.toString(),

    originalTitle: subject.name,
    localizedTitle: subject.name_cn || undefined,
    coverUrl: subject.images?.large,
    releaseDate: subject.date,
    developer: getInfoboxValue(subject.infobox, '开发') || undefined,
    score: subject.rating?.score,

    raw: subject
  }
}

function getInfoboxValue(
  infobox: { key: string; value: any }[] | undefined,
  targetKey: string
) {
  if (!infobox) return undefined

  return infobox.find(item => item.key === targetKey)?.value
}