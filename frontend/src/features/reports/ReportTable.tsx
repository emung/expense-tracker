import { Anchor, Badge, Group, Table } from '@mantine/core';
import { Link, useNavigate } from 'react-router';
import type { CategoryTotal, MonthlyCategoryReport } from '../../api/types';
import { formatPercent, formatRon } from '../../lib/format';
import { labels } from '../../lib/labels';

const NUMERIC = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

/** The complete, accessible view of the report: every category with exact values, like the original spreadsheet. */
export function ReportTable({ report }: { report: MonthlyCategoryReport }) {
  const navigate = useNavigate();
  const expensesOf = (category: CategoryTotal) => `/cheltuieli?luna=${report.month}&categorie=${category.categoryId}`;

  return (
    <Table.ScrollContainer minWidth={560}>
      <Table verticalSpacing="xs" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{labels.fields.category}</Table.Th>
            <Table.Th ta="right">Cheltuieli</Table.Th>
            <Table.Th ta="right">Retururi</Table.Th>
            <Table.Th ta="right">{labels.totals.net}</Table.Th>
            <Table.Th ta="right">{labels.fields.percentage}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {report.categories.map((category) => {
            const empty = category.expenseRon === 0 && category.refundRon === 0;
            return (
              <Table.Tr
                key={category.categoryId}
                onClick={() => void navigate(expensesOf(category))}
                style={{ cursor: 'pointer' }}
                c={empty ? 'dimmed' : undefined}
              >
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Anchor component={Link} to={expensesOf(category)} size="sm" c="inherit" onClick={(event) => event.stopPropagation()}>
                      {category.name}
                    </Anchor>
                    {category.archived && (
                      <Badge size="sm" variant="light" color="gray">
                        {labels.states.archived}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td ta="right" style={NUMERIC}>
                  {formatRon(category.expenseRon)}
                </Table.Td>
                <Table.Td ta="right" style={NUMERIC}>
                  {category.refundRon > 0 ? formatRon(category.refundRon) : '—'}
                </Table.Td>
                <Table.Td ta="right" fw={empty ? undefined : 600} style={NUMERIC}>
                  {formatRon(category.netRon)}
                </Table.Td>
                <Table.Td ta="right" style={NUMERIC}>
                  {formatPercent(category.percentage)}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
        <Table.Tfoot>
          <Table.Tr fw={700}>
            <Table.Td>{labels.totals.total}</Table.Td>
            <Table.Td ta="right" style={NUMERIC}>
              {formatRon(report.totalExpenseRon)}
            </Table.Td>
            <Table.Td ta="right" style={NUMERIC}>
              {report.totalRefundRon > 0 ? formatRon(report.totalRefundRon) : '—'}
            </Table.Td>
            <Table.Td ta="right" style={NUMERIC}>
              {formatRon(report.netTotalRon)}
            </Table.Td>
            <Table.Td ta="right" style={NUMERIC}>
              {report.netTotalRon > 0 ? formatPercent(100) : '—'}
            </Table.Td>
          </Table.Tr>
        </Table.Tfoot>
      </Table>
    </Table.ScrollContainer>
  );
}
