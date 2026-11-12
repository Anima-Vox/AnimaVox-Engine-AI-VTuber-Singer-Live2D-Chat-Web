/** 存下来的时间都是 ISO 字串；这里把它们转成界面上显示的样子 */

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** 会话侧栏用的简短时间：今天显示 HH:mm，昨天显示 yesterdayLabel，更早显示 MM/DD */
export function formatSidebarTime(
  iso: string,
  yesterdayLabel: string,
  now: Date = new Date(),
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, now)) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return yesterdayLabel;
  }

  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

/** 消息气泡下方的完整时间：HH:mm */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
