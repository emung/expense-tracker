import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseDateInput } from './dateInput';

beforeAll(() => {
  dayjs.extend(customParseFormat);
});

describe('parseDateInput', () => {
  it.each([
    ['12.08.2026', '2026-08-12'],
    ['1.8.2026', '2026-08-01'],
    ['01.08.26', '2026-08-01'],
    [' 2026-08-31 ', '2026-08-31'],
  ])('%j -> %s', (input, expected) => {
    expect(parseDateInput(input)).toBe(expected);
  });

  // "24.08.026" is a typo that actually occurs in the original spreadsheet.
  it.each(['24.08.026', '31.02.2026', '2026/08/12', 'ieri', ''])('rejects %j', (input) => {
    expect(parseDateInput(input)).toBeNull();
  });
});
