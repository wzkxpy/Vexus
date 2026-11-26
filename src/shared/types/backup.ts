export const BACKUP_FORMAT = 'vexus-backup'
export const BACKUP_VERSION = 1

export interface BackupManifest {
  format: typeof BACKUP_FORMAT
  version: number
  appVersion: string
  exportedAt: string
  includes: {
    media: boolean
    routeTrees: boolean
    voiceActorAliases: boolean
    settings: boolean
  }
  counts: {
    games: number
    routes: number
    sessions: number
    mediaFiles: number
  }
}

export interface BackupProgress {
  processedBytes: number
  totalBytes: number
  processedFiles: number
  totalFiles: number
}

export interface BackupExportResult {
  canceled: boolean
  path?: string
  bytes?: number
}