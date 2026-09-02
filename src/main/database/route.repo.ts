import type { Route } from '@/shared/types'
import type { Database } from 'better-sqlite3'

export class RouteRepository {
  constructor(private db: Database) {}

  // 获取某个游戏的全部 route[]
  getByGame(gameId: string): Route[] {
    return this.db.prepare(`
      SELECT
        id,
        game_id AS gameId,
        name,
        description,
        COALESCE(color, '') AS color,
        type,
        "order",
        status,
        COALESCE(playtime, 0) AS playtime
      FROM routes
      WHERE game_id = ?
      ORDER BY "order" ASC, created_at ASC
    `).all(gameId) as Route[]
  }

  // 整体同步编辑器草稿；upsert 保留未删除线路的稳定 ID，供后续 Session 继续关联。
  saveForGame(gameId: string, routes: Route[]): Route[] {
    const upsert = this.db.prepare(`
      INSERT INTO routes (
        id, game_id, name, description, color, type, "order", status, playtime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        color = excluded.color,
        type = excluded.type,
        "order" = excluded."order",
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
      WHERE routes.game_id = excluded.game_id
    `)

    // 写入与删除必须原子完成，避免保存中途失败后只留下部分线路。
    this.db.transaction(() => {
      for (const route of routes) {
        upsert.run(
          route.id,
          gameId,
          route.name,
          route.description ?? null,
          route.color,
          route.type,
          route.order,
          route.status
        )
      }

      if (routes.length === 0) {
        this.db.prepare('DELETE FROM routes WHERE game_id = ?').run(gameId)
      } else {
        const placeholders = routes.map(() => '?').join(', ')
        this.db.prepare(`
          DELETE FROM routes
          WHERE game_id = ? AND id NOT IN (${placeholders})
        `).run(gameId, ...routes.map(route => route.id))
      }
    })()

    return this.getByGame(gameId)
  }
}
