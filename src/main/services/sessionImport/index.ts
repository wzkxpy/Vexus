import { SessionService } from "../../database/session.service";
import { parsePotatoVNSessions } from "./potato.parser";
import { parseVniteSessions } from "./vnite.parser";

export class SessionImportService {
  constructor(private sessionService: SessionService) {}

  import(gameId: string, text: string) {
    const data = parseText(text);
    const isPotatoVN = 'PlayedTime' in data;
    const isVnite = 'timers' in data && 'dailyPlayTimes' in data;
    if (isPotatoVN === isVnite) {
      throw new Error('无法识别导入格式');
    }
    const sessions = isPotatoVN
      ? parsePotatoVNSessions(gameId, data)
      : parseVniteSessions(gameId, data);
    this.sessionService.importSessions(gameId, sessions);
  }
}

// 转化 JSON 文本为对象
function parseText(text: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('JSON 格式无效');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('JSON 根节点必须是对象');
  }
  return value as Record<string, unknown>;
}
