// src/shared/types/game.ts

export interface Game {
  // 基础
  id: string
  originalTitle: string
  localizedTitle?: string
  sortNum?: number

  description?: string // 游戏简介
  tags?: string[]      // 游戏标签
  guide?: string       // 游戏攻略

  // 基本信息
  basicInfo: {
    developer?: string             // 开发商
    publisher?: string             // 发行商
    releaseDate?: string           // 发行时间 yyyy-mm-dd
    estimatedTime?: string         // 预计游戏时长，-h-m
    externalScore?: ExternalScore  // 三站评分
  }

  // 外部信息源 ID
  externalIds?: {
    bgmId?: string
    vndbId?: string
    steamId?: string
    ymgalId?: string
  }

  // 安装路径
  exePath?: string

  // 媒体资源路径
  media?: {
    coverPath?: string
    bannerPath?: string
    iconPath?: string
  }
  // staff信息
  staff?: {
    planner?: string[]
    scenario?: string[]
    artist?: string[]
    music?: string[]
  }
  // Cast 信息
  cast?: CastItem[]

  // 个人记录
  record: {
    addTime: string           // ISO datetime
    lastRunDate?: string      // ISO datetime
    extraPlaytime: number     // 额外的游玩时间记录
    playStatus: PlayStatus    // 游玩状态
    personalScore?: number    // 个人评分
    totalPlaytime: number     // 总游玩时长
  }

  settings: {
    nsfw: boolean
    magpie: boolean
  }
}


// 新建游戏时的类型
export interface NewGame {
  // 基础
  originalTitle: string
  localizedTitle?: string
  description?: string
  tags?: string[]
  // 基本信息
  basicInfo: {
    developer?: string
    publisher?: string
    releaseDate?: string
    estimatedTime?: string
    externalScore?: ExternalScore
  }
  // 外部信息源 ID
  externalIds?: {
    bgmId?: string
    vndbId?: string
    steamId?: string
    ymgalId?: string
  }
  // 媒体资源路径
  media?: {
    coverPath?: string
    bannerPath?: string
    iconPath?: string
  }
  // staff信息
  staff?: {
    planner?: string[]
    scenario?: string[]
    artist?: string[]
    music?: string[]
  }
  // Cast 信息
  cast?: CastItem[]
}



// types
export type PlayStatus =
  | 'NotStarted'
  | 'Playing'
  | 'OnHold'
  | 'Completed'

export interface CastItem {
  character: string
  voiceActor: string
}

export interface ExternalScore {
  erogame?: number   // 0 – 100
  bgm?: number       // 0 – 10
  vndb?: number      // 0 – 10
}