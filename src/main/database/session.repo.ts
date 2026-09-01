import { Session, SessionSource } from '@/shared/types'
import type { Database } from 'better-sqlite3'



export class SessionRepository {
  constructor(private db: Database) {}

  add(session: Session) {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        id, game_id, route_id,
        local_date,
        started_at, ended_at, duration,
        source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
        session.id,
        session.gameId,
        session.routeId,
        session.playDate,
        session.startedAt,
        session.endedAt,
        session.duration,
        session.source
    )
  }

  delete(id: string) {
    const stmt = this.db.prepare(`
      DELETE FROM sessions
      WHERE id = ?
    `)
    stmt.run(id)
  }

  update(session: Session) {
    const stmt = this.db.prepare(`
      UPDATE sessions SET
        route_id = ?,
        local_date = ?,
        duration = ?,
        started_at = ?,
        ended_at = ?,
        source = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    stmt.run(
      session.routeId ?? null,
      session.playDate,
      session.duration,
      session.startedAt ?? null,
      session.endedAt ?? null,
      session.source,
      session.id
    )
  }

  getByGame(gameId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE game_id = ?
      ORDER BY local_date ASC, started_at ASC
    `)
    const rows = stmt.all(gameId)
    return rows.map((row: any): Session => ({
      id: row.id,
      gameId: row.game_id,
      routeId: row.route_id,
      playDate: row.local_date,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      duration: row.duration,
      source: row.source as SessionSource
    }))
  }

  // 单个游戏覆盖导入
  // 删除旧记录和写入新记录必须处于同一事务，避免失败后留下部分数据。
  importForGame(gameId: string, sessions: Session[]) {
    const deleteStmt = this.db.prepare(`
      DELETE FROM sessions
      WHERE game_id = ?
    `)
    const insertStmt = this.db.prepare(`
      INSERT INTO sessions (
        id, game_id, route_id,
        local_date,
        started_at, ended_at, duration,
        source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    this.db.transaction(() => {
      deleteStmt.run(gameId)
      for (const session of sessions) {
        insertStmt.run(
          session.id,
          session.gameId,
          session.routeId,
          session.playDate,
          session.startedAt,
          session.endedAt,
          session.duration,
          session.source
        )
      }
    })()
  }

}
