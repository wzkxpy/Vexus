// src/main/db/game.repo.ts
import type { Game, NewGame } from '@/shared/types'
import type { Database } from 'better-sqlite3'
import { rowToGame, newGameToRow } from './game.mapper'
import { get } from 'http'


export class GameRepository {
  constructor(private db: Database) {
    this.db = db
  }
  // 添加一个游戏
  add(game: NewGame): string {
    const row = newGameToRow(game)
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
        @original_title, @localized_title, @description, @tags,
        @developer, @publisher, @release_date, @estimated_time,
        @erogame_score, @bgm_score, @vndb_score,
        @bgm_id, @vndb_id, @steam_id, @ymgal_id,
        @cover_path, @banner_path, @icon_path,
        @planner, @scenario, @artist, @music,
        @cast,
        @nsfw
      )
    `)
    stmt.run(row)
    return row.id
  }
  // 删除一个游戏
  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM games WHERE id = ?`)
    const result = stmt.run(id)
    return result.changes > 0
  }
  // 获取一个游戏
  get(id: string): Game | null {
    const stmt = this.db.prepare(`SELECT * FROM games WHERE id = ?`)
    const row = stmt.get(id)
    return row ? rowToGame(row) : null
  }
  // 获取全部游戏
  getAll(): Game[] {
    const stmt = this.db.prepare(`SELECT * FROM games`)
    const rows = stmt.all()
    return rows.map(rowToGame)
  }
}
