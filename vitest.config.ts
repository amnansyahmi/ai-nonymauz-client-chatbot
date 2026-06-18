import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'happy-dom',
    globals: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts', 'components/planner/utils.ts', 'components/planner/hooks/**/*.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});
