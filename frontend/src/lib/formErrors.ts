import { ApiError } from '../api/client';
import { notifyError } from './notify';

/**
 * Shows server-side validation next to the offending fields when possible, otherwise as a notification.
 *
 * @param conflictField form field a 409 (e.g. duplicate name) belongs to
 */
export function applyServerErrors(
  error: unknown,
  setErrors: (errors: Record<string, string>) => void,
  conflictField?: string,
): void {
  if (error instanceof ApiError) {
    const fieldErrors = error.fieldErrors;
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    if (error.status === 409 && conflictField) {
      setErrors({ [conflictField]: error.message });
      return;
    }
  }
  notifyError(error);
}
