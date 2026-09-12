import { Group, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Group justify="space-between" align="center" gap="sm" mb="md">
      <Title order={2}>{title}</Title>
      {children}
    </Group>
  );
}
