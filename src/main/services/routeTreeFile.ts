import fs from 'node:fs'
import path from 'node:path'
import type { RouteTree } from '@/shared/types'

const GAME_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

// 树文件是线路结构的唯一来源；写入先落临时文件，再在数据库提交后替换正式文件。
export class RouteTreeFileStore {
  constructor(private baseDir: string) {}

  private pathFor(gameId: string): string {
    if (!GAME_ID_PATTERN.test(gameId)) throw new Error('Invalid game id')
    const filePath = path.resolve(this.baseDir, `${gameId}.json`)
    if (path.dirname(filePath) !== path.resolve(this.baseDir)) throw new Error('Invalid game id')
    return filePath
  }

  // null 表示文件不存在；内容损坏时抛出，由 service 决定如何兜底。
  read(gameId: string): unknown {
    const filePath = this.pathFor(gameId)
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  stage(gameId: string, tree: RouteTree): void {
    const tempPath = `${this.pathFor(gameId)}.tmp`
    fs.mkdirSync(this.baseDir, { recursive: true })
    const handle = fs.openSync(tempPath, 'w')
    try {
      fs.writeFileSync(handle, `${JSON.stringify(tree, null, 2)}\n`, 'utf8')
      fs.fsyncSync(handle)
    } finally {
      fs.closeSync(handle)
    }
  }

  commit(gameId: string): void {
    const filePath = this.pathFor(gameId)
    fs.renameSync(`${filePath}.tmp`, filePath)
  }

  discard(gameId: string): void {
    try {
      fs.unlinkSync(`${this.pathFor(gameId)}.tmp`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}
