// src/main/db/game.repo.ts
import type { Game, NewGame } from '@/shared/types'
import type { Database } from 'better-sqlite3'
import { rowToGame, newGameToRow, gameToRow } from './game.mapper'


export class GameRepository {
  constructor(private db: Database) {
    this.db = db
  }
  
add(game: NewGame): string {
  const row = newGameToRow(game);
  const keys = Object.keys(row); // 动态提取键名
  const columns = keys.join(', '); // 生成列名部分: "id, original_title, ..."
  const placeholders = keys.map(key => `@${key}`).join(', '); // 生成参数占位符"@id, @original_title, ..."
  const sql = `INSERT INTO games (${columns}) VALUES (${placeholders})`;
  const stmt = this.db.prepare(sql);
  stmt.run(row);
  return row.id;
}

  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM games WHERE id = ?`)
    const result = stmt.run(id)
    return result.changes > 0
  }

  update(game: Game) {
    const row = gameToRow(game)
    const fields = Object.keys(row)
      .filter(k => k !== 'id')
      .map(k => `${k} = @${k}`)
      .join(',\n')
    const stmt = this.db.prepare(`
      UPDATE games
      SET
        ${fields},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    stmt.run(row)
  }

  // patch(id: string, data: Partial<Game>) 


  get(id: string): Game | null {
    const stmt = this.db.prepare(`SELECT * FROM games WHERE id = ?`)
    const row = stmt.get(id)
    return row ? rowToGame(row) : null
  }

  getAll(): Game[] {
    const stmt = this.db.prepare(`SELECT * FROM games`)
    const rows = stmt.all()
    return rows.map(rowToGame)
  }

  static readonly GAME_COLUMNS = [
    'id',
    'original_title',
    'localized_title',
    'sort_num',
    'description',
    'tags',
    'guide',

    'developer',
    'publisher',
    'release_date',
    'estimated_time',
    'erogame_score',
    'bgm_score',
    'vndb_score',

    'bgm_id',
    'vndb_id',
    'steam_id',
    'ymgal_id',

    'exe_path',
    'cover_path',
    'banner_path',
    'icon_path',

    'planner',
    'scenario',
    'artist',
    'music',
    'characters',

    'add_time',
    'last_run_date',
    'play_status',
    'personal_score',
    'session_playtime',
    'extra_playtime',
    'session_count',
    
    'nsfw',
    'magpie',

    'created_at',
    'updated_at'
  ] as const
}
