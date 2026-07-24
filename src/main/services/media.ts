// src/main/services/media.ts
import * as path from 'path'
import * as fs from 'fs'
import { NewGame } from '@/shared/types';
import { downloadFile } from '../utils/file'
import { app } from 'electron'
import sharp from 'sharp'
import { Dispatcher } from 'undici';

export class MediaService {
  private mediaBaseDir = path.join(app.getPath('userData'), 'media')

  constructor(
    private getAgent: () => Dispatcher | undefined
  ) {}
  // 新增游戏时 初始化媒体资源 将游戏/角色图片下载到本地
  async initMedia(gameId: string, media: NewGame['media'], characters: NewGame['characters']) {
    const gameDir = path.join(this.mediaBaseDir, gameId);
    const tempDir = path.join(gameDir, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const downloadTasks: Promise<string | void>[] = [];
    for (const type of ['cover', 'banner', 'icon'] as const) {
      if (media[`${type}Url`]) {
        const localPath = path.join(tempDir, `${type}.jpg`);
        downloadTasks.push(downloadFile(media[`${type}Url`]!, localPath, this.getAgent()));
      }
    }
    if (characters && characters.length > 0) {
      characters.forEach((char) => {
        if (char.avatarUrl) {
          const charFileName = `${char.uuid}_avatar.jpg`; 
          const localPath = path.join(tempDir, charFileName);          
          downloadTasks.push(downloadFile(char.avatarUrl, localPath, this.getAgent()));
        }
      });
    }
    await Promise.all(downloadTasks); // 并行下载
    // 转换 WebP (读取 temp 目录下的所有文件并转换)
    const files = fs.readdirSync(tempDir);
    const convertTasks = files.map(async (file) => {
      const inputPath = path.join(tempDir, file);
      // 获取不带后缀的文件名，准备输出为 .webp
      const fileNameNoExt = path.parse(file).name;
      const outputPath = path.join(gameDir, `${fileNameNoExt}.webp`);
      await sharp(inputPath).webp({ quality: 90 }).toFile(outputPath)
    });
    await Promise.all(convertTasks); // 并行转换
    // 清理：递归删除临时文件夹
    fs.rmSync(tempDir, { recursive: true, force: true });
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

  // --------- private -------------

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

