import { Text } from '@mantine/core';
import { PageHeader } from '../../components/PageHeader';
import { labels } from '../../lib/labels';

export function SettingsPage() {
  return (
    <>
      <PageHeader title={labels.nav.settings} />
      <Text c="dimmed">Categoriile și conturile urmează.</Text>
    </>
  );
}
