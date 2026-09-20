import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithUser } from '../test/render';
import { SearchableSelect } from './SearchableSelect';

const CATEGORIES = [
  { value: '1', label: 'Combustibil' },
  { value: '2', label: 'Casă' },
  { value: '3', label: 'Consumabile' },
];

describe('SearchableSelect', () => {
  it('replaces the chosen label when typing instead of appending to it', async () => {
    const { user } = renderWithUser(<SearchableSelect label="Categorie" data={CATEGORIES} value="1" onChange={vi.fn()} />);
    const input = screen.getByRole<HTMLInputElement>('combobox', { name: 'Categorie' });
    expect(input).toHaveValue('Combustibil');

    // Focus that doesn't select on its own - a click, or a shortcut moving the caret here - is
    // exactly where Mantine would otherwise leave the caret parked after the chosen label.
    act(() => input.focus());
    await user.keyboard('Cas');

    expect(input).toHaveValue('Cas');
    // Floating UI cannot measure anything in jsdom, so the open dropdown stays `display: none`
    // and its options are only reachable with `hidden`.
    expect(screen.getAllByRole('option', { hidden: true }).map((option) => option.textContent)).toEqual(['Casă']);
  });

  it('picks the highlighted match on Enter, without the mouse', async () => {
    const onChange = vi.fn();
    const { user } = renderWithUser(<SearchableSelect label="Categorie" data={CATEGORIES} value="1" onChange={onChange} />);

    await user.tab();
    await user.keyboard('Cas{Enter}');

    expect(onChange).toHaveBeenCalledWith('2', { value: '2', label: 'Casă' });
  });

  it('restores the chosen label when leaving a half-typed search', async () => {
    const { user } = renderWithUser(
      <>
        <SearchableSelect label="Categorie" data={CATEGORIES} value="1" onChange={vi.fn()} />
        <button type="button">Altceva</button>
      </>,
    );
    const input = screen.getByRole<HTMLInputElement>('combobox', { name: 'Categorie' });

    await user.tab();
    await user.keyboard('Com');
    await user.click(screen.getByRole('button', { name: 'Altceva' }));

    expect(input).toHaveValue('Combustibil');
  });
});
