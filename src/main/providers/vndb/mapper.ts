// src/main/providers/vndb/mapper.ts
import { randomUUID } from 'crypto'
import type { CharacterDraft, Game, GameCandidate, NewGame } from '@/shared/types'
import { normalizeNameSpacing } from '@/shared/utils/name'
import { computeTitleSplit } from '@/shared/utils/title'
import type { VndbStaff, VndbVa, VndbVn } from './types'

export function vndbToBasicInfo(vn: VndbVn): Game['basicInfo'] {
  return {
    developer: joinStaffNames((vn.developers ?? []).map(developer => developer.original || developer.name)),
    releaseDate: normalizeReleased(vn.released),
    estimatedTime: minutesToEstimatedTime(vn.length_minutes)
  }
}

export function vndbToStaff(vn: VndbVn): Game['staff'] {
  const staff = vn.staff ?? []
  return {
    planner: joinStaffByRole(staff, ['director']),
    scenario: joinStaffByRole(staff, ['scenario']),
    artist: joinStaffByRole(staff, ['art', 'chardesign']),
    music: joinStaffByRole(staff, ['music'])
  }
}

// VNDB 直接标签可能超过 100 个，按评分保留最能概括作品的前若干个。
const MAX_IMPORTED_TAGS = 20

export function vndbToTags(vn: VndbVn): string[] {
  return (vn.tags ?? [])
    .filter(tag => !tag.lie && tag.spoiler === 0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_IMPORTED_TAGS)
    .map(tag => tag.name)
}

export function vndbToDescription(vn: VndbVn): string | undefined {
  return stripVndbFormatting(vn.description)
}

export function vndbToCharacterDrafts(va: VndbVa[], vnId: string): CharacterDraft[] {
  // 同一角色可能因版本或声优不同重复出现，只保留一条关系。
  const byCharacter = new Map<string, VndbVa>()
  for (const relation of va) {
    const character = relation.character
    if (!character?.id) continue
    const current = byCharacter.get(character.id)
    if (!current) {
      byCharacter.set(character.id, relation)
      continue
    }
    if ((current.note ?? null) !== null && (relation.note ?? null) === null) {
      byCharacter.set(character.id, relation)
    }
  }

  const drafts: CharacterDraft[] = []
  for (const relation of byCharacter.values()) {
    const character = relation.character
    const roles = character.vns
      ?.filter(vn => vn.id === vnId)
      .map(vn => vn.role)
    if (roles && roles.length > 0 && roles.every(role => role === 'appears')) continue

    drafts.push({
      name: normalizeNameSpacing(character.original?.trim() || character.name),
      voiceActor: normalizeNameSpacing(relation.staff?.original?.trim() || relation.staff?.name || '未知'),
      avatarUrl: character.image?.url || undefined
    })
  }
  return drafts
}

export function vndbToNewGame(vn: VndbVn, va: VndbVa[]): NewGame {
  const { originalTitle, localizedTitle } = getVndbTitles(vn)
  const characters = vndbToCharacterDrafts(va, vn.id)

  return {
    id: randomUUID(),
    originalTitle,
    localizedTitle,
    titleSplit: computeTitleSplit(originalTitle, localizedTitle),
    description: vndbToDescription(vn),
    tags: vndbToTags(vn),
    basicInfo: vndbToBasicInfo(vn),
    externalScore: {
      vndb: vndbRatingToScore(vn.rating)
    },
    externalIds: {
      vndbId: vn.id
    },
    media: {
      coverUrl: vn.image?.url || undefined
    },
    staff: vndbToStaff(vn),
    characters: characters.map(character => ({
      uuid: randomUUID(),
      name: character.name,
      voiceActor: character.voiceActor,
      avatarUrl: character.avatarUrl
    })),
    settings: {
      nsfw: false
    }
  }
}

export function vndbToSearchResult(vn: VndbVn): GameCandidate {
  const { originalTitle, localizedTitle } = getVndbTitles(vn)
  const developer = vn.developers?.[0]

  return {
    source: 'vndb',
    sourceId: vn.id,
    originalTitle,
    localizedTitle,
    coverUrl: vn.image?.thumbnail || vn.image?.url || undefined,
    releaseDate: normalizeReleased(vn.released),
    developer: developer ? normalizeNameSpacing(developer.original?.trim() || developer.name) : undefined,
    score: vndbRatingToScore(vn.rating)
  }
}

export function vndbRatingToScore(rating?: number | null): number | undefined {
  if (rating == null || !Number.isFinite(rating)) return undefined
  return Math.round(rating) / 10
}

export function normalizeReleased(released?: string | null): string | undefined {
  if (!released) return undefined
  const value = released.trim()
  return /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(value) ? value : undefined
}

export function minutesToEstimatedTime(minutes?: number | null): string | undefined {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return undefined
  const total = Math.round(minutes)
  if (total <= 0) return undefined
  if (total < 60) return `${total}m`

  const hours = Math.floor(total / 60)
  const remainingMinutes = total % 60
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h${remainingMinutes}m`
}

export function stripVndbFormatting(text?: string | null): string | undefined {
  if (!text) return undefined

  let result = text.replace(/\[spoiler\][\s\S]*?\[\/spoiler\]/gi, '')
  result = result.replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, '$1')
  result = result.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '$1')
  // VNDB 只支持固定几种格式标签，避免误删 “[From ...]” 之类正文括号。
  result = result.replace(/\[\/?(?:b|i|u|s|quote|raw|code|spoiler|url)(?:=[^\]]*)?\]/gi, '')
  result = result.replace(/\n{3,}/g, '\n\n').trim()

  return result || undefined
}

function getVndbTitles(vn: VndbVn) {
  const originalTitle = (vn.alttitle?.trim() || vn.title).trim()
  const zhTitle = vn.titles?.find(title => title.lang === 'zh-Hans')?.title
    ?? vn.titles?.find(title => title.lang === 'zh-Hant')?.title
  const localizedTitle = zhTitle?.trim()

  return {
    originalTitle,
    localizedTitle: localizedTitle && localizedTitle !== originalTitle ? localizedTitle : undefined
  }
}

function joinStaffByRole(staff: VndbStaff[], roles: string[]): string | undefined {
  const seen = new Set<string>()
  const names: string[] = []

  for (const member of staff) {
    if (!roles.includes(member.role)) continue
    const key = member.id || member.name
    if (seen.has(key)) continue
    seen.add(key)
    const name = normalizeNameSpacing(member.original?.trim() || member.name)
    if (name) names.push(name)
  }

  return names.length > 0 ? names.join('、') : undefined
}

function joinStaffNames(names: Array<string | null | undefined>): string | undefined {
  const seen = new Set<string>()
  const values: string[] = []

  for (const name of names) {
    if (!name?.trim()) continue
    const value = normalizeNameSpacing(name)
    if (!value || seen.has(value)) continue
    seen.add(value)
    values.push(value)
  }

  return values.length > 0 ? values.join('、') : undefined
}