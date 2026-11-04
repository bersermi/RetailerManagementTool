import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AVISO_URL } from '@/auth/aviso';
import { isSecretKey, readSupabaseEnv } from '@/lib/env';
import { LIMIT_MS, isTimedOut, timedOutError, withLimit, type Timers } from '@/lib/plazo';
import { desplazamiento } from '@/lib/teclado';

// ============================================================================
// ITACATE'S DATA LAYER: what it is built from, and the lines its wiring must not
// cross. Plan task `10.5-iii-a`.
//
// ⚠️ THE CONVENTIONS GATE DOES NOT READ THIS APP (`docs/CONVENTIONS.md` and
// `conventions-gate.sh` are written about Wera — density for elder shopkeepers,
// four environment values, money), decided for Wera Cocina by `10.4b-iii-a` and
// for Itacate by `10.5-iii-a`, its first real screens. This suite pins the rules
// that carry this app's risks instead, as `cocina/test/data-layer.test.ts` does:
// `supabase.auth` in `AuthProvider` alone, the live client imported by it alone,
// `@/` imports, and no word on a screen outside `src/strings.ts`.
//
// ⚠️ NOTHING HERE READS THE DATABASE YET: signing in is GoTrue's, and Itacate's
// first read of a table or a door is `10.5-iii-b`'s or `10.5-iv`'s — each brings
// its contract check against a real PostgREST, as Wera Cocina's do (`db.yml`
// fires on `itacate/src/api/**` since this row).
// ============================================================================

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
// ⚠️ WHOLE-LINE `//` COMMENTS GO FIRST: a header that mentions `test/**` holds a
// `/*`, and stripping block comments first swallowed every import below it.
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

function sources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}
const relative = (path: string) => path.slice(SRC.length + 1);

