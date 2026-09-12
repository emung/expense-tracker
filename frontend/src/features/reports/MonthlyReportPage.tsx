import { Button, Paper, Stack, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Link } from 'react-router';
import { useMonthlyReport } from '../../api/reports';
import type { MonthlyCategoryReport } from '../../api/types';
import { MonthPicker } from '../../components/MonthPicker';
import { PageHeader } from '../../components/PageHeader';
import { CenteredLoader, QueryError } from '../../components/QueryState';
import { formatMonth } from '../../lib/format';
import { labels } from '../../lib/labels';
import { useMonthParam } from '../../hooks/useMonthParam';
import { CategoryBarChart } from './CategoryBarChart';
import { ReportTable } from './ReportTable';
import { SummaryCards } from './SummaryCards';

export function MonthlyReportPage() {
  const [month, setMonth] = useMonthParam();
  const report = useMonthlyReport(month);

  return (
    <>
      <PageHeader title={labels.nav.report}>
        <MonthPicker value={month} onChange={setMonth} />
      </PageHeader>

      {report.isPending ? (
        <CenteredLoader />
      ) : report.isError ? (
        <QueryError error={report.error} onRetry={() => void report.refetch()} />
      ) : isEmpty(report.data) ? (
        <Paper withBorder p="xl" radius="md">
          <Stack align="center" gap="sm">
            <Text c="dimmed">Nicio cheltuială în {formatMonth(month)}.</Text>
            <Button component={Link} to={`/cheltuieli?luna=${month}`} variant="light" leftSection={<IconPlus size={16} />}>
              Adaugă cheltuieli
            </Button>
          </Stack>
        </Paper>
      ) : (
        // While another month loads, keep the previous render, dimmed, instead of flashing a loader.
        <Stack gap="lg" style={{ opacity: report.isPlaceholderData ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <SummaryCards report={report.data} />

          <Paper withBorder p="md" radius="md" component="section" aria-labelledby="report-chart-title">
            <Title order={3} size="h5" id="report-chart-title">
              Cheltuieli nete pe categorii
            </Title>
            <Text size="xs" c="dimmed" mb="sm">
              În lei, după scăderea retururilor. Valorile exacte sunt în tabelul de mai jos.
            </Text>
            <CategoryBarChart categories={report.data.categories} />
          </Paper>

          <Paper withBorder radius="md" component="section" aria-label="Tabel pe categorii">
            <ReportTable report={report.data} />
          </Paper>
        </Stack>
      )}
    </>
  );
}

function isEmpty(report: MonthlyCategoryReport): boolean {
  return report.totalExpenseRon === 0 && report.totalRefundRon === 0;
}
