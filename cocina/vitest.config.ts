import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// ⚠️ `test/` ONLY, AND THE EXCLUSION IS THE POINT. Vitest's default include
// sweeps the whole workspace for `*.test.*`, which here would eventually pull in
// `.tsx` under `src/app/` and need a React Native transform to load them. The
// ADR (§2.10, amended 2026-09-07) permits unit tests that pin a VALUE and
// refuses suites over rendering and navigation; a config that could only ever
// collect the former is that rule made structural rather than remembered.
export default defineConfig({
  // ⚠️ THE SAME `@/` THE APP IMPORTS BY, AND IT HAS TO BE SAID TWICE. Metro
  // reads the mapping out of `tsconfig.json`; Vitest does not, so a module that
  // compiles and bundles fine fails to LOAD under test with "Does the file
  // exist?". Found the moment 5a-ii's first non-relative source module was
  // imported by a suite. The two spellings drifting apart is a real risk, and
  // it fails loudly rather than silently — a wrong alias resolves to nothing.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
