import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './queryKeys';
import type { MerchantRule, MerchantRuleRequest } from './types';

export function useMerchantRules(query: string) {
  return useQuery({
    queryKey: queryKeys.merchantRules.list(query),
    queryFn: () => api.get<MerchantRule[]>('/merchant-rules', { q: query }),
  });
}

/** A rule decides what the next entry for that merchant looks like, so suggestions go stale with it. */
function useInvalidateAfterRuleChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantRules.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
    ]);
}

export function useSaveMerchantRule() {
  const invalidate = useInvalidateAfterRuleChange();
  return useMutation({
    mutationFn: ({ id, request }: { id?: number; request: MerchantRuleRequest }) =>
      id == null ? api.post<MerchantRule>('/merchant-rules', request) : api.put<MerchantRule>(`/merchant-rules/${id}`, request),
    onSuccess: invalidate,
  });
}

export function useDeleteMerchantRule() {
  const invalidate = useInvalidateAfterRuleChange();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/merchant-rules/${id}`),
    onSuccess: invalidate,
  });
}
