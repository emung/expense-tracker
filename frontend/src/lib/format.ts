const amount = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
const rate = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 6, useGrouping: false });
const percent = new Intl.NumberFormat('ro-RO', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_NAMES = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
] as const;

/** `1568.14` -> `1.568,14 lei` */
export function formatRon(value: number): string {
  return `${amount.format(value)} lei`;
}

/** Like {@link formatRon} but always shows the sign: `+10,00 lei`, `-49,75 lei`. */
export function formatSignedRon(value: number): string {
  return value > 0 ? `+${formatRon(value)}` : formatRon(value);
}

/** `300` -> `300,00 €` */
export function formatEur(value: number): string {
  return `${amount.format(value)} €`;
}

/** Plain decimal in Romanian notation without currency: `1.568,14` */
export function formatAmount(value: number): string {
  return amount.format(value);
}

/** `5.227133` -> `5,227133` */
export function formatRate(value: number): string {
  return rate.format(value);
}

/** Percentage points (0-100) -> `67,03 %` */
export function formatPercent(points: number): string {
  return percent.format(points / 100);
}

/** ISO `2026-08-12` -> `12.08.2026`, without going through Date (no time-zone shifts). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

/** `2026-08` -> `august 2026` */
export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}
