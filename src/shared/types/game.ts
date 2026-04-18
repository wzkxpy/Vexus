// src/shared/types/game.ts

export interface Game {
  // 基础
  id: string               // UUID v4
  originalTitle: string    // 原始标题
  localizedTitle?: string  // 本地化标题
  sortNum?: number         // 排序数字, 整数

  description?: string   // 游戏简介
  tags?: string[]        // 游戏标签
  guide?: string         // 游戏攻略

  // 基本信息
  basicInfo: {
    developer?: string      // 开发商
    publisher?: string      // 发行商
    releaseDate?: string    // 发行时间 yyyy-mm-dd
    estimatedTime?: string  // 预计游戏时长，-h-m
  }
  // 外部评分
  externalScore: {
    erogame?: number   // 0 – 100
    bgm?: number       // 0 – 10
    vndb?: number      // 0 – 10
  }

  // 外部信息源 ID
  externalIds: {
    bgmId?: string
    vndbId?: string
    steamId?: string
    ymgalId?: string
  }

  // 安装路径
  exePath?: string

  // 媒体资源路径
  media: {
    coverPath?: string
    bannerPath?: string
    iconPath?: string
  }
  // staff信息
  staff: {
    planner?: string
    scenario?: string
    artist?: string
    music?: string
  }
  // Cast 信息
  cast?: CastItem[]

  // 个人记录
  record: {
    addTime: string           // ISO datetime
    lastRunDate?: string      // ISO datetime
    playStatus: PlayStatus    // 游玩状态
    personalScore?: number    // 个人评分
    sessionPlaytime: number   // 计时游玩时长
    extraPlaytime: number     // 额外的游玩时长
  }

  settings: {
    nsfw: boolean
    magpie: boolean
  }
}


// 新建游戏时的类型
export interface NewGame {
  // 基础
  id: string
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
  }
  // 外部评分
  externalScore: {
    erogame?: number   // 0 – 100
    bgm?: number       // 0 – 10
    vndb?: number      // 0 – 10
  }
  // 外部信息源 ID
  externalIds: {
    bgmId?: string
    vndbId?: string
    steamId?: string
    ymgalId?: string
  }
  // 媒体资源路径
  media: {
    coverUrl?: string
    bannerUrl?: string
    iconUrl?: string
  }
  // staff信息
  staff: {
    planner?: string
    scenario?: string
    artist?: string
    music?: string
  }
  // Cast 信息
  cast?: CastItem[]
  // 设置项
  settings: {
    nsfw?: boolean  // 已知 bgm.tv 数据源具有此标签
  }
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