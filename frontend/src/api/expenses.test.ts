import { describe, expect, it } from 'vitest';
import { requestFrom } from './expenses';
import type { Expense } from './types';

function expenseWith(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 42,
    expenseDate: '2026-09-20',
    merchant: 'Penny',
    categoryId: 3,
    categoryName: 'Consumabile',
    accountId: 1,
    accountName: 'SaltBank',
    type: 'EXPENSE',
    originalAmount: 49.75,
    originalCurrency: 'RON',
    fxRate: 1,
    amountRon: 49.75,
    signedAmountRon: -49.75,
    amountExpression: null,
    details: null,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    ...overrides,
  };
}

describe('requestFrom', () => {
  it('drops the server-derived fields', () => {
    expect(requestFrom(expenseWith())).toStrictEqual({
      expenseDate: '2026-09-20',
      merchant: 'Penny',
      categoryId: 3,
      accountId: 1,
      type: 'EXPENSE',
      originalAmount: 49.75,
      originalCurrency: 'RON',
      fxRate: null,
      amountExpression: null,
      details: null,
    });
  });

  it('omits the rate of a RON entry, which the server stores as 1', () => {
    expect(requestFrom(expenseWith({ fxRate: 1 })).fxRate).toBeNull();
  });

  it('keeps the rate of an EUR entry', () => {
    const request = requestFrom(expenseWith({ originalCurrency: 'EUR', originalAmount: 19.99, fxRate: 5.2452, amountRon: 104.85 }));
    expect(request).toMatchObject({ originalCurrency: 'EUR', originalAmount: 19.99, fxRate: 5.2452 });
  });

  it('takes the positive amount, never the signed one', () => {
    const request = requestFrom(expenseWith({ originalAmount: 49.75, signedAmountRon: -49.75 }));
    expect(request.originalAmount).toBe(49.75);
  });

  it('keeps a refund a refund', () => {
    expect(requestFrom(expenseWith({ type: 'REFUND', signedAmountRon: 49.75 })).type).toBe('REFUND');
  });

  it('round-trips the formula and the details', () => {
    const request = requestFrom(expenseWith({ amountExpression: '-88,74+38.99', details: 'retur parțial' }));
    expect(request).toMatchObject({ amountExpression: '-88,74+38.99', details: 'retur parțial' });
  });
});