describe('the two values the client is built from', () => {
  const GOOD = { EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' };

  it('are read, trimmed', () => {
    expect(readSupabaseEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_URL: ' https://abc.supabase.co ' })).toEqual({
      url: 'https://abc.supabase.co',
      publishableKey: 'sb_publishable_x',
    });
  });

  it('refuse to start missing, over http, or with a trailing slash', () => {
    expect(() => readSupabaseEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_URL: '' })).toThrow(/URL is not set/);
    expect(() => readSupabaseEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined })).toThrow(/KEY is not set/);
    expect(() => readSupabaseEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_URL: 'http://abc.supabase.co' })).toThrow(/https/);
    expect(() => readSupabaseEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co/' })).toThrow(/slash/);
  });

  it('refuse a key that bypasses every wall, in both spellings', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
    const legacy = `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
    expect(isSecretKey('sb_secret_abc')).toBe(true);
    expect(isSecretKey(legacy)).toBe(true);
    expect(isSecretKey('sb_publishable_abc')).toBe(false);
    expect(() => readSupabaseEnv({ ...GOOD, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacy })).toThrow(/SECRET/);
  });

  it('are written out in full where the bundler inlines them', () => {
    const client = code('lib/supabase.ts');
    expect(client).toMatch(/process\.env\.EXPO_PUBLIC_SUPABASE_URL/);
    expect(client).toMatch(/process\.env\.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    expect(client).not.toMatch(/readSupabaseEnv\(process\.env\)/);
  });
});

describe('every request has a time limit', () => {
  it('30 s, Wera’s', () => {
    expect(LIMIT_MS).toBe(30_000);
  });

  it('a request over it fails as a lost link, and only the limit is called a timeout', async () => {
    let fire: (() => void) | null = null;
    let asked = 0;
    const timers: Timers = { set: (run, ms) => ((fire = run), (asked = ms), 1), clear: () => {} };
    const hung = (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const pending = withLimit(hung, timers)('https://x.supabase.co/auth/v1/token?grant_type=refresh_token', { method: 'POST' });
    expect(asked).toBe(LIMIT_MS);
    (fire as unknown as () => void)();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError', message: expect.stringMatching(/Network request failed/) });
    expect(isTimedOut(timedOutError(LIMIT_MS))).toBe(true);
    expect(isTimedOut(new TypeError('Network request failed'))).toBe(false);
  });

  it('a request that answers in time is handed back, and its timer cleared', async () => {
    let cleared = 0;
    const timers: Timers = { set: () => 7, clear: (handle) => void (handle === 7 && cleared++) };
    const answer = new Response('{}');
    await expect(withLimit(async () => answer, timers)('https://x.supabase.co/auth/v1/user')).resolves.toBe(answer);
    expect(cleared).toBe(1);
  });

  it('is on the one client', () => {
    expect(code('lib/supabase.ts')).toMatch(/global: \{ fetch: withLimit\(fetch\) \}/);
  });
});

describe('the lines the wiring does not cross', () => {
  const files = sources().map((path) => ({ name: relative(path), text: readFileSync(path, 'utf8') }));

  it('`supabase.auth` is called in AuthProvider and nowhere else', () => {
    const callers = files.filter((f) => /supabase\.auth\./.test(f.text)).map((f) => f.name);
    expect(callers.sort()).toEqual(['auth/AuthProvider.tsx', 'lib/supabase.ts']);
  });

  // ⚠️ When the first read lands (`10.5-iii-b`), `api/calls.ts` joins this list —
  // the data layer, and no screen.
  it('the live client is imported by the provider alone', () => {
    const importers = files.filter((f) => /from '@\/lib\/supabase'/.test(f.text)).map((f) => f.name);
    expect(importers.sort()).toEqual(['auth/AuthProvider.tsx']);
  });

  it('a screen reaches the database through a hook, never `@/api/calls`', () => {
    const screens = files.filter((f) => f.name.startsWith('app/'));
    expect(screens.length).toBeGreaterThan(0);
    for (const screen of screens) expect(screen.text, screen.name).not.toMatch(/from '@\/api\/calls'/);
  });

  it('imports are written `@/…`, never a path that climbs', () => {
    for (const file of files) expect(file.text, file.name).not.toMatch(/from '\.\.\//);
  });

  // Wera's R4, the part a suite can read: a word on a screen is a JSX text node
  // or a string handed to `label`/`titulo`, and every one comes from `ES`.
  it('no screen or component draws a word of its own — every word is `src/strings.ts`’s', () => {
    for (const file of files.filter((f) => f.name.endsWith('.tsx'))) {
      const jsx = file.text.replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
      // `(?<![=-])`: an arrow (`=> Promise<…>`) is not a tag closing.
      expect(jsx, file.name).not.toMatch(/(?<![=-])>\s*[A-Za-zÁÉÍÓÚÑáéíóúñ¿¡][^<{]*</);
      expect(jsx, file.name).not.toMatch(/(?:label|titulo|antetitulo)=["'][^"']+["']/);
    }
  });

  it('the query layer sits inside the session, so a read is scoped to whoever holds it', () => {
    expect(code('app/_layout.tsx')).toMatch(/<AuthProvider>\s*<QueryProvider>[\s\S]*<\/QueryProvider>\s*<\/AuthProvider>/);
  });
});

describe('the aviso the two places an account is made open', () => {
  it('is the published page of these apps, and it is in site/', () => {
    expect(AVISO_URL).toBe('https://tu-wera.com/privacidad/cocina-e-itacate/');
    const page = new URL('../../site/privacidad/cocina-e-itacate/index.html', import.meta.url);
    expect(existsSync(page)).toBe(true);
  });

  it('is opened by the sign-in screen, from the box and from the line under the providers', () => {
    const screen = read('app/(auth)/entrar.tsx');
    expect(screen).toMatch(/openBrowserAsync\(AVISO_URL\)/);
    expect((screen.match(/onPress=\{openAviso\}/g) ?? []).length).toBe(2);
  });
});

describe('a form keeps the field being typed in above the keyboard', () => {
  it('scrolls by what the field overlaps, plus the margin, and never backwards', () => {
    expect(desplazamiento(600, 48, 620, 24)).toBe(52);
    expect(desplazamiento(300, 48, 620, 24)).toBe(0);
  });
});
