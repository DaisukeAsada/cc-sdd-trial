import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@book': path.resolve(__dirname, './src/domains/book'),
      '@loan': path.resolve(__dirname, './src/domains/loan'),
      '@user': path.resolve(__dirname, './src/domains/user'),
      '@reservation': path.resolve(__dirname, './src/domains/reservation'),
      '@report': path.resolve(__dirname, './src/domains/report'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
    },
  },
});
