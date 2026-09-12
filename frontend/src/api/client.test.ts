import { describe, expect, it } from 'vitest';
import { ApiError, toQueryString } from './client';

describe('toQueryString', () => {
  it('skips empty values and encodes the rest', () => {
    expect(toQueryString({ month: '2026-08', q: 'Pizza Cluj', categoryId: undefined, type: null, sort: '' })).toBe(
      '?month=2026-08&q=Pizza+Cluj',
    );
  });

  it('returns an empty string without params', () => {
    expect(toQueryString()).toBe('');
  });
});

describe('ApiError', () => {
  it('exposes the detail as message and field errors as a map', () => {
    const error = new ApiError(400, {
      title: 'Date invalide',
      detail: 'Verificați câmpurile marcate.',
      errors: [
        { field: 'merchant', message: 'Magazinul este obligatoriu.' },
        { field: 'fxRate', message: 'Cursul de schimb este obligatoriu pentru EUR.' },
      ],
    });

    expect(error.message).toBe('Verificați câmpurile marcate.');
    expect(error.fieldErrors).toEqual({
      merchant: 'Magazinul este obligatoriu.',
      fxRate: 'Cursul de schimb este obligatoriu pentru EUR.',
    });
  });
});
