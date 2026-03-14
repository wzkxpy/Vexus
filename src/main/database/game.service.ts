// src/main/services/game.service.ts
import { GameRepository } from './game.repo'
import { NewGame, Game } from '@/shared/types'
import { downloadFile, deleteFile } from './../utils'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'


export class GameService {
  constructor(private repo: GameRepository) {}

  private mediaDir = path.join(app.getPath('userData'), 'media', 'game')

  async addGame(newGame: NewGame): Promise<string> {
    if (!fs.existsSync(this.mediaDir)) fs.mkdirSync(this.mediaDir, { recursive: true })
    for (const media of ['cover', 'banner', 'icon'] as const) {
      if (newGame.media[`${media}Url`]) {
        const filename = `${newGame.id}_${media}.jpg`
        const localPath = path.join(this.mediaDir, filename)
        await downloadFile(newGame.media[`${media}Url`]!, localPath)
      }
    }
    return this.repo.add(newGame)
  }

  
  deleteGame(id: string): boolean {
    const game = this.repo.get(id)
    if (game && game.media) {
      for (const media of ['cover', 'banner', 'icon'] as const) {
        if (game.media[`${media}Path`]) {
          deleteFile(path.join(this.mediaDir, game.media[`${media}Path`]!))
        }
      }
    }
    return this.repo.delete(id)
  }

  // 更新游戏
  async updateGame(game: Game) {
    // const adaptedGame = {
    //   ...game,
    //   media: {
    //     ...game.media,
    //     coverPath: game.media.coverPath ? game.media.coverPath.replace('vexus-media://game/', '') : undefined,
    //     bannerPath: game.media.bannerPath ? game.media.bannerPath.replace('vexus-media://game/', '') : undefined,
    //     iconPath: game.media.iconPath ? game.media.iconPath.replace('vexus-media://game/', '') : undefined,
    //   }
    // }
    // this.repo.update(adaptedGame)
    this.repo.update(game)
  }

  getAllGames(): Game[] {
    const games = this.repo.getAll()

    return games.map(game => ({
      ...game,
      media: {
        ...game.media,
        coverPath: game.media.coverPath
          ? `vexus-media://game/${game.media.coverPath}`
          : undefined,
        bannerPath: game.media.bannerPath
          ? `vexus-media://game/${game.media.bannerPath}`
          : undefined,
        iconPath: game.media.iconPath
          ? `vexus-media://game/${game.media.iconPath}`
          : undefined,
      }
    }))
  }
}