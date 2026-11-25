// src/main/providers/bangumi/mapper.ts
import type { Game, NewGame, GameCandidate, CharacterDraft } from "@/shared/types"
import type { BangumiCharacter, BangumiSubject } from "./types"
import { randomUUID } from "crypto";
import { normalizeNameSpacing } from '@/shared/utils/name'
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

// 从 Bangumi「链接」infobox 中提取可精确对应的外部条目 ID。
export function bangumiToLinkedIds(subject: BangumiSubject): {
  vndbId?: string
  erogameId?: string
  steamId?: string
} {
  const links = getInfoboxValue(subject.infobox, '链接')
  return {
    vndbId: parseVndbLink(getLinkValue(links, 'vndb')),
    erogameId: parseErogameLink(getLinkValue(links, 'erogamescape')),
    steamId: parseSteamLink(getLinkValue(links, 'steam'))
  }
}

export function bangumiToCharacterDrafts(characters: BangumiCharacter[]): CharacterDraft[] {
  return characters
    .filter(character => character.relation !== '客串')
    .map(character => ({
      name: normalizeNameSpacing(character.name),
      voiceActor: normalizeNameSpacing(character.actors?.[0]?.name || '未知'),
      avatarUrl: character.images?.grid || undefined
    }))
}

export function bangumiToNewGame(
  subject: BangumiSubject,
  characters: BangumiCharacter[]
  ): NewGame {
  const originalTitle = subject.name
  const localizedTitle = subject.name_cn || undefined
  const linkedIds = bangumiToLinkedIds(subject)

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
      ...linkedIds
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
    score: subject.rating?.score
  }
}

function getInfoboxValue(
  infobox: { key: string; value: any }[] | undefined,
  targetKey: string
) {
  if (!infobox) return undefined

  return infobox.find(item => item.key === targetKey)?.value
}

function getLinkValue(links: unknown, targetKey: string): string | undefined {
  const entries = Array.isArray(links) ? links : [links]
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const link = entry as { k?: unknown; v?: unknown }
    if (typeof link.k !== 'string' || typeof link.v !== 'string') continue
    if (link.k.trim().toLowerCase() === targetKey) {
      return link.v.trim()
    }
  }
  return undefined
}

function parseVndbLink(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.hostname !== 'vndb.org' && url.hostname !== 'www.vndb.org') return undefined
    const match = /^\/v(\d+)\/?$/i.exec(url.pathname)
    return match ? `v${match[1]}` : undefined
  } catch {
    const match = /^v?(\d+)$/i.exec(value)
    return match ? `v${match[1]}` : undefined
  }
}

function parseErogameLink(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    const allowed =
      host === 'erogamescape.org' ||
      host === 'www.erogamescape.org' ||
      host === 'erogamescape.dyndns.org' ||
      host === 'erogamescape.ddo.jp'
    if (!allowed) return undefined
    const game = url.searchParams.get('game')?.trim()
    return game && /^\d+$/.test(game) ? game : undefined
  } catch {
    const match = /^\d+$/.exec(value)
    return match ? match[0] : undefined
  }
}

function parseSteamLink(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.hostname.toLowerCase() !== 'store.steampowered.com') return undefined
    const match = /^\/app\/(\d+)(?:\/|$)/i.exec(url.pathname)
    return match ? match[1] : undefined
  } catch {
    const match = /^\d+$/.exec(value)
    return match ? match[0] : undefined
  }
}