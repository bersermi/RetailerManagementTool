import { defineConfig } from 'vitest/config';

// ⚠️ `test/` ONLY, AND THE EXCLUSION IS THE POINT. Vitest's default include
// sweeps the whole workspace for `*.test.*`, which here would eventually pull in
// `.tsx` under `src/app/` and need a React Native transform to load them. The
// ADR (§2.10, amended 2026-09-07) permits unit tests that pin a VALUE and
// refuses suites over rendering and navigation; a config that could only ever
// collect the former is that rule made structural rather than remembered.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
