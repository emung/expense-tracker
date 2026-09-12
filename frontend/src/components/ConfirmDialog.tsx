import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { labels } from '../lib/labels';

interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Destructive-action confirmation; the confirm button is red and never the default focus. */
export function ConfirmDialog({ opened, title, message, confirmLabel = labels.actions.delete, loading, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="sm">
      <Stack>
        <Text size="sm">{message}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} data-autofocus>
            {labels.actions.cancel}
          </Button>
          <Button color="red" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
