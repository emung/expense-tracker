import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithUser } from '../../test/render';
import { ExpenseForm } from './ExpenseForm';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('../../api/categories', () => ({
  useCategories: () => ({ data: [{ id: 7, name: 'Consumabile', sortOrder: 1, archived: false, expenseCount: 0 }] }),
}));
vi.mock('../../api/accounts', () => ({
  useAccounts: () => ({ data: [{ id: 3, name: 'SaltBank', defaultCurrency: 'RON', sortOrder: 1, archived: false, expenseCount: 0 }] }),
}));
vi.mock('../../api/expenses', () => ({
  useSaveExpense: () => ({ mutate, isPending: false }),
  useMerchantSuggestions: () => ({ data: [] }),
}));

/** Fills everything the form needs, leaving the cursor wherever the caller wants to press Enter. */
async function fillForm(user: ReturnType<typeof renderWithUser>['user']) {
  await user.click(screen.getByRole('combobox', { name: 'Magazin' }));
  await user.keyboard('Lidl');
  await user.click(screen.getByRole('combobox', { name: 'Categorie' }));
  await user.keyboard('Consum');
  await user.tab();
  await user.keyboard('49,75');
}

const savedRequest = () => mutate.mock.calls.at(-1)?.[0].request;

describe('ExpenseForm keyboard entry', () => {
  beforeEach(() => mutate.mockReset());

  it('saves on Enter from a text field', async () => {
    const { user } = renderWithUser(<ExpenseForm defaultDate="2026-09-20" />);
    await fillForm(user);

    await user.keyboard('{Enter}');

    expect(savedRequest()).toMatchObject({ expenseDate: '2026-09-20', merchant: 'Lidl', categoryId: 7, accountId: 3, originalAmount: 49.75, type: 'EXPENSE' });
  });

  it('saves on Ctrl+Enter out of an open dropdown, taking the highlighted option with it', async () => {
    const { user } = renderWithUser(<ExpenseForm defaultDate="2026-09-20" />);
    await user.click(screen.getByRole('combobox', { name: 'Magazin' }));
    await user.keyboard('Lidl');
    await user.click(screen.getByRole('textbox', { name: 'Suma' }));
    await user.keyboard('49,75');
    // Category left for last, with its dropdown open on the match - plain Enter would only pick it.
    await user.click(screen.getByRole('combobox', { name: 'Categorie' }));
    await user.keyboard('Consum');

    await user.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(savedRequest()).toMatchObject({ merchant: 'Lidl', categoryId: 7, originalAmount: 49.75 });
  });

  it('marks the merchant field as the target of the "n" shortcut', () => {
    renderWithUser(<ExpenseForm defaultDate="2026-09-20" />);

    expect(screen.getByRole('combobox', { name: 'Magazin' })).toHaveAttribute('data-hotkey-target', 'merchant');
  });
});
