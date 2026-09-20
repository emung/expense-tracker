import { Select, type SelectProps } from '@mantine/core';

/**
 * A searchable `Select` that behaves like a field rather than an append-only text box.
 *
 * Mantine keeps the chosen option's label in the search input, so typing with the caret parked at
 * its end produces "CombustibilCas" and finds nothing. Selecting the label on focus means the first
 * keystroke replaces it, which is what changing a category from the keyboard needs.
 */
export function SearchableSelect({ onFocus, ...props }: SelectProps) {
  return (
    <Select
      searchable
      // Typing highlights the first match, so Enter or Tab picks it without touching the mouse.
      selectFirstOptionOnChange
      autoSelectOnBlur
      {...props}
      onFocus={(event) => {
        event.currentTarget.select();
        onFocus?.(event);
      }}
    />
  );
}
