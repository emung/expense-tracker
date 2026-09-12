import { Alert, Anchor, Center, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export function NotFoundPage() {
  return (
    <Stack align="flex-start">
      <Title order={2}>Pagina nu există</Title>
      <Anchor component={Link} to="/cheltuieli">
        Înapoi la cheltuieli
      </Anchor>
    </Stack>
  );
}

/** Last-resort boundary for errors thrown while rendering a route. */
export function RouteErrorPage() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : null;

  return (
    <Center p="xl">
      <Alert color="red" icon={<IconAlertTriangle />} title="Ceva nu a funcționat" maw={520}>
        <Stack gap="xs">
          <Text size="sm">Pagina nu a putut fi afișată. Reîncărcați pagina sau reveniți la lista de cheltuieli.</Text>
          {detail && (
            <Text size="xs" c="dimmed" ff="monospace">
              {detail}
            </Text>
          )}
          <Anchor href="/cheltuieli" size="sm">
            Înapoi la cheltuieli
          </Anchor>
        </Stack>
      </Alert>
    </Center>
  );
}
