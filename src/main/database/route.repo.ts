import { ROUTE_TYPE_OPTIONS, type Route, type RouteStatus } from '@/shared/types'
import type { Database } from 'better-sqlite3'
import { rowToRoute, type RouteRow } from './route.mapper'

export class RouteRepository {
  constructor(private db: Database) {}

  transaction<T>(work: () => T): T { return this.db.transaction(work)() }

  saveLock(route: Route): void {
    this.db.prepare('UPDATE routes SET lock_condition = ? WHERE id = ? AND game_id = ?')
      .run(JSON.stringify(route.lockCondition), route.id, route.gameId)
  }

  // 自动记录在启动时绑定到当前游玩中的线路；无游玩中线路时不归属。
  getPlayingRouteId(gameId: string): string | null {
    const row = this.db.prepare(`
      SELECT id FROM routes
      WHERE game_id = ? AND status = 'Playing'
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `).get(gameId) as { id: string } | undefined
    return row?.id ?? null
  }

  belongsToGame(routeId: string, gameId: string): boolean {
    return Boolean(this.db.prepare('SELECT 1 FROM routes WHERE id = ? AND game_id = ?')
      .get(routeId, gameId))
  }

  // 获取某个游戏的全部 route[]
  getByGame(gameId: string): Route[] {
    const rows = this.db.prepare(`
      SELECT
        id, game_id,
        name, description, color,
        type,
        lock_condition,
        status,
        (SELECT COALESCE(SUM(duration), 0) FROM sessions
         WHERE sessions.route_id = routes.id AND sessions.game_id = routes.game_id) AS playtime
      FROM routes
      WHERE game_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(gameId) as RouteRow[]
    return rows.map(rowToRoute)
  }

  updateStatus(gameId: string, routeId: string, status: RouteStatus): Route[] {
    return this.db.transaction(() => {
      if (status === 'Playing') {
        const mainTypes = ROUTE_TYPE_OPTIONS.filter(option => option.isMain).map(option => option.value)
        // 交接与新状态必须一起提交；失败时恢复原线路，且不改动其它游戏。
        this.db.prepare(`
          UPDATE routes
          SET status = CASE WHEN type IN (${mainTypes.map(() => '?').join(', ')})
            THEN 'Completed' ELSE 'OnHold' END,
            updated_at = CURRENT_TIMESTAMP
          WHERE game_id = ? AND id != ? AND status = 'Playing'
        `).run(...mainTypes, gameId, routeId)
      }
      // 只更新状态，保留线路编辑、剧情锁以及所有游玩记录。
      const result = this.db.prepare(`
        UPDATE routes SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND game_id = ?
      `).run(status, routeId, gameId)
      if (result.changes !== 1) throw new Error('Route not found')
      return this.getByGame(gameId)
    })()
  }

  // 整体同步编辑器草稿；upsert 保留未删除线路的稳定 ID，供后续 Session 继续关联。
  saveForGame(gameId: string, routes: Route[]): Route[] {
    const upsert = this.db.prepare(`
      INSERT INTO routes (
        id, game_id, name, description, color, type, lock_condition, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        color = excluded.color,
        type = excluded.type,
        lock_condition = excluded.lock_condition,
        updated_at = CURRENT_TIMESTAMP
      WHERE routes.game_id = excluded.game_id
    `)

    // 写入与删除必须原子完成，避免保存中途失败后只留下部分线路。
    this.db.transaction(() => {
      for (const route of routes) {
        const result = upsert.run(
          route.id,
          gameId,
          route.name,
          route.description ?? null,
          route.color,
          route.type,
          route.lockCondition === null ? null : JSON.stringify(route.lockCondition),
          // 编辑器只保存线路结构；旧草稿不能恢复先前的游玩状态。
          'NotStarted'
        )
        if (result.changes !== 1) throw new Error('Route belongs to another game')
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
