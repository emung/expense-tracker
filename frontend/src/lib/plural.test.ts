import { describe, expect, it } from 'vitest';
import { countLabel } from './plural';

describe('countLabel', () => {
  it.each([
    [0, '0 cheltuieli'],
    [1, '1 cheltuială'],
    [2, '2 cheltuieli'],
    [19, '19 cheltuieli'],
    [20, '20 de cheltuieli'],
    [100, '100 de cheltuieli'],
    [101, '101 cheltuieli'],
    [124, '124 de cheltuieli'],
  ])('%i -> %s', (count, expected) => {
    expect(countLabel(count, 'cheltuială', 'cheltuieli')).toBe(expected);
  });
});
