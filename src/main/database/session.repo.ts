import { Session } from '@/shared/types'
import type { Database } from 'better-sqlite3'



export class SessionRepository {
  constructor(private db: Database) {}

  add(session: Session) {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        id, game_id, route_id,
        play_date,
        start_time, end_time, duration,
        auto_record
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
        session.id,
        session.gameId,
        session.routeId,
        session.playDate,
        session.startTime,
        session.endTime,
        session.duration,
        session.autoRecord ? 1 : 0
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
        play_date = ?,
        duration = ?,
        start_time = ?,
        end_time = ?,
        auto_record = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    stmt.run(
      session.routeId ?? null,
      session.playDate,
      session.duration,
      session.startTime ?? null,
      session.endTime ?? null,
      session.autoRecord ? 1 : 0,
      session.id
    )
  }

  getByGame(gameId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE game_id = ?
      ORDER BY play_date ASC, start_time ASC
    `)
    const rows = stmt.all(gameId)
    return rows.map((row: any): Session => ({
      id: row.id,
      gameId: row.game_id,
      routeId: row.route_id,
      playDate: row.play_date,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      autoRecord: Boolean(row.auto_record)
    }))
  }

}
