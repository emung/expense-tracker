import { describe, expect, it } from 'vitest';
import { parseDecimal, toRon } from './money';

describe('toRon', () => {
  it.each([
    [300, 5.227133, 1568.14],
    [19.98, 5.2452, 104.8],
    [1, 1.005, 1.01],
    [0.01, 0.4, 0],
    [1234567.89, 4.977, 6144444.39],
  ])('%s at %s = %s (same results as the backend MoneyCalculator)', (amount, rate, expected) => {
    expect(toRon(amount, rate)).toBe(expected);
  });

  it('keeps the sign of the amount', () => {
    expect(toRon(-300, 5.227133)).toBe(-1568.14);
  });
});

describe('parseDecimal', () => {
  it.each([
    ['5,227133', 5.227133],
    ['5.2452', 5.2452],
    [' 300 ', 300],
  ])('parses %j', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1.234,5', '5,', ',5', '1e3'])('rejects %j', (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});
