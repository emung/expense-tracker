import { ActionIcon, Badge, Button, Group, Modal, Select, Stack, Table, Text, TextInput, Tooltip, VisuallyHidden } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPencil, IconSearch, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useAccounts } from '../../api/accounts';
import { useCategories } from '../../api/categories';
import { useDeleteMerchantRule, useMerchantRules, useSaveMerchantRule } from '../../api/merchantRules';
import type { MerchantRule } from '../../api/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CenteredLoader, QueryError } from '../../components/QueryState';
import { applyServerErrors } from '../../lib/formErrors';
import { labels } from '../../lib/labels';
import { notifyError, notifySuccess } from '../../lib/notify';
import { countLabel } from '../../lib/plural';
import { SettingsSection } from './SettingsSection';

type Editing = MerchantRule | 'new' | null;

export function MerchantRulesSection() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<MerchantRule | null>(null);
  const rules = useMerchantRules(debouncedSearch);
  const remove = useDeleteMerchantRule();

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => notifySuccess(`Regula pentru „${deleting.merchantKey}” a fost ștearsă.`),
      onError: (error) => notifyError(error),
      onSettled: () => setDeleting(null),
    });
  };

  return (
    <SettingsSection
      title="Reguli magazin"
      description="Unde ajunge fiecare magazin. Se învață singure când salvați o cheltuială; dacă modificați una, rămâne fixată."
      addLabel="Regulă nouă"
      controls={
        <TextInput
          placeholder="Caută magazin"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          aria-label="Caută magazin"
        />
      }
      onAdd={() => setEditing('new')}
    >
      {rules.isPending ? (
        <CenteredLoader />
      ) : rules.isError ? (
        <QueryError error={rules.error} onRetry={() => void rules.refetch()} />
      ) : rules.data.length === 0 ? (
        <Text c="dimmed" size="sm">
          {debouncedSearch ? 'Niciun magazin găsit.' : 'Nicio regulă încă. Se creează singure pe măsură ce adăugați cheltuieli.'}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{labels.fields.merchant}</Table.Th>
                <Table.Th>{labels.fields.category}</Table.Th>
                <Table.Th>{labels.fields.account}</Table.Th>
                <Table.Th ta="right">Folosiri</Table.Th>
                <Table.Th w={90}>
                  <VisuallyHidden>Acțiuni</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rules.data.map((rule) => (
                <Table.Tr key={rule.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm">{rule.merchantKey}</Text>
                      {rule.pinned && (
                        <Tooltip label="Fixată: nu se mai schimbă automat.">
                          <Badge size="sm" variant="light">
                            Fixată
                          </Badge>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" c={rule.categoryArchived ? 'dimmed' : undefined}>
                        {rule.categoryName}
                      </Text>
                      {rule.categoryArchived && (
                        <Badge size="sm" variant="light" color="gray">
                          {labels.states.archived}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={rule.accountName ? undefined : 'dimmed'}>
                      {rule.accountName ?? '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {rule.hitCount}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={2} justify="flex-end" wrap="nowrap">
                      <Tooltip label={labels.actions.edit}>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={`${labels.actions.edit} ${rule.merchantKey}`}
                          onClick={() => setEditing(rule)}
                        >
                          <IconPencil size={18} stroke={1.75} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={labels.actions.delete}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={`${labels.actions.delete} ${rule.merchantKey}`}
                          onClick={() => setDeleting(rule)}
                        >
                          <IconTrash size={18} stroke={1.75} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Regulă nouă' : 'Editează regula'}
        centered
      >
        {editing !== null && (
          <MerchantRuleForm
            key={editing === 'new' ? 'new' : editing.id}
            rule={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        opened={deleting !== null}
        title="Ștergeți regula?"
        message={
          deleting
            ? `Regula pentru „${deleting.merchantKey}” va fi ștearsă. Cele ${countLabel(deleting.hitCount, 'cheltuială', 'cheltuieli')} rămân neschimbate.`
            : ''
        }
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </SettingsSection>
  );
}

function MerchantRuleForm({ rule, onDone }: { rule: MerchantRule | null; onDone: () => void }) {
  const save = useSaveMerchantRule();
  const categories = useCategories();
  const accounts = useAccounts();
  const form = useForm({
    mode: 'controlled',
    initialValues: {
      merchantKey: rule?.merchantKey ?? '',
      categoryId: rule ? String(rule.categoryId) : null,
      accountId: rule?.accountId != null ? String(rule.accountId) : null,
    },
    validate: {
      merchantKey: (value) => (value.trim() ? null : 'Magazinul este obligatoriu.'),
      categoryId: (value) => (value ? null : 'Categoria este obligatorie.'),
    },
  });

  const submit = form.onSubmit((values) => {
    if (!values.categoryId) return;
    save.mutate(
      {
        id: rule?.id,
        request: {
          merchantKey: values.merchantKey.trim(),
          categoryId: Number(values.categoryId),
          accountId: values.accountId ? Number(values.accountId) : null,
        },
      },
      {
        onSuccess: (saved) => {
          notifySuccess(rule ? 'Modificările au fost salvate.' : `Regula pentru „${saved.merchantKey}” a fost adăugată.`);
          onDone();
        },
        onError: (error) => applyServerErrors(error, form.setErrors, 'merchantKey'),
      },
    );
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <TextInput label={labels.fields.merchant} required maxLength={200} data-autofocus {...form.getInputProps('merchantKey')} />
        <Select
          label={labels.fields.category}
          required
          searchable
          selectFirstOptionOnChange
          autoSelectOnBlur
          data={(categories.data ?? []).map((category) => ({ value: String(category.id), label: category.name }))}
          {...form.getInputProps('categoryId')}
        />
        <Select
          label={labels.fields.account}
          description="Opțional. Lăsați gol dacă plătiți de pe conturi diferite."
          clearable
          data={(accounts.data ?? []).map((account) => ({ value: String(account.id), label: account.name }))}
          {...form.getInputProps('accountId')}
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
