import {
  ARCHIVE_REASON_AUTO_48H,
  ARCHIVE_REASON_DAILY_CHECKIN,
  ARCHIVE_REASON_FOCUS_COMPLETE,
  ARCHIVE_REASON_MANUAL,
  ARCHIVE_REASON_PLAN_COMPLETE,
  ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER,
  ARCHIVE_REASON_PLAN_OVERDUE,
  ARCHIVE_REASON_REFLECT_ARCHIVE,
  ARCHIVE_REASON_USER_UPLOAD,
  ARCHIVE_TYPE_DAILY_CHECKIN,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_ESSAY_TOPIC,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_PLAN_CYCLE,
  ARCHIVE_TYPE_REFLECT_REPORT,
} from "@/db/schema";
import { stripToPlainText } from "@/lib/rich-text";

/** 知识库只收文本；纯图或仅占位标题「无标题」不可进知识库 */
export function archiveHasKeepableText(item: {
  title: string;
  body: string;
}) {
  if (stripToPlainText(item.body)) return true;
  const title = item.title.trim();
  return Boolean(title && title !== "无标题");
}

export function archiveTypeLabel(type: string) {
  switch (type) {
    case ARCHIVE_TYPE_ESSAY_SEDIMENT:
      return "随笔归档";
    case ARCHIVE_TYPE_ESSAY_TOPIC:
      return "专题归档";
    case ARCHIVE_TYPE_PLAN_ARCHIVE:
      return "规划归档";
    case ARCHIVE_TYPE_PLAN_CYCLE:
      return "周期计划归档";
    case ARCHIVE_TYPE_DAILY_CHECKIN:
      return "每日打卡归档";
    case ARCHIVE_TYPE_FOCUS_RECORD:
      return "专注记录";
    case ARCHIVE_TYPE_MEMORY_FRAGMENT:
      return "记忆碎片";
    case ARCHIVE_TYPE_REFLECT_REPORT:
      return "自省报告";
    default:
      return type;
  }
}

export function sourceModuleLabel(module: string) {
  switch (module) {
    case "present":
      return "今时际";
    case "future":
      return "来日途";
    case "focus":
      return "凝时";
    case "past":
      return "昔时往";
    case "reflect":
      return "自省";
    default:
      return module;
  }
}

export function archiveReasonLabel(reason: string) {
  switch (reason) {
    case ARCHIVE_REASON_MANUAL:
      return "手动归档";
    case ARCHIVE_REASON_AUTO_48H:
      return "逾时自动归档";
    case ARCHIVE_REASON_PLAN_COMPLETE:
      return "临期完成归档";
    case ARCHIVE_REASON_PLAN_OVERDUE:
      return "逾期自动归档";
    case ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER:
      return "周期计划滚期计次";
    case ARCHIVE_REASON_DAILY_CHECKIN:
      return "每日打卡";
    case ARCHIVE_REASON_FOCUS_COMPLETE:
      return "专注完成";
    case ARCHIVE_REASON_USER_UPLOAD:
      return "用户上传";
    case ARCHIVE_REASON_REFLECT_ARCHIVE:
      return "自省归档";
    default:
      return reason;
  }
}

/** 停留时长文案（创建 → 归档） */
export function formatDwell(createdAt: Date, archivedAt: Date) {
  const ms = Math.max(0, archivedAt.getTime() - createdAt.getTime());
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 1) return "不足 1 分钟";
  if (minutes < 60) return `约 ${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `约 ${hours} 小时`;
  const days = Math.floor(hours / 24);
  return `约 ${days} 天`;
}
