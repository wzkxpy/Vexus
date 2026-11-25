// src/main/services/voiceActorAlias.ts
import * as fs from 'fs'
import * as path from 'path'
import { shell } from 'electron'
import {
  normalizeVoiceActorNames,
  parseVoiceActorAliasMap
} from '@/shared/utils/voiceActor'

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export class VoiceActorAliasService {
  constructor(private filePath: string) {}

  // 只转换即将写库或即将展示的角色数据；库中已有名字不会在启动时回扫。
  normalizeCharacters<T extends { voiceActor: string }>(characters: T[]): T[] {
    if (!characters.length) return characters
    return normalizeVoiceActorNames(characters, this.loadAliases())
  }

  async openFile(): Promise<void> {
    this.ensureFile()
    const error = await shell.openPath(this.filePath)
    if (error) throw new Error(`无法打开声优马甲映射文件：${error}`)
  }

  private loadAliases(): Map<string, string> {
    this.ensureFile()
    let text: string
    try {
      text = fs.readFileSync(this.filePath, 'utf8')
    } catch (error) {
      throw new Error(`无法读取声优马甲映射文件（${this.filePath}）：${messageOf(error)}`)
    }

    let raw: unknown
    try {
      raw = JSON.parse(text.replace(/^\uFEFF/, ''))
    } catch (error) {
      throw new Error(`声优马甲映射文件格式错误（${this.filePath}）：${messageOf(error)}`)
    }
    return parseVoiceActorAliasMap(raw)
  }

  private ensureFile(): void {
    if (fs.existsSync(this.filePath)) return
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
      // wx 避免在检查与创建之间覆盖用户刚建好的文件。
      fs.writeFileSync(this.filePath, '{}\n', { encoding: 'utf8', flag: 'wx' })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return
      throw new Error(`无法创建声优马甲映射文件（${this.filePath}）：${messageOf(error)}`)
    }
  }
}