export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function defaultStartTime(): number {
  const lookbackDays = Number(process.env.SYNC_LOOKBACK_DAYS ?? "365");
  return Date.now() - lookbackDays * MS_PER_DAY;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

