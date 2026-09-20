import { ActionIcon, AppShell, Burger, Button, Container, Group, NavLink, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChartBar, IconKeyboard, IconReceipt, IconSettings, type Icon } from '@tabler/icons-react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router';
import { useAppHotkeys } from '../hooks/useAppHotkeys';
import { labels } from '../lib/labels';
import { isValidMonth } from '../lib/month';
import { paths } from '../lib/paths';
import { ShortcutsModal } from './ShortcutsModal';

interface NavItem {
  path: string;
  label: string;
  icon: Icon;
  /** Pages scoped to a month keep the currently selected month when switching between them. */
  keepsMonth: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: paths.expenses, label: labels.nav.expenses, icon: IconReceipt, keepsMonth: true },
  { path: paths.report, label: labels.nav.report, icon: IconChartBar, keepsMonth: true },
  { path: paths.settings, label: labels.nav.settings, icon: IconSettings, keepsMonth: false },
];

const MONTH_LESS_PATHS = NAV_ITEMS.filter((item) => !item.keepsMonth).map((item) => item.path);

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [shortcutsOpened, shortcuts] = useDisclosure(false);
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const month = searchParams.get('luna');

  /** Keeps the selected month while moving between the month-scoped pages. */
  const resolveHref = (path: string) =>
    !MONTH_LESS_PATHS.includes(path) && isValidMonth(month) ? `${path}?luna=${month}` : path;
  const isActive = (item: NavItem) => pathname.startsWith(item.path);

  useAppHotkeys({ resolveHref, onShowShortcuts: shortcuts.open });

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
            <Group gap={4} wrap="nowrap">
              <Group gap={4} visibleFrom="sm" component="nav" aria-label="Navigare principală">
                {NAV_ITEMS.map((item) => (
                  <Button
                    key={item.path}
                    component={Link}
                    to={resolveHref(item.path)}
                    variant={isActive(item) ? 'light' : 'subtle'}
                    color={isActive(item) ? undefined : 'gray'}
                    leftSection={<item.icon size={18} stroke={1.75} />}
                    aria-current={isActive(item) ? 'page' : undefined}
                  >
                    {item.label}
                  </Button>
                ))}
              </Group>
              <Tooltip label="Scurtături de tastatură (?)">
                <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Scurtături de tastatură" onClick={shortcuts.open}>
                  <IconKeyboard size={20} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="xs" component="nav" aria-label="Navigare principală">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            component={Link}
            to={resolveHref(item.path)}
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

      <ShortcutsModal opened={shortcutsOpened} onClose={shortcuts.close} />
    </AppShell>
  );
}
