

export type GameSortType =
    | 'addTime' // 游戏添加时间
    | 'title' // localizedTitle or originalTitle
    | 'playtime' // sessionPlaytime + extraPlaytime
    | 'score' // 个人评分 personalScore
    | 'releaseDate' // 发售日期
    | 'lastRunDate' // 最近游玩时间 
    | 'custom' // 自定义排序 sortNum