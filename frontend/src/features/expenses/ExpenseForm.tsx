import { Button, Grid, Group, Input, SegmentedControl, Select, TextInput, type GridColProps } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconCalendar } from '@tabler/icons-react';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useAccounts } from '../../api/accounts';
import { useCategories } from '../../api/categories';
import { useSaveExpense } from '../../api/expenses';
import type { Currency, EntryType, Expense, ExpenseRequest, MerchantSuggestion } from '../../api/types';
import { parseDateInput } from '../../lib/dateInput';
import { evaluateExpression, isFormula } from '../../lib/expression';
import { applyServerErrors } from '../../lib/formErrors';
import { formatEur, formatRate, formatRon } from '../../lib/format';
import { labels } from '../../lib/labels';
import { parseDecimal, toRon } from '../../lib/money';
import { notifySuccess } from '../../lib/notify';
import { loadLastEurRate, saveLastEurRate } from '../../lib/storage';
import { MerchantAutocomplete } from './MerchantAutocomplete';

interface FormValues {
  expenseDate: string | null;
  merchant: string;
  categoryId: string | null;
  accountId: string | null;
  type: EntryType;
  amount: string;
  currency: Currency;
  rate: string;
  details: string;
}

/** Backend field names -> form field names, so server validation lands next to the right input. */
const SERVER_FIELDS: Record<string, keyof FormValues> = {
  expenseDate: 'expenseDate',
  merchant: 'merchant',
  categoryId: 'categoryId',
  accountId: 'accountId',
  type: 'type',
  originalAmount: 'amount',
  amountExpression: 'amount',
  originalCurrency: 'currency',
  fxRate: 'rate',
  details: 'details',
};

type Spans = Record<'date' | 'merchant' | 'category' | 'amount' | 'type' | 'account' | 'currency' | 'rate' | 'details', GridColProps['span']>;

/** Quick-add row on wide screens; stacks naturally on phones. */
const INLINE_SPANS: Spans = {
  date: { base: 12, xs: 5, md: 2 },
  merchant: { base: 12, xs: 7, md: 3 },
  category: { base: 12, xs: 6, md: 3 },
  amount: { base: 12, xs: 6, md: 4 },
  type: { base: 12, xs: 6, md: 3 },
  account: { base: 12, xs: 6, md: 3 },
  currency: { base: 6, md: 2 },
  rate: { base: 6, md: 2 },
  details: { base: 12, md: 'auto' },
};

/** Two columns inside the edit modal, whatever the viewport. */
const MODAL_SPANS: Spans = {
  date: { base: 12, xs: 6 },
  merchant: { base: 12, xs: 6 },
  category: { base: 12, xs: 6 },
  amount: { base: 12, xs: 6 },
  type: { base: 12, xs: 6 },
  account: { base: 12, xs: 6 },
  currency: { base: 6, xs: 3 },
  rate: { base: 6, xs: 3 },
  details: { base: 12 },
};

interface ExpenseFormProps {
  /** Edits this expense; creates a new one when absent. */
  expense?: Expense;
  defaultDate: string;
  layout?: 'inline' | 'modal';
  onSaved?: (expense: Expense) => void;
  onCancel?: () => void;
  /** Rendered at the start of the button row, e.g. a delete button. */
  secondaryAction?: ReactNode;
}

