import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import type { Expense } from '../../api/types';
import { renderWithUser } from '../../test/render';
import { EditExpenseModal } from './EditExpenseModal';

const { remove, restore } = vi.hoisted(() => ({ remove: vi.fn(), restore: vi.fn() }));

vi.mock('../../api/categories', () => ({
  useCategories: () => ({ data: [{ id: 7, name: 'Consumabile', sortOrder: 1, archived: false, expenseCount: 0 }] }),
}));
vi.mock('../../api/accounts', () => ({
  useAccounts: () => ({ data: [{ id: 3, name: 'SaltBank', defaultCurrency: 'RON', sortOrder: 1, archived: false, expenseCount: 0 }] }),
}));
vi.mock('../../api/expenses', async (importOriginal) => ({
  // `requestFrom` is the mapping under test here, so it stays real.
  requestFrom: (await importOriginal<typeof import('../../api/expenses')>()).requestFrom,
  useDeleteExpense: () => ({ mutate: remove, isPending: false }),
  useSaveExpense: () => ({ mutateAsync: restore, isPending: false }),
  useMerchantSuggestions: () => ({ data: [] }),
}));

function expenseWith(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 42,
    expenseDate: '2026-09-20',
    merchant: 'Penny',
    categoryId: 7,
    categoryName: 'Consumabile',
    accountId: 3,
    accountName: 'SaltBank',
    type: 'EXPENSE',
    originalAmount: 49.75,
    originalCurrency: 'RON',
    fxRate: 1,
    amountRon: 49.75,
    signedAmountRon: -49.75,
    amountExpression: null,
    details: null,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    ...overrides,
  };
}

/** Opens the confirmation and accepts it, as a mis-click would. */
async function deleteExpense(expense = expenseWith()) {
  const session = renderWithUser(<EditExpenseModal expense={expense} onClose={vi.fn()} />);
  await session.user.click(await screen.findByRole('button', { name: 'Șterge' }));
  const dialog = await screen.findByRole('dialog', { name: 'Ștergeți înregistrarea?' });
  await session.user.click(within(dialog).getByRole('button', { name: 'Șterge' }));
  return session;
}

/** The undo button of the offer carrying `message` - the confirm dialog has an "Anulează" too. */
function undoButtonFor(message: string): HTMLElement {
  const offer = screen.getByText(message).parentElement;
  if (!offer) throw new Error(`no offer for "${message}"`);
  return within(offer).getByRole('button');
}

const deletedMessage = 'Înregistrarea „Penny” din 20.09.2026 a fost ștearsă.';
const restoredRequest = () => restore.mock.calls.at(-1)?.[0].request;

describe('EditExpenseModal delete', () => {
  beforeEach(() => {
    remove.mockReset();
    restore.mockReset();
    // The real hook calls back once the DELETE lands.
    remove.mockImplementation((_id: number, options: { onSuccess: () => void; onSettled: () => void }) => {
      options.onSuccess();
      options.onSettled();
    });
    restore.mockResolvedValue(expenseWith({ id: 43 }));
  });

  it('promises the delete can be taken back, rather than calling it final', async () => {
    const { user } = renderWithUser(<EditExpenseModal expense={expenseWith()} onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Șterge' }));

    const dialog = await screen.findByRole('dialog', { name: 'Ștergeți înregistrarea?' });
    expect(within(dialog).getByText('Penny din 20.09.2026 (-49,75 lei) va fi ștearsă. Puteți anula imediat după.')).toBeInTheDocument();
    expect(within(dialog).queryByText(/definitiv/)).not.toBeInTheDocument();
  });

  it('offers the undo naming what was deleted', async () => {
    await deleteExpense();

    expect(remove).toHaveBeenCalledWith(42, expect.anything());
    expect(await screen.findByText(deletedMessage)).toBeInTheDocument();
  });

  it('re-creates the entry from the captured request', async () => {
    const { user } = await deleteExpense(expenseWith({ amountExpression: '-88,74+38.99', details: 'retur parțial' }));

    await user.click(undoButtonFor(deletedMessage));

    await waitFor(() => expect(restore).toHaveBeenCalledOnce());
    // No id: the entry comes back as a new row.
    expect(restore.mock.calls.at(-1)?.[0]).toStrictEqual({ request: restoredRequest() });
    expect(restoredRequest()).toMatchObject({
      expenseDate: '2026-09-20',
      merchant: 'Penny',
      categoryId: 7,
      accountId: 3,
      type: 'EXPENSE',
      originalAmount: 49.75,
      originalCurrency: 'RON',
      fxRate: null,
      amountExpression: '-88,74+38.99',
      details: 'retur parțial',
    });
    expect(await screen.findByText('Înregistrarea a fost restaurată.')).toBeInTheDocument();
  });

  it('restores an EUR entry with its rate', async () => {
    const { user } = await deleteExpense(expenseWith({ originalCurrency: 'EUR', originalAmount: 19.99, fxRate: 5.2452, amountRon: 104.85, signedAmountRon: -104.85 }));

    await user.click(undoButtonFor(deletedMessage));

    await waitFor(() => expect(restore).toHaveBeenCalledOnce());
    expect(restoredRequest()).toMatchObject({ originalCurrency: 'EUR', originalAmount: 19.99, fxRate: 5.2452 });
  });

  it('reports a rejected restore without offering a pointless retry', async () => {
    restore.mockRejectedValue(new ApiError(400, { title: 'Cerere invalidă', detail: 'Categoria „Consumabile” este arhivată.', status: 400 }));
    const { user } = await deleteExpense();

    await user.click(undoButtonFor(deletedMessage));

    expect(await screen.findByText('Categoria „Consumabile” este arhivată.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reîncearcă' })).not.toBeInTheDocument();
  });

  it('keeps offering a retry while the failure is the server or the network', async () => {
    restore.mockRejectedValueOnce(new ApiError(0, { title: 'Offline', detail: 'Serverul nu poate fi contactat.', status: 0 }));
    const { user } = await deleteExpense();

    await user.click(undoButtonFor(deletedMessage));
    await user.click(await screen.findByRole('button', { name: 'Reîncearcă' }));

    await waitFor(() => expect(restore).toHaveBeenCalledTimes(2));
    expect(restoredRequest()).toMatchObject({ merchant: 'Penny', originalAmount: 49.75 });
    expect(await screen.findByText('Înregistrarea a fost restaurată.')).toBeInTheDocument();
  });
});
