import { describe, expect, it } from 'vitest';
import { addMonths, currentMonth, defaultEntryDate, isValidMonth, today } from './month';

const SEPT_12 = new Date(2026, 8, 12, 23, 30);

describe('month helpers', () => {
  it('uses local time for the current month and day', () => {
    expect(currentMonth(SEPT_12)).toBe('2026-09');
    expect(today(SEPT_12)).toBe('2026-09-12');
  });

  it.each([
    ['2026-08', 1, '2026-09'],
    ['2026-12', 1, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-08', -20, '2024-12'],
  ])('addMonths(%s, %i) = %s', (month, delta, expected) => {
    expect(addMonths(month, delta)).toBe(expected);
  });

  it('validates YYYY-MM', () => {
    expect(isValidMonth('2026-08')).toBe(true);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-8')).toBe(false);
    expect(isValidMonth(null)).toBe(false);
  });

  it('defaults new entries to today in the current month, otherwise the 1st', () => {
    expect(defaultEntryDate('2026-09', SEPT_12)).toBe('2026-09-12');
    expect(defaultEntryDate('2026-08', SEPT_12)).toBe('2026-08-01');
  });
});
