import { ActionIcon, Box, Group, Pagination, Paper, SimpleGrid, Stack, Table, Text, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconPencil, IconSelector } from '@tabler/icons-react';
import type { Expense, ExpenseList } from '../../api/types';
import { formatDate, formatEur, formatMonth, formatRate, formatRon, formatSignedRon } from '../../lib/format';
import { labels } from '../../lib/labels';

const NUMERIC = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

type SortField = 'expenseDate' | 'merchant' | 'amountRon';

/** Direction used when a column is first clicked. */
const FIRST_DIRECTION: Record<SortField, 'asc' | 'desc'> = { expenseDate: 'desc', merchant: 'asc', amountRon: 'desc' };

interface ExpenseTableProps {
  data: ExpenseList;
  month: string;
  sort: string;
  filtered: boolean;
  /** True while a newer page is loading; the previous rows stay visible, dimmed. */
  stale: boolean;
  onSortChange: (sort: string) => void;
  onPageChange: (zeroBasedPage: number) => void;
  onEdit: (expense: Expense) => void;
}

export function ExpenseTable({ data, month, sort, filtered, stale, onSortChange, onPageChange, onEdit }: ExpenseTableProps) {
  const [sortField, sortDirection] = sort.split(',') as [SortField, 'asc' | 'desc'];

  const header = (field: SortField, label: string, align: 'left' | 'right' = 'left') => {
    const active = sortField === field;
    const Icon = active ? (sortDirection === 'asc' ? IconChevronUp : IconChevronDown) : IconSelector;
    const nextDirection = active ? (sortDirection === 'asc' ? 'desc' : 'asc') : FIRST_DIRECTION[field];
    return (
      <Table.Th ta={align} aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <UnstyledButton onClick={() => onSortChange(`${field},${nextDirection}`)} fw={600} fz="sm">
          <Group gap={4} wrap="nowrap" justify={align === 'right' ? 'flex-end' : 'flex-start'}>
            {label}
            <Icon size={14} stroke={1.75} aria-hidden />
          </Group>
        </UnstyledButton>
      </Table.Th>
    );
  };

  if (data.totalElements === 0) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Text c="dimmed" ta="center">
          {filtered ? 'Nicio înregistrare nu corespunde filtrelor.' : `Nicio cheltuială în ${formatMonth(month)}.`}
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="sm">
      <Paper withBorder radius="md" style={{ opacity: stale ? 0.6 : 1, transition: 'opacity 150ms' }}>
        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {header('expenseDate', labels.fields.date)}
                {header('merchant', labels.fields.merchant)}
                <Table.Th>{labels.fields.category}</Table.Th>
                <Table.Th>{labels.fields.account}</Table.Th>
                {header('amountRon', labels.fields.amount, 'right')}
                <Table.Th w={48}>
                  <VisuallyHidden>Acțiuni</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.content.map((expense) => (
                <Table.Tr key={expense.id} onClick={() => onEdit(expense)} style={{ cursor: 'pointer' }}>
                  <Table.Td style={NUMERIC}>{formatDate(expense.expenseDate)}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{expense.merchant}</Text>
                    {expense.details && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {expense.details}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{expense.categoryName}</Table.Td>
                  <Table.Td>{expense.accountName}</Table.Td>
                  <Table.Td ta="right">
                    <Text
                      size="sm"
                      fw={500}
                      style={{ ...NUMERIC, color: expense.type === 'REFUND' ? 'var(--mantine-color-teal-text)' : undefined }}
                    >
                      {formatSignedRon(expense.signedAmountRon)}
                    </Text>
                    {expense.type === 'REFUND' && (
                      <Text size="xs" c="dimmed">
                        {labels.entryType.REFUND}
                      </Text>
                    )}
                    {expense.originalCurrency === 'EUR' && (
                      <Text size="xs" c="dimmed" style={NUMERIC}>
                        {formatEur(expense.originalAmount)} × {formatRate(expense.fxRate)}
                      </Text>
                    )}
                    {expense.amountExpression && (
                      <Text size="xs" c="dimmed" ff="monospace" style={NUMERIC}>
                        {expense.amountExpression}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={`${labels.actions.edit} ${expense.merchant} din ${formatDate(expense.expenseDate)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(expense);
                      }}
                    >
                      <IconPencil size={16} stroke={1.75} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Group justify="space-between" align="flex-start" gap="md">
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xl" verticalSpacing={4}>
          <Total label={labels.totals.expenses} value={formatRon(data.totalExpenseRon)} />
          <Total label={labels.totals.refunds} value={formatRon(data.totalRefundRon)} />
          <Total label={filtered ? `${labels.totals.net} (filtrat)` : labels.totals.net} value={formatRon(data.netRon)} strong />
        </SimpleGrid>
        {data.totalPages > 1 && (
          <Pagination
            total={data.totalPages}
            value={data.page + 1}
            onChange={(page) => onPageChange(page - 1)}
            size="sm"
            getControlProps={(control) => ({ 'aria-label': control === 'previous' ? 'Pagina anterioară' : 'Pagina următoare' })}
          />
        )}
      </Group>
    </Stack>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Box>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={strong ? 700 : 500}>{value}</Text>
    </Box>
  );
}
