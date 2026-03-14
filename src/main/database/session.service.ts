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
    if (session.duration < 0 || session.duration > 86400) {
      throw new Error('Duration cannot be negative or more than one day')
    }
    // TODO 检测一天时长不超过 24h
    if (!session.startTime && !session.endTime)
      return

    // 检测时间段重叠
    let start = new Date(`${session.playDate}T${session.startTime}`).getTime() / 1000
    let end = new Date(`${session.playDate}T${session.endTime}`).getTime() / 1000
    if (end < start) end += 24 * 3600

    const sessions = this.getGameSessions(session.gameId)
    for (const s of sessions) {
      if (s.id === session.id) continue
      if (!s.startTime || !s.endTime) continue

      let sStart = new Date(`${s.playDate}T${s.startTime}`).getTime() / 1000
      let sEnd = new Date(`${s.playDate}T${s.endTime}`).getTime() / 1000
      if (sEnd < sStart) sEnd += 24 * 3600

      const overlap = start < sEnd && end > sStart
      if (overlap) {
        throw new Error('Playtime overlaps with existing records')
      }
    }
  }
  
}
