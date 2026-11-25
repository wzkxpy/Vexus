// src/main/services/game.service.ts
import { GameRepository } from './game.repo'
import { GAME_METADATA_SECTIONS } from '@/shared/types'
import type {
  CharacterDraft,
  ExternalScoreFetchResult,
  Game,
  GameMetadataSection,
  NewGame,
  ProviderSource
} from '@/shared/types'
import { MediaService } from '../services/media'
import { VoiceActorAliasService } from '../services/voiceActorAlias'
import { fetchGameScores, fetchProviderSection } from '../providers/manager'


export class GameService {
  constructor(
    private repo: GameRepository,
    private mediaService: MediaService,
    private voiceActorAliases: VoiceActorAliasService
  ) {}

  // private mediaBaseDir = path.join(app.getPath('userData'), 'media')

  async addGame(newGame: NewGame): Promise<string> {
    const { id, media, characters } = newGame;
    const normalizedCharacters = characters
      ? this.voiceActorAliases.normalizeCharacters(characters)
      : characters
    await this.mediaService.initMedia(id, media, normalizedCharacters);
    return this.repo.add({ ...newGame, characters: normalizedCharacters });
  }

  
  deleteGame(id: string): boolean {
    // deleteFile(path.join(this.mediaService.mediaBaseDir, id))
    return this.repo.delete(id)
  }

  // 全量更新
  updateGame(game: Game) {
    this.repo.update(game)
  }

  async fetchMetadataSection(
    gameId: string,
    section: GameMetadataSection,
    source: ProviderSource
  ) {
    if (!GAME_METADATA_SECTIONS.includes(section)) {
      throw new Error('不支持的信息分区')
    }
    if (source !== 'bangumi' && source !== 'vndb') {
      throw new Error('不支持的数据源')
    }

    const game = this.repo.get(gameId)
    if (!game) throw new Error('Game not found')

    const sourceId = source === 'bangumi' ? game.externalIds.bgmId : game.externalIds.vndbId
    if (!sourceId) {
      throw new Error(`未设置 ${source === 'bangumi' ? 'Bangumi' : 'VNDB'} ID，请先编辑数据源 ID`)
    }
    const result = await fetchProviderSection(source, sourceId, section)
    if (result.section === 'characters') {
      return { ...result, value: this.voiceActorAliases.normalizeCharacters(result.value) }
    }
    return result
  }

  async fetchExternalScores(gameId: string): Promise<ExternalScoreFetchResult> {
    const game = this.repo.get(gameId)
    if (!game) throw new Error('Game not found')
    return fetchGameScores(game.externalIds)
  }

  async updateCharacters(gameId: string, characters: CharacterDraft[]): Promise<Game> {
    const game = this.repo.get(gameId)
    if (!game) throw new Error('Game not found')
    if (!Array.isArray(characters)) throw new Error('无效的角色数据')

    const currentAvatarPaths = new Set(
      (game.characters ?? [])
        .map(character => character.avatarPath)
        .filter((value): value is string => Boolean(value))
    )
    for (const character of characters) {
      if (!character || typeof character.name !== 'string' || typeof character.voiceActor !== 'string') {
        throw new Error('无效的角色数据')
      }
      if (character.avatarPath && !currentAvatarPaths.has(character.avatarPath)) {
        throw new Error('无效的角色头像路径')
      }
      if (character.avatarUrl && typeof character.avatarUrl !== 'string') {
        throw new Error('无效的角色头像地址')
      }
    }

    const normalizedCharacters = this.voiceActorAliases.normalizeCharacters(characters)
    const prepared = await this.mediaService.prepareCharacterAvatars(gameId, normalizedCharacters)
    try {
      const updatedGame: Game = { ...game, characters: prepared.characters }
      this.repo.update(updatedGame)

      try {
        this.mediaService.cleanupUnusedCharacterAvatars(
          gameId,
          game.characters ?? [],
          prepared.characters
        )
      } catch (error) {
        console.error('Failed to clean up old character avatars:', error)
      }
      return updatedGame
    } catch (error) {
      this.mediaService.discardPreparedMedia(prepared.createdPaths)
      throw error
    }
  }

  // 更新单个媒体资源
  async updateMedia(gameId: string, type: 'cover' | 'banner' | 'icon', sourcePath: string) {
    const game = this.repo.get(gameId)
    if (!game) throw new Error('Game not found')

    // 1. 让 MediaService 处理文件
    const savedPath = await this.mediaService.setMediaFromFile(gameId, type, sourcePath)

    // 2. 更新 game 对象
    const updatedGame: Game = {
      ...game,
      media: {
        ...game.media,
        [`${type}Path`]: savedPath
      }
    }
    // 3. 写入数据库
    this.repo.update(updatedGame)
    return savedPath
  }


  getGame(id: string): Game | null {
    const game = this.repo.get(id)
    if (!game) return null
    return game
  }
  
  getAllGames(): Game[] {
    const games = this.repo.getAll()
    return games
  }

  // 系列只是 games.series 上的名字分组，重命名/删除均批量作用于同系列游戏。
  renameSeries(oldName: string, newName: string) {
    const from = oldName.trim()
    const to = newName.trim()
    if (!from || !to) throw new Error('系列名称不能为空')
    if (from === to) return
    this.repo.transaction(() => {
      if (this.repo.seriesExists(to)) throw new Error('已存在同名系列')
      this.repo.renameSeries(from, to)
    })
  }

  deleteSeries(name: string) {
    const seriesName = name.trim()
    if (!seriesName) throw new Error('系列名称不能为空')
    this.repo.deleteSeries(seriesName)
  }
}
