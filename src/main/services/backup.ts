import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import { ZipArchive } from 'archiver'
import type { ProgressData } from 'archiver'
import { BACKUP_FORMAT, BACKUP_VERSION } from '@/shared/types'
import type { BackupManifest, BackupProgress } from '@/shared/types'

const PROGRESS_INTERVAL_MS = 120

interface BackupFile {
  absolutePath: string
  name: string
  size: number
  store?: boolean
}

export interface BackupExportOutput {
  path: string
  bytes: number
}

export class BackupService {
  private readonly mediaDir: string
  private readonly routeTreeDir: string
  private readonly aliasFilePath: string
  private readonly tempRoot: string
  private busy = false

  constructor(
    private db: DatabaseType,
    private userDataDir: string,
    private appVersion: string
  ) {
    this.mediaDir = path.join(userDataDir, 'media')
    this.routeTreeDir = path.join(userDataDir, 'route-trees')
    this.aliasFilePath = path.join(userDataDir, 'voice-actor-aliases.json')
    this.tempRoot = path.join(userDataDir, 'backup-tmp')
    // 异常退出可能留下快照目录；只清理备份临时区，不触碰用户数据。
    try {
      fs.rmSync(this.tempRoot, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to clean stale backup temp directory.', error)
    }
  }

  async export(
    destPath: string,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<BackupExportOutput> {
    if (this.busy) throw new Error('已有备份任务正在进行')

    this.busy = true
    const tempDir = path.join(this.tempRoot, randomUUID())
    let partialPath: string | undefined
    let completed = false

    try {
      const target = this.resolveTarget(destPath)
      partialPath = `${target}.partial`

      fs.mkdirSync(tempDir, { recursive: true })
      const snapshotPath = path.join(tempDir, 'vexus.db')
      await this.db.backup(snapshotPath)

      const { manifest, mediaFiles, treeFiles, aliasFile } = this.collectBackupData(snapshotPath)
      const files: BackupFile[] = [
        {
          absolutePath: snapshotPath,
          name: 'vexus.db',
          size: fs.statSync(snapshotPath).size
        },
        ...treeFiles,
        ...(aliasFile ? [aliasFile] : []),
        ...mediaFiles
      ]
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0)

      await this.writeArchive({
        files,
        manifest,
        totalBytes,
        totalFiles: files.length + 2,
        partialPath,
        onProgress
      })

      const fd = fs.openSync(partialPath, 'r+')
      try {
        fs.fsyncSync(fd)
      } finally {
        fs.closeSync(fd)
      }
      fs.renameSync(partialPath, target)
      completed = true
      return { path: target, bytes: fs.statSync(target).size }
    } finally {
      this.busy = false
      if (!completed && partialPath) {
        fs.rmSync(partialPath, { force: true })
      }
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }

  private resolveTarget(destPath: string): string {
    if (typeof destPath !== 'string' || !destPath.trim()) {
      throw new Error('无效的备份保存路径')
    }
    let target = path.resolve(destPath.trim())
    if (!target.toLowerCase().endsWith('.zip')) target += '.zip'

    const userData = path.resolve(this.userDataDir)
    const relative = path.relative(userData, target)
    // 放进数据目录的备份会被下一次导出当作媒体/数据重新打包。
    const insideUserData =
      relative === '' ||
      (!path.isAbsolute(relative) && relative.split(path.sep)[0] !== '..')
    if (insideUserData) throw new Error('备份文件不能保存在 Vexus 数据目录内')
    return target
  }

  private collectBackupData(snapshotPath: string): {
    manifest: BackupManifest
    mediaFiles: BackupFile[]
    treeFiles: BackupFile[]
    aliasFile: BackupFile | null
  } {
    const snapshot = new Database(snapshotPath, { readonly: true })
    const counts: BackupManifest['counts'] = { games: 0, routes: 0, sessions: 0, mediaFiles: 0 }
    try {
      const integrity = snapshot.pragma('integrity_check', { simple: true })
      if (integrity !== 'ok') throw new Error('数据库快照校验失败')

      const count = (sql: string) => (snapshot.prepare(sql).get() as { count: number }).count
      counts.games = count('SELECT COUNT(*) AS count FROM games')
      counts.routes = count('SELECT COUNT(*) AS count FROM routes')
      counts.sessions = count('SELECT COUNT(*) AS count FROM sessions')
    } finally {
      snapshot.close()
    }

    const mediaFiles = this.collectMedia(this.mediaDir, 'media')
    const treeFiles = this.collectRouteTrees()
    const aliasFile = this.collectAlias()
    counts.mediaFiles = mediaFiles.length

    const manifest: BackupManifest = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      appVersion: this.appVersion,
      exportedAt: new Date().toISOString(),
      includes: {
        media: true,
        routeTrees: true,
        voiceActorAliases: aliasFile !== null,
        settings: false
      },
      counts
    }
    return { manifest, mediaFiles, treeFiles, aliasFile }
  }

  private collectRouteTrees(): BackupFile[] {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(this.routeTreeDir, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }

    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(entry => {
        const absolutePath = path.join(this.routeTreeDir, entry.name)
        return {
          absolutePath,
          name: `route-trees/${entry.name}`,
          size: fs.statSync(absolutePath).size
        }
      })
  }

  private collectAlias(): BackupFile | null {
    try {
      const stat = fs.statSync(this.aliasFilePath)
      if (!stat.isFile()) return null
      return {
        absolutePath: this.aliasFilePath,
        name: 'voice-actor-aliases.json',
        size: stat.size
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  private collectMedia(dir: string, zipPrefix: string): BackupFile[] {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }

    const files: BackupFile[] = []
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // 头像处理与下载过程中留下的临时目录没有备份价值。
        if (entry.name === 'temp' || entry.name.startsWith('.avatar-')) continue
        files.push(
          ...this.collectMedia(path.join(dir, entry.name), `${zipPrefix}/${entry.name}`)
        )
      } else if (entry.isFile()) {
        const absolutePath = path.join(dir, entry.name)
        files.push({
          absolutePath,
          name: `${zipPrefix}/${entry.name}`,
          size: fs.statSync(absolutePath).size,
          store: true
        })
      }
    }
    return files
  }

  private writeArchive(options: {
    files: BackupFile[]
    manifest: BackupManifest
    totalBytes: number
    totalFiles: number
    partialPath: string
    onProgress?: (progress: BackupProgress) => void
  }): Promise<void> {
    const { files, manifest, totalBytes, totalFiles, partialPath, onProgress } = options
    const archive = new ZipArchive()
    const output = fs.createWriteStream(partialPath)

    return new Promise((resolve, reject) => {
      let settled = false
      let lastProgressAt = 0
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        try {
          archive.abort()
        } catch {
          // 忽略中止阶段的二次错误。
        }
        output.destroy()
        reject(error)
      }

      output.on('close', () => {
        if (settled) return
        settled = true
        resolve()
      })
      output.on('error', fail)
      archive.on('error', fail)
      archive.on('warning', fail)
      archive.on('progress', (data: ProgressData) => {
        const now = Date.now()
        if (now - lastProgressAt < PROGRESS_INTERVAL_MS && data.fs.processedBytes < totalBytes) return
        lastProgressAt = now
        try {
          onProgress?.({
            processedBytes: Math.min(data.fs.processedBytes, totalBytes),
            totalBytes,
            processedFiles: Math.min(data.entries.processed, totalFiles),
            totalFiles
          })
        } catch {
          // 进度回调失败不应中断备份。
        }
      })

      archive.pipe(output)
      archive.append(`${JSON.stringify(manifest, null, 2)}\n`, { name: 'manifest.json' })
      archive.append(buildReadme(), { name: 'README.txt' })
      for (const file of files) {
        archive.file(file.absolutePath, { name: file.name, store: file.store })
      }
      archive.finalize().catch(fail)
    })
  }
}

function buildReadme(): string {
  return [
    'Vexus 数据备份',
    '',
    '恢复步骤：',
    '1. 退出 Vexus。',
    '2. 建议先备份当前 %APPDATA%\\vexus 目录。',
    '3. 将本压缩包中的 vexus.db、route-trees、voice-actor-aliases.json、media 解压并覆盖到 %APPDATA%\\vexus。',
    '4. 重新启动 Vexus。',
    '',
    '说明：',
    '- 备份包含游戏库、线路树、游玩记录、声优马甲映射和本地图片。',
    '- 不包含游戏本体、游戏存档和 Vexus 设置（含 Bangumi Token）。',
    '- 本文件包含个人数据，请勿上传或分享。',
    ''
  ].join('\n')
}