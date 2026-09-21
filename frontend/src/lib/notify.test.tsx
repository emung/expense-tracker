import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithUser } from '../test/render';
import { notifyUndo } from './notify';

/** The offer carrying `message`, so two stacked offers can be told apart. */
function undoButtonFor(message: string): HTMLElement {
  const offer = screen.getByText(message).parentElement;
  if (!offer) throw new Error(`no offer for "${message}"`);
  return within(offer).getByRole('button');
}

/** The offers are driven from outside React, so the tree under test is empty on purpose. */
function renderNotifications() {
  return renderWithUser(<div />);
}

describe('notifyUndo', () => {
  it('offers the action next to the message', async () => {
    renderNotifications();
    notifyUndo({ message: 'Înregistrarea a fost ștearsă.', onUndo: vi.fn() });

    expect(await screen.findByText('Înregistrarea a fost ștearsă.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anulează' })).toBeInTheDocument();
  });

  it('runs the action and closes the offer', async () => {
    const onUndo = vi.fn();
    const { user } = renderNotifications();
    notifyUndo({ message: 'Ștearsă.', onUndo });

    await user.click(await screen.findByRole('button', { name: 'Anulează' }));

    expect(onUndo).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText('Ștearsă.')).not.toBeInTheDocument());
  });

  it('ignores a second click while the offer is still closing', async () => {
    const onUndo = vi.fn();
    const { user } = renderNotifications();
    notifyUndo({ message: 'Ștearsă.', onUndo });

    const button = await screen.findByRole('button', { name: 'Anulează' });
    await user.dblClick(button);

    expect(onUndo).toHaveBeenCalledOnce();
  });

  // Regression: `notifications.show` drops a notification whose id is already on screen, so two
  // deletes in a row must not share one.
  it('shows two offers at once', async () => {
    renderNotifications();
    notifyUndo({ message: 'Prima a fost ștearsă.', onUndo: vi.fn() });
    notifyUndo({ message: 'A doua a fost ștearsă.', onUndo: vi.fn() });

    expect(await screen.findByText('Prima a fost ștearsă.')).toBeInTheDocument();
    expect(screen.getByText('A doua a fost ștearsă.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Anulează' })).toHaveLength(2);
  });

  it('undoes each offer independently', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { user } = renderNotifications();
    notifyUndo({ message: 'Prima.', onUndo: first });
    notifyUndo({ message: 'A doua.', onUndo: second });

    await screen.findByText('A doua.');
    await user.click(undoButtonFor('Prima.'));

    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
    expect(screen.getByText('A doua.')).toBeInTheDocument();
  });

  it('can be re-armed as a sticky retry', async () => {
    const onUndo = vi.fn();
    const { user } = renderNotifications();
    notifyUndo({ message: 'Nu a fost restaurată.', onUndo, actionLabel: 'Reîncearcă', autoClose: false });

    await user.click(await screen.findByRole('button', { name: 'Reîncearcă' }));

    expect(onUndo).toHaveBeenCalledOnce();
  });
});
