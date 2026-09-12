import { createTheme } from '@mantine/core';

const systemSans = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: systemSans,
  headings: { fontFamily: systemSans },
  cursorType: 'pointer',
});
