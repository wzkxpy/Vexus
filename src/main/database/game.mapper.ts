// src/main/database/game.mapper.ts
import { Game, NewGame } from '@/shared/types'

export function newGameToRow(game: NewGame) {
  return {
    id: game.id as string,
    // 名称 & 简介
    original_title: game.originalTitle,
    localized_title: game.localizedTitle ?? null,
    description: game.description ?? null,
    tags: game.tags ? JSON.stringify(game.tags) : null,

    // 基本信息
    developer: game.basicInfo.developer ?? null,
    publisher: game.basicInfo.publisher ?? null,
    release_date: game.basicInfo.releaseDate ?? null,
    estimated_time: game.basicInfo.estimatedTime ?? null,

    erogame_score: game.basicInfo.externalScore?.erogame ?? null,
    bgm_score: game.basicInfo.externalScore?.bgm ?? null,
    vndb_score: game.basicInfo.externalScore?.vndb ?? null,

    // 外部 ID
    bgm_id: game.externalIds.bgmId ?? null,
    vndb_id: game.externalIds.vndbId ?? null,
    steam_id: game.externalIds.steamId ?? null,
    ymgal_id: game.externalIds.ymgalId ?? null,

    // 媒体路径
    cover_path: game.media.coverUrl ? `${game.id}_cover.jpg` : null,
    banner_path: game.media.bannerUrl ? `${game.id}_banner.jpg` : null,
    icon_path: game.media.iconUrl ? `${game.id}_icon.jpg` : null,

    // Staff
    planner: game.staff.planner ? game.staff.planner : null,
    scenario: game.staff.scenario ? game.staff.scenario : null,
    artist: game.staff.artist ? game.staff.artist : null,
    music: game.staff.music ? game.staff.music : null,

    // Cast
    cast: game.cast ? JSON.stringify(game.cast) : null,

    // 设置项
    nsfw: game.settings?.nsfw ? 1 : 0
  }
}




export function rowToGame(row: any): Game {
  return {
    id: row.id,

    originalTitle: row.original_title,
    localizedTitle: row.localized_title,
    sortNum: row.sort_num,

    description: row.description,
    tags: safeParse(row.tags, []),
    guide: row.guide,

    basicInfo: {
      developer: row.developer,
      publisher: row.publisher,
      releaseDate: row.release_date,
      estimatedTime: row.estimated_time,
      externalScore: {
        erogame: row.erogame_score,
        bgm: row.bgm_score,
        vndb: row.vndb_score,
      },
    },

    externalIds: {
      bgmId: row.bgm_id,
      vndbId: row.vndb_id,
      steamId: row.steam_id,
      ymgalId: row.ymgal_id,
    },

    exePath: row.exe_path,

    media: {
      coverPath: row.cover_path,
      bannerPath: row.banner_path,
      iconPath: row.icon_path,
    },

    staff: {
      planner: safeParse(row.planner, ""),
      scenario: safeParse(row.scenario, ""),
      artist: safeParse(row.artist, ""),
      music: safeParse(row.music, ""),
    },

    cast: safeParse(row.cast, []),

    record: {
      addTime: row.add_time,
      lastRunDate: row.last_run_date,
      extraPlaytime: row.extra_playtime,
      playStatus: row.play_status,
      personalScore: row.personal_score,
      totalPlaytime: row.total_playtime,
    },

    settings: {
      nsfw: Boolean(row.nsfw),
      magpie: Boolean(row.magpie),
    }
  }
}


function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}