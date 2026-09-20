import { Group, Kbd, Modal, Stack, Text } from '@mantine/core';
import { useOs } from '@mantine/hooks';
import { SHORTCUTS } from '../lib/hotkeys';

/** The `?` cheat sheet. Rendered from the same list the shortcuts are bound from. */
export function ShortcutsModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const modLabel = useOs() === 'macos' ? '⌘' : 'Ctrl';

  return (
    <Modal opened={opened} onClose={onClose} title="Scurtături de tastatură" centered>
      <Stack gap="xs">
        {SHORTCUTS.map((shortcut) => (
          <Group key={shortcut.description} justify="space-between" align="center" gap="md" wrap="nowrap">
            <Text size="sm">{shortcut.description}</Text>
            <Group gap={6} wrap="nowrap">
              {shortcut.keys.map((key, index) => (
                <Group key={`${key}-${index}`} gap={6} wrap="nowrap">
                  {index > 0 && (
                    <Text size="xs" c="dimmed">
                      {shortcut.together ? '+' : 'apoi'}
                    </Text>
                  )}
                  <Kbd size="sm">{key === 'mod' ? modLabel : key}</Kbd>
                </Group>
              ))}
            </Group>
          </Group>
        ))}
      </Stack>
      <Text size="xs" c="dimmed" mt="md">
        Scurtăturile dintr-o singură tastă funcționează doar când nu scrieți într-un câmp.
      </Text>
    </Modal>
  );
}
