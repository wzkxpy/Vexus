import type { Character, ExternalScore, Game } from './game'
import type { ProviderSource } from './search'

export const GAME_METADATA_SECTIONS = [
  'basicInfo',
  'staff',
  'tags',
  'description',
  'characters'
] as const

export type GameMetadataSection = typeof GAME_METADATA_SECTIONS[number]

export interface CharacterDraft extends Character {
  avatarUrl?: string
}

export interface GameMetadataSectionMap {
  basicInfo: Game['basicInfo']
  staff: Game['staff']
  tags: string[]
  description: string | undefined
  characters: CharacterDraft[]
}

export type ProviderSectionResult = {
  [Section in GameMetadataSection]: {
    section: Section
    source: ProviderSource
    sourceId: string
    value: GameMetadataSectionMap[Section]
  }
}[GameMetadataSection]

export type ExternalScoreKey = keyof ExternalScore

export interface ExternalScoreFetchError {
  key: ExternalScoreKey
  message: string
}

export interface ExternalScoreFetchResult {
  scores: ExternalScore
  errors: ExternalScoreFetchError[]
  skipped: ExternalScoreKey[]
}