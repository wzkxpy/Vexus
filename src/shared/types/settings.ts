

export type GameSortType =
    | 'addedAt' // 游戏添加时间
    | 'title' // localizedTitle or originalTitle
    | 'playtime' // sessionPlaytime + extraPlaytime
    | 'score' // 个人评分 personalScore
    | 'releaseDate' // 发售日期
    | 'lastRunAt' // 最近游玩时间
    | 'custom' // 自定义排序 sortNum

export interface Settings {
  // 通用设置
  autoLaunch: boolean  // 开机自启
  theme: 'light' | 'dark' | 'system' // 主题
  gameTitle: 'Orig' | 'Local' // 游戏标题显示原名 or 译名
  subTitle: boolean // 是否区分展示主副标题
  playtimeFormat: 'detail' | 'decimal' // 总时长展示格式：XhYm 或 X.Xh
  // 账号设置
  bangumiToken: string
  // 工具设置
  magpiePath: string // magpie路径
  magpieHotkey: string // magpie快捷键
  // 代理设置
  proxy: {
    enabled: boolean // 是否启用代理
    protocol: 'http' | 'https' | 'socks5' // 代理协议
    host: string     // 代理服务器地址
    port: number     // 代理服务器端口
  }
  // 游戏排序设置
  gameSortType: GameSortType
  gameSortOrder: 'asc' | 'desc'
  // 游戏库显示设置
  librarySeriesMode: boolean
}
