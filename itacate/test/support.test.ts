import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { EXTRA_ENV } from '../app.config';
import { forgotPasswordUrl, supportNumberOf, whatsappUrl } from '@/auth/support';
import { ES } from '@/strings';
import {
  supportNumberOf as weraSupportNumberOf,
  whatsappUrl as weraWhatsappUrl,
} from '../../app/src/auth/support';
import { ES as WERA } from '../../app/src/strings';

// ============================================================================
// ¿OLVIDASTE TU CONTRASEÑA? Plan task `10.5-iii-a` — Wera's `5R-h`, in this app.
//
// Two values a neighbour is affected by: whether the link is drawn at all, and
// the chat it opens. ⚠️ The number here is a made-up one — the real one never
// enters this repository, which is public.
//
// ⚠️ ITACATE'S `supportNumberOf` AND `whatsappUrl` ARE COPIES OF WERA'S
// (`app/src/auth/support.ts`), and this runs WERA'S FILE beside them over the same
// inputs — the file, not a second spelling (`cocina/test/support.test.ts` does
// the same for Wera Cocina's). Loaded here, Wera's file reads this app's
// `@/strings`; the two functions compared use no word.
// ============================================================================

const FAKE = '525500000000';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

describe('a build with no number draws no link', () => {
  it('is null when unset or blank', () => {
    expect(supportNumberOf(undefined)).toBeNull();
    expect(supportNumberOf('')).toBeNull();
    expect(supportNumberOf('   ')).toBeNull();
  });

  // Ten digits is a Mexican number without its country code, and `wa.me` would
  // read it as some other country's. Refused, rather than guessed at.
  it('refuses a number with no country code, or anything that is not digits', () => {
    expect(supportNumberOf('5500000000')).toBeNull();
    expect(supportNumberOf('52 55 abcd 0000')).toBeNull();
  });

  it('reads a number the way a person copies one', () => {
    expect(supportNumberOf('+52 (55) 0000-0000')).toBe(FAKE);
    expect(supportNumberOf(` ${FAKE}\n`)).toBe(FAKE);
  });

  it('answers what Wera’s answers, input for input', () => {
    const inputs = [undefined, '', '   ', '5500000000', '52 55 abcd 0000', '+52 (55) 0000-0000', ` ${FAKE}\n`, FAKE, '5255000000001234', '+1 555 000 0000'];
    for (const raw of inputs) expect(supportNumberOf(raw), String(raw)).toBe(weraSupportNumberOf(raw));
  });
});

describe('the chat the link opens', () => {
  it('goes to wa.me, spelled as Wera spells it', () => {
    expect(forgotPasswordUrl(FAKE, '')).toMatch(/^https:\/\/wa\.me\/525500000000\?text=/);
    for (const text of ['Hola', 'a+b&c@ejemplo.mx', 'Doña Lupe ñ']) {
      expect(whatsappUrl(FAKE, text)).toBe(weraWhatsappUrl(FAKE, text));
    }
  });

  // The exact words he receives, written here rather than read back from `ES`:
  // a sentence compared with itself would pass whatever it said.
  it('names the typed address, so the owner knows who is asking — and this app', () => {
    const text = new URL(forgotPasswordUrl(FAKE, '  doña.lupe@ejemplo.mx ')).searchParams.get('text');
    expect(text).toBe('Hola, olvidé mi contraseña de Itacate. Mi correo es doña.lupe@ejemplo.mx');
  });

  it('says nothing about an address when the box is empty — and still names this app', () => {
    expect(new URL(forgotPasswordUrl(FAKE, '  ')).searchParams.get('text')).toBe('Hola, olvidé mi contraseña de Itacate.');
  });

  // An unencoded `&` or `+` in an address would cut the message short or turn
  // into a space; both are legal in an email.
  it('survives the characters a URL would eat', () => {
    const text = new URL(forgotPasswordUrl(FAKE, 'a+b&c@ejemplo.mx')).searchParams.get('text');
    expect(text).toContain('a+b&c@ejemplo.mx');
  });

  it('is labelled with Wera’s words, word for word', () => {
    expect(ES.auth.forgotPassword).toBe(WERA.auth.forgotPassword);
  });
});

