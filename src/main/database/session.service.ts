import { SessionRepository } from "./session.repo";
import { Session } from "@/shared/types";


export class SessionService {
  constructor(private repo: SessionRepository) {}

  addSession(session: Session) {
    this.validateSession(session)
    this.repo.add(session);
  }

  deleteSession(id: string) {
    this.repo.delete(id);
  }

  updateSession(session: Session) {
    this.validateSession(session)
    this.repo.update(session)
  }

  getGameSessions(gameId: string) {
    return this.repo.getByGame(gameId);
  }

  importSessions(gameId: string, sessions: Session[]) {
    if (sessions.length === 0) {
      throw new Error('没有可导入的游玩记录')
    }

    for (const session of sessions) {
      if (session.gameId !== gameId) {
        throw new Error('Session game id mismatch')
      }
      this.validateSessionFields(session)
    }

    // 覆盖时旧记录会被删除，只需保证新批次内部不存在时间重叠。
    this.validateNoOverlap(sessions)
    return this.repo.importForGame(gameId, sessions)
  }

/**************************************************/

  private validateSession(session: Session) {
    this.validateSessionFields(session)
    if (!session.startedAt || !session.endedAt) return
    const start = Date.parse(session.startedAt)
    const end = Date.parse(session.endedAt)
    // 单条新增或修改时，需要与数据库中的现有记录比较。
    const sessions = this.getGameSessions(session.gameId)
    for (const existing of sessions) {
      if (existing.id === session.id) continue
      if (!existing.startedAt || !existing.endedAt) continue
      // 检测时间重叠
      const existingStart = Date.parse(existing.startedAt)
      const existingEnd = Date.parse(existing.endedAt)
      if (start < existingEnd && end > existingStart) {
        throw new Error('Playtime overlaps with existing records')
      }
    }
  }

  // 检查单条记录的字段有效性
  private validateSessionFields(session: Session) {
    if (!session.id) {
      throw new Error('Session id required')
    }
    if (!session.gameId) {
      throw new Error('Game id required')
    }
    if (!Number.isFinite(session.duration) || session.duration < 0 || session.duration > 86400) {
      throw new Error('Duration cannot be negative or more than one day')
    }
    const hasStartedAt = session.startedAt !== null
    const hasEndedAt = session.endedAt !== null
    if (hasStartedAt !== hasEndedAt) {
      throw new Error('Started at and ended at must both be provided')
    }
    if (!hasStartedAt || !hasEndedAt) return
    // 检测时间格式和逻辑
    const start = Date.parse(session.startedAt!)
    const end = Date.parse(session.endedAt!)
    if (!Number.isFinite(start) || !Number.isFinite(end)) { // isFinite 非无穷的数字
      throw new Error('Invalid session time')
    }
    if (end < start) {
      throw new Error('Ended at cannot be earlier than started at')
    }

  }

  // 检查批量导入的记录中是否存在时间重叠
  private validateNoOverlap(sessions: Session[]) {
    const timedSessions = sessions
      .filter(session => session.startedAt && session.endedAt)
      .sort((a, b) => Date.parse(a.startedAt!) - Date.parse(b.startedAt!))

    for (let index = 1; index < timedSessions.length; index += 1) {
      const previous = timedSessions[index - 1]
      const current = timedSessions[index]
      if (Date.parse(current.startedAt!) < Date.parse(previous.endedAt!)) {
        throw new Error('Playtime overlaps within replacement records')
      }
    }
  }
  
}
