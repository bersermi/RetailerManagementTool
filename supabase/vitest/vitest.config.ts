import { defineConfig } from 'vitest/config';

// Every test in this package drives real connections against ONE database and
// commits to it. Parallelism here would not be a speed-up, it would be a second
// race running inside the race under test — and `pg_blocking_pids()` would start
// naming a backend that belongs to another test.
export default defineConfig({
  test: {
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
