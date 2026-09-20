import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In dev the Spring Boot backend runs natively on 8080; in Docker nginx does this proxying.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    // Components render against jsdom; the pure `lib/` tests are happy there too.
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
