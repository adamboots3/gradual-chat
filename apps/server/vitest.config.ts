import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    env: { NODE_ENV: 'test' },
    // Every integration test file boots its own in-memory MongoDB, so running
    // files one at a time keeps memory usage predictable.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 40000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/seed/**', 'src/graphql/schema.graphql'],
    },
  },
});
