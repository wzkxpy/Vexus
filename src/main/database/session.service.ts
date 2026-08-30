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

/**************************************************/

  private validateSession(session: Session) {
    if (!session.id) {
      throw new Error('Session id required')
    }
    if (!session.gameId) {
      throw new Error('Game id required')
    }
    if (!Number.isFinite(session.duration) || session.duration < 0 || session.duration > 86400) {
      throw new Error('Duration cannot be negative or more than one day')
    }

    // 检测 startedAt 和 endedAt 是否同时存在
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

    // 检测时间是否与已有记录重叠
    const sessions = this.getGameSessions(session.gameId)
    for (const s of sessions) {
      if (s.id === session.id) continue
      if (!s.startedAt || !s.endedAt) continue

      const sStart = Date.parse(s.startedAt)
      const sEnd = Date.parse(s.endedAt)
      const overlap = start < sEnd && end > sStart
      if (overlap) {
        throw new Error('Playtime overlaps with existing records')
      }
    }
  }
  
}
