// src/main/services/game.service.ts
import { GameRepository } from './game.repo'
import { GAME_METADATA_SECTIONS } from '@/shared/types'
import type {
  CharacterDraft,
  Game,
  GameMetadataSection,
  NewGame
} from '@/shared/types'
import { MediaService } from '../services/media'
import { fetchBangumiSection } from '../providers/manager'


export class GameService {
  constructor(private repo: GameRepository, private mediaService: MediaService) {}

  // private mediaBaseDir = path.join(app.getPath('userData'), 'media')

  async addGame(newGame: NewGame): Promise<string> {
    const { id, media, characters } = newGame;
    await this.mediaService.initMedia(id, media, characters);
    return this.repo.add(newGame);
  }

  
  deleteGame(id: string): boolean {
    // deleteFile(path.join(this.mediaService.mediaBaseDir, id))
    return this.repo.delete(id)
  }

  // 全量更新
  updateGame(game: Game) {
    this.repo.update(game)
  }

  async fetchMetadataSection(gameId: string, section: GameMetadataSection) {
    if (!GAME_METADATA_SECTIONS.includes(section)) {
      throw new Error('不支持的信息分区')
    }

    const game = this.repo.get(gameId)
    if (!game) throw new Error('Game not found')

    const sourceId = game.externalIds.bgmId
    if (!sourceId) {
      throw new Error('未设置 Bangumi ID，请先编辑数据源 ID')
    }
    return fetchBangumiSection(sourceId, section)
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

    const prepared = await this.mediaService.prepareCharacterAvatars(gameId, characters)
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

}