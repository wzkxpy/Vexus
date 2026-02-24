import { Game } from '@/shared/types'

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
      estimatedTime: row.estimated_time_minutes,
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
      planner: safeParse(row.planner, []),
      scenario: safeParse(row.scenario, []),
      artist: safeParse(row.artist, []),
      music: safeParse(row.music, []),
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