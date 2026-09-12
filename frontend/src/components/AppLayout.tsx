import { AppShell, Burger, Button, Container, Group, NavLink, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChartBar, IconReceipt, IconSettings, type Icon } from '@tabler/icons-react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router';
import { isValidMonth } from '../lib/month';
import { labels } from '../lib/labels';

interface NavItem {
  path: string;
  label: string;
  icon: Icon;
  /** Pages scoped to a month keep the currently selected month when switching between them. */
  keepsMonth: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/cheltuieli', label: labels.nav.expenses, icon: IconReceipt, keepsMonth: true },
  { path: '/raport', label: labels.nav.report, icon: IconChartBar, keepsMonth: true },
  { path: '/setari', label: labels.nav.settings, icon: IconSettings, keepsMonth: false },
];

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const month = searchParams.get('luna');

  const hrefOf = (item: NavItem) => (item.keepsMonth && isValidMonth(month) ? `${item.path}?luna=${month}` : item.path);
  const isActive = (item: NavItem) => pathname.startsWith(item.path);

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Deschide meniul" />
              <Text fw={700} size="lg">
                {labels.appName}
              </Text>
            </Group>
            <Group gap={4} visibleFrom="sm" component="nav" aria-label="Navigare principală">
              {NAV_ITEMS.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={hrefOf(item)}
                  variant={isActive(item) ? 'light' : 'subtle'}
                  color={isActive(item) ? undefined : 'gray'}
                  leftSection={<item.icon size={18} stroke={1.75} />}
                  aria-current={isActive(item) ? 'page' : undefined}
                >
                  {item.label}
                </Button>
              ))}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="xs" component="nav" aria-label="Navigare principală">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            component={Link}
            to={hrefOf(item)}
            label={item.label}
            leftSection={<item.icon size={18} stroke={1.75} />}
            active={isActive(item)}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl" px={0}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
