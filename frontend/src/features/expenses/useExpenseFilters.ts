import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import type { EntryType, ExpenseFilters } from '../../api/types';
import { useMonthParam } from '../../hooks/useMonthParam';

export const PAGE_SIZE = 50;
export const DEFAULT_SORT = 'expenseDate,desc';

const SORTS = new Set(['expenseDate,desc', 'expenseDate,asc', 'amountRon,desc', 'amountRon,asc', 'merchant,asc', 'merchant,desc']);

function toId(value: string | null): number | undefined {
  const id = Number(value);
  return value && Number.isInteger(id) && id > 0 ? id : undefined;
}

/**
 * Expense list filters kept in the URL (Romanian parameter names):
 * `?luna=2026-08&categorie=3&cont=1&tip=REFUND&q=penny&pagina=2&sort=amountRon,desc`
 */
export function useExpenseFilters() {
  const [params, setParams] = useSearchParams();
  const [month, setMonth] = useMonthParam();

  const rawType = params.get('tip');
  const type: EntryType | undefined = rawType === 'EXPENSE' || rawType === 'REFUND' ? rawType : undefined;
  const rawSort = params.get('sort') ?? DEFAULT_SORT;
  const pageParam = Number(params.get('pagina'));

  const filters: ExpenseFilters = {
    month,
    categoryId: toId(params.get('categorie')),
    accountId: toId(params.get('cont')),
    type,
    q: params.get('q')?.trim() || undefined,
    page: Number.isInteger(pageParam) && pageParam > 1 ? pageParam - 1 : 0,
    size: PAGE_SIZE,
    sort: SORTS.has(rawSort) ? rawSort : DEFAULT_SORT,
  };

  const update = useCallback(
    (changes: Record<string, string | null>, options: { resetPage?: boolean; replace?: boolean } = {}) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          }
          if (options.resetPage ?? true) next.delete('pagina');
          return next;
        },
        { replace: options.replace },
      ),
    [setParams],
  );

  return {
    filters,
    month,
    setMonth,
    hasActiveFilters: Boolean(filters.categoryId || filters.accountId || filters.type || filters.q),
    setCategory: (id: number | undefined) => update({ categorie: id ? String(id) : null }),
    setAccount: (id: number | undefined) => update({ cont: id ? String(id) : null }),
    setType: (value: EntryType | undefined) => update({ tip: value ?? null }),
    setQuery: (query: string) => update({ q: query.trim() || null }, { replace: true }),
    setSort: (sort: string) => update({ sort: sort === DEFAULT_SORT ? null : sort }),
    setPage: (zeroBasedPage: number) => update({ pagina: zeroBasedPage > 0 ? String(zeroBasedPage + 1) : null }, { resetPage: false }),
    clearFilters: () => update({ categorie: null, cont: null, tip: null, q: null }),
  };
}
