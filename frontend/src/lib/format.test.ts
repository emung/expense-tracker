import { describe, expect, it } from 'vitest';
import { formatDate, formatEur, formatMonth, formatPercent, formatRate, formatRon, formatSignedRon } from './format';

describe('amounts', () => {
  it.each([
    [1568.14, '1.568,14 lei'],
    [49.75, '49,75 lei'],
    [1234, '1.234,00 lei'],
    [18394.54, '18.394,54 lei'],
    [0, '0,00 lei'],
    [-104.8, '-104,80 lei'],
  ])('formatRon(%s) = %s', (value, expected) => {
    expect(formatRon(value)).toBe(expected);
  });

  it('formatSignedRon marks refunds with a plus', () => {
    expect(formatSignedRon(10)).toBe('+10,00 lei');
    expect(formatSignedRon(-49.75)).toBe('-49,75 lei');
  });

  it('formats EUR and exchange rates', () => {
    expect(formatEur(300)).toBe('300,00 €');
    expect(formatRate(5.227133)).toBe('5,227133');
    expect(formatRate(5)).toBe('5,00');
  });

  it('formats percentage points', () => {
    expect(formatPercent(67.03)).toMatch(/^67,03\s%$/u);
  });
});

describe('dates', () => {
  it('formats ISO dates as dd.MM.yyyy without time-zone shifts', () => {
    expect(formatDate('2026-08-01')).toBe('01.08.2026');
    expect(formatDate('2026-12-31')).toBe('31.12.2026');
  });

  it('formats months in Romanian', () => {
    expect(formatMonth('2026-08')).toBe('august 2026');
    expect(formatMonth('2027-01')).toBe('ianuarie 2027');
  });
});
