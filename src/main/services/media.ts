// src/main/services/media.ts
import * as path from 'path'
import * as fs from 'fs'
import { randomUUID } from 'crypto'
import type { Character, CharacterDraft, NewGame } from '@/shared/types';
import { downloadFile } from '../utils/file'
import { mapWithConcurrency } from '../utils/async'
import { app } from 'electron'
import sharp from 'sharp'
import { Dispatcher } from 'undici';
import { logger } from '../logger'
import { UserError } from '../utils/errors'

const MEDIA_DOWNLOAD_CONCURRENCY = 3

export interface PreparedCharacterAvatars {
  characters: Character[]
  createdPaths: string[]
}

export class MediaService {
  private mediaBaseDir = path.join(app.getPath('userData'), 'media')

  constructor(
    private getAgent: () => Dispatcher | undefined
  ) {}
  // 新增游戏时 初始化媒体资源 将游戏/角色图片下载到本地
  async initMedia(gameId: string, media: NewGame['media'], characters: NewGame['characters']) {
    const gameDir = path.join(this.mediaBaseDir, gameId);
    const gameDirExisted = fs.existsSync(gameDir)
    const tempDir = path.join(gameDir, 'temp');
    fs.mkdirSync(tempDir, { recursive: true })

    try {
      const downloadTasks: Array<() => Promise<string>> = []
      for (const type of ['cover', 'banner', 'icon'] as const) {
        const url = media[`${type}Url`]
        if (!url) continue
        const localPath = path.join(tempDir, `${type}.jpg`)
        downloadTasks.push(() => downloadFile(url, localPath, this.getAgent()))
      }
      for (const character of characters ?? []) {
        const avatarUrl = character.avatarUrl
        if (!avatarUrl) continue
        const localPath = path.join(tempDir, `${character.uuid}_avatar.jpg`)
        downloadTasks.push(() => downloadFile(avatarUrl, localPath, this.getAgent()))
      }

      // 图片站和代理对突发连接较敏感，限制同时下载的数量。
      await mapWithConcurrency(downloadTasks, MEDIA_DOWNLOAD_CONCURRENCY, task => task())

      const files = fs.readdirSync(tempDir)
      await mapWithConcurrency(files, MEDIA_DOWNLOAD_CONCURRENCY, async (file) => {
        const inputPath = path.join(tempDir, file)
        // 获取不带后缀的文件名，准备输出为 .webp
        const fileNameNoExt = path.parse(file).name
        const outputPath = path.join(gameDir, `${fileNameNoExt}.webp`)
        await sharp(inputPath).webp({ quality: 90 }).toFile(outputPath)
      })
    } catch (error) {
      // 只清理本次新建的目录，避免异常路径下删除已有游戏的媒体文件。
      if (!gameDirExisted) {
        fs.rmSync(gameDir, { recursive: true, force: true })
      }
      logger.error('media', 'initialize failed', { gameId, error })
      throw new Error('下载或处理游戏图片失败，请检查网络或代理设置后重试')
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }


  // 更新媒体资源时 复制新文件到媒体目录并返回新路径 ------
  async setMediaFromFile(gameId: string, type: 'cover' | 'banner' | 'icon', sourcePath: string
    ): Promise<string> {
    const gameDir = path.join(this.mediaBaseDir, gameId)
    if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true })

    const targetPath = await this.getAvailableMediaPath(gameId, type)
    await sharp(sourcePath).webp({ quality: 90 }).toFile(targetPath)
    const fileName = path.basename(targetPath)
    return `vexus-media://${gameId}/${fileName}`
  } 

  // 保存角色前准备头像；所有文件成功后才返回，调用方写库失败时用 createdPaths 补偿清理。
  async prepareCharacterAvatars(
    gameId: string,
    characters: CharacterDraft[]
  ): Promise<PreparedCharacterAvatars> {
    const gameDir = path.join(this.mediaBaseDir, gameId)
    const tempDir = path.join(gameDir, `.avatar-${randomUUID()}`)
    fs.mkdirSync(tempDir, { recursive: true })
    const createdPaths: string[] = []

    try {
      const prepared = await mapWithConcurrency(
        characters,
        MEDIA_DOWNLOAD_CONCURRENCY,
        async (character, index) => {
          if (character.avatarPath) {
            return {
              name: character.name,
              voiceActor: character.voiceActor,
              avatarPath: character.avatarPath
            }
          }
          if (!character.avatarUrl) {
            return {
              name: character.name,
              voiceActor: character.voiceActor
            }
          }

          this.assertAvatarUrl(character.avatarUrl)
          const sourcePath = path.join(tempDir, `${index}.image`)
          await downloadFile(character.avatarUrl, sourcePath, this.getAgent())

          const fileName = `${randomUUID()}_avatar.webp`
          const targetPath = path.join(gameDir, fileName)
          createdPaths.push(targetPath)
          await sharp(sourcePath).webp({ quality: 90 }).toFile(targetPath)

          return {
            name: character.name,
            voiceActor: character.voiceActor,
            avatarPath: `vexus-media://${gameId}/${fileName}`
          }
        }
      )

      return { characters: prepared, createdPaths }
    } catch (error) {
      this.discardPreparedMedia(createdPaths)
      throw error
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }

  discardPreparedMedia(paths: string[]) {
    for (const filePath of paths) {
      fs.rmSync(filePath, { force: true })
    }
  }

  // 删除整款游戏的媒体目录；校验解析后的路径仍是 media 根目录的直接子项。
  deleteGameMedia(gameId: string) {
    const mediaRoot = path.resolve(this.mediaBaseDir)
    const gameDir = path.resolve(mediaRoot, gameId)
    if (path.dirname(gameDir) !== mediaRoot) {
      throw new Error('Invalid game id')
    }
    fs.rmSync(gameDir, { recursive: true, force: true })
  }

  cleanupUnusedCharacterAvatars(gameId: string, previous: Character[], next: Character[]) {
    const retained = new Set(next.map(character => character.avatarPath).filter(Boolean))
    for (const character of previous) {
      if (!character.avatarPath || retained.has(character.avatarPath)) continue
      const filePath = this.resolveCharacterAvatarPath(gameId, character.avatarPath)
      if (filePath) fs.rmSync(filePath, { force: true })
    }
  }

  // --------- private -------------

  private assertAvatarUrl(value: string) {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new UserError('无效的角色头像地址')
    }
    const allowedHost =
      url.hostname === 'bgm.tv' ||
      url.hostname.endsWith('.bgm.tv') ||
      url.hostname === 't.vndb.org'
    if (url.protocol !== 'https:' || !allowedHost) {
      throw new UserError('无效的角色头像地址')
    }
  }

  private resolveCharacterAvatarPath(gameId: string, mediaPath: string) {
    const prefix = `vexus-media://${gameId}/`
    if (!mediaPath.startsWith(prefix)) return undefined

    const fileName = mediaPath.slice(prefix.length)
    if (fileName !== path.basename(fileName) || !fileName.endsWith('_avatar.webp')) {
      return undefined
    }
    return path.join(this.mediaBaseDir, gameId, fileName)
  }

  private async getAvailableMediaPath(gameId: string, type: string): Promise<string> {
    const gameDir = path.join(this.mediaBaseDir, gameId)
    const base = path.join(gameDir, `${type}.webp`)
    if (!fs.existsSync(base)) {
        return base
    }
    // cover_2.webp, cover_3.webp ...
    let index = 2
    while (true) {
      const candidate = path.join(gameDir, `${type}_${index}.webp`)
      if (!fs.existsSync(candidate)) {
        return candidate
      }
      index++
    }
  }


}

