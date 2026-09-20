import { Button, Group, Paper, Stack, Switch, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description: string;
  addLabel: string;
  /** Omit both to hide the archive switch, for lists that have nothing to archive. */
  showArchived?: boolean;
  onShowArchivedChange?: (show: boolean) => void;
  /** Extra control beside the add button, e.g. a search field. */
  controls?: ReactNode;
  onAdd: () => void;
  children: ReactNode;
}

export function SettingsSection({
  title,
  description,
  addLabel,
  showArchived,
  onShowArchivedChange,
  controls,
  onAdd,
  children,
}: SettingsSectionProps) {
  return (
    <Paper withBorder p="md" radius="md" component="section" aria-label={title}>
      <Group justify="space-between" align="flex-start" mb="sm" gap="sm">
        <Stack gap={2}>
          <Title order={3} size="h4">
            {title}
          </Title>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Stack>
        <Group gap="md">
          {controls}
          {onShowArchivedChange && (
            <Switch
              label="Afișează arhivate"
              checked={showArchived}
              onChange={(event) => onShowArchivedChange(event.currentTarget.checked)}
            />
          )}
          <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
            {addLabel}
          </Button>
        </Group>
      </Group>
      {children}
    </Paper>
  );
}
