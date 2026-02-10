import Database from 'better-sqlite3'
import * as path from 'path'
import { app } from 'electron'

const dbPath = path.join(app.getPath('userData'), 'vexus.db')

export const db = new Database(dbPath)

// 初始化表
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL
  )
`)
