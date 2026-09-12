import { Paper, SimpleGrid, Text } from '@mantine/core';
import type { MonthlyCategoryReport } from '../../api/types';
import { formatRon } from '../../lib/format';
import { labels } from '../../lib/labels';

export function SummaryCards({ report }: { report: MonthlyCategoryReport }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
      <StatTile label={labels.totals.expenses} value={formatRon(report.totalExpenseRon)} />
      <StatTile label={labels.totals.refunds} value={formatRon(report.totalRefundRon)} />
      <StatTile label={labels.totals.net} value={formatRon(report.netTotalRon)} hint="Cheltuieli minus retururi" lead />
    </SimpleGrid>
  );
}

/** Label, then a large proportional-figure value; the net total is the view's lead number. */
function StatTile({ label, value, hint, lead }: { label: string; value: string; hint?: string; lead?: boolean }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={600} fz={lead ? 30 : 24} lh={1.25}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Paper>
  );
}
