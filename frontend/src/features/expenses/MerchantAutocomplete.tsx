import { Autocomplete, type AutocompleteProps, Group, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import type { Ref } from 'react';
import { useMerchantSuggestions } from '../../api/expenses';
import type { MerchantSuggestion } from '../../api/types';
import { formatRon } from '../../lib/format';

interface MerchantAutocompleteProps extends Omit<AutocompleteProps, 'data' | 'value' | 'onChange' | 'onOptionSubmit'> {
  value?: string;
  onChange?: (value: string) => void;
  /** Called when an existing merchant is picked, so the form can pre-fill its category and account. */
  onSuggestionPicked: (suggestion: MerchantSuggestion) => void;
  ref?: Ref<HTMLInputElement>;
}

export function MerchantAutocomplete({ value = '', onChange, onSuggestionPicked, ref, ...props }: MerchantAutocompleteProps) {
  const [debounced] = useDebouncedValue(value.trim(), 200);
  const suggestions = useMerchantSuggestions(debounced).data ?? [];

  return (
    <Autocomplete
      ref={ref}
      value={value}
      onChange={onChange}
      data={suggestions.map((suggestion) => suggestion.merchant)}
      onOptionSubmit={(merchant) => {
        const picked = suggestions.find((suggestion) => suggestion.merchant === merchant);
        if (picked) onSuggestionPicked(picked);
      }}
      // The last amount is a reminder of what this shop usually costs, never a pre-filled value.
      renderOption={({ option }) => {
        const lastAmountRon = suggestions.find((suggestion) => suggestion.merchant === option.value)?.lastAmountRon;
        return (
          <Group justify="space-between" gap="sm" wrap="nowrap" w="100%">
            <Text size="sm" truncate>
              {option.value}
            </Text>
            {lastAmountRon != null && (
              <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {formatRon(lastAmountRon)}
              </Text>
            )}
          </Group>
        );
      }}
      limit={10}
      autoComplete="off"
      {...props}
    />
  );
}
