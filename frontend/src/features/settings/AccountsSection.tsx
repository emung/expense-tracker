import { Badge, Button, Group, Input, Modal, NumberInput, SegmentedControl, Stack, Table, Text, TextInput, VisuallyHidden } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { useAccounts, useDeleteAccount, useSaveAccount } from '../../api/accounts';
import type { Account, Currency } from '../../api/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CenteredLoader, QueryError } from '../../components/QueryState';
import { applyServerErrors } from '../../lib/formErrors';
import { labels } from '../../lib/labels';
import { notifyError, notifySuccess } from '../../lib/notify';
import { RowActions } from './RowActions';
import { SettingsSection } from './SettingsSection';

type Editing = Account | 'new' | null;

export function AccountsSection() {
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const accounts = useAccounts(showArchived);
  const save = useSaveAccount();
  const remove = useDeleteAccount();

  const toggleArchived = (account: Account) =>
    save.mutate(
      { id: account.id, request: { name: account.name, archived: !account.archived } },
      {
        onSuccess: () =>
          notifySuccess(account.archived ? `Contul „${account.name}” a fost restaurat.` : `Contul „${account.name}” a fost arhivat.`),
        onError: (error) => notifyError(error),
      },
    );

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => notifySuccess(`Contul „${deleting.name}” a fost șters.`),
      onError: (error) => notifyError(error),
      onSettled: () => setDeleting(null),
    });
  };

  return (
    <SettingsSection
      title="Conturi"
      description="Cardurile și conturile din care plătiți. Moneda implicită este preselectată la adăugarea unei cheltuieli."
      addLabel="Cont nou"
      showArchived={showArchived}
      onShowArchivedChange={setShowArchived}
      onAdd={() => setEditing('new')}
    >
      {accounts.isPending ? (
        <CenteredLoader />
      ) : accounts.isError ? (
        <QueryError error={accounts.error} onRetry={() => void accounts.refetch()} />
      ) : accounts.data.length === 0 ? (
        <Text c="dimmed" size="sm">
          Niciun cont.
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={480}>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{labels.fields.name}</Table.Th>
                <Table.Th>{labels.fields.defaultCurrency}</Table.Th>
                <Table.Th ta="right">Cheltuieli</Table.Th>
                <Table.Th w={120}>
                  <VisuallyHidden>Acțiuni</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {accounts.data.map((account) => (
                <Table.Tr key={account.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" c={account.archived ? 'dimmed' : undefined}>
                        {account.name}
                      </Text>
                      {account.archived && (
                        <Badge size="sm" variant="light" color="gray">
                          {labels.states.archived}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>{account.defaultCurrency}</Table.Td>
                  <Table.Td ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {account.expenseCount}
                  </Table.Td>
                  <Table.Td>
                    <RowActions
                      name={account.name}
                      archived={account.archived}
                      usageCount={account.expenseCount}
                      archiving={save.isPending && save.variables?.id === account.id}
                      onEdit={() => setEditing(account)}
                      onToggleArchived={() => toggleArchived(account)}
                      onDelete={() => setDeleting(account)}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal opened={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Cont nou' : 'Editează contul'} centered>
        {editing !== null && (
          <AccountForm key={editing === 'new' ? 'new' : editing.id} account={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog
        opened={deleting !== null}
        title="Ștergeți contul?"
        message={`Contul „${deleting?.name ?? ''}” va fi șters definitiv.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </SettingsSection>
  );
}

function AccountForm({ account, onDone }: { account: Account | null; onDone: () => void }) {
  const save = useSaveAccount();
  const form = useForm({
    mode: 'controlled',
    initialValues: {
      name: account?.name ?? '',
      defaultCurrency: account?.defaultCurrency ?? ('RON' as Currency),
      sortOrder: (account?.sortOrder ?? '') as number | string,
    },
    validate: { name: (value) => (value.trim() ? null : 'Numele este obligatoriu.') },
  });

  const submit = form.onSubmit((values) =>
    save.mutate(
      {
        id: account?.id,
        request: {
          name: values.name,
          defaultCurrency: values.defaultCurrency,
          sortOrder: values.sortOrder === '' ? null : Number(values.sortOrder),
        },
      },
      {
        onSuccess: (saved) => {
          notifySuccess(account ? 'Modificările au fost salvate.' : `Contul „${saved.name}” a fost adăugat.`);
          onDone();
        },
        onError: (error) => applyServerErrors(error, form.setErrors, 'name'),
      },
    ),
  );

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <TextInput label={labels.fields.name} required maxLength={100} data-autofocus {...form.getInputProps('name')} />
        <Input.Wrapper label={labels.fields.defaultCurrency}>
          <div>
            <SegmentedControl
              data={['RON', 'EUR']}
              value={form.values.defaultCurrency}
              onChange={(value) => form.setFieldValue('defaultCurrency', value as Currency)}
            />
          </div>
        </Input.Wrapper>
        <NumberInput
          label={labels.fields.order}
          description="Poziția în liste. Lăsați gol pentru a-l adăuga la final."
          allowDecimal={false}
          allowNegative={false}
          {...form.getInputProps('sortOrder')}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            {labels.actions.cancel}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {labels.actions.save}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
