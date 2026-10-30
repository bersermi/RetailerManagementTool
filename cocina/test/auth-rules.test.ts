import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { authErrorKey, authErrorMessage, KNOWN_AUTH_CODES } from '@/auth/errors';
import { checkCredentials, checkSignUp, FULL_NAME_KEY, joinName, normalizeEmail } from '@/auth/credentials';
import { quienEntro } from '@/auth/quien';
import { ES } from '@/strings';
import { ES as WERA } from '../../app/src/strings';

// ============================================================================
// WHAT IS CHECKED BEFORE A SIGN-IN LEAVES THE PHONE, AND WHAT SHE IS TOLD WHEN
// ONE FAILS. Plan task `10.4b-iii-a`.
//
// ⚠️ COCINA'S COPIES OF WERA'S RULES (`app/src/auth/credentials.ts` and
// `errors.ts`, pinned by `app/test/credentials.test.ts` and
// `auth-errors.test.ts`). The copies are this app's own — each app's `@/`
// resolves to its own `src/` — so what must not drift is held here AGAINST
// WERA'S FILES, not against a second spelling: one login is used in both apps,
// so the name's key is one key, and the same refusal reads the same in each.
// ============================================================================

const wera = (path: string) => readFileSync(new URL(`../../app/src/${path}`, import.meta.url), 'utf8');

describe('one login, one name key, in both apps', () => {
  it('stores the name under the key Wera stores it under', () => {
    const weraKey = /export const FULL_NAME_KEY = '([^']+)';/.exec(wera('auth/credentials.ts'))?.[1];
    expect(weraKey).toBe('full_name');
    expect(FULL_NAME_KEY).toBe(weraKey);
  });
});

describe('the same refusal reads the same in both apps', () => {
  it('every sign-in sentence is Wera’s, word for word', () => {
    for (const [key, sentence] of Object.entries(ES.auth.errors)) {
      expect(WERA.auth.errors[key as keyof typeof WERA.auth.errors], key).toBe(sentence);
    }
  });

  it('and the words around the boxes too', () => {
    for (const key of ['emailLabel', 'passwordLabel', 'nameLabel', 'surnameLabel', 'signIn', 'signUp', 'google', 'aviso', 'avisoAcceptLead', 'avisoGoogleLead', 'signOut', 'toSignUp'] as const) {
      expect(ES.auth[key], key).toBe(WERA.auth[key]);
    }
    expect(ES.auth.orEmail).toBe(WERA.cuenta.orEmail);
  });
});

describe('the address and the password, as they will be sent', () => {
  it('trims and lower-cases the address — a keyboard capitalises the first letter', () => {
    expect(normalizeEmail('  Doña.Lupe@Ejemplo.MX ')).toBe('doña.lupe@ejemplo.mx');
    const checked = checkCredentials(' Lupe@Ejemplo.mx', 'secreto ');
    expect(checked).toEqual({ ok: true, email: 'lupe@ejemplo.mx', password: 'secreto ' });
  });

  it('refuses in the screen’s order, in Spanish', () => {
    expect(checkCredentials('', 'secreto')).toMatchObject({ ok: false, key: 'emailMissing' });
    expect(checkCredentials('lupe', 'secreto')).toMatchObject({ ok: false, key: 'emailInvalid' });
    expect(checkCredentials('lupe@ejemplo.mx', '')).toMatchObject({ ok: false, key: 'passwordMissing' });
    expect(checkCredentials('lupe@ejemplo.mx', '12345')).toMatchObject({
      ok: false,
      key: 'passwordShort',
      message: ES.auth.errors.passwordShort,
    });
  });
});

describe('Crear cuenta: the name in two boxes, then the aviso', () => {
  const GOOD = ['lupe@ejemplo.mx', 'secreto', 'María del Carmen', 'Rodríguez Gómez'] as const;

  it('joins the two boxes and touches nothing else', () => {
    expect(joinName('  María  del Carmen ', ' de la  Cruz ')).toBe('María del Carmen de la Cruz');
    expect(checkSignUp(...GOOD, true)).toEqual({
      ok: true,
      email: 'lupe@ejemplo.mx',
      password: 'secreto',
      fullName: 'María del Carmen Rodríguez Gómez',
    });
  });

  it('asks each box, and refuses an unticked aviso last', () => {
    expect(checkSignUp('lupe@ejemplo.mx', 'secreto', ' ', 'Gómez', true)).toMatchObject({ key: 'nameMissing' });
    expect(checkSignUp('lupe@ejemplo.mx', 'secreto', 'Lupe', '', true)).toMatchObject({ key: 'surnameMissing' });
    expect(checkSignUp(...GOOD, false)).toMatchObject({ ok: false, key: 'avisoMissing' });
    expect(checkSignUp('', 'secreto', '', '', false)).toMatchObject({ key: 'emailMissing' });
  });
});

describe('what a failure is called', () => {
  it('maps every code it knows to a sentence of its own table', () => {
    for (const code of KNOWN_AUTH_CODES) {
      expect(ES.auth.errors[authErrorKey({ code })]).toBeTruthy();
      expect(authErrorKey({ code })).not.toBe('unknown');
    }
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('badCredentials');
    expect(authErrorKey({ code: 'user_already_exists' })).toBe('emailTaken');
  });

  it('reads a dead connection from its shape — it carries no code', () => {
    expect(authErrorKey({ name: 'AuthRetryableFetchError', message: 'x' })).toBe('offline');
    expect(authErrorKey(new TypeError('Network request failed'))).toBe('offline');
    expect(authErrorKey({ message: 'AbortError: Network request failed: no answer in 30 s' })).toBe('offline');
  });

  it('says nothing invented about anything else', () => {
    expect(authErrorMessage({ code: 'something_new', message: 'Invalid thing' })).toBe(ES.auth.errors.unknown);
    expect(authErrorMessage(null)).toBe(ES.auth.errors.unknown);
    expect(authErrorMessage('boom')).toBe(ES.auth.errors.unknown);
  });
});

describe('who the landing says is signed in', () => {
  it('her name first, collapsed', () => {
    expect(quienEntro({ email: 'lupe@ejemplo.mx', user_metadata: { [FULL_NAME_KEY]: '  Lupe   Gómez ' } })).toBe('Lupe Gómez');
  });

  it('her address when there is no name, and nothing for nobody', () => {
    expect(quienEntro({ email: 'lupe@ejemplo.mx', user_metadata: { [FULL_NAME_KEY]: ' ' } })).toBe('lupe@ejemplo.mx');
    expect(quienEntro({ email: 'lupe@ejemplo.mx', user_metadata: null })).toBe('lupe@ejemplo.mx');
    expect(quienEntro({ email: null, user_metadata: {} })).toBeNull();
    expect(quienEntro(null)).toBeNull();
  });
});
