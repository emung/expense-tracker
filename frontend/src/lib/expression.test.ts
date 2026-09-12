import { describe, expect, it } from 'vitest';
import { evaluateExpression, isFormula, roundToCents } from './expression';

function valueOf(input: string): number {
  const result = evaluateExpression(input);
  if (!result.ok) {
    throw new Error(`expected "${input}" to evaluate, got: ${result.error}`);
  }
  return result.value;
}

describe('evaluateExpression', () => {
  it.each([
    // Formulas copied from the original Numbers sheet
    ['-88,74+38.99', -49.75],
    ['-22.64-8.98-180-50-90-12-7-26-20', -416.62],
    ['-25-62.97-26.98-54-6-10-5-160-20-8-117.97-7-41.8-14.98', -559.7],
    ['300*5,227133', 1568.14],
    ['-19.98*5.2452', -104.8],
    ['-102.58+80', -22.58],
  ])('evaluates spreadsheet formula %s', (input, expected) => {
    expect(valueOf(input)).toBe(expected);
  });

  it.each([
    ['49,75', 49.75],
    ['2+3*4', 14],
    ['(2+3)*4', 20],
    ['-(2+3)', -5],
    ['2*-3', -6],
    ['--5', 5],
    ['10/4', 2.5],
    ['  1,5 + 2 ', 3.5],
    ['1/3', 0.33],
    ['2/3', 0.67],
  ])('evaluates %s', (input, expected) => {
    expect(valueOf(input)).toBe(expected);
  });

  it.each(['', '   ', '2+', 'abc', '1..2', '1.234,56', '()', '(1+2', '1+2)', '1/0', '1 2', '5%'])('rejects %j', (input) => {
    const result = evaluateExpression(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toBe('');
    }
  });

  it('rejects very long input', () => {
    expect(evaluateExpression('1+'.repeat(150) + '1').ok).toBe(false);
  });
});

describe('isFormula', () => {
  it.each([
    ['49,75', false],
    ['-49,75', false],
    [' -10 ', false],
    ['-88,74+38.99', true],
    ['10-2', true],
    ['300*5', true],
    ['(5)', true],
  ])('%s -> %s', (input, expected) => {
    expect(isFormula(input)).toBe(expected);
  });
});

describe('roundToCents', () => {
  it('rounds half away from zero symmetrically', () => {
    expect(roundToCents(1.005)).toBe(1.01);
    expect(roundToCents(-1.005)).toBe(-1.01);
    expect(roundToCents(-0.001)).toBe(0);
  });
});
