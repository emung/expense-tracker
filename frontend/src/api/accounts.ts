import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './queryKeys';
import type { Account, AccountRequest } from './types';

export function useAccounts(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.accounts.list(includeArchived),
    queryFn: () => api.get<Account[]>('/accounts', { includeArchived }),
  });
}

/** Account names show up in expense rows, so those are refreshed too. */
function useInvalidateAfterAccountChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
    ]);
}

export function useSaveAccount() {
  const invalidate = useInvalidateAfterAccountChange();
  return useMutation({
    mutationFn: ({ id, request }: { id?: number; request: AccountRequest }) =>
      id == null ? api.post<Account>('/accounts', request) : api.put<Account>(`/accounts/${id}`, request),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAfterAccountChange();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/accounts/${id}`),
    onSuccess: invalidate,
  });
}
