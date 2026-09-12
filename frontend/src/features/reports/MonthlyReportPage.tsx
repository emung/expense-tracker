import { Text } from '@mantine/core';
import { MonthPicker } from '../../components/MonthPicker';
import { PageHeader } from '../../components/PageHeader';
import { useMonthParam } from '../../hooks/useMonthParam';
import { labels } from '../../lib/labels';

export function MonthlyReportPage() {
  const [month, setMonth] = useMonthParam();

  return (
    <>
      <PageHeader title={labels.nav.report}>
        <MonthPicker value={month} onChange={setMonth} />
      </PageHeader>
      <Text c="dimmed">Raportul lunar urmează.</Text>
    </>
  );
}