export function ExpenseForm({ expense, defaultDate, layout = 'inline', onSaved, onCancel, secondaryAction }: ExpenseFormProps) {
  const isEdit = expense !== undefined;
  const spans = layout === 'inline' ? INLINE_SPANS : MODAL_SPANS;
  const categories = useCategories(true);
  const accounts = useAccounts(true);
  const save = useSaveExpense();
  const merchantInput = useRef<HTMLInputElement>(null);
  // Merchant suggestions only pre-fill fields the user hasn't chosen explicitly.
  const categoryChosen = useRef(isEdit);
  const accountChosen = useRef(isEdit);

  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: expense ? valuesFrom(expense) : emptyValues(defaultDate),
    validate: {
      expenseDate: (value) => (value ? null : 'Alegeți data.'),
      merchant: (value) => (value.trim() ? null : 'Magazinul este obligatoriu.'),
      categoryId: (value) => (value ? null : 'Alegeți o categorie.'),
      accountId: (value) => (value ? null : 'Alegeți un cont.'),
      amount: (value) => {
        const result = evaluateExpression(value);
        if (!result.ok) return result.error;
        return result.value === 0 ? 'Suma nu poate fi zero.' : null;
      },
      rate: (value, values) => {
        if (values.currency !== 'EUR') return null;
        const rate = parseDecimal(value);
        return rate !== null && rate > 0 ? null : 'Introduceți cursul (lei pentru 1 €), de ex. 5,0775.';
      },
    },
  });

  const activeCategories = (categories.data ?? []).filter((c) => !c.archived || c.id === expense?.categoryId);
  const activeAccounts = (accounts.data ?? []).filter((a) => !a.archived || a.id === expense?.accountId);

  const selectCurrency = (currency: Currency) => {
    form.setFieldValue('currency', currency);
    if (currency === 'EUR' && !form.getValues().rate) {
      form.setFieldValue('rate', loadLastEurRate());
    }
  };

  const selectAccount = (accountId: string | null) => {
    form.setFieldValue('accountId', accountId);
    const account = activeAccounts.find((a) => String(a.id) === accountId);
    if (account && !isEdit) selectCurrency(account.defaultCurrency);
  };

  // New entries start on the first active account once accounts have loaded.
  const firstAccountId = activeAccounts[0]?.id;
  useEffect(() => {
    if (!isEdit && firstAccountId !== undefined && form.getValues().accountId === null) {
      selectAccount(String(firstAccountId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the first account becomes known
  }, [firstAccountId, isEdit]);

  const applySuggestion = (suggestion: MerchantSuggestion) => {
    if (!categoryChosen.current && activeCategories.some((c) => c.id === suggestion.lastCategoryId && !c.archived)) {
      form.setFieldValue('categoryId', String(suggestion.lastCategoryId));
    }
    if (!accountChosen.current && activeAccounts.some((a) => a.id === suggestion.lastAccountId && !a.archived)) {
      selectAccount(String(suggestion.lastAccountId));
    }
  };

  const handleSubmit = form.onSubmit((values) => {
    const amount = evaluateExpression(values.amount);
    if (!amount.ok || !values.expenseDate || !values.categoryId || !values.accountId) return;
    const request: ExpenseRequest = {
      expenseDate: values.expenseDate,
      merchant: values.merchant.trim(),
      categoryId: Number(values.categoryId),
      accountId: Number(values.accountId),
      type: values.type,
      originalAmount: Math.abs(amount.value),
      originalCurrency: values.currency,
      fxRate: values.currency === 'EUR' ? parseDecimal(values.rate) : null,
      amountExpression: isFormula(values.amount) ? values.amount.trim() : null,
      details: values.details.trim() || null,
    };

    save.mutate(
      { id: expense?.id, request },
      {
        onSuccess: (saved) => {
          if (values.currency === 'EUR') saveLastEurRate(values.rate.trim());
          if (isEdit) {
            notifySuccess('Modificările au fost salvate.');
          } else {
            notifySuccess(`${saved.type === 'REFUND' ? 'Retur adăugat' : 'Cheltuială adăugată'}: ${saved.merchant}, ${formatRon(saved.amountRon)}.`);
            // Keep date, account, currency and rate for fast entry of the next receipt.
            form.setValues({ merchant: '', categoryId: null, amount: '', details: '', type: 'EXPENSE' });
            form.resetTouched();
            form.clearErrors();
            categoryChosen.current = false;
            merchantInput.current?.focus();
          }
          onSaved?.(saved);
        },
        onError: (error) =>
          applyServerErrors(error, (errors) =>
            form.setErrors(Object.fromEntries(Object.entries(errors).map(([field, message]) => [SERVER_FIELDS[field] ?? field, message]))),
          ),
      },
    );
  });

  /** Enter in any text field saves, as in a spreadsheet row. Open dropdowns handle Enter themselves (defaultPrevented). */
  const submitOnEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (!(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    event.currentTarget.requestSubmit();
  };

  const { amount, currency, rate } = form.values;
  const amountPreview = previewOf(amount, currency, rate);

  return (
    <form onSubmit={handleSubmit} onKeyDown={submitOnEnter} noValidate>
      <Grid gap="sm" align="flex-start">
        <Grid.Col span={spans.date}>
          <DateInput
            label={labels.fields.date}
            valueFormat="DD.MM.YYYY"
            dateParser={parseDateInput}
            placeholder="zz.ll.aaaa"
            leftSection={<IconCalendar size={16} />}
            {...form.getInputProps('expenseDate')}
          />
        </Grid.Col>
        <Grid.Col span={spans.merchant}>
          <MerchantAutocomplete
            ref={merchantInput}
            label={labels.fields.merchant}
            placeholder="ex. Penny"
            data-autofocus
            {...form.getInputProps('merchant')}
            onSuggestionPicked={applySuggestion}
          />
        </Grid.Col>
        <Grid.Col span={spans.category}>
          <Select
            label={labels.fields.category}
            placeholder="Alegeți"
            searchable
            // Keyboard entry: typing highlights the first match, Enter or Tab picks it.
            selectFirstOptionOnChange
            autoSelectOnBlur
            nothingFoundMessage="Nicio categorie"
            data={activeCategories.map((c) => ({ value: String(c.id), label: c.archived ? `${c.name} (arhivată)` : c.name }))}
            {...form.getInputProps('categoryId')}
            onChange={(value) => {
              categoryChosen.current = true;
              form.setFieldValue('categoryId', value);
            }}
          />
        </Grid.Col>
        <Grid.Col span={spans.amount}>
          <TextInput
            label={labels.fields.amount}
            placeholder="ex. 49,75 sau -88,74+38,99"
            description={amountPreview}
            inputWrapperOrder={['label', 'input', 'description', 'error']}
            inputMode="text"
            autoComplete="off"
            styles={{ input: { fontVariantNumeric: 'tabular-nums' } }}
            {...form.getInputProps('amount')}
          />
        </Grid.Col>
        <Grid.Col span={spans.type}>
          <Input.Wrapper label={labels.fields.type}>
            <SegmentedControl
              fullWidth
              data={[
                { value: 'EXPENSE', label: labels.entryType.EXPENSE },
                { value: 'REFUND', label: labels.entryType.REFUND },
              ]}
              value={form.values.type}
              onChange={(value) => form.setFieldValue('type', value as EntryType)}
            />
          </Input.Wrapper>
        </Grid.Col>
        <Grid.Col span={spans.account}>
          <Select
            label={labels.fields.account}
            placeholder="Alegeți"
            allowDeselect={false}
            data={activeAccounts.map((a) => ({ value: String(a.id), label: a.archived ? `${a.name} (arhivat)` : a.name }))}
            {...form.getInputProps('accountId')}
            onChange={(value) => {
              accountChosen.current = true;
              selectAccount(value);
            }}
          />
        </Grid.Col>
        <Grid.Col span={spans.currency}>
          <Input.Wrapper label={labels.fields.currency}>
            <SegmentedControl fullWidth data={['RON', 'EUR']} value={currency} onChange={(value) => selectCurrency(value as Currency)} />
          </Input.Wrapper>
        </Grid.Col>
        {currency === 'EUR' && (
          <Grid.Col span={spans.rate}>
            <TextInput
              label={labels.fields.rate}
              description="lei pentru 1 €"
              placeholder="5,0775"
              inputMode="decimal"
              autoComplete="off"
              {...form.getInputProps('rate')}
            />
          </Grid.Col>
        )}
        <Grid.Col span={spans.details}>
          <TextInput label={labels.fields.details} placeholder="opțional" maxLength={1000} {...form.getInputProps('details')} />
        </Grid.Col>
      </Grid>

      <Group justify={secondaryAction ? 'space-between' : 'flex-end'} mt="md">
        {secondaryAction}
        <Group gap="sm">
          {onCancel && (
            <Button variant="default" onClick={onCancel}>
              {labels.actions.cancel}
            </Button>
          )}
          <Button type="submit" loading={save.isPending}>
            {isEdit ? labels.actions.save : labels.actions.add}
          </Button>
        </Group>
      </Group>
    </form>
  );
}

function emptyValues(date: string): FormValues {
  return { expenseDate: date, merchant: '', categoryId: null, accountId: null, type: 'EXPENSE', amount: '', currency: 'RON', rate: '', details: '' };
}

function valuesFrom(expense: Expense): FormValues {
  return {
    expenseDate: expense.expenseDate,
    merchant: expense.merchant,
    categoryId: String(expense.categoryId),
    accountId: String(expense.accountId),
    type: expense.type,
    amount: expense.amountExpression ?? String(expense.originalAmount).replace('.', ','),
    currency: expense.originalCurrency,
    rate: expense.originalCurrency === 'EUR' ? formatRate(expense.fxRate) : '',
    details: expense.details ?? '',
  };
}

/** Live result under the amount field: only when it adds information (a formula, or a conversion). */
function previewOf(amount: string, currency: Currency, rate: string): string | undefined {
  const result = evaluateExpression(amount);
  if (!amount.trim() || !result.ok || result.value === 0) return undefined;
  const value = Math.abs(result.value);
  if (currency === 'EUR') {
    const parsedRate = parseDecimal(rate);
    return parsedRate ? `= ${formatEur(value)} ≈ ${formatRon(toRon(value, parsedRate))}` : `= ${formatEur(value)}`;
  }
  return isFormula(amount) ? `= ${formatRon(value)}` : undefined;
}
