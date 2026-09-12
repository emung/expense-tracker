import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconArchive, IconArchiveOff, IconPencil, IconTrash } from '@tabler/icons-react';
import { labels } from '../../lib/labels';
import { countLabel } from '../../lib/plural';

interface RowActionsProps {
  name: string;
  archived: boolean;
  /** Items still used by expenses can only be archived, never deleted. */
  usageCount: number;
  archiving?: boolean;
  onEdit: () => void;
  onToggleArchived: () => void;
  onDelete: () => void;
}

export function RowActions({ name, archived, usageCount, archiving, onEdit, onToggleArchived, onDelete }: RowActionsProps) {
  const archiveLabel = archived ? labels.actions.restore : labels.actions.archive;
  const deleteBlocked = usageCount > 0;
  const deleteHint = deleteBlocked
    ? `Folosit de ${countLabel(usageCount, 'cheltuială', 'cheltuieli')}. Arhivați în loc să ștergeți.`
    : labels.actions.delete;

  return (
    <Group gap={2} justify="flex-end" wrap="nowrap">
      <Tooltip label={labels.actions.edit}>
        <ActionIcon variant="subtle" color="gray" aria-label={`${labels.actions.edit} ${name}`} onClick={onEdit}>
          <IconPencil size={18} stroke={1.75} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={archiveLabel}>
        <ActionIcon variant="subtle" color="gray" aria-label={`${archiveLabel} ${name}`} loading={archiving} onClick={onToggleArchived}>
          {archived ? <IconArchiveOff size={18} stroke={1.75} /> : <IconArchive size={18} stroke={1.75} />}
        </ActionIcon>
      </Tooltip>
      <Tooltip label={deleteHint} multiline maw={240}>
        {/* Disabled buttons swallow pointer events, so the wrapper keeps the explanation reachable. */}
        <span style={{ display: 'inline-flex' }}>
          <ActionIcon variant="subtle" color="red" aria-label={`${labels.actions.delete} ${name}`} disabled={deleteBlocked} onClick={onDelete}>
            <IconTrash size={18} stroke={1.75} />
          </ActionIcon>
        </span>
      </Tooltip>
    </Group>
  );
}
