import type { EntryType } from '../api/types';

/** All user-facing Romanian strings that are shared between screens. */
export const labels = {
  appName: 'Cheltuieli',
  nav: {
    expenses: 'Cheltuieli',
    report: 'Raport lunar',
    settings: 'Setări',
  },
  fields: {
    date: 'Data',
    merchant: 'Magazin',
    category: 'Categorie',
    amount: 'Suma',
    details: 'Detalii',
    account: 'Cont',
    currency: 'Monedă',
    rate: 'Curs',
    type: 'Tip',
    name: 'Nume',
    order: 'Ordine',
    defaultCurrency: 'Monedă implicită',
    percentage: 'Procent',
  },
  entryType: {
    EXPENSE: 'Cheltuială',
    REFUND: 'Retur',
  } satisfies Record<EntryType, string>,
  actions: {
    add: 'Adaugă',
    save: 'Salvează',
    cancel: 'Anulează',
    delete: 'Șterge',
    edit: 'Editează',
    archive: 'Arhivează',
    restore: 'Restaurează',
    previousMonth: 'Luna anterioară',
    nextMonth: 'Luna următoare',
    currentMonth: 'Luna curentă',
    retry: 'Reîncearcă',
  },
  totals: {
    expenses: 'Total cheltuieli',
    refunds: 'Retururi',
    net: 'Net',
    total: 'Total',
  },
  states: {
    loading: 'Se încarcă…',
    empty: 'Nicio înregistrare.',
    loadError: 'Datele nu au putut fi încărcate.',
    archived: 'Arhivat',
  },
} as const;
