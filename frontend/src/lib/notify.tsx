import { Button, Group, Text } from '@mantine/core';
import { randomId } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';
import { ApiError } from '../api/client';

/** How long an undo offer stays on screen. */
const UNDO_WINDOW_MS = 8000;

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'A apărut o eroare neașteptată.';
}

export function notifySuccess(message: string) {
  notifications.show({ message, color: 'teal', autoClose: 2500 });
}

export function notifyError(error: unknown, title = 'Operația nu a reușit') {
  notifications.show({ title, message: errorMessage(error), color: 'red', autoClose: 6000 });
}

interface UndoOptions {
  message: ReactNode;
  /** Runs at most once, after the offer has closed. */
  onUndo: () => void;
  actionLabel?: string;
  /** Milliseconds, or `false` to keep the offer until it is taken or dismissed. */
  autoClose?: number | false;
}

/**
 * A finished action that can still be taken back. Mantine notifications have no `action` prop, so
 * the button is part of the message node - which is why this file is `.tsx`.
 *
 * `onUndo` returns nothing: what success and failure look like belongs to the caller, so this helper
 * stays usable for anything undoable.
 */
export function notifyUndo({ message, onUndo, actionLabel = 'Anulează', autoClose = UNDO_WINDOW_MS }: UndoOptions) {
  // A fresh id per offer: `show` silently drops a notification whose id is already on screen, so a
  // fixed id would swallow the second of two quick deletes.
  const id = randomId();
  let taken = false;
  const take = () => {
    // Hiding is async, so without this a double click would fire the action twice.
    if (taken) return;
    taken = true;
    notifications.hide(id);
    onUndo();
  };

  notifications.show({
    id,
    color: 'teal',
    autoClose,
    message: (
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Text size="sm">{message}</Text>
        <Button variant="subtle" color="teal" size="compact-sm" onClick={take}>
          {actionLabel}
        </Button>
      </Group>
    ),
  });
}

/** A 4xx means the request itself is wrong - an archived category - so retrying can only fail again. */
export function isTransientError(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
}
