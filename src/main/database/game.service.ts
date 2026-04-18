// src/main/services/game.service.ts
import { GameRepository } from './game.repo'
import { NewGame, Game } from '@/shared/types'
import { downloadFile, deleteFile } from './../utils'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'


export class GameService {
  constructor(private repo: GameRepository) {}

  private mediaBaseDir = path.join(app.getPath('userData'), 'media')

  async addGame(newGame: NewGame): Promise<string> {
    const { id, media, characters } = newGame;
    await this.mediaService(id, media, characters);
    return this.repo.add(newGame);
  }

  // 处理媒体文件 下载到本地
  private async mediaService(gameId: string, media: NewGame['media'], characters: NewGame['characters']) {
    const gameDir = path.join(this.mediaBaseDir, gameId);
    if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true })
    const downloadTasks: Promise<string | void>[] = [];
    for (const type of ['cover', 'banner', 'icon'] as const) {
      if (media[`${type}Url`]) {
        const localPath = path.join(gameDir, `${type}.jpg`);
        downloadTasks.push(downloadFile(media[`${type}Url`]!, localPath));
      }
    }
    if (characters && characters.length > 0) {
      characters.forEach((char) => {
        if (char.avatarUrl) {
          const charFileName = `${char.uuid}_avatar.jpg`; 
          const localPath = path.join(gameDir, charFileName);          
          downloadTasks.push(downloadFile(char.avatarUrl, localPath));
        }
      });
    }
    await Promise.all(downloadTasks); // 并行下载
  }
  
  deleteGame(id: string): boolean {
    deleteFile(path.join(this.mediaBaseDir, id))
    return this.repo.delete(id)
  }

  updateGame(game: Game) {
    this.repo.update(game)
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