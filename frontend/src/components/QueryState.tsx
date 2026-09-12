import { Alert, Button, Center, Loader, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { errorMessage } from '../lib/notify';
import { labels } from '../lib/labels';

export function CenteredLoader() {
  return (
    <Center py="xl" aria-label={labels.states.loading}>
      <Loader />
    </Center>
  );
}

export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle />} title={labels.states.loadError}>
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{errorMessage(error)}</Text>
        {onRetry && (
          <Button size="compact-sm" variant="light" color="red" onClick={onRetry}>
            {labels.actions.retry}
          </Button>
        )}
      </Stack>
    </Alert>
  );
}
