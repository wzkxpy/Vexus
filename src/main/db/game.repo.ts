// src/main/db/game.repo.ts
import { db } from './index'
import { v4 as uuid } from 'uuid'
import type { Game, NewGame } from '@/shared/types'


export function addGame(game: NewGame) {
  const id = uuid()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO games (id, name, data)
    VALUES (?, ?, ?)
  `)
  stmt.run(id, game.name, JSON.stringify(game.data))
  return id
}

export function deleteGame(id: string): boolean {
  const stmt = db.prepare(`
    DELETE FROM games
    WHERE id = ?
  `)
  const result = stmt.run(id)
  return result.changes > 0
}

export function getAllGames() {
  const stmt = db.prepare(`SELECT * FROM games`)
  return stmt.all().map(row => ({
    id: row.id,
    name: row.name,
    data: JSON.parse(row.data),
  }))
}
