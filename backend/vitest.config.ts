import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

config({ path: '../.env', quiet: true });

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
