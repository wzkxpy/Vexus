// src/main/services/game.service.ts
import { GameRepository } from './game.repo'
import { NewGame, Game } from '@/shared/types'
import { MediaService } from '../services/media'


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