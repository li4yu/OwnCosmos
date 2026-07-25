export function remainingDaysLabel(days: number) {
  if (days > 1) return `还剩 ${days} 天`;
  if (days === 1) return "还剩 1 天";
  if (days === 0) return "今天到期";
  if (days === -1) return "已逾期 1 天";
  return `已逾期 ${Math.abs(days)} 天`;
}
