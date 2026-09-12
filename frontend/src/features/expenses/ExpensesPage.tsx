import { Paper, Stack, Title } from '@mantine/core';
import { useState } from 'react';
import { useExpenses } from '../../api/expenses';
import type { Expense } from '../../api/types';
import { MonthPicker } from '../../components/MonthPicker';
import { PageHeader } from '../../components/PageHeader';
import { CenteredLoader, QueryError } from '../../components/QueryState';
import { labels } from '../../lib/labels';
import { defaultEntryDate } from '../../lib/month';
import { EditExpenseModal } from './EditExpenseModal';
import { ExpenseFiltersBar } from './ExpenseFiltersBar';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseTable } from './ExpenseTable';
import { DEFAULT_SORT, useExpenseFilters } from './useExpenseFilters';

export function ExpensesPage() {
  const view = useExpenseFilters();
  const expenses = useExpenses(view.filters);
  const [editing, setEditing] = useState<Expense | null>(null);

  return (
    <>
      <PageHeader title={labels.nav.expenses}>
        <MonthPicker value={view.month} onChange={view.setMonth} />
      </PageHeader>

      <Stack gap="lg">
        <Paper withBorder p="md" radius="md" component="section" aria-labelledby="quick-add-title">
          <Title order={3} size="h5" mb="xs" id="quick-add-title">
            Adaugă o înregistrare
          </Title>
          {/* Re-keyed per month so the default date follows the month being viewed. */}
          <ExpenseForm key={view.month} defaultDate={defaultEntryDate(view.month)} />
        </Paper>

        <Stack gap="sm" component="section" aria-label="Înregistrările lunii">
          <ExpenseFiltersBar
            filters={view.filters}
            hasActiveFilters={view.hasActiveFilters}
            onCategoryChange={view.setCategory}
            onAccountChange={view.setAccount}
            onTypeChange={view.setType}
            onQueryChange={view.setQuery}
            onClear={view.clearFilters}
          />
          {expenses.isPending ? (
            <CenteredLoader />
          ) : expenses.isError ? (
            <QueryError error={expenses.error} onRetry={() => void expenses.refetch()} />
          ) : (
            <ExpenseTable
              data={expenses.data}
              month={view.month}
              sort={view.filters.sort ?? DEFAULT_SORT}
              filtered={view.hasActiveFilters}
              stale={expenses.isPlaceholderData}
              onSortChange={view.setSort}
              onPageChange={view.setPage}
              onEdit={setEditing}
            />
          )}
        </Stack>
      </Stack>

      <EditExpenseModal expense={editing} onClose={() => setEditing(null)} />
    </>
  );
}
