// src/shared/types/game.ts
export interface Game {
  id: string      // 数据库主键，由系统生成
  name: string
  data: string
  // 未来扩展字段
}

// 新建游戏时的类型，调用者只能传 name 和 data
export type NewGame = Omit<Game, 'id'>