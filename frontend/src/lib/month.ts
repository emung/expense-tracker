/** Month and date helpers working on ISO strings (`YYYY-MM`, `YYYY-MM-DD`) in the browser's local time. */

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const pad = (value: number) => String(value).padStart(2, '0');

export function isValidMonth(value: string | null | undefined): value is string {
  return value != null && MONTH.test(value);
}

export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function today(now: Date = new Date()): string {
  return `${currentMonth(now)}-${pad(now.getDate())}`;
}

/** `2026-12` + 1 -> `2027-01` */
export function addMonths(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number) as [number, number];
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** New entries default to today when viewing the current month, otherwise to the first day of the viewed month. */
export function defaultEntryDate(viewedMonth: string, now: Date = new Date()): string {
  return viewedMonth === currentMonth(now) ? today(now) : `${viewedMonth}-01`;
}
