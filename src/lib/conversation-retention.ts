/** 伴读 / 自省会话保留策略（自动清理） */

/** 伴读：已关闭会话保留天数 */
export const COMPANION_CLOSED_RETENTION_DAYS = 30;
/** 伴读：每人最多保留会话数（含当前开放） */
export const COMPANION_MAX_CONVERSATIONS = 20;

/** 自省：已关闭会话保留天数 */
export const REFLECT_CLOSED_RETENTION_DAYS = 90;
/** 自省：每人最多保留会话数（含当前开放） */
export const REFLECT_MAX_CONVERSATIONS = 40;

export function retentionCutoff(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
