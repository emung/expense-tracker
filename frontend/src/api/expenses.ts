import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './queryKeys';
import type { Expense, ExpenseFilters, ExpenseList, ExpenseRequest, MerchantSuggestion } from './types';

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: () => api.get<ExpenseList>('/expenses', { ...filters }),
    placeholderData: keepPreviousData,
  });
}

export function useMerchantSuggestions(query: string) {
  return useQuery({
    queryKey: queryKeys.expenses.merchants(query),
    queryFn: () => api.get<MerchantSuggestion[]>('/expenses/merchants', { q: query, limit: 10 }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Anything that changes an expense also changes totals, reports, usage counts and merchant
 * suggestions - and, because saving teaches the merchant's rule, the rules list too.
 */
function useInvalidateAfterExpenseChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantRules.all }),
    ]);
}

/**
 * The request that would re-create this expense. Used to undo a delete: the entry comes back with a
 * new id, which for a single-user tracker is a perfectly good undo.
 */
export function requestFrom(expense: Expense): ExpenseRequest {
  return {
    expenseDate: expense.expenseDate,
    merchant: expense.merchant,
    categoryId: expense.categoryId,
    accountId: expense.accountId,
    type: expense.type,
    // Already positive - the sign lives in `type`, never in `signedAmountRon`.
    originalAmount: expense.originalAmount,
    originalCurrency: expense.originalCurrency,
    // A RON entry carries a stored rate of 1; the request omits it, as the form does.
    fxRate: expense.originalCurrency === 'RON' ? null : expense.fxRate,
    amountExpression: expense.amountExpression,
    details: expense.details,
  };
}

export function useSaveExpense() {
  const invalidate = useInvalidateAfterExpenseChange();
  return useMutation({
    mutationFn: ({ id, request }: { id?: number; request: ExpenseRequest }) =>
      id == null ? api.post<Expense>('/expenses', request) : api.put<Expense>(`/expenses/${id}`, request),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidateAfterExpenseChange();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: invalidate,
  });
}
