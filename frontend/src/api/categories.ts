import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './queryKeys';
import type { Category, CategoryRequest } from './types';

export function useCategories(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.categories.list(includeArchived),
    queryFn: () => api.get<Category[]>('/categories', { includeArchived }),
  });
}

/** Names and archive state show up in expense rows and reports, so those are refreshed too. */
function useInvalidateAfterCategoryChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
    ]);
}

export function useSaveCategory() {
  const invalidate = useInvalidateAfterCategoryChange();
  return useMutation({
    mutationFn: ({ id, request }: { id?: number; request: CategoryRequest }) =>
      id == null ? api.post<Category>('/categories', request) : api.put<Category>(`/categories/${id}`, request),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateAfterCategoryChange();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: invalidate,
  });
}
