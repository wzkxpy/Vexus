// src/main/providers/bangumi/mapper.ts
import type { Game, NewGame, GameCandidate, CharacterDraft } from "@/shared/types"
import type { BangumiCharacter, BangumiSubject } from "./types"
import { randomUUID } from "crypto";
import { computeTitleSplit } from '@/shared/utils/title'

export function bangumiToBasicInfo(subject: BangumiSubject): Game['basicInfo'] {
  return {
    developer: getInfoboxValue(subject.infobox, '开发') || undefined,
    publisher: getInfoboxValue(subject.infobox, '发行') || undefined,
    releaseDate: subject.date || undefined,
  }
}

export function bangumiToStaff(subject: BangumiSubject): Game['staff'] {
  return {
    planner: getInfoboxValue(subject.infobox, '企画') || undefined,
    scenario: getInfoboxValue(subject.infobox, '剧本') || undefined,
    artist: getInfoboxValue(subject.infobox, '原画') || undefined,
    music: getInfoboxValue(subject.infobox, '音乐') || undefined,
  }
}

export function bangumiToTags(subject: BangumiSubject): string[] {
  return subject.tags?.map(tag => tag.name) || []
}

export function bangumiToDescription(subject: BangumiSubject): string | undefined {
  return subject.summary || undefined
}

export function bangumiToCharacterDrafts(characters: BangumiCharacter[]): CharacterDraft[] {
  return characters
    .filter(character => character.relation !== '客串')
    .map(character => ({
      name: character.name,
      voiceActor: character.actors?.[0]?.name || '未知',
      avatarUrl: character.images?.grid || undefined
    }))
}

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
    description: bangumiToDescription(subject),
    tags: bangumiToTags(subject),

    basicInfo: bangumiToBasicInfo(subject),

    externalScore: {
      bgm: subject.rating?.score || undefined,
    },

    externalIds: {
      bgmId: subject.id.toString(),
    },

    media: {
      coverUrl: subject.images?.large || undefined,
    },

    staff: bangumiToStaff(subject),

    characters: bangumiToCharacterDrafts(characters).map(character => ({
      uuid: randomUUID(),
      name: character.name,
      voiceActor: character.voiceActor,
      avatarUrl: character.avatarUrl
    })),

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