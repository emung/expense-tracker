import { notifications } from '@mantine/notifications';
import { ApiError } from '../api/client';

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'A apărut o eroare neașteptată.';
}

export function notifySuccess(message: string) {
  notifications.show({ message, color: 'teal', autoClose: 2500 });
}

export function notifyError(error: unknown, title = 'Operația nu a reușit') {
  notifications.show({ title, message: errorMessage(error), color: 'red', autoClose: 6000 });
}
