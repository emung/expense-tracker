import { Badge, Button, Group, Modal, NumberInput, Stack, Table, Text, TextInput, VisuallyHidden } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { useCategories, useDeleteCategory, useSaveCategory } from '../../api/categories';
import type { Category } from '../../api/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CenteredLoader, QueryError } from '../../components/QueryState';
import { applyServerErrors } from '../../lib/formErrors';
import { labels } from '../../lib/labels';
import { notifyError, notifySuccess } from '../../lib/notify';
import { RowActions } from './RowActions';
import { SettingsSection } from './SettingsSection';

type Editing = Category | 'new' | null;

export function CategoriesSection() {
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const categories = useCategories(showArchived);
  const save = useSaveCategory();
  const remove = useDeleteCategory();

  const toggleArchived = (category: Category) =>
    save.mutate(
      { id: category.id, request: { name: category.name, archived: !category.archived } },
      {
        onSuccess: () =>
          notifySuccess(category.archived ? `Categoria „${category.name}” a fost restaurată.` : `Categoria „${category.name}” a fost arhivată.`),
        onError: (error) => notifyError(error),
      },
    );

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => notifySuccess(`Categoria „${deleting.name}” a fost ștearsă.`),
      onError: (error) => notifyError(error),
      onSettled: () => setDeleting(null),
    });
  };

  return (
    <SettingsSection
      title="Categorii"
      description="Arhivați categoriile pe care nu le mai folosiți: rămân în rapoartele lunilor trecute."
      addLabel="Categorie nouă"
      showArchived={showArchived}
      onShowArchivedChange={setShowArchived}
      onAdd={() => setEditing('new')}
    >
      {categories.isPending ? (
        <CenteredLoader />
      ) : categories.isError ? (
        <QueryError error={categories.error} onRetry={() => void categories.refetch()} />
      ) : categories.data.length === 0 ? (
        <Text c="dimmed" size="sm">
          Nicio categorie.
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={420}>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{labels.fields.name}</Table.Th>
                <Table.Th ta="right">Cheltuieli</Table.Th>
                <Table.Th w={120}>
                  <VisuallyHidden>Acțiuni</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {categories.data.map((category) => (
                <Table.Tr key={category.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" c={category.archived ? 'dimmed' : undefined}>
                        {category.name}
                      </Text>
                      {category.archived && (
                        <Badge size="sm" variant="light" color="gray">
                          {labels.states.archived}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {category.expenseCount}
                  </Table.Td>
                  <Table.Td>
                    <RowActions
                      name={category.name}
                      archived={category.archived}
                      usageCount={category.expenseCount}
                      archiving={save.isPending && save.variables?.id === category.id}
                      onEdit={() => setEditing(category)}
                      onToggleArchived={() => toggleArchived(category)}
                      onDelete={() => setDeleting(category)}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal opened={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Categorie nouă' : 'Editează categoria'} centered>
        {editing !== null && (
          <CategoryForm key={editing === 'new' ? 'new' : editing.id} category={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog
        opened={deleting !== null}
        title="Ștergeți categoria?"
        message={`Categoria „${deleting?.name ?? ''}” va fi ștearsă definitiv.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </SettingsSection>
  );
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const save = useSaveCategory();
  const form = useForm({
    mode: 'controlled',
    initialValues: { name: category?.name ?? '', sortOrder: (category?.sortOrder ?? '') as number | string },
    validate: { name: (value) => (value.trim() ? null : 'Numele este obligatoriu.') },
  });

  const submit = form.onSubmit((values) =>
    save.mutate(
      {
        id: category?.id,
        request: { name: values.name, sortOrder: values.sortOrder === '' ? null : Number(values.sortOrder) },
      },
      {
        onSuccess: (saved) => {
          notifySuccess(category ? 'Modificările au fost salvate.' : `Categoria „${saved.name}” a fost adăugată.`);
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
        <NumberInput
          label={labels.fields.order}
          description="Poziția în liste. Lăsați gol pentru a o adăuga la final."
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
