import { screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { hotkeyTarget } from '../lib/hotkeys';
import { paths } from '../lib/paths';
import { renderWithUser } from '../test/render';
import { useAppHotkeys } from './useAppHotkeys';

function Layout() {
  const [shortcutsShown, setShortcutsShown] = useState(false);
  useAppHotkeys({ resolveHref: (path) => path, onShowShortcuts: () => setShortcutsShown(true) });
  return (
    <div>
      {shortcutsShown && <p>Scurtături de tastatură</p>}
      <Outlet />
    </div>
  );
}

/** Stands in for `ExpensesPage`: the two fields the shortcuts jump to, marked the same way. */
function ExpensesStub() {
  return (
    <div>
      <p>Pagina cheltuieli</p>
      <input aria-label="Magazin" {...hotkeyTarget('merchant')} />
      <input aria-label="Caută" {...hotkeyTarget('search')} />
    </div>
  );
}

function renderApp(initialPath: string = paths.expenses) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Layout />,
        children: [
          { path: paths.expenses.slice(1), element: <ExpensesStub /> },
          { path: paths.report.slice(1), element: <p>Pagina raport</p> },
          { path: paths.settings.slice(1), element: <p>Pagina setări</p> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  return renderWithUser(<RouterProvider router={router} />);
}

describe('useAppHotkeys', () => {
  it('puts the cursor on the merchant field with "n"', async () => {
    const { user } = renderApp();

    await user.keyboard('n');

    expect(screen.getByLabelText('Magazin')).toHaveFocus();
  });

  it('puts the cursor on the search field with "/"', async () => {
    const { user } = renderApp();

    await user.keyboard('/');

    expect(screen.getByLabelText('Caută')).toHaveFocus();
  });

  it('goes to another page and focuses there when the field is elsewhere', async () => {
    const { user } = renderApp(paths.settings);

    await user.keyboard('n');

    await waitFor(() => expect(screen.getByLabelText('Magazin')).toHaveFocus());
  });

  it('navigates with the "g" sequences', async () => {
    const { user } = renderApp();

    await user.keyboard('gr');
    expect(await screen.findByText('Pagina raport')).toBeInTheDocument();

    await user.keyboard('gs');
    expect(await screen.findByText('Pagina setări')).toBeInTheDocument();

    await user.keyboard('gc');
    expect(await screen.findByText('Pagina cheltuieli')).toBeInTheDocument();
  });

  it('does not navigate on a destination key that no "g" preceded', async () => {
    const { user } = renderApp();

    await user.keyboard('r');

    expect(screen.getByText('Pagina cheltuieli')).toBeInTheDocument();
  });

  it('opens the cheat sheet with "?"', async () => {
    const { user } = renderApp();

    await user.keyboard('?');

    expect(screen.getByText('Scurtături de tastatură')).toBeInTheDocument();
  });

  it('stays out of the way while a modal is open', async () => {
    const { user } = renderApp();
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    document.body.append(modal);

    await user.keyboard('n');
    await user.keyboard('gr');

    expect(screen.getByLabelText('Magazin')).not.toHaveFocus();
    expect(screen.getByText('Pagina cheltuieli')).toBeInTheDocument();
    modal.remove();
  });

  it('stays out of the way while typing in a field', async () => {
    const { user } = renderApp();
    const search = screen.getByLabelText<HTMLInputElement>('Caută');

    await user.click(search);
    await user.keyboard('ngr');

    expect(search).toHaveFocus();
    expect(search).toHaveValue('ngr');
    expect(screen.getByText('Pagina cheltuieli')).toBeInTheDocument();
  });
});
