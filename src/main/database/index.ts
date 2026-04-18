// src/main/database/index.ts
import Database from 'better-sqlite3'


export function initDatabase(db: Database) {
  db.pragma('foreign_keys = ON');

  // 初始化 game 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
    
      -- 主键
      id TEXT PRIMARY KEY,          -- UUID v4

      -- 名称 & 简介
      original_title TEXT NOT NULL, -- 原始标题
      localized_title TEXT,         -- 中文标题
      sort_num INTEGER,             -- 排序编号
      description TEXT,             -- 游戏简介
      tags TEXT,                    -- 游戏标签
      guide TEXT,                   -- 游戏攻略

      -- 基本信息
      developer TEXT,        -- 开发商
      publisher TEXT,        -- 发行商
      release_date TEXT,     -- 发行时间 yyyy-mm-dd
      estimated_time TEXT,   -- 预计游戏时长 -h-m
      erogame_score INTEGER, -- 0 - 100
      bgm_score REAL,        -- 0.0 - 10.0
      vndb_score REAL,       -- 0.0 - 10.0

      -- 外部信息源 ID
      bgm_id TEXT,          -- bangumi.tv
      vndb_id TEXT,         -- vndb.org
      steam_id TEXT,        -- steampowered.com
      ymgal_id TEXT,        -- ymgal.games

      -- 安装路径
      exe_path TEXT,    -- 可执行文件路径

      -- 媒体资源路径
      cover_path TEXT,  -- 封面图
      banner_path TEXT, -- 横幅图
      icon_path TEXT,   -- 图标

      -- Staff 信息
      planner TEXT,    -- 企划
      scenario TEXT,   -- 脚本
      artist TEXT,     -- 原画
      music TEXT,      -- 音乐

      -- Cast 信息
      cast TEXT,       -- [ { character: '', voiceActor: '' } ]

      -- 个人记录 record
      add_time TEXT DEFAULT CURRENT_TIMESTAMP,  -- 添加时间 ISO datetime
      last_run_date TEXT,                       -- 最后运行日期 ISO datetime
      play_status TEXT DEFAULT 'NotStarted',    -- 游玩状态 NotStarted Playing OnHold Completed
      personal_score FLOAT,                     -- 个人评分 1-10
      session_playtime INTEGER DEFAULT 0,       -- 计时游玩时长 / seconds
      extra_playtime INTEGER DEFAULT 0,         -- 额外的游玩时间记录 / seconds
      session_count INTEGER DEFAULT 0,          -- 游玩次数

      -- 设置项
      nsfw BOOLEAN DEFAULT FALSE,
      magpie BOOLEAN DEFAULT FALSE,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- 记录创建时间
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP  -- 记录更新时间
      -- 注意 update 字段不会自动更新, 需要在更新记录时手动设置为 CURRENT_TIMESTAMP
    )
  `)

  // 初始化 route 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,               -- UUID v4
      game_id TEXT NOT NULL,             -- 游戏 ID
      order_num INTEGER,                 -- 线路顺序编号, 用于排序显示

      name TEXT NOT NULL,                -- 线路名称
      description TEXT,                  -- 备注说明

      route_type TEXT DEFAULT 'Normal',      -- 线路类型
      play_status TEXT DEFAULT 'NotStarted', -- 游玩状态

      created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- 记录创建时间
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP, -- 记录更新时间

      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  // 初始化 session 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,          -- UUID v4

      game_id TEXT NOT NULL,        -- 游戏 ID
      route_id TEXT,                -- 线路 ID

      local_date TEXT NOT NULL,   -- 游玩日期 yyyy-mm-dd
      start_time TEXT,            -- 开始时间 ISO datetime
      end_time TEXT,              -- 结束时间 ISO datetime
      duration INTEGER NOT NULL,  -- 游玩时长 INT seconds

      auto_record INTEGER,        -- 是否为自动记录

      created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- 记录创建时间
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP, -- 记录更新时间

      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,

      CHECK (
        (start_time IS NOT NULL AND end_time IS NOT NULL)
        OR
        (start_time IS NULL AND end_time IS NULL)
      )
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_routes_game_id
    ON routes(game_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_game_time
    ON sessions(game_id, start_time DESC);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_route_time
    ON sessions(route_id, start_time DESC);
  `);

  // 创建触发器
  db.exec(`
    -- 1. 当插入新的 Session 时
    CREATE TRIGGER IF NOT EXISTS update_game_time_after_insert
    AFTER INSERT ON sessions
    BEGIN
        UPDATE games 
        SET session_playtime = (
            SELECT COALESCE(SUM(duration), 0)
            FROM sessions 
            WHERE game_id = NEW.game_id
        )
        WHERE id = NEW.game_id;
    END;

    -- 2. 当 Session 的时长 duration 被更新时
    CREATE TRIGGER IF NOT EXISTS update_game_time_after_update
    AFTER UPDATE OF duration ON sessions
    BEGIN
        UPDATE games 
        SET session_playtime = (
            SELECT COALESCE(SUM(duration), 0)
            FROM sessions 
            WHERE game_id = NEW.game_id
        )
        WHERE id = NEW.game_id;
    END;

    -- 3. 当 Session 被删除时
    CREATE TRIGGER IF NOT EXISTS update_game_time_after_delete
    AFTER DELETE ON sessions
    BEGIN
        UPDATE games 
        SET session_playtime = (
            SELECT COALESCE(SUM(duration), 0)
            FROM sessions 
            WHERE game_id = OLD.game_id
        )
        WHERE id = OLD.game_id;
    END;
  `)
}