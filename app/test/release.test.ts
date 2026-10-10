import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// ============================================================================
// WHICH PHONES AN OVER-THE-AIR UPDATE REACHES. Plan task 5R-b.
//
// `docs/runbooks/ship-an-update.sh <channel>` publishes with
// `--environment <channel>`, so it assumes each build profile's EAS environment
// has the same name as its channel. If they drift, an update is bundled from
// another environment's values than the build it lands on — a different
// Supabase project, or none — and nothing reports it until a phone opens.
//
// It also assumes the runtime is a fingerprint: a version string never changes
// when a native module is added, so an update needing that module would reach
// a build without it. `app/fingerprint.config.js` says why the hash is stable.
// ============================================================================

const read = (path: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'));

const app = read('../app.json') as { expo: { runtimeVersion?: unknown } };
const eas = read('../eas.json') as {
  build: Record<string, { channel?: string; environment?: string; distribution?: string }>;
};

describe('an update reaches only the builds it was made for', () => {
  it('names the runtime by fingerprint, not by a version string', () => {
    expect(app.expo.runtimeVersion).toEqual({ policy: 'fingerprint' });
  });

  it('has the two channels the runbook accepts, preview and production', () => {
    expect(Object.keys(eas.build).sort()).toEqual(['preview', 'production']);
  });

  it.each(Object.entries(eas.build))(
    'bundles %s from the environment its channel is named after',
    (_profile, build) => {
      expect(build.channel).toBeDefined();
      expect(build.environment).toBe(build.channel);
    },
  );

  it('installs preview builds from a link, without a store', () => {
    expect(eas.build.preview.distribution).toBe('internal');
  });
});
