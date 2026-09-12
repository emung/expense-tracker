import { Button, Modal } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useDeleteExpense } from '../../api/expenses';
import type { Expense } from '../../api/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDate, formatSignedRon } from '../../lib/format';
import { labels } from '../../lib/labels';
import { notifyError, notifySuccess } from '../../lib/notify';
import { ExpenseForm } from './ExpenseForm';

export function EditExpenseModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const remove = useDeleteExpense();
  const [confirming, setConfirming] = useState(false);

  const confirmDelete = () => {
    if (!expense) return;
    remove.mutate(expense.id, {
      onSuccess: () => {
        notifySuccess('Înregistrarea a fost ștearsă.');
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
        message={expense ? `${expense.merchant} din ${formatDate(expense.expenseDate)} (${formatSignedRon(expense.signedAmountRon)}) va fi ștearsă definitiv.` : ''}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
