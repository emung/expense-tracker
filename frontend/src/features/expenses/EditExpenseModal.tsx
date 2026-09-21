import { Button, Modal } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { requestFrom, useDeleteExpense, useSaveExpense } from '../../api/expenses';
import type { Expense, ExpenseRequest } from '../../api/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDate, formatSignedRon } from '../../lib/format';
import { labels } from '../../lib/labels';
import { isTransientError, notifyError, notifySuccess, notifyUndo } from '../../lib/notify';
import { ExpenseForm } from './ExpenseForm';

export function EditExpenseModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const remove = useDeleteExpense();
  const restore = useSaveExpense();
  const [confirming, setConfirming] = useState(false);

  /**
   * Re-creates a deleted entry from the request captured before the delete; it comes back with a new
   * id, which is undo enough for a single-user tracker.
   *
   * `mutateAsync`, not `mutate`: this runs from a notification that outlives the open modal, and
   * per-call callbacks are dropped once the component's observer has no listeners left. The promise
   * is not, so the feedback has to hang off it.
   */
  const undoDelete = (request: ExpenseRequest) => {
    restore
      .mutateAsync({ request })
      .then(() => notifySuccess('Înregistrarea a fost restaurată.'))
      .catch((error: unknown) => {
        notifyError(error, 'Restaurarea nu a reușit');
        // A rejected request (an archived category) would be rejected again; only offer a retry when
        // the server or the network was at fault.
        if (isTransientError(error)) {
          notifyUndo({
            message: 'Înregistrarea nu a fost restaurată.',
            actionLabel: labels.actions.retry,
            autoClose: false,
            onUndo: () => undoDelete(request),
          });
        }
      });
  };

  const confirmDelete = () => {
    if (!expense) return;
    // Captured while the row still exists; the offer outlives it.
    const request = requestFrom(expense);
    const deleted = `Înregistrarea „${expense.merchant}” din ${formatDate(expense.expenseDate)} a fost ștearsă.`;
    remove.mutate(expense.id, {
      onSuccess: () => {
        notifyUndo({ message: deleted, onUndo: () => undoDelete(request) });
        onClose();
      },
      onError: (error) => notifyError(error),
      onSettled: () => setConfirming(false),
    });
  };

  return (
    <>
      <Modal opened={expense !== null && !confirming} onClose={onClose} title="Editează înregistrarea" size="lg" centered>
        {expense && (
          <ExpenseForm
            key={expense.id}
            expense={expense}
            defaultDate={expense.expenseDate}
            layout="modal"
            onSaved={onClose}
            onCancel={onClose}
            secondaryAction={
              <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={() => setConfirming(true)}>
                {labels.actions.delete}
              </Button>
            }
          />
        )}
      </Modal>
      <ConfirmDialog
        opened={confirming}
        title="Ștergeți înregistrarea?"
        message={
          expense
            ? `${expense.merchant} din ${formatDate(expense.expenseDate)} (${formatSignedRon(expense.signedAmountRon)}) va fi ștearsă. Puteți anula imediat după.`
            : ''
        }
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
