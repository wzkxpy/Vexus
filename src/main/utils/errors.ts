// 用户输入或用户数据导致的预期失败；日志按 warn 记录，避免污染内部错误。
export class UserError extends Error {}

export function isUserError(error: unknown): error is UserError {
  return error instanceof UserError
}