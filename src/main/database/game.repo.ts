// src/main/db/game.repo.ts
import { db } from './index'
import { v4 as uuid } from 'uuid'
import type { Game, NewGame } from '@/shared/types'
import { rowToGame } from './game.mapper'

// 添加游戏
export function addGame(game: NewGame) {
  const id = uuid()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO games (id, original_title, description)
    VALUES (?, ?, ?)
  `)
  stmt.run(id, game.originalTitle, JSON.stringify(game.description))
  return id
}

// 删除游戏
export function deleteGame(id: string): boolean {
  const stmt = db.prepare(`
    DELETE FROM games
    WHERE id = ?
  `)
  const result = stmt.run(id)
  return result.changes > 0
}

// 获取全部游戏
export function getAllGames(): Game[] {
  const stmt = db.prepare(`SELECT * FROM games`)
  const rows = stmt.all()
  return rows.map(rowToGame)
}