describe('the link on the screen', () => {
  const screen = read('app/(auth)/entrar.tsx');

  it('is drawn on Entrar only, and only on a build that carries the number', () => {
    expect(screen).toMatch(/const supportNumber = SUPPORT_WHATSAPP;/);
    expect(screen).toMatch(/\{!creating && supportNumber !== null && \(/);
  });

  it('opens the chat for the address typed above it', () => {
    expect(screen).toMatch(/Linking\.openURL\(forgotPasswordUrl\(supportNumber, email\)\)/);
    expect(screen).toMatch(/\{ES\.auth\.forgotPassword\}/);
  });

  it('reads the number from where the bundler inlines it, written out in full', () => {
    expect(read('lib/supportWhatsapp.ts')).toMatch(/supportNumberOf\(\s*process\.env\.EXPO_PUBLIC_SUPPORT_WHATSAPP,?\s*\)/);
  });
});

// ⚠️ A VALUE THE BUNDLE READS AND EAS DOES NOT HOLD FAILS SILENTLY, OR ON THE FIRST
// LAUNCH. `eas update` builds the bundle from EAS's environment alone, and the
// update runbook is the only thing that refuses to publish without a value — so
// every `EXPO_PUBLIC_` value this app's source reads must be on the runbook's
// list for `--app itacate`. ⚠️ SINCE `10.5-iv-a-i` THE CONFIG HANDS GOOGLE'S TWO KEYS
// TO `extra` too, as Wera Cocina's has since `10.4g-i` (`cocina/app.config.ts`):
// Expo writes `extra` into every update, so an update built without one asks Google
// nothing on that phone — a kitchen with no point shows no distance, a postal code
// cannot be placed — as silently as a missing `EXPO_PUBLIC_` value.
describe('every value the bundle reads, the update runbook refuses to ship without', () => {
  function sources(dir = SRC): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
    });
  }
  // Comments out first (whole-line `//`, then blocks), as `data-layer.test.ts`
  // reads code: `lib/supabase.ts` explains the inlining with a made-up name.
  const allSource = sources()
    .map((path) => readFileSync(path, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))
    .join('\n');
  const inlined = [...new Set([...allSource.matchAll(/process\.env\.(EXPO_PUBLIC_[A-Z0-9_]+)/g)].map((m) => m[1]))].sort();
  const config = readFileSync(new URL('../app.config.ts', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  const used = [...inlined, ...EXTRA_ENV].sort();

  const runbook = readFileSync(new URL('../../docs/runbooks/ship-an-update.sh', import.meta.url), 'utf8');
  const listed = /\n\s*itacate\)\s+label="Itacate";\s+needed="([^"]*)"/.exec(runbook)?.[1].split(/\s+/).filter(Boolean).sort();

  it('reads the database’s two and the support number from the bundler', () => {
    expect(inlined).toEqual(['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPPORT_WHATSAPP']);
  });

  it('and Google’s two keys from the config, into `extra.google` and nowhere else in the bundle', () => {
    expect([...EXTRA_ENV]).toEqual(['GOOGLE_MAPS_ANDROID_API_KEY', 'GOOGLE_MAPS_IOS_API_KEY']);
    expect(config).toMatch(/extra: \{ \.\.\.config\.extra, google: \{ android: mapsKey, ios: iosKey \} \}/);
    expect(config).toMatch(/const mapsKey = process\.env\[MAPS_KEY_ENV\] \|\| MAPS_KEY_PLACEHOLDER;/);
    expect(config).toMatch(/const iosKey = process\.env\[IOS_MAPS_KEY_ENV\] \|\| MAPS_KEY_PLACEHOLDER;/);
    // ⚠️ Since `10.5-iv-b-i` the iPhone key is in the map's options too: its presence
    // compiles Google's map into an iPhone build, as in Wera Cocina since `10.4g-i`.
    expect(config).toMatch(/\['react-native-maps', \{ androidGoogleMapsApiKey: mapsKey, iosGoogleMapsApiKey: iosKey \}\]/);
    // Her phone's questions to Google read them where Expo puts the config, and only there.
    const readers = sources().filter((path) => /expoConfig\?\.extra/.test(readFileSync(path, 'utf8')));
    expect(readers.map((path) => path.slice(SRC.length + 1))).toEqual(['lib/useGoogle.ts']);
  });

  it('and the runbook names each of them for Itacate', () => {
    expect(listed, 'the runbook’s itacate) line').toBeDefined();
    expect(listed).toEqual(used);
  });
});
