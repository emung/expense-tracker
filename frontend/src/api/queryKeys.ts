import type { ExpenseFilters } from './types';

/** Hierarchical keys so mutations can invalidate a whole family (e.g. every expenses page). */
export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    list: (filters: ExpenseFilters) => ['expenses', 'list', filters] as const,
    merchants: (query: string) => ['expenses', 'merchants', query] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: (includeArchived: boolean) => ['categories', { includeArchived }] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    list: (includeArchived: boolean) => ['accounts', { includeArchived }] as const,
  },
  merchantRules: {
    all: ['merchantRules'] as const,
    list: (query: string) => ['merchantRules', 'list', query] as const,
  },
  reports: {
    all: ['reports'] as const,
    monthly: (month: string) => ['reports', 'monthly', month] as const,
  },
};
