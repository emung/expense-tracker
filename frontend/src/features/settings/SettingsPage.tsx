import { Stack } from '@mantine/core';
import { PageHeader } from '../../components/PageHeader';
import { labels } from '../../lib/labels';
import { AccountsSection } from './AccountsSection';
import { CategoriesSection } from './CategoriesSection';

export function SettingsPage() {
  return (
    <>
      <PageHeader title={labels.nav.settings} />
      <Stack gap="lg">
        <CategoriesSection />
        <AccountsSection />
      </Stack>
    </>
  );
}
