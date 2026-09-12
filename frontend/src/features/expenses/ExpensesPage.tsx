import { Text } from '@mantine/core';
import { MonthPicker } from '../../components/MonthPicker';
import { PageHeader } from '../../components/PageHeader';
import { useMonthParam } from '../../hooks/useMonthParam';
import { labels } from '../../lib/labels';

export function ExpensesPage() {
  const [month, setMonth] = useMonthParam();

  return (
    <>
      <PageHeader title={labels.nav.expenses}>
        <MonthPicker value={month} onChange={setMonth} />
      </PageHeader>
      <Text c="dimmed">Lista de cheltuieli urmează.</Text>
    </>
  );
}
