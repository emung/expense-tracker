import { Autocomplete, type AutocompleteProps } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import type { Ref } from 'react';
import { useMerchantSuggestions } from '../../api/expenses';
import type { MerchantSuggestion } from '../../api/types';

interface MerchantAutocompleteProps extends Omit<AutocompleteProps, 'data' | 'value' | 'onChange' | 'onOptionSubmit'> {
  value?: string;
  onChange?: (value: string) => void;
  /** Called when an existing merchant is picked, so the form can pre-fill its last category and account. */
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
      limit={10}
      autoComplete="off"
      {...props}
    />
  );
}
