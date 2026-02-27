// src/main/db/game.repo.ts
import type { Game, NewGame } from '@/shared/types'
import type { Database } from 'better-sqlite3'
import { rowToGame, newGameToRow } from './game.mapper'


export class GameRepository {
  constructor(private db: Database) {
    this.db = db
  }
  // 添加一个游戏
  add(game: NewGame): string {
    // console.log("before transform", game);
    const row = newGameToRow(game)
    console.log("after transform", row);
    
    const stmt = this.db.prepare(`
      INSERT INTO games (
        id,
        original_title, localized_title, description, tags,

        developer, publisher, release_date, estimated_time,
        erogame_score, bgm_score, vndb_score,

        bgm_id, vndb_id, steam_id, ymgal_id,

        cover_path, banner_path, icon_path,

        planner, scenario, artist, music,

        cast,
        nsfw
      )
      VALUES (
        @id,
        @original_title,
        @localized_title,
        @description,
        @tags,

        @developer,
        @publisher,
        @release_date,
        @estimated_time,
        @erogame_score,
        @bgm_score,
        @vndb_score,

        @bgm_id,
        @vndb_id,
        @steam_id,
        @ymgal_id,

        @cover_path,
        @banner_path,
        @icon_path,

        @planner,
        @scenario,
        @artist,
        @music,

        @cast,
        @nsfw
      )
    `)
    stmt.run(row)
    return row.id
  }
  // 删除一个游戏
  delete(id: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM games
      WHERE id = ?
    `)
    const result = stmt.run(id)
    return result.changes > 0
  }
  // 获取全部游戏
  getAll(): Game[] {
    const stmt = this.db.prepare(`SELECT * FROM games`)
    const rows = stmt.all()
    return rows.map(rowToGame)
  }
}
