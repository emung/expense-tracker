import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './queryKeys';
import type { MonthlyCategoryReport } from './types';

export function useMonthlyReport(month: string) {
  return useQuery({
    queryKey: queryKeys.reports.monthly(month),
    queryFn: () => api.get<MonthlyCategoryReport>('/reports/monthly-by-category', { month }),
    placeholderData: keepPreviousData,
  });
}
