import dayjs from 'dayjs';

const ACCEPTED_FORMATS = ['DD.MM.YYYY', 'D.M.YYYY', 'DD.MM.YY', 'D.M.YY', 'YYYY-MM-DD'];

/** Parses dates typed the Romanian way (12.08.2026, 1.8.26) into ISO `YYYY-MM-DD`; requires dayjs customParseFormat. */
export function parseDateInput(input: string): string | null {
  const parsed = dayjs(input.trim(), ACCEPTED_FORMATS, true);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
}
