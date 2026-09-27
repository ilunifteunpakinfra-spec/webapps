import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Component tests import from '@/components/...'; the alias must match
    // the tsconfig paths so the same specifier works in both toolchains.
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
});
