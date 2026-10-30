import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AVISO_URL } from '@/auth/aviso';
import {
  COCINA_KIND,
  KIND_COLUMN,
  KITCHEN_COLUMNS,
  KITCHEN_ORDER,
  WORKSPACE_TABLE,
  kitchensKey,
  membershipFrom,
  openKitchen,
  toKitchen,
} from '@/api/kitchen';
import { isSecretKey, readSupabaseEnv } from '@/lib/env';
import { LIMIT_MS, UPLOAD_LIMIT_MS, isTimedOut, limitFor, timedOutError, withLimit, type Timers } from '@/lib/plazo';
import { desplazamiento } from '@/lib/teclado';

// ============================================================================
// COCINA'S DATA LAYER: what it is built from, what it asks the database, and the
// lines its wiring must not cross. Plan task `10.4b-iii-a`.
//
// ⚠️ WHAT ONLY A REAL DATABASE CAN SAY — that the table, the columns, the kind
// and the order are ones PostgREST answers, and that a shop stays out — is
// `docs/checks/10.4b-iii-a-cocina-contract.sh`, which reads them out of
// `src/api/kitchen.ts`. Here: the values, and the structure around them.
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
  it('30 s, and 90 s for a photo going up', () => {
    expect(limitFor('https://x.supabase.co/rest/v1/workspace?select=id', 'GET')).toBe(LIMIT_MS);
    expect(limitFor('https://x.supabase.co/auth/v1/token?grant_type=refresh_token', 'POST')).toBe(LIMIT_MS);
    expect(limitFor('https://x.supabase.co/storage/v1/object/fotos/a.jpg', 'POST')).toBe(UPLOAD_LIMIT_MS);
    expect(limitFor('https://x.supabase.co/storage/v1/object/fotos/a.jpg', 'GET')).toBe(LIMIT_MS);
  });

  it('a request over it fails as a lost link, and only the limit is called a timeout', async () => {
    let fire: (() => void) | null = null;
    const timers: Timers = { set: (run) => ((fire = run), 1), clear: () => {} };
    const hung = (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const pending = withLimit(hung, timers)('https://x.supabase.co/rest/v1/workspace');
    (fire as unknown as () => void)();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError', message: expect.stringMatching(/Network request failed/) });
    expect(isTimedOut(timedOutError(LIMIT_MS))).toBe(true);
    expect(isTimedOut(new TypeError('Network request failed'))).toBe(false);
  });

  it('is on the one client', () => {
    expect(code('lib/supabase.ts')).toMatch(/global: \{ fetch: withLimit\(fetch\) \}/);
  });
});

describe('her kitchen, as the app asks for it', () => {
  it('names the table, the columns, the kind and the order once', () => {
    expect(WORKSPACE_TABLE).toBe('workspace');
    expect(KITCHEN_COLUMNS).toBe('id,display_name,giro_principal');
    expect(KITCHEN_COLUMNS).not.toContain('*');
    expect(KIND_COLUMN).toBe('kind');
    expect(COCINA_KIND).toBe('cocina');
    expect(KITCHEN_ORDER).toBe('created_at,id');
  });

  it('and the read sends exactly those — the filter and the order, nothing retyped', () => {
    const calls = code('api/calls.ts');
    expect(calls).toMatch(/\.from\(WORKSPACE_TABLE\)\.select\(KITCHEN_COLUMNS\)\.eq\(KIND_COLUMN, COCINA_KIND\)/);
    expect(calls).toMatch(/KITCHEN_ORDER\.split\(','\)\) query = query\.order\(column\)/);
  });

  it('renames a row, and reads an absent trade as none', () => {
    expect(toKitchen({ id: 'k', display_name: 'Fonda Lupe', giro_principal: 'giro-fonda' })).toEqual({
      id: 'k',
      displayName: 'Fonda Lupe',
      giroPrincipal: 'giro-fonda',
    });
    expect(toKitchen({ id: 'k', display_name: 'Fonda Lupe' }).giroPrincipal).toBeNull();
  });

  it('no answer yet is not “no kitchen”', () => {
    expect(membershipFrom(undefined)).toBe('unknown');
    expect(membershipFrom(null)).toBe('unknown');
    expect(membershipFrom([])).toBe('none');
    expect(membershipFrom([toKitchen({ id: 'k', display_name: 'A' })])).toBe('member');
  });

  it('opens the first the ordered read returns', () => {
    const [a, b] = [toKitchen({ id: 'a', display_name: 'A' }), toKitchen({ id: 'b', display_name: 'B' })];
    expect(openKitchen([a, b])).toBe(a);
    expect(openKitchen([])).toBeNull();
    expect(openKitchen(undefined)).toBeNull();
  });

  it('caches under the login, so the next person on this phone is never answered from the last one’s', () => {
    expect(kitchensKey('u-1')).toEqual(['cocina', 'mias', 'u-1']);
    expect(kitchensKey('u-1')).not.toEqual(kitchensKey('u-2'));
    expect(code('api/hooks.ts')).toMatch(/queryKey: kitchensKey\(userId\)/);
  });
});

describe('the lines the wiring does not cross', () => {
  const files = sources().map((path) => ({ name: relative(path), text: readFileSync(path, 'utf8') }));

  it('`supabase.auth` is called in AuthProvider and nowhere else', () => {
    const callers = files.filter((f) => /supabase\.auth\./.test(f.text)).map((f) => f.name);
    expect(callers.sort()).toEqual(['auth/AuthProvider.tsx', 'lib/supabase.ts']);
  });

  it('the live client is imported by the data layer and the provider alone', () => {
    const importers = files.filter((f) => /from '@\/lib\/supabase'/.test(f.text)).map((f) => f.name);
    expect(importers.sort()).toEqual(['api/calls.ts', 'auth/AuthProvider.tsx']);
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
