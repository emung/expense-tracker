import { ActionIcon, Button, Group, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { formatMonth } from '../lib/format';
import { labels } from '../lib/labels';
import { addMonths, currentMonth } from '../lib/month';

interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
}

/** ‹ august 2026 › with a shortcut back to the current month. */
export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const thisMonth = currentMonth();

  return (
    <Group gap={6} wrap="nowrap">
      <ActionIcon variant="default" size="lg" aria-label={labels.actions.previousMonth} onClick={() => onChange(addMonths(value, -1))}>
        <IconChevronLeft size={18} />
      </ActionIcon>
      <Text fw={600} miw={140} ta="center" aria-live="polite" style={{ textTransform: 'capitalize' }}>
        {formatMonth(value)}
      </Text>
      <ActionIcon variant="default" size="lg" aria-label={labels.actions.nextMonth} onClick={() => onChange(addMonths(value, 1))}>
        <IconChevronRight size={18} />
      </ActionIcon>
      {value !== thisMonth && (
        <Button variant="subtle" size="compact-sm" onClick={() => onChange(thisMonth)}>
          {labels.actions.currentMonth}
        </Button>
      )}
    </Group>
  );
}
