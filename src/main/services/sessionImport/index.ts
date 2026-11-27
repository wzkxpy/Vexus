import { SessionService } from "../../database/session.service";
import { parsePotatoVNSessions } from "./potato.parser";
import { parseVniteSessions } from "./vnite.parser";
import { parseVexusSessions } from "./vexus.parser";
import { SESSION_EXPORT_FORMAT } from '@/shared/sessionExport';
import { logger } from '../../logger';
import { UserError } from '../../utils/errors';

export class SessionImportService {
  constructor(private sessionService: SessionService) {}

  import(gameId: string, text: string) {
    const data = parseText(text);
    if (data.format === SESSION_EXPORT_FORMAT) {
      const sessions = parseVexusSessions(gameId, data);
      this.sessionService.importSessions(gameId, sessions);
      logger.info('session-import', 'imported', { gameId, source: 'vexus', count: sessions.length });
      return;
    }
    const isPotatoVN = 'PlayedTime' in data;
    const isVnite = 'timers' in data && 'dailyPlayTimes' in data;
    if (isPotatoVN === isVnite) {
      throw new UserError('无法识别导入格式');
    }
    const source = isPotatoVN ? 'potatovn' : 'vnite';
    const sessions = isPotatoVN
      ? parsePotatoVNSessions(gameId, data)
      : parseVniteSessions(gameId, data);
    this.sessionService.importSessions(gameId, sessions);
    logger.info('session-import', 'imported', { gameId, source, count: sessions.length });
  }
}

// 转化 JSON 文本为对象
function parseText(text: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new UserError('JSON 格式无效');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new UserError('JSON 根节点必须是对象');
  }
  return value as Record<string, unknown>;
}
