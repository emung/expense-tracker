import { Button, Group, SegmentedControl, Select, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAccounts } from '../../api/accounts';
import { useCategories } from '../../api/categories';
import type { EntryType, ExpenseFilters } from '../../api/types';
import { SearchableSelect } from '../../components/SearchableSelect';
import { hotkeyTarget } from '../../lib/hotkeys';

interface ExpenseFiltersBarProps {
  filters: ExpenseFilters;
  hasActiveFilters: boolean;
  onCategoryChange: (id: number | undefined) => void;
  onAccountChange: (id: number | undefined) => void;
  onTypeChange: (type: EntryType | undefined) => void;
  onQueryChange: (query: string) => void;
  onClear: () => void;
}

/** One row of filters above the list; everything below re-renders against the same slice. */
export function ExpenseFiltersBar({ filters, hasActiveFilters, onCategoryChange, onAccountChange, onTypeChange, onQueryChange, onClear }: ExpenseFiltersBarProps) {
  // Filters include archived items so older months can still be filtered by them.
  const categories = useCategories(true);
  const accounts = useAccounts(true);
  const [search, setSearch] = useState(filters.q ?? '');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  useEffect(() => {
    if (debouncedSearch.trim() !== (filters.q ?? '')) onQueryChange(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to typing only
  }, [debouncedSearch]);

  // Keep the input in sync when the URL changes elsewhere (clear button, back navigation).
  useEffect(() => {
    setSearch((current) => (current.trim() === (filters.q ?? '') ? current : (filters.q ?? '')));
  }, [filters.q]);

  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      <TextInput
        aria-label="Caută"
        placeholder="Caută magazin sau detalii"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        w={{ base: '100%', sm: 240 }}
        {...hotkeyTarget('search')}
      />
      <SearchableSelect
        aria-label="Filtrează după categorie"
        placeholder="Toate categoriile"
        clearable
        data={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.archived ? `${c.name} (arhivată)` : c.name }))}
        value={filters.categoryId ? String(filters.categoryId) : null}
        onChange={(value) => onCategoryChange(value ? Number(value) : undefined)}
        w={{ base: '100%', xs: 200 }}
      />
      <Select
        aria-label="Filtrează după cont"
        placeholder="Toate conturile"
        clearable
        data={(accounts.data ?? []).map((a) => ({ value: String(a.id), label: a.archived ? `${a.name} (arhivat)` : a.name }))}
        value={filters.accountId ? String(filters.accountId) : null}
        onChange={(value) => onAccountChange(value ? Number(value) : undefined)}
        w={{ base: '100%', xs: 170 }}
      />
      <SegmentedControl
        aria-label="Filtrează după tip"
        data={[
          { value: 'ALL', label: 'Toate' },
          { value: 'EXPENSE', label: 'Cheltuieli' },
          { value: 'REFUND', label: 'Retururi' },
        ]}
        value={filters.type ?? 'ALL'}
        onChange={(value) => onTypeChange(value === 'ALL' ? undefined : (value as EntryType))}
      />
      {hasActiveFilters && (
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconX size={16} />}
          onClick={() => {
            setSearch('');
            onClear();
          }}
        >
          Resetează filtrele
        </Button>
      )}
    </Group>
  );
}